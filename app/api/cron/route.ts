import { getConfig } from "@/lib/config";
import prisma from "@/lib/prisma";
import { fetchResults } from "@/modules/api/results/fetchResults";
import { settleAll } from "@/modules/api/scoring/settle";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function verifyCronAuth(request: Request): Promise<boolean> {
  const cfg = await getConfig();
  const secret = cfg.cronSecret ?? process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

// Pull finished-match scores and recompute points. Idempotent (full recompute),
// so it's safe to run on a frequent schedule. Odds are NOT touched here — refresh
// tournament-winner / top-scorer odds manually from the admin panel when needed.
export async function GET(request: Request) {
  if (!(await verifyCronAuth(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await fetchResults();
  await settleAll();
  await prisma.config.update({
    where: { id: 1 },
    data: { lastCronRunAt: new Date() },
  });
  revalidatePath("/leaderboard");

  return Response.json({ results, settled: true });
}
