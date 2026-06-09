import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { seedMatches } from "@/modules/api/insert/seedMatches";

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;
  const result = await seedMatches();
  return NextResponse.json(result);
}
