import { headers } from "next/headers";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import MatchesClient from "@/components/matches/matches-client";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session!.user.id;

  const [userCredits, matches] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { remainingCredits: true },
    }),
    prisma.match.findMany({
      include: {
        away: true,
        home: true,
        Pick: { where: { userId } },
      },
      orderBy: { startTime: "asc" },
    }),
  ]);

  return (
    <MatchesClient
      matches={JSON.parse(JSON.stringify(matches))}
      initialCredits={userCredits?.remainingCredits ?? 0}
      backgroundUrl="https://storage.googleapis.com/em-kisa-2024-bucket/background_6.jpg"
    />
  );
}
