# Implementation Plan — Data Sources & Tournament Config

This is a step-by-step plan for an implementing agent. The betting/scoring/admin system is **already built** (see "What already exists" below — do NOT rebuild it). The remaining work is fixing the **data ingestion layer**: the Veikkaus odds source uses a dead endpoint, there is no ESPN source, and the `Tournament` schema doesn't match the live APIs.

Stack: Next.js 15 (App Router), Prisma 6, better-auth, TypeScript. Package manager: `pnpm`. Path alias: `@/` → repo root.

---

## What already exists (DONE — do not touch unless a task says so)

- **Schema** (`prisma/schema.prisma`): `Config`, `Tournament`, `TeamNameAlias`, `Pick.predHome/predAway/awardedPoints`, `Match.stage/resultOverridden`, `User.role`, `ScoringMode`/`Stage` enums.
- **Scoring engine** (`modules/api/scoring/`): `settle.ts` (dispatcher), `settleFixedOdds`, `settleCompressedOdds`, `settlePariMutuel`, `settleExactScore`, `updateUserPoints.ts` (`syncUserPointsFromPicks`, incl. odds-weighted winner/top-scorer bonus). **Correct — leave as is.**
- **Cron** (`app/api/cron/route.ts`): Bearer-secret auth, calls `settleAll()`. Done.
- **Admin** (`app/api/admin/**`, `app/(protected)/admin/`, `components/admin/admin-client.tsx`, `lib/admin.ts` `requireAdmin()`): all routes exist. Done.
- **Config/tournament accessors** (`lib/config.ts` `getConfig`/`decimalOdds`/`maxBetForStage`, `lib/tournament.ts` `getActiveTournament`/`veikkausVariables`/`mapFdStageToStage`, `lib/team-map.ts`, `lib/seed-result.ts`).
- **Data jobs**: `insertTeams` (football-data, upsert), `insertMatches` (football-data), `updateResults` (football-data, respects `resultOverridden`). All return `SeedResult` and use `getActiveTournament()`.
- **UI**: `match-card.tsx` handles all 4 scoring modes (pari-mutuel live pool via SWR, exact-score steppers, compressed odds). `app/api/match/[id]/pool/route.ts` exists.

---

## The gaps (what this plan fixes)

1. **Veikkaus odds modules call a DEAD endpoint.** `modules/api/odds/{updateMatchOdds,updateTeamOdds,updatePlayerOdds}.ts` use `veikkausGraphQlEndpoint` (`v3.middle.prod.gcp.veikkaus.fi/midas/graphql`) via `graphql-request`. That host is dead. The live API is a REST content-service (Task 3).
2. **No ESPN source.** The cleanest free fixtures+results source (no API key, no name-mapping) is not wired up (Task 2).
3. **`Tournament` schema mismatches the live APIs**: it has `veikkausCtids` (a dead-GraphQL variable) and lacks `fixtureSource`, `espnLeagueSlug`, `veikkausDrilldownTagId` (Task 1).
4. **Defaults are Euro 2024**, should be World Cup 2026 (Task 1).

**Priority:** Because the project is moving to **pari-mutuel scoring, bookmaker odds are not needed.** So **Task 2 (ESPN) is the critical path** — it makes the app fully functional with one free, keyless source. **Task 3 (Veikkaus) is OPTIONAL** (only needed if `FIXED_ODDS`/`COMPRESSED_ODDS` modes will be used). Do tasks in order; you may stop after Task 2 + Task 5 for a pari-mutuel launch.

---

## Verified API reference (probed live, June 2026 — use these exact paths)

### ESPN hidden API (free, no key) — fixtures + results + logos
```
GET https://site.api.espn.com/apis/site/v2/sports/soccer/{slug}/scoreboard?dates=YYYYMMDD
    {slug} = "fifa.world" for the World Cup.   Single day per call; loop across the tournament window.
```
Response (`application/json`):
```jsonc
{
  "events": [
    {
      "id": "...",                       // numeric string → use parseInt as Match.id
      "date": "2026-06-11T19:00Z",       // ISO kickoff
      "status": { "type": { "completed": false, "name": "STATUS_SCHEDULED" } },
      "competitions": [
        { "competitors": [
            { "homeAway": "home", "score": "0",
              "team": { "displayName": "Mexico", "abbreviation": "MEX",
                        "logo": "https://a.espncdn.com/i/teamlogos/countries/500/mex.png" } },
            { "homeAway": "away", "score": "0", "team": { "displayName": "South Africa", ... } }
        ] }
      ]
    }
  ]
}
```
- Result: `status.type.completed === true` → compare `home.score` vs `away.score` (strings → Number) → `HOME_TEAM`/`AWAY_TEAM`/`DRAW`.
- English names align with football-data, so **no team-name map needed** when ESPN is the source.
- Caveat: undocumented/unofficial. Keep football-data as fallback (`fixtureSource = FOOTBALL_DATA`).

