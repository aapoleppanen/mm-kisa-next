import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { emailEnabled, sendEmail } from "@/lib/email";

const TestEmailSchema = z.object({
  // Defaults to the admin's own address when omitted.
  to: z.string().email().optional(),
});

// Fire a one-off email so admins can confirm Resend (key + verified domain) works
// before relying on it for the picks-lock reminders.
export async function POST(request: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  if (!emailEnabled) {
    return NextResponse.json(
      { error: "Email not configured — set RESEND_API_KEY (and RESEND_FROM)." },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = TestEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const to = parsed.data.to ?? session.user.email;
  if (!to) {
    return NextResponse.json({ error: "No recipient address" }, { status: 400 });
  }

  const ok = await sendEmail({
    to,
    subject: "✅ MM-Kisa test email",
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 8px">✅ Email is working</h2>
        <p style="color:#475569;margin:0">
          If you're reading this, Resend is configured correctly and the
          picks-lock reminders are good to go.
        </p>
      </div>`,
  });

  if (!ok) {
    return NextResponse.json(
      { error: "Send failed — check the server logs and your Resend setup." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, to });
}
