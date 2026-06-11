"use client";

import { useEffect, useState } from "react";
import type { Config, FixtureSource, Match, Player, Result, Stage, Team, Tournament } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

type MatchWithTeams = Match & { home: Team; away: Team };
type TeamAlias = { id: number; veikkausName: string; teamId: number; team: { id: number; name: string } };
type HealthData = {
  lastCronRunAt: string | null;
  matchesMissingOdds: number;
  matchesMissingResult: number;
  usersWithNoPicks: number;
  teamNameAliases: number;
  teams: number;
  matches: number;
  unmappedTeamsRisk: boolean;
};
type SeedResult = { inserted: number; updated: number; skipped: number; unmapped: string[]; errors: string[] };

export default function AdminClient({
  teams,
  players,
  matches,
}: {
  teams: Team[];
  players: Player[];
  matches: MatchWithTeams[];
}) {
  const [config, setConfig] = useState<Config | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [aliases, setAliases] = useState<TeamAlias[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; role?: string; hasPaid?: boolean }>>([]);
  const [loading, setLoading] = useState(false);
  const [matchResults, setMatchResults] = useState<Record<number, { result: Result; homeGoals: string; awayGoals: string }>>({});
  const [newAlias, setNewAlias] = useState({ veikkausName: "", teamId: "" });

  const loadHealth = () =>
    fetch("/api/admin/health").then((r) => r.json()).then(setHealth).catch(() => {});

  const loadUsers = () =>
    fetch("/api/admin/users").then((r) => r.json()).then(setUsers).catch(() => {});

  useEffect(() => {
    fetch("/api/admin/config").then((r) => r.json()).then(setConfig);
    fetch("/api/admin/tournament").then((r) => r.json()).then((d) => setTournament(d.active));
    fetch("/api/admin/team-map").then((r) => r.json()).then(setAliases).catch(() => {});
    loadHealth();
    loadUsers();
  }, []);

  const saveConfig = async () => {
    if (!config) return;
    setLoading(true);
    const res = await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...config,
        prePicksLockAt: config.prePicksLockAt
          ? new Date(config.prePicksLockAt).toISOString()
          : null,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setConfig(await res.json());
      toast.success("Config saved");
    } else {
      toast.error("Failed to save config");
    }
  };

  const saveTournament = async () => {
    if (!tournament) return;
    setLoading(true);
    const res = await fetch("/api/admin/tournament", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...tournament,
        startDate: new Date(tournament.startDate).toISOString(),
      }),
    });
    setLoading(false);
    if (res.ok) {
      setTournament(await res.json());
      toast.success("Tournament saved");
    } else {
      toast.error("Failed to save tournament");
    }
  };

  const saveActuals = async () => {
    if (!config) return;
    setLoading(true);
    const res = await fetch("/api/admin/actuals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actualWinnerTeamId: config.actualWinnerTeamId,
        actualTopScorerId: config.actualTopScorerId,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setConfig(await res.json());
      toast.success("Actuals set and recomputed");
    } else {
      toast.error("Failed to set actuals");
    }
  };

  const formatSeedResult = (r: SeedResult) =>
    `+${r.inserted} / ~${r.updated} / skip ${r.skipped}` +
    (r.unmapped.length ? ` · unmapped: ${r.unmapped.slice(0, 3).join(", ")}${r.unmapped.length > 3 ? "…" : ""}` : "") +
    (r.errors.length ? ` · errors: ${r.errors.length}` : "");

  const runAction = async (url: string, body?: object, label = "Done") => {
    setLoading(true);
    const res = await fetch(url, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && "inserted" in data) {
        toast.success(`${label}: ${formatSeedResult(data as SeedResult)}`);
      } else if (data && "team" in data) {
        const { team, player, match } = data as { team: SeedResult; player: SeedResult; match: SeedResult };
        toast.success(`Odds: teams ${formatSeedResult(team)}, players ${formatSeedResult(player)}, matches ${formatSeedResult(match)}`);
      } else {
        toast.success(label);
      }
      loadHealth();
    } else {
      toast.error("Action failed");
    }
  };

  const addAlias = async () => {
    if (!newAlias.veikkausName || !newAlias.teamId) return;
    setLoading(true);
    const res = await fetch("/api/admin/team-map", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aliases: [{ veikkausName: newAlias.veikkausName, teamId: Number(newAlias.teamId) }],
      }),
    });
    setLoading(false);
    if (res.ok) {
      setAliases(await res.json());
      setNewAlias({ veikkausName: "", teamId: "" });
      toast.success("Alias added");
    } else {
      toast.error("Failed to add alias");
    }
  };

  const setUserRole = async (userId: string, role: "user" | "admin") => {
    await authClient.admin.setRole({ userId, role });
    toast.success("Role updated");
    loadUsers();
  };

  const deleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("User deleted");
      loadUsers();
    } else {
      toast.error("Failed to delete user");
    }
  };

  const togglePayment = async (userId: string, hasPaid: boolean) => {
    const res = await fetch(`/api/admin/users/${userId}/payment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hasPaid }),
    });
    if (res.ok) {
      toast.success(hasPaid ? "Marked as paid" : "Marked as unpaid");
      loadUsers();
    } else {
      toast.error("Failed to update payment status");
    }
  };

  if (!config || !tournament) return <p className="p-8 text-center">Loading admin…</p>;

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-6 pb-24">
      <h1 className="text-2xl font-bold">Admin Panel</h1>

      {health && (
        <section className="space-y-2 border rounded-lg p-3 bg-muted/30 text-sm">
          <h2 className="font-semibold">Data health</h2>
          <div className="grid gap-1 sm:grid-cols-2">
            <span>Last cron: {health.lastCronRunAt ? new Date(health.lastCronRunAt).toLocaleString() : "never"}</span>
            <span>Matches missing odds: {health.matchesMissingOdds}</span>
            <span>Matches missing result: {health.matchesMissingResult}</span>
            <span>Users with no picks: {health.usersWithNoPicks}</span>
            <span>Team aliases: {health.teamNameAliases} / {health.teams} teams</span>
            {health.unmappedTeamsRisk && (
              <span className="text-amber-600">Some teams may lack Veikkaus name mappings</span>
            )}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold text-lg">Tournament setup</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Name
            <Input value={tournament.name} onChange={(e) => setTournament({ ...tournament, name: e.target.value })} />
          </label>
          <label className="text-sm">
            Fixture source
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={tournament.fixtureSource}
              onChange={(e) => setTournament({ ...tournament, fixtureSource: e.target.value as FixtureSource })}
            >
              <option value="ESPN">ESPN</option>
              <option value="FOOTBALL_DATA">Football-data</option>
              <option value="VEIKKAUS">Veikkaus</option>
            </select>
          </label>
          <label className="text-sm">
            ESPN league slug
            <Input value={tournament.espnLeagueSlug ?? ""} onChange={(e) => setTournament({ ...tournament, espnLeagueSlug: e.target.value || null })} />
          </label>
          <label className="text-sm">
            FD competition code
            <Input value={tournament.fdCompetition ?? ""} onChange={(e) => setTournament({ ...tournament, fdCompetition: e.target.value || null })} />
          </label>
          <label className="text-sm">
            Veikkaus drilldown tag ID
            <Input
              type="number"
              value={tournament.veikkausDrilldownTagId ?? ""}
              onChange={(e) => setTournament({ ...tournament, veikkausDrilldownTagId: e.target.value ? Number(e.target.value) : null })}
            />
          </label>
          <label className="text-sm">
            Start date
            <Input
              type="datetime-local"
              value={new Date(tournament.startDate).toISOString().slice(0, 16)}
              onChange={(e) => setTournament({ ...tournament, startDate: new Date(e.target.value) })}
            />
          </label>
          <label className="text-sm">
            Veikkaus winner event
            <Input value={tournament.veikkausWinnerEvent ?? ""} onChange={(e) => setTournament({ ...tournament, veikkausWinnerEvent: e.target.value || null })} />
          </label>
          <label className="text-sm">
            Veikkaus scorer event
            <Input value={tournament.veikkausScorerEvent ?? ""} onChange={(e) => setTournament({ ...tournament, veikkausScorerEvent: e.target.value || null })} />
          </label>
        </div>
        <Button onClick={saveTournament} disabled={loading}>Save tournament</Button>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="font-semibold text-lg">Data seeding</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={loading} onClick={() => runAction("/api/admin/seed/teams", undefined, "Teams seeded")}>
            Seed teams
          </Button>
          <Button variant="outline" size="sm" disabled={loading} onClick={() => runAction("/api/admin/seed/matches", undefined, "Matches seeded")}>
            Seed matches
          </Button>
          <Button variant="outline" size="sm" disabled={loading} onClick={() => runAction("/api/admin/seed/odds?kind=match", undefined, "Match odds")}>
            Refresh match odds
          </Button>
          <Button variant="outline" size="sm" disabled={loading} onClick={() => runAction("/api/admin/seed/odds?kind=team", undefined, "Team odds")}>
            Refresh team odds
          </Button>
          <Button variant="outline" size="sm" disabled={loading} onClick={() => runAction("/api/admin/seed/odds?kind=player", undefined, "Player odds")}>
            Refresh scorer odds
          </Button>
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="font-semibold text-lg">Team name map (Veikkaus → football-data)</h2>
        <div className="flex flex-wrap gap-2">
          <Input
            className="flex-1 min-w-[120px]"
            placeholder="Veikkaus name"
            value={newAlias.veikkausName}
            onChange={(e) => setNewAlias({ ...newAlias, veikkausName: e.target.value })}
          />
          <select
            className="border rounded-md px-2 py-1.5 text-sm"
            value={newAlias.teamId}
            onChange={(e) => setNewAlias({ ...newAlias, teamId: e.target.value })}
          >
            <option value="">Team…</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={addAlias} disabled={loading}>Add</Button>
        </div>
        <div className="max-h-40 overflow-y-auto text-sm space-y-1">
          {aliases.map((a) => (
            <div key={a.id} className="flex justify-between border rounded px-2 py-1">
              <span>{a.veikkausName}</span>
              <span className="text-muted-foreground">→ {a.team.name}</span>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="font-semibold text-lg">Scoring Config</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Scoring mode
            <select
              className="w-full mt-1 border rounded-md px-2 py-1.5"
              value={config.scoringMode}
              onChange={(e) => setConfig({ ...config, scoringMode: e.target.value as Config["scoringMode"] })}
            >
              <option value="FIXED_ODDS">Fixed odds</option>
              <option value="COMPRESSED_ODDS">Compressed odds (log2)</option>
              <option value="PARI_MUTUEL">Pari-mutuel</option>
              <option value="EXACT_SCORE">Exact score</option>
              <option value="CONTRARIAN">Contrarian (1 + k·(1−p))</option>
            </select>
          </label>
          <label className="text-sm">
            Starting credits
            <Input type="number" value={config.startingCredits} onChange={(e) => setConfig({ ...config, startingCredits: Number(e.target.value) })} />
          </label>
          <label className="text-sm">
            Max bet (group stage)
            <Input type="number" value={config.maxBetAmount} onChange={(e) => setConfig({ ...config, maxBetAmount: Number(e.target.value) })} />
          </label>
          <label className="text-sm">
            Lock lead (hours)
            <Input type="number" value={config.lockLeadHours} onChange={(e) => setConfig({ ...config, lockLeadHours: Number(e.target.value) })} />
          </label>
          <label className="text-sm">
            Pre-picks lock at
            <Input
              type="datetime-local"
              value={config.prePicksLockAt ? new Date(config.prePicksLockAt).toISOString().slice(0, 16) : ""}
              onChange={(e) => setConfig({ ...config, prePicksLockAt: e.target.value ? new Date(e.target.value) : null })}
            />
          </label>
          <label className="text-sm">
            Pari-mutuel rake %
            <Input type="number" value={config.rakePercent} onChange={(e) => setConfig({ ...config, rakePercent: Number(e.target.value) })} />
          </label>
          <label className="text-sm">
            Exact / goal-diff / tendency pts
            <div className="flex gap-1 mt-1">
              <Input type="number" value={config.exactScorePoints} onChange={(e) => setConfig({ ...config, exactScorePoints: Number(e.target.value) })} />
              <Input type="number" value={config.goalDiffPoints} onChange={(e) => setConfig({ ...config, goalDiffPoints: Number(e.target.value) })} />
              <Input type="number" value={config.tendencyPoints} onChange={(e) => setConfig({ ...config, tendencyPoints: Number(e.target.value) })} />
            </div>
          </label>
          <label className="text-sm">
            Contrarian factor (k)
            <Input type="number" step="0.1" value={config.contrarianFactor} onChange={(e) => setConfig({ ...config, contrarianFactor: Number(e.target.value) })} />
          </label>
          <label className="text-sm">
            Winner / scorer bonus factor
            <div className="flex gap-1 mt-1">
              <Input type="number" value={config.winnerBonusFactor} onChange={(e) => setConfig({ ...config, winnerBonusFactor: Number(e.target.value) })} />
              <Input type="number" value={config.topScorerBonusFactor} onChange={(e) => setConfig({ ...config, topScorerBonusFactor: Number(e.target.value) })} />
            </div>
          </label>
          <label className="text-sm">
            Actual winner team
            <select
              className="w-full mt-1 border rounded-md px-2 py-1.5"
              value={config.actualWinnerTeamId ?? ""}
              onChange={(e) => setConfig({ ...config, actualWinnerTeamId: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">—</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="text-sm">
            Actual top scorer
            <select
              className="w-full mt-1 border rounded-md px-2 py-1.5"
              value={config.actualTopScorerId ?? ""}
              onChange={(e) => setConfig({ ...config, actualTopScorerId: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">—</option>
              {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.maintenanceMode}
              onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
            />
            Maintenance mode
          </label>
          <label className="text-sm">
            Cron secret
            <Input
              type="text"
              placeholder="Rotate cron auth"
              value={config.cronSecret ?? ""}
              onChange={(e) => setConfig({ ...config, cronSecret: e.target.value || null })}
            />
          </label>
          <label className="text-sm">
            MobilePay number (shown on sign-up)
            <Input
              type="text"
              placeholder="e.g. 12345"
              value={config.mobilepayNumber ?? ""}
              onChange={(e) => setConfig({ ...config, mobilepayNumber: e.target.value || null })}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={saveConfig} disabled={loading}>Save config</Button>
          <Button variant="outline" onClick={saveActuals} disabled={loading}>Set actuals & recompute</Button>
          <Button variant="outline" onClick={() => runAction("/api/admin/recompute", undefined, "Recomputed")} disabled={loading}>
            Recompute now
          </Button>
          <Button variant="outline" onClick={() => runAction("/api/admin/run-cron", undefined, "Cron ran")} disabled={loading}>
            Trigger cron
          </Button>
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="font-semibold text-lg">Stage credit reset</h2>
        <div className="flex flex-wrap gap-2">
          {(["GROUP", "R16", "QF", "SF", "FINAL"] as Stage[]).map((stage) => (
            <Button
              key={stage}
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => runAction("/api/admin/credits/reset", { stage }, `Reset ${stage}`)}
            >
              Reset {stage}
            </Button>
          ))}
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="font-semibold text-lg">Override match result</h2>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {matches.map((m) => {
            const state = matchResults[m.id] ?? {
              result: (m.result ?? "NO_RESULT") as Result,
              homeGoals: String(m.homeGoals ?? ""),
              awayGoals: String(m.awayGoals ?? ""),
            };
            return (
              <div key={m.id} className="flex flex-wrap items-center gap-2 text-sm border rounded-lg p-2">
                <span className="flex-1 min-w-[140px]">{m.home.name} vs {m.away.name}</span>
                <select
                  className="border rounded px-1 py-0.5"
                  value={state.result}
                  onChange={(e) => setMatchResults({ ...matchResults, [m.id]: { ...state, result: e.target.value as Result } })}
                >
                  <option value="HOME_TEAM">Home</option>
                  <option value="DRAW">Draw</option>
                  <option value="AWAY_TEAM">Away</option>
                  <option value="NO_RESULT">No result</option>
                </select>
                <Input
                  className="w-14 h-8"
                  type="number"
                  placeholder="H"
                  value={state.homeGoals}
                  onChange={(e) => setMatchResults({ ...matchResults, [m.id]: { ...state, homeGoals: e.target.value } })}
                />
                <Input
                  className="w-14 h-8"
                  type="number"
                  placeholder="A"
                  value={state.awayGoals}
                  onChange={(e) => setMatchResults({ ...matchResults, [m.id]: { ...state, awayGoals: e.target.value } })}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  onClick={() =>
                    runAction(`/api/admin/match/${m.id}/result`, {
                      result: state.result,
                      homeGoals: state.homeGoals ? Number(state.homeGoals) : null,
                      awayGoals: state.awayGoals ? Number(state.awayGoals) : null,
                    }, "Result saved")
                  }
                >
                  Set
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="font-semibold text-lg">Users</h2>
        <p className="text-xs text-muted-foreground">
          {users.filter((u) => u.hasPaid).length} / {users.length} paid
        </p>
        <div className="space-y-1">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between text-sm border rounded-lg p-2 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${u.hasPaid ? "bg-green-500" : "bg-red-400"}`} />
                <span className="truncate">{u.name} <span className="text-muted-foreground">({u.email})</span></span>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  size="sm"
                  variant={u.hasPaid ? "default" : "outline"}
                  className={u.hasPaid ? "bg-green-600 hover:bg-green-700" : ""}
                  onClick={() => togglePayment(u.id, !u.hasPaid)}
                >
                  {u.hasPaid ? "Paid ✓" : "Unpaid"}
                </Button>
                <Button size="sm" variant={u.role === "admin" ? "default" : "outline"} onClick={() => setUserRole(u.id, "admin")}>
                  Admin
                </Button>
                <Button size="sm" variant={u.role === "user" ? "default" : "outline"} onClick={() => setUserRole(u.id, "user")}>
                  User
                </Button>
                <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200" onClick={() => deleteUser(u.id, u.name)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