### Veikkaus content-service (REST, replaces dead GraphQL) — odds only
```
GET https://content.ob.veikkaus.fi/content-service/api/v1/q/event-list
    ?drilldownTagIds={tagId}            // 2086 = World Cup 2026 → Tournament.veikkausDrilldownTagId
    &eventSortsIncluded=MTCH,TNMT       // MTCH=matches, TNMT=outrights (winner/top-scorer)
    &includeChildMarkets=true&lang=fi-FI&channel=
```
Response: `json.data.events[]` (NOT the old `sports[0].tournaments[0].events`).
- **Match events** (have `teams.length === 2`): `teams[]` → `{ side: "HOME"|"AWAY", name }` (Finnish names); `startTime`; `markets[]` where `name === "Voittaja (1X2)"` → `outcomes[]` → `{ name (team name or "Tasapeli"), prices: [{ decimal }] }`. Store odds as `Math.round(decimal * 100)`.
- **Outright events**: `name === tournament.veikkausWinnerEvent` → outcomes are teams (winner odds); `name === tournament.veikkausScorerEvent` → outcomes are players (top-scorer odds).
- Finnish names → still need `TeamNameAlias` map for this source only.

---

## Task 1 — Align the `Tournament` schema with the live APIs

**Files:** `prisma/schema.prisma`, `lib/tournament.ts`.

1. In `prisma/schema.prisma`, replace the `Tournament` model with:
```prisma
model Tournament {
  id                     Int           @id @default(autoincrement())
  name                   String
  startDate              DateTime
  fixtureSource          FixtureSource @default(ESPN)
  espnLeagueSlug         String?       // "fifa.world"
  fdCompetition          String?       // "WC" / "EC"
  veikkausDrilldownTagId Int?          // 2086 (odds only)
  veikkausWinnerEvent    String?
  veikkausScorerEvent    String?
  isActive               Boolean       @default(false)
}

enum FixtureSource {
  ESPN
  FOOTBALL_DATA
  VEIKKAUS
}
```
   (Removes `veikkausCtids`, makes provider ids nullable, adds `fixtureSource`/`espnLeagueSlug`.)

2. Run the migration:
```bash
pnpm exec prisma format
pnpm exec prisma validate
pnpm exec prisma db push
pnpm exec prisma generate
```

3. In `lib/tournament.ts`:
   - Update `DEFAULT_TOURNAMENT` to World Cup 2026:
```ts
const DEFAULT_TOURNAMENT = {
  name: "World Cup 2026",
  startDate: new Date("2026-06-11T19:00:00Z"),
  fixtureSource: "ESPN" as const,
  espnLeagueSlug: "fifa.world",
  fdCompetition: "WC",
  veikkausDrilldownTagId: 2086,
  veikkausWinnerEvent: "World Cup - Group Winner & Tournament Winner",
  veikkausScorerEvent: "World Cup - Golden Boot - Top Goalscorer",
  isActive: true,
};
```
   - Replace `veikkausVariables(tournament)` (which used `veikkausCtids`) so it builds the REST query string from `veikkausDrilldownTagId` (see Task 3); if you are skipping Task 3, leave a stub that throws `"Veikkaus odds source not configured"`.

**Acceptance:** `pnpm exec prisma validate` passes; `pnpm exec tsc --noEmit` has no errors referencing `veikkausCtids`.

---

## Task 2 — ESPN fixture/result provider (CRITICAL PATH)

**Goal:** When `tournament.fixtureSource === "ESPN"`, seed teams, seed matches, and fetch results from ESPN — no token, no name map.

