import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { insertMatches } from "@/modules/api/insert/insertMatches";

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;
  const result = await insertMatches();
  return NextResponse.json(result);
}
