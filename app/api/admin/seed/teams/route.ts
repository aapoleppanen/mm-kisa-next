import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { seedTeams } from "@/modules/api/insert/seedTeams";

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;
  const result = await seedTeams();
  return NextResponse.json(result);
}
