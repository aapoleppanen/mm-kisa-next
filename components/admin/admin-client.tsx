"use client";

import { useEffect, useState } from "react";
import type { Config, Match, Player, Result, Stage, Team } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

type MatchWithTeams = Match & { home: Team; away: Team };

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
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; role?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [matchResults, setMatchResults] = useState<Record<number, { result: Result; homeGoals: string; awayGoals: string }>>({});

  useEffect(() => {
    fetch("/api/admin/config").then((r) => r.json()).then(setConfig);
    authClient.admin.listUsers({ query: { limit: 50 } })
      .then((res) => { if (res.data) setUsers(res.data.users); })
      .catch(() => {});
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

  const runAction = async (url: string, body?: object, label = "Done") => {
    setLoading(true);
    const res = await fetch(url, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setLoading(false);
    if (res.ok) toast.success(label);
    else toast.error("Action failed");
  };

  const setUserRole = async (userId: string, role: "user" | "admin") => {
    await authClient.admin.setRole({ userId, role });
    toast.success("Role updated");
    const updated = await authClient.admin.listUsers({ query: { limit: 50 } });
    if (updated.data) setUsers(updated.data.users);
  };

  if (!config) return <p className="p-8 text-center">Loading admin…</p>;

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-6 pb-24">
      <h1 className="text-2xl font-bold">Admin Panel</h1>

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
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={saveConfig} disabled={loading}>Save config</Button>
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
        <div className="space-y-1">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between text-sm border rounded-lg p-2">
              <span>{u.name} ({u.email})</span>
              <div className="flex gap-1">
                <Button size="sm" variant={u.role === "admin" ? "default" : "outline"} onClick={() => setUserRole(u.id, "admin")}>
                  Admin
                </Button>
                <Button size="sm" variant={u.role === "user" ? "default" : "outline"} onClick={() => setUserRole(u.id, "user")}>
                  User
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
