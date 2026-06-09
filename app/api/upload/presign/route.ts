import { auth } from "@/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUploadUrl } from "@/lib/r2";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const PresignSchema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.string().refine((t) => ALLOWED_TYPES.includes(t), {
    message: "Only JPEG, PNG, WebP, and GIF are allowed",
  }),
  size: z.number().max(MAX_SIZE_BYTES),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = PresignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { filename, contentType } = parsed.data;
  const ext = filename.split(".").pop() ?? "jpg";
  const key = `avatars/${session.user.id}-${Date.now()}.${ext}`;

  const uploadUrl = await getUploadUrl(key, contentType);

  return NextResponse.json({ uploadUrl, key });
}
