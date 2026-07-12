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

async function fetchEspnEvents(slug: string, start: Date, days = 45): Promise<EspnEvent[]> {
  const all: EspnEvent[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < days; i++) {
    const d = format(addDays(start, i), "yyyyMMdd");
    const res = await fetch(`${BASE}/${slug}/scoreboard?dates=${d}`);
    if (!res.ok) continue;
    const json = await res.json();
    for (const ev of (json.events ?? []) as EspnEvent[]) {
      if (!seen.has(ev.id)) {
        seen.add(ev.id);
        all.push(ev);
      }
    }
  }
  return all;
}

/** The set of canonical match ids (parseInt of ESPN event ids) for the active tournament. */
export async function fetchEspnEventIds(): Promise<Set<number>> {
  const t = await getActiveTournament();
  if (!t.espnLeagueSlug) return new Set();
  const events = await fetchEspnEvents(t.espnLeagueSlug, t.startDate);
  return new Set(events.map((e) => parseInt(e.id, 10)).filter((n) => !Number.isNaN(n)));
}

function sides(ev: EspnEvent) {
  const comp = ev.competitions[0]?.competitors ?? [];
  return {
    home: comp.find((c) => c.homeAway === "home"),
    away: comp.find((c) => c.homeAway === "away"),
  };
}

/** Create/refresh the Team row for an ESPN competitor and return its id (or null). */
async function upsertEspnTeam(c: EspnCompetitor | undefined): Promise<number | null> {
  const name = c?.team?.displayName;
  if (!name) return null;
  const team = await prisma.team.upsert({
    where: { name },
    update: { crest: c.team.logo ?? "" },
    create: { name, crest: c.team.logo ?? "" },
  });
  return team.id;
}

export async function espnSeedTeams(): Promise<SeedResult> {
  const result = emptySeedResult();
  try {
    const t = await getActiveTournament();
    if (!t.espnLeagueSlug) throw new Error("espnLeagueSlug not set");
    const events = await fetchEspnEvents(t.espnLeagueSlug, t.startDate);
    const teams = new Map<string, string>();
    for (const ev of events) {
      const { home, away } = sides(ev);
      for (const c of [home, away]) {
        if (c?.team?.displayName) teams.set(c.team.displayName, c.team.logo ?? "");
      }
    }
    for (const [name, crest] of Array.from(teams.entries())) {
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
        if (!home?.team?.displayName || !away?.team?.displayName) {
          result.skipped++;
          continue;
        }
        const homeId = await upsertEspnTeam(home);
        const awayId = await upsertEspnTeam(away);
        if (!homeId || !awayId) {
          result.skipped++;
          continue;
        }
        const id = parseInt(ev.id, 10);
        // ESPN scoreboard doesn't expose group/knockout stage — admin sets stages manually.
        // Re-point homeId/awayId on update too, so a re-seed swaps knockout placeholders
        // ("Quarterfinal 1 Winner") for the real competitors once the bracket resolves.
        const existing = await prisma.match.findUnique({ where: { id } });
        await prisma.match.upsert({
          where: { id },
          update: { startTime: new Date(ev.date), source: "ESPN", homeId, awayId },
          create: { id, startTime: new Date(ev.date), homeId, awayId, source: "ESPN" },
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
        const id = parseInt(ev.id, 10);
        const existing = await prisma.match.findUnique({
          where: { id },
          select: { resultOverridden: true, homeId: true, awayId: true },
        });
        // Only touch matches we already track; creation is espnInsertMatches' job.
        if (!existing) {
          result.skipped++;
          continue;
        }
        const { home, away } = sides(ev);

        // Re-point to the real teams as soon as ESPN knows them. Knockout matches
        // are seeded with placeholders ("Quarterfinal 1 Winner"); once the bracket
        // resolves, ESPN serves the actual competitors on the same event id, so
        // this replaces the placeholders (and refreshes crests) even before kickoff.
        const homeId = await upsertEspnTeam(home);
        const awayId = await upsertEspnTeam(away);
        if (
          (homeId && homeId !== existing.homeId) ||
          (awayId && awayId !== existing.awayId)
        ) {
          await prisma.match.update({
            where: { id },
            data: {
              ...(homeId ? { homeId } : {}),
              ...(awayId ? { awayId } : {}),
            },
          });
        }

        // Scores only settle once the match is complete and an admin hasn't
        // manually overridden the result.
        if (!ev.status?.type?.completed || existing.resultOverridden) {
          result.skipped++;
          continue;
        }
        if (!home || !away) {
          result.skipped++;
          continue;
        }
        const hg = Number(home.score);
        const ag = Number(away.score);
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
