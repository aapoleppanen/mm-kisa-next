import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { updateMatchOdds } from "@/modules/api/odds/updateMatchOdds";
import { updatePlayerOdds } from "@/modules/api/odds/updatePlayerOdds";
import { updateTeamOdds } from "@/modules/api/odds/updateTeamOdds";

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const kind = request.nextUrl.searchParams.get("kind") ?? "all";

  if (kind === "match") return NextResponse.json(await updateMatchOdds());
  if (kind === "team") return NextResponse.json(await updateTeamOdds());
  if (kind === "player") return NextResponse.json(await updatePlayerOdds());

  const [team, player, match] = await Promise.all([
    updateTeamOdds(),
    updatePlayerOdds(),
    updateMatchOdds(),
  ]);
  return NextResponse.json({ team, player, match });
}
