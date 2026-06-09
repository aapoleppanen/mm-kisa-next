# Betting & Scoring Overhaul — Spec

Status: proposal · Target: mm-kisa-next (Next.js 15 App Router, Prisma 6, better-auth)

## 0. Current state (baseline)

- Everyone starts with `User.credits = 500`, bets up to `maxBetAmount = 50` per match on `HOME_TEAM | DRAW | AWAY_TEAM`.
- Odds are real Veikkaus bookmaker odds, stored on `Match` as `decimal × 100` (`homeWinOdds`, `drawOdds`, `awayWinOdds`).
- `remainingCredits = credits − Σ betAmount` (via `UserCreditsView` + a `Pick` trigger). Fixed budget — no re-staking of winnings, so **no compounding**.
- Settlement: `modules/api/results/updatePlayerPoints.ts` sets `points = Σ(betAmount × odds)` over winning picks, recomputed from scratch each `/api/cron` run.
- Leaderboard sorts by `points`; both `points` and `odds` are divided by 100 in the UI.
- `/api/cron` is **unauthenticated**. Config is hardcoded in `lib/config.ts`. No admin. No user roles.

Two fairness problems with the baseline: (1) bookie odds mean every credit has ~equal EV, so winning is a **variance contest, not skill**; (2) most credits are spent in the group stage, so an early underdog hit is hard to catch.

---

## 1. Shared foundation (Phase 0 — everything depends on this)

### 1.1 Schema changes (`prisma/schema.prisma`)

```prisma
enum ScoringMode {
  FIXED_ODDS        // current behaviour
  COMPRESSED_ODDS   // log2(odds) payout
  PARI_MUTUEL       // crowd pool, winners split the pot
  EXACT_SCORE       // 3 / 2 / 1 prediction, no betting
}

// NOTE: user roles are NOT a custom enum — use the better-auth **admin plugin**, which
// owns the `role` field (+ `banned`/`banReason`/`banExpires`). See §4.0.

// Singleton config row (id is always 1)
model Config {
  id               Int         @id @default(1)
  scoringMode      ScoringMode @default(FIXED_ODDS)
  startingCredits  Float       @default(500) @db.Real
  maxBetAmount     Float       @default(50)  @db.Real
  lockLeadHours    Int         @default(1)   // bets freeze N h before kickoff
  prePicksLockAt   DateTime?                 // winner/top-scorer global lock
  rakePercent      Float       @default(0)   @db.Real  // pari-mutuel house take
  exactScorePoints Int         @default(3)
  goalDiffPoints   Int         @default(2)
  tendencyPoints   Int         @default(1)
  maintenanceMode  Boolean     @default(false)
  cronSecret       String?                    // optional: rotate cron auth from UI
  updatedAt        DateTime    @updatedAt
}

model Match {
  // ...existing...
  stage  Stage @default(GROUP)   // for per-stage credit resets / escalating stakes
  resultOverridden Boolean @default(false)  // admin set the result manually; cron won't clobber
}

enum Stage { GROUP  R16  QF  SF  FINAL }

model Pick {
  // ...existing...
  predHome  Int?    // predicted home goals (EXACT_SCORE mode)
  predAway  Int?    // predicted away goals (EXACT_SCORE mode)
  // settlement audit (written by the settlement engine, read by leaderboard):
  awardedPoints Float @default(0) @db.Real
}

// User: role + ban fields are added by the better-auth admin plugin migration, NOT hand-written.
// (`role String?`, `banned Boolean?`, `banReason String?`, `banExpires DateTime?`; `Session.impersonatedBy String?`)
```

