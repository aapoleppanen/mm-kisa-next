import { Resend } from "resend";

// Resend is optional: without a key (e.g. local dev or before setup) email
// sending is a no-op rather than a crash.
const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

// Must be a verified domain/sender in your Resend account.
const FROM = process.env.RESEND_FROM ?? "MM-Kisa <noreply@em-kisa.app>";

export const emailEnabled = Boolean(resend);

type EmailInput = { to: string; subject: string; html: string };

/** Send one email. Returns false (and logs) when Resend isn't configured or the send fails. */
export async function sendEmail({ to, subject, html }: EmailInput): Promise<boolean> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping send to", to);
    return false;
  }
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error("[email] send failed:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] send threw:", err);
    return false;
  }
}