**New file:** `modules/api/espn/espn.ts`
```ts
import prisma from "@/lib/prisma";
import { getActiveTournament } from "@/lib/tournament";
import { emptySeedResult, type SeedResult } from "@/lib/seed-result";
import type { Result } from "@prisma/client";
import { addDays, format } from "date-fns";

const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

type EspnCompetitor = {
  homeAway: "home" | "away";
  score: string;
  team: { displayName: string; abbreviation?: string; logo?: string };
};
type EspnEvent = {
  id: string;
  date: string;
  status: { type: { completed: boolean; name: string } };
  competitions: { competitors: EspnCompetitor[] }[];
};

// Fetch every match across the tournament window (single-day calls, ~40 days).
async function fetchEspnEvents(slug: string, start: Date, days = 45): Promise<EspnEvent[]> {
  const all: EspnEvent[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < days; i++) {
    const d = format(addDays(start, i), "yyyyMMdd");
    const res = await fetch(`${BASE}/${slug}/scoreboard?dates=${d}`);
    if (!res.ok) continue;
    const json = await res.json();
    for (const ev of (json.events ?? []) as EspnEvent[]) {
      if (!seen.has(ev.id)) { seen.add(ev.id); all.push(ev); }
    }
  }
  return all;
}

function sides(ev: EspnEvent) {
  const comp = ev.competitions[0]?.competitors ?? [];
  return {
    home: comp.find((c) => c.homeAway === "home"),
    away: comp.find((c) => c.homeAway === "away"),
  };
}

export async function espnSeedTeams(): Promise<SeedResult> {
  const result = emptySeedResult();
  try {
    const t = await getActiveTournament();
    if (!t.espnLeagueSlug) throw new Error("espnLeagueSlug not set");
    const events = await fetchEspnEvents(t.espnLeagueSlug, t.startDate);
    const teams = new Map<string, string>(); // name -> logo
    for (const ev of events) {
      const { home, away } = sides(ev);
      for (const c of [home, away]) {
        if (c?.team?.displayName) teams.set(c.team.displayName, c.team.logo ?? "");
      }
    }
    for (const [name, crest] of teams) {
      const existing = await prisma.team.findUnique({ where: { name } });
      await prisma.team.upsert({
        where: { name },
        update: { crest },
        create: { name, crest },
      });
      existing ? result.updated++ : result.inserted++;
    }
    return result;
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : "espnSeedTeams failed");
    return result;
  }
}

export async function espnInsertMatches(): Promise<SeedResult> {
  const result = emptySeedResult();
  try {
    const t = await getActiveTournament();
    if (!t.espnLeagueSlug) throw new Error("espnLeagueSlug not set");
    const events = await fetchEspnEvents(t.espnLeagueSlug, t.startDate);
    for (const ev of events) {
      try {
        const { home, away } = sides(ev);
        if (!home?.team?.displayName || !away?.team?.displayName) { result.skipped++; continue; }
        const homeTeam = await prisma.team.findUnique({ where: { name: home.team.displayName } });
        const awayTeam = await prisma.team.findUnique({ where: { name: away.team.displayName } });
        if (!homeTeam) { result.unmapped.push(home.team.displayName); continue; }
        if (!awayTeam) { result.unmapped.push(away.team.displayName); continue; }
        const id = parseInt(ev.id, 10);
        const existing = await prisma.match.findUnique({ where: { id } });
        await prisma.match.upsert({
          where: { id },
          update: { startTime: new Date(ev.date) },
          create: { id, startTime: new Date(ev.date), homeId: homeTeam.id, awayId: awayTeam.id },
        });
        existing ? result.updated++ : result.inserted++;
      } catch (e) {
        result.errors.push(`ESPN ${ev.id}: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }
    return result;
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : "espnInsertMatches failed");
    return result;
  }
}

