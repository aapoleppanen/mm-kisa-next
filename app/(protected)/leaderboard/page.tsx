import prisma from "@/lib/prisma";
import { User } from "@prisma/client";
import { getConfig } from "@/lib/config";
import LeaderboardClient from "@/components/leaderboard/leaderboard-client";

export const dynamic = "force-dynamic";

export type LeaderBoardUser = {
  name: User["name"];
  id: User["id"];
  image: User["image"];
  credits: User["credits"];
  points: User["points"];
  remainingcredits: number;
};

export default async function LeaderboardPage() {
  const cfg = await getConfig();
  const users = (await prisma.$queryRaw`
    SELECT
      "User".name as name,
      "User".id AS id,
      "User".image as image,
      "User".credits as credits,
      "User".points as points,
      ucv."remainingCredits" as remainingCredits
    FROM "User"
    LEFT JOIN "UserCreditsView" ucv ON ucv."userId" = "User".id
    ORDER BY points DESC;
  `) as LeaderBoardUser[];

  return <LeaderboardClient users={users} scoringMode={cfg.scoringMode} />;
}
