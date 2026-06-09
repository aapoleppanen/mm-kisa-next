import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { insertTeams } from "@/modules/api/insert/insertTeams";

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;
  const result = await insertTeams();
  return NextResponse.json(result);
}