Migration notes:
- `Config` is a singleton; seed one row with `id = 1` and the current defaults. All reads go through `getConfig()` (cached per request).
- The admin-plugin user/session columns come from `npx @better-auth/cli generate` (or `prisma db push`) after the plugin is enabled — don't write them by hand.
- Backfill `Match.stage` from a static fixture map (or default everything to `GROUP` and let admin edit).
- **Unit normalization:** stop storing points as `×100`. Settlement writes real credit/point values; remove the two `/100` display sites (`leaderboard-client.tsx:53`, `user-picks-overview.tsx:36`). Odds stay `×100` on `Match` (that's the upstream format) but are converted to decimal inside the settlement engine.

### 1.2 Config accessor (`lib/config.ts` → DB-backed)

Replace the hardcoded exports with a cached loader:

```ts
export async function getConfig(): Promise<Config>   // cached via React cache()
export function decimalOdds(matchOddsInt: number): number  // /100 helper
```

Keep `disabledToday(date, lockLeadHours)` but drive the lead time from config. Replace `disablePrePicks()` with a check against `config.prePicksLockAt`.

### 1.3 Settlement engine (`modules/api/scoring/`)

Introduce a single dispatcher that replaces the bare SQL in `updatePlayerPoints.ts`:

```ts
// modules/api/scoring/settle.ts
export async function settleAll(): Promise<void> {
  const cfg = await getConfig();
  switch (cfg.scoringMode) {
    case "FIXED_ODDS":      return settleFixedOdds(cfg);
    case "COMPRESSED_ODDS": return settleCompressed(cfg);
    case "PARI_MUTUEL":     return settlePariMutuel(cfg);
    case "EXACT_SCORE":     return settleExactScore(cfg);
  }
}
```

Every settler is **idempotent and full-recompute** (like today): it recomputes `Pick.awardedPoints` for all finished matches, then `User.points = Σ awardedPoints` (+ winner/top-scorer bonus, §5). This makes mode switching safe — flip the mode, re-run `settleAll()`, and the whole board recomputes consistently.

---

## 2. Pari-mutuel mode (`settlePariMutuel`)

**Model.** All stakes on a match form one pot. The winning side splits the entire pot proportional to stake. Crowd sets the odds; zero house edge (unless `rakePercent > 0`). Reuses the existing `betAmount` / credits schema unchanged.

**Per finished match:**
```
pool        = Σ betAmount over all picks on the match
winningPool = Σ betAmount over picks where pickedResult == result
payoutPool  = pool * (1 - rakePercent/100)

for each pick on the match:
  if winningPool == 0:                       # nobody correct → refund stakes
      awardedPoints = betAmount
  elif pick.pickedResult == result:
      awardedPoints = betAmount * payoutPool / winningPool
  else:
      awardedPoints = 0
```

`User.points = Σ awardedPoints` over settled matches. Spendable budget stays fixed: `remainingCredits = startingCredits − Σ betAmount` (open + settled), so winnings are **not** re-stakeable → no compounding/runaway.

**Worked example (50 players, ~1500 staked on a match):** Home 900 / Draw 450 / Away 150.
- Away wins → the Away backers split 1500 → **10×** their stake.
- Home wins → Home backers split 1500 → **~1.67×**.
Self-balancing: piling onto the favorite shrinks its payout; correct contrarians are rewarded by the crowd's money.

**SQL shape** (settler can be a single CTE):
```sql
WITH pools AS (
  SELECT m.id AS "matchId", m.result,
         SUM(p."betAmount") AS pool,
         SUM(p."betAmount") FILTER (WHERE p."pickedResult" = m.result) AS "winningPool"
  FROM "Match" m JOIN "Pick" p ON p."matchId" = m.id
  WHERE m.result IS NOT NULL AND m.result <> 'NO_RESULT'
  GROUP BY m.id, m.result
)
UPDATE "Pick" p SET "awardedPoints" =
  CASE
    WHEN po."winningPool" IS NULL OR po."winningPool" = 0 THEN p."betAmount"
    WHEN p."pickedResult" = po.result THEN p."betAmount" * po.pool * (1 - :rake/100.0) / po."winningPool"
    ELSE 0
  END
FROM pools po WHERE p."matchId" = po."matchId";
-- then: UPDATE "User" SET points = (SELECT COALESCE(SUM("awardedPoints"),0) FROM "Pick" WHERE "userId" = "User".id);
```

**Live projected odds.** Because true odds aren't known until lock, add `GET /api/match/[id]/pool` returning current `pool`, per-outcome totals, and implied `pool/outcomeTotal` multipliers. The bet UI shows "current payout if this wins" live, updating as people bet. Final odds = pool at lock time.

**UI changes (`match-card.tsx`):** replace the static Veikkaus odds line under each button with the live projected multiplier from the pool endpoint; keep the bet-amount input and credit accounting as-is.

---

## 3. Exact-score mode (`settleExactScore`)

**Recommendation (closest to your 3/1 ask, and fairest): 3 / 2 / 1 tiered** — the standard Kicktipp/Toto rule. Pure 3/1 punishes a near-miss (predicted 2–1, actual 3–1) the same as a totally wrong call; adding a goal-difference tier rewards getting *close* and meaningfully separates skill. All three values are admin-editable, so you can set `goalDiffPoints = 0` to collapse it to pure 3/1 if you prefer.

**Per finished match** (`homeGoals`, `awayGoals` known; pick has `predHome`, `predAway`):
```
exact      = predHome == homeGoals && predAway == awayGoals
goalDiff   = (predHome - predAway) == (homeGoals - awayGoals)   # incl. correct-draw margin
tendency   = sign(predHome - predAway) == sign(homeGoals - awayGoals)  # who wins / draw

awardedPoints = exact   ? cfg.exactScorePoints     # 3
              : goalDiff ? cfg.goalDiffPoints       # 2  (right margin, wrong score)
              : tendency ? cfg.tendencyPoints       # 1  (right outcome only)
              : 0
```
`User.points = Σ awardedPoints`. No betting in this mode — bounded points per match means **no runaway is possible**; everyone stays in contention to the final whistle.

**UI changes:** in exact-score mode the match card shows two small number steppers (Home goals / Away goals) instead of the bet input + outcome buttons. The outcome (1/X/2) is derived from the predicted score for display. `/api/pick` accepts `{ predHome, predAway }` and ignores `betAmount`. Lock timing unchanged.

---

## 4. Admin panel

**Build the admin layer on the better-auth [admin plugin](https://www.better-auth.com/docs/plugins/admin)** — don't hand-roll roles. It owns the `role`/`banned` fields, role-based permissions, and gives user-management (list/ban/impersonate/set-role) for free.

### 4.0 Better-auth admin plugin setup
- **Server** (`auth.ts`): add `plugins: [admin({ defaultRole: "user", adminUserIds: [<your userId>] })]`. `adminUserIds` bootstraps you as admin without a manual DB edit (alternatively `adminRoles`/`setRole`).
- **Client** (`lib/auth-client.ts`): add `plugins: [adminClient()]` → unlocks `authClient.admin.listUsers / setRole / banUser / impersonateUser / …` for the user-management UI.
- **Migration:** run `npx @better-auth/cli generate` (then `prisma db push`) to add the plugin's columns (§1.1).
- **Guard:** in the `app/(protected)/admin/` layout and every `/api/admin/*` route, check the session role server-side — `auth.api.userHasPermission({ headers, body: { permission: {...} } })` or simply `session.user.role !== "admin" → redirect/403`. (App-config knobs like scoring mode are gated by this role; they are not better-auth permissions themselves.)
- **Optional:** define an `ac` access-control instance (`createAccessControl`) if you later want finer permissions (e.g. a "settler" role that can recompute but not change config).

### 4.1 Admin API (`app/api/admin/...`, all role-guarded)
- `GET/PUT /api/admin/config` — read/write the `Config` singleton (Zod-validated).
- `POST /api/admin/recompute` — run `settleAll()` and `revalidatePath('/leaderboard')`.
- `POST /api/admin/match/[id]/result` — manually set `result`/`homeGoals`/`awayGoals`, set `resultOverridden = true` (cron then skips it).
- `POST /api/admin/credits/reset` — per-stage credit reset (see §6).
- `POST /api/admin/run-cron` — manually fire odds/results/settlement jobs.
- **Data/seeding** (see §6.5): `POST /api/admin/seed/teams`, `POST /api/admin/seed/matches`, `POST /api/admin/seed/odds` (`?kind=match|team|player`); `POST/PUT/DELETE /api/admin/teams/[id]`, `/api/admin/players/[id]`, `/api/admin/matches/[id]`; `PUT /api/admin/team-map` (Veikkaus↔football-data name map); `PUT /api/admin/tournament` (active-tournament config); `POST /api/admin/actuals` (set actual winner/top-scorer for §5 bonus).

### 4.2 Admin UI controls (config-as-easy-knobs — your "other admin options")
| Control | Field | Why |
|---|---|---|
| **Scoring mode** | `scoringMode` dropdown | Switch the whole pool's calculation; triggers recompute |
| **Starting credits** | `startingCredits` | Tune budget without redeploy |
| **Max bet / match** | `maxBetAmount` | Tune variance cap |
| **Lock lead time** | `lockLeadHours` | How long before kickoff bets freeze |
| **Pre-picks lock** | `prePicksLockAt` | Winner/top-scorer deadline (date picker) |
| **Pari-mutuel rake** | `rakePercent` | House take (default 0 = fully fair) |
| **Point values** | `exactScorePoints`/`goalDiffPoints`/`tendencyPoints` | Tune exact-score scoring |
| **Maintenance mode** | `maintenanceMode` | Show a banner / block writes during edits |
| **Recompute now** | button → `/api/admin/recompute` | Re-settle after any change |
| **Override match result** | per-match form | Fix wrong/missing API results |
| **Reset stage credits** | button + stage select | Anti-runaway reset |
| **Trigger cron** | button → `/api/admin/run-cron` | Manual odds/results refresh |
| **Rotate cron secret** | `cronSecret` | Security (see §6.1) |
| **Manage users** | admin-plugin `listUsers`/`setRole`/`banUser`/`impersonateUser` | Free via the plugin — promote admins, ban cheaters, impersonate to debug |
| **Seed teams** | button → `/api/admin/seed/teams` | Import the tournament's teams from football-data |
| **Seed matches** | button → `/api/admin/seed/matches` | Import the fixture list (needs teams first) |
| **Refresh odds** | buttons → `/api/admin/seed/odds?kind=…` | Pull match / team-winner / top-scorer odds from Veikkaus |
| **Edit team / player / match** | per-row CRUD forms | Fix name mismatches, missing crests, wrong kickoff/stage by hand |
| **Team-name map** | `/api/admin/team-map` editor | Map Veikkaus names ↔ football-data names so odds sync stops silently dropping teams |
| **Tournament setup** | `/api/admin/tournament` | Switch competition (Euro→World Cup), Veikkaus event names, season start — no redeploy (§6.5) |
| **Set actual winner / top-scorer** | `/api/admin/actuals` | Resolves the §5 odds-weighted bonus |
| **Data health panel** | read-only dashboard | Last cron run, # matches missing odds/result, # unmapped teams, # users with no picks |

---

## 5. Winner / Top-scorer scoring (currently unscored — decision needed)

Today `User.teamId` / `playerId` picks are stored and odds displayed, but **not** added to `points`. **Decision: odds-weighted bonus** (rewards bold long-shot calls in every mode).

At settlement, if the actual winner / top-scorer is known (admin-set), award:
```
winnerBonus    = correctWinner    ? log2(decimalOdds(Team.winningOdds)) * cfg.winnerBonusFactor    : 0
topScorerBonus = correctTopScorer ? log2(decimalOdds(Player.odds))      * cfg.topScorerBonusFactor : 0
```
`log2` compression keeps a 15.0-odds winner pick from dwarfing the match scoring (15.0 → 3.9× the factor, not 15×). Both factors are admin-editable. `User.points` includes these bonuses on top of `Σ Pick.awardedPoints`.

Schema additions: `Config.winnerBonusFactor` / `Config.topScorerBonusFactor` (default e.g. 10); admin-set `Config.actualWinnerTeamId` / `Config.actualTopScorerId`. The bonus is recomputed in `settleAll()` alongside the per-match settlers, so it stays consistent across mode switches.

---

## 6. Other project improvements

### 6.1 Security — **`/api/cron` is open to the world** (high priority)
Anyone can hit `/api/cron` and trigger settlement/odds jobs. Add a `CRON_SECRET` check (`Authorization: Bearer …`, which Vercel Cron sends), or check `Config.cronSecret`. Reject otherwise. Also rate-limit `/api/pick`, `/api/comments`.

### 6.2 Fairness mechanics (layer on any mode)
- **Per-stage credit resets** (`Match.stage` + `POST /api/admin/credits/reset`): fresh budget per knockout round so a hot start can't snowball. Biggest single fairness win.
- **Escalating max bet** by stage (50 → 100 → 200) for a real late-tournament comeback path.

### 6.3 Code-quality fixes found during exploration
- `updateResults.ts` uses `json.matches.forEach(async …)` — async callbacks aren't awaited, the `success` flag races, and errors are swallowed. Rewrite as `for…of` with awaited bodies. **`updateTeamOdds.ts` and `updatePlayerOdds.ts` still have this exact bug** (`updateMatchOdds.ts` was already fixed) — apply the same `for…of` rewrite.
- `insertTeams.ts` uses `createMany` with no `skipDuplicates` — re-running it throws on the `Team.name` unique constraint. Switch to per-team `upsert` (and update crest) so seeding is idempotent and re-runnable from the admin panel.
- `/api/pick` casts `result as any` — validate against the `Result` enum with Zod.
- `/api/pick` create-path returns an optimistic `remainingCredits` instead of re-reading the view (minor drift risk under concurrent bets).
- Unit scaling (`×100` / `/100`) is implicit and duplicated — centralize in the config/settlement layer (§1.1).
- Settlement should respect `Match.resultOverridden` so admin fixes aren't clobbered by the next cron run.

### 6.4 Nice-to-haves
- Daily leaderboard snapshot table for "biggest movers" / history graph.
- Unit tests for each settler (pure functions over fixtures) — the scoring math is the part most worth testing.
- `maintenanceMode` banner wired to `Config`.

### 6.5 Admin data management & tournament setup

**The single biggest reusability problem:** the whole data pipeline is hardcoded to Euro 2024. To run the next tournament today you'd have to edit code — `competition = "EC"`, `euro2024Variables`/`euro2024startDate`, the Veikkaus event names (`"Euro 2024 - Mestari"`, `"Euro 2024 - Paras maalintekijä"`), and the `VeikkausFDEuroTeamMap` translation table. Move all of it behind admin config so a new cup is a form, not a deploy.

#### Active-tournament config
Add a `Tournament` model (or a `tournament` block on `Config`) holding everything currently hardcoded:
```prisma
model Tournament {
  id              Int      @id @default(autoincrement())
  name            String                    // "World Cup 2026"
  fdCompetition   String                    // football-data code, e.g. "EC" / "WC"
  startDate       DateTime
  veikkausWinnerEvent    String             // "Euro 2024 - Mestari"
  veikkausScorerEvent    String             // "Euro 2024 - Paras maalintekijä"
  isActive        Boolean  @default(false)   // one active at a time
}
```
`updateResults` / `insertTeams` read `fdCompetition`; the odds jobs read the Veikkaus event names. `lib/config.ts`'s `euro2024*` constants are deleted. This also makes the GraphQL `events` query parameters config-driven.

#### Team-name mapping as data
`VeikkausFDEuroTeamMap` (Veikkaus name → football-data name) is a hardcoded object in `utils/adapterUtils.ts`. When a name doesn't match, the odds job silently drops that team. Move it to a `TeamNameAlias` table (`{ veikkausName, teamId }`) editable in the admin panel, and have the odds jobs **log/surface unmapped names** instead of dropping them silently (feeds the §4.2 data-health panel).

#### Seeding actions (admin buttons, idempotent)
- **Seed teams** → `insertTeams` (now upsert, §6.3). Then admin can fix crests/names by hand.
- **Seed matches** → run the fixture import. Currently matches are created lazily as a side effect of `updateResults`; split out an explicit `insertMatches` (look up teams by name, set `startTime` + `stage`) so the fixture list exists before odds/picks open. Surface teams it couldn't resolve.
- **Refresh odds** → match / team-winner / top-scorer jobs, individually triggerable.
- Each action returns a summary (`inserted`, `updated`, `skipped`, `unmapped[]`) shown as a toast + in the health panel — no more reading server logs.

#### Manual CRUD fallback
APIs + simple forms to add/edit/delete a **team** (name, crest), **player** (name, odds), and **match** (home, away, kickoff, stage), plus the match-result override from §4.1. This is the escape hatch for when the upstream APIs are missing data, names mismatch, or a fixture changes — so the tournament never blocks on a code change.

---

## 7. Multi-agent execution plan

**Phase 0 — Foundation (serial; single agent; everything depends on it).**
Schema migration (`Config`, `Role`, `Stage`, `Pick.predHome/predAway/awardedPoints`, `Match.stage/resultOverridden`), `getConfig()` accessor, seed admin + config row, and the `settleAll()` dispatcher skeleton with the four settler stubs + the unit normalization. Establishes the shared contract (config shape, settler signature, points unit) all later agents code against. **Gate: merge before Phase 1 fans out.**

**Phase 1 — Parallel workstreams (independent files, one agent each):**
- **A. Pari-mutuel** — `settlePariMutuel`, pool endpoint `/api/match/[id]/pool`, live-odds in `match-card.tsx`. (worktree)
- **B. Exact-score** — `settleExactScore`, `/api/pick` scoreline handling, score-stepper UI in `match-card.tsx`. (worktree)
- **C. Admin panel** — enable the better-auth admin plugin (server + client + `cli generate`), `app/(protected)/admin/`, all `/api/admin/*` routes, role guard, config form, user-management UI. (worktree)
- **D. Security & cron** — `CRON_SECRET` guard on `/api/cron`, `settleAll()` wired into cron, `resultOverridden` respect, rate-limiting. (worktree)
- **E. Code-quality** — `updateTeamOdds`/`updatePlayerOdds`/`updateResults` async fixes, `insertTeams` upsert, Zod enum validation, pick create-path fix. (worktree)
- **F. Data management & tournament config (§6.5)** — `Tournament` + `TeamNameAlias` models, de-hardcode `lib/config.ts`/`adapterUtils.ts`/odds jobs, `insertMatches` split-out, seeding + CRUD `/api/admin/*` routes, data-health panel. Depends on C's admin shell — land C's role guard + layout first, then F's pages plug in. (worktree)

> A and B both edit `match-card.tsx`; isolate in worktrees and reconcile in Phase 2 (the card branches on `config.scoringMode`, so the two edits are additive).

**Phase 2 — Integration & verification (serial):**
- Merge worktrees; reconcile `match-card.tsx` into one mode-switching component.
- Fairness layer: `Match.stage` backfill, stage-reset endpoint, escalating max bet.
- Winner/top-scorer bonus (§5).
- Settler unit tests over fixtures; manual `verify` of each mode end-to-end (place picks → set results via admin → recompute → check leaderboard).

**Phase 3 — Adversarial review:** review each settler for idempotency, the `winningPool == 0` refund path, rake math, mode-switch recompute correctness, and the admin role guard / cron-secret for auth bypass.

Suggested ordering: Phase 0 → fan out A–E → Phase 2 → Phase 3. A, B, C are the largest; D and E are quick wins that can land first.
