import prisma from "@/lib/prisma";
import { getConfig, maxBetForStage } from "@/lib/config";
import { getSession } from "@/lib/session";
import MatchesClient from "@/components/matches/matches-client";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const session = await getSession();
  const userId = session!.user.id;
  const cfg = await getConfig();

  const [userRecord, matches, pickDist] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { remainingCredits: true, hasPaid: true },
    }),
    prisma.match.findMany({
      include: {
        away: true,
        home: true,
        Pick: { where: { userId } },
        _count: {
          select: { Comment: true },
        },
      },
      orderBy: { startTime: "asc" },
    }),
    // Crowd pick distribution per match (revealed in the UI only after lock).
    prisma.pick.groupBy({
      by: ["matchId", "pickedResult"],
      _count: { _all: true },
    }),
  ]);

  const distByMatch = new Map<number, { HOME_TEAM: number; DRAW: number; AWAY_TEAM: number }>();
  for (const row of pickDist) {
    if (!row.pickedResult || row.pickedResult === "NO_RESULT") continue;
    const cur = distByMatch.get(row.matchId) ?? { HOME_TEAM: 0, DRAW: 0, AWAY_TEAM: 0 };
    cur[row.pickedResult as "HOME_TEAM" | "DRAW" | "AWAY_TEAM"] = row._count._all;
    distByMatch.set(row.matchId, cur);
  }

  const matchesWithMaxBet = matches.map((m) => ({
    ...m,
    maxBet: maxBetForStage(m.stage, cfg.maxBetAmount),
    pickDist: distByMatch.get(m.id) ?? { HOME_TEAM: 0, DRAW: 0, AWAY_TEAM: 0 },
  }));

  return (
    <MatchesClient
      matches={matchesWithMaxBet}
      initialCredits={userRecord?.remainingCredits ?? 0}
      backgroundUrl="https://storage.googleapis.com/em-kisa-2024-bucket/background_6.jpg"
      scoringMode={cfg.scoringMode}
      lockLeadHours={cfg.lockLeadHours}
      scoringParams={{
        contrarianFactor: cfg.contrarianFactor,
        exactScorePoints: cfg.exactScorePoints,
        goalDiffPoints: cfg.goalDiffPoints,
        tendencyPoints: cfg.tendencyPoints,
        maxBetAmount: cfg.maxBetAmount,
        startingCredits: cfg.startingCredits,
      }}
      mobilepayNumber={cfg.mobilepayNumber ?? null}
      hasPaid={userRecord?.hasPaid ?? false}
    />
  );
}