export async function espnFetchResults(): Promise<SeedResult> {
  const result = emptySeedResult();
  try {
    const t = await getActiveTournament();
    if (!t.espnLeagueSlug) throw new Error("espnLeagueSlug not set");
    const events = await fetchEspnEvents(t.espnLeagueSlug, t.startDate);
    for (const ev of events) {
      try {
        if (!ev.status?.type?.completed) { result.skipped++; continue; }
        const id = parseInt(ev.id, 10);
        const existing = await prisma.match.findUnique({
          where: { id }, select: { resultOverridden: true },
        });
        if (existing?.resultOverridden) { result.skipped++; continue; }
        const { home, away } = sides(ev);
        if (!home || !away) { result.skipped++; continue; }
        const hg = Number(home.score), ag = Number(away.score);
        const res: Result = hg > ag ? "HOME_TEAM" : hg < ag ? "AWAY_TEAM" : "DRAW";
        await prisma.match.update({
          where: { id },
          data: { homeGoals: hg, awayGoals: ag, result: res },
        });
        result.updated++;
      } catch (e) {
        result.errors.push(`ESPN ${ev.id}: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }
    return result;
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : "espnFetchResults failed");
    return result;
  }
}
```

**Wire the provider switch.** Create `modules/api/insert/seedMatches.ts` and `modules/api/results/fetchResults.ts` as thin dispatchers (or inline the switch in the routes):
```ts
// modules/api/insert/seedMatches.ts
import { getActiveTournament } from "@/lib/tournament";
import { insertMatches } from "./insertMatches";          // football-data
import { espnInsertMatches } from "../espn/espn";
import type { SeedResult } from "@/lib/seed-result";
export async function seedMatches(): Promise<SeedResult> {
  const t = await getActiveTournament();
  return t.fixtureSource === "ESPN" ? espnInsertMatches() : insertMatches();
}
```
```ts
// modules/api/insert/seedTeams.ts  — same pattern over insertTeams / espnSeedTeams
// modules/api/results/fetchResults.ts — same pattern over updateResults / espnFetchResults
```

**Update callers:**
- `app/api/admin/seed/matches/route.ts` → call `seedMatches()` instead of `insertMatches()`.
- `app/api/admin/seed/teams/route.ts` → call `seedTeams()`.
- `app/api/cron/route.ts` → in the post-lock branch, replace `updateResults()` with `fetchResults()`. Keep `updateMatchOdds()` only inside an `if (t.fixtureSource === "VEIKKAUS")` guard (or remove — see Task 4).

**Stage derivation (best-effort):** ESPN scoreboard doesn't cleanly expose group/knockout. Default `Match.stage` stays `GROUP`; admin sets knockout stages via the existing admin match editor. Note this in a code comment. (Do NOT block on perfect stage data.)

**Acceptance:**
- `pnpm exec tsc --noEmit` clean.
- Standalone parse check (no DB needed):
```bash
curl -s 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611' \
  | npx --yes node-jq '.events[0] | {id, date, completed: .status.type.completed, home: (.competitions[0].competitors[]|select(.homeAway=="home")|.team.displayName)}'
```
  Should print an `id`, ISO `date`, and a team name.
- After `seedTeams()` + `seedMatches()` against a live DB: `SELECT count(*) FROM "Team"`, `"Match"` are non-zero; matches have valid `homeId`/`awayId`/`startTime`.

---

## Task 3 — Veikkaus content-service REST migration (OPTIONAL — odds only)

Skip if launching with pari-mutuel and not using odds. Do this only to restore `FIXED_ODDS`/`COMPRESSED_ODDS` displayed odds.

**Files:** `modules/api/odds/{updateMatchOdds,updateTeamOdds,updatePlayerOdds}.ts`, `lib/tournament.ts`, delete `modules/api/odds/queries.ts`, remove `graphql-request` usage.

1. Add a fetch helper in `lib/tournament.ts`:
```ts
export async function fetchVeikkausEvents(tagId: number) {
  const url = `https://content.ob.veikkaus.fi/content-service/api/v1/q/event-list` +
    `?drilldownTagIds=${tagId}&eventSortsIncluded=MTCH,TNMT&includeChildMarkets=true&lang=fi-FI&channel=`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Veikkaus ${res.status}`);
  const json = await res.json();
  return (json.data?.events ?? []) as any[];
}
```
2. Rewrite `updateMatchOdds.ts` to consume `data.events`, filtering match events (`teams.length === 2`), reading the `"Voittaja (1X2)"` market, matching outcome `name` to the team name (Finnish → via `getTeamNameMap()`) or `"Tasapeli"` for draw, and storing `Math.round(price.decimal * 100)` into `homeWinOdds`/`drawOdds`/`awayWinOdds`. Preserve the existing `SeedResult`/`unmapped` behaviour. Match to a DB `Match` by resolved home/away team ids + future `startTime` (same as today).
3. Rewrite `updateTeamOdds.ts` / `updatePlayerOdds.ts` to read the outright event whose `name` equals `tournament.veikkausWinnerEvent` / `veikkausScorerEvent`, iterate `markets[0].outcomes`, and upsert `Team.winningOdds` / `Player.odds` (×100 int). Keep `unmapped` surfacing for teams.
4. Delete `modules/api/odds/queries.ts`; remove the `graphql-request` import and the `veikkausGraphQlEndpoint` constant from `lib/config.ts`. Drop the `graphql-request` dependency from `package.json` if nothing else uses it (`grep -rn "graphql-request" --include=*.ts`).

**Acceptance:** `tsc --noEmit` clean; no remaining import of `graphql-request` or `veikkausGraphQlEndpoint`; live-DB run sets non-null `homeWinOdds` on at least one upcoming match.

---

## Task 4 — Cleanup & dead-code removal

- `lib/config.ts`: remove `veikkausGraphQlEndpoint` and the unused `startDate` constant (confirm no importers: `grep -rn "veikkausGraphQlEndpoint\|from \"@/lib/config\"" --include=*.ts`).
- `modules/api/results/updatePlayerPoints.ts`: it's a `@deprecated` wrapper around `settleAll()`. Replace its callers with `settleAll()` directly, then delete the file. Find callers: `grep -rn "updatePlayerPoints" --include=*.ts`.
- If `fixtureSource` is never `VEIKKAUS` for your tournament and Task 3 is skipped: in `app/api/cron/route.ts` remove the `updateTeamOdds`/`updatePlayerOdds`/`updateMatchOdds` calls (they hit the dead endpoint and will error/no-op). Keep the modules on disk but unreferenced, or delete them + `VeikkausFDEuroTeamMap` in `utils/adapterUtils.ts` + `lib/team-map.ts` if fully going ESPN-only.
- Run `pnpm exec tsc --noEmit` after each deletion.

---

## Task 5 — End-to-end verification (do this regardless of which tasks you completed)

Set env: `DATABASE_URL`, `DIRECT_URL`, `CRON_SECRET`, `FD_API_TOKEN` (only if using football-data source), `BETTER_AUTH_SECRET`.

1. **Migrate & generate:** `pnpm exec prisma db push && pnpm exec prisma generate`.
2. **Build:** `pnpm build` must succeed.
3. **Seed (admin or scripts):** seed teams → seed matches. Confirm `Team`/`Match` populated.
4. **Scoring-mode matrix.** For each mode, set `Config.scoringMode`, create picks, set a few match results (admin "override result"), POST `/api/admin/recompute`, and check the leaderboard:
   - `PARI_MUTUEL`: on a match, verify the winning side's `awardedPoints` sums to `pool` (× `(1 - rake/100)`), and a match with zero correct picks refunds stakes (`awardedPoints == betAmount`).
   - `EXACT_SCORE`: exact score → `exactScorePoints` (3); right margin/wrong score → `goalDiffPoints` (2); right outcome only → `tendencyPoints` (1); else 0.
   - `FIXED_ODDS` / `COMPRESSED_ODDS`: payouts match `betAmount × decimalOdds` and `betAmount × log2(decimalOdds)` respectively.
   - Winner/top-scorer bonus: set `Config.actualWinnerTeamId`/`actualTopScorerId`, recompute, confirm `log2(decimalOdds) × factor` is added to the right users (`updateUserPoints.ts`).
5. **Mode-switch idempotency:** switch mode, recompute twice, confirm `User.points` is identical on the second run (settlers are full-recompute).
6. **Cron auth:** `GET /api/cron` with no header → 401; with `Authorization: Bearer $CRON_SECRET` → 200.
7. **Pool endpoint:** `GET /api/match/<id>/pool` returns `{ pool, multipliers }` for a match with bets.

**Definition of done:** `pnpm build` green, `tsc --noEmit` clean, the scoring matrix in step 4 passes for the mode you intend to launch (at minimum `PARI_MUTUEL`), and ESPN seeding (Task 2) populates teams + matches.

---

## Order of execution
1. **Task 1** (schema) — unblocks everything; run the migration.
2. **Task 2** (ESPN) — critical path for a working pari-mutuel app.
3. **Task 5** (verify) — you can launch pari-mutuel after this.
4. **Task 3** (Veikkaus REST) — only if you need displayed odds.
5. **Task 4** (cleanup) — after the sources you keep are settled.

Commit after each task. Keep each task's diff focused. If `pnpm exec tsc --noEmit` or `pnpm build` fails, fix before moving on.
