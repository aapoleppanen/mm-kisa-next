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
        const homeTeam = await prisma.team.findUnique({ where: { name: home.team.displayName } });
        const awayTeam = await prisma.team.findUnique({ where: { name: away.team.displayName } });
        if (!homeTeam) {
          result.unmapped.push(home.team.displayName);
          continue;
        }
        if (!awayTeam) {
          result.unmapped.push(away.team.displayName);
          continue;
        }
        const id = parseInt(ev.id, 10);
        // ESPN scoreboard doesn't expose group/knockout stage — admin sets stages manually.
        const existing = await prisma.match.findUnique({ where: { id } });
        await prisma.match.upsert({
          where: { id },
          update: { startTime: new Date(ev.date), source: "ESPN" },
          create: { id, startTime: new Date(ev.date), homeId: homeTeam.id, awayId: awayTeam.id, source: "ESPN" },
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
        if (!ev.status?.type?.completed) {
          result.skipped++;
          continue;
        }
        const id = parseInt(ev.id, 10);
        const existing = await prisma.match.findUnique({
          where: { id },
          select: { resultOverridden: true },
        });
        if (existing?.resultOverridden) {
          result.skipped++;
          continue;
        }
        const { home, away } = sides(ev);
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
