import prisma from "@/lib/prisma";
import type { Config } from "@prisma/client";
import { emailEnabled, sendEmail } from "@/lib/email";

// How long before picks LOCK to send the nudge. Picks lock lockLeadHours before
// kickoff, so the reminder goes out (lockLeadHours + 1) hours before kickoff.
const REMINDER_LEAD_HOURS = 1;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://em-kisa.vercel.app";

type Candidate = {
  matchId: number;
  userId: string;
  email: string;
  name: string;
  startTime: Date;
  homeName: string;
  awayName: string;
};

function reminderHtml(c: Candidate): string {
  const kickoff = c.startTime.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Helsinki",
  });
  return `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="margin:0 0 8px">⏰ Picks close soon</h2>
      <p style="color:#475569;margin:0 0 16px">
        You haven't set a prediction for
        <strong>${c.homeName} vs ${c.awayName}</strong> (${kickoff}).
        Picks lock in about an hour — get yours in before it's too late!
      </p>
      <a href="${APP_URL}/matches"
         style="display:inline-block;background:#059669;color:#fff;text-decoration:none;font-weight:700;padding:10px 20px;border-radius:12px">
        Set my pick →
      </a>
      <p style="color:#94a3b8;font-size:12px;margin:24px 0 0">
        Don't want these? Turn off reminders in your profile.
      </p>
    </div>`;
}

/**
 * Email active players who left a soon-to-lock match blank, once per match.
 * Runs in the cron; the PickReminder table guarantees at-most-once per (user, match).
 *
 * "Active player" = anyone who has ever made a pick, with reminders not opted out.
 * No-op when Resend isn't configured.
 *
 * @returns number of reminder emails successfully sent
 */
export async function sendPickReminders(cfg: Config): Promise<number> {
  if (!emailEnabled) return 0;

  const leadHours = cfg.lockLeadHours + REMINDER_LEAD_HOURS;

  // Pairs of (locking-soon match, player who hasn't picked it). The time window
  // is [lockTime - 1h, lockTime); the NOT EXISTS against PickReminder dedups
  // across the multiple cron ticks that window spans.
  const candidates = (await prisma.$queryRaw`
    SELECT m.id AS "matchId", m."startTime",
           u.id AS "userId", u.email, u.name,
           home.name AS "homeName", away.name AS "awayName"
    FROM "Match" m
    JOIN "Team" home ON home.id = m."homeId"
    JOIN "Team" away ON away.id = m."awayId"
    CROSS JOIN "User" u
    WHERE m.result IS NULL
      AND NOW() >= m."startTime" - (${leadHours} * interval '1 hour')
      AND NOW() <  m."startTime" - (${cfg.lockLeadHours} * interval '1 hour')
      AND u."notifyReminders" = true
      AND u.email IS NOT NULL
      AND EXISTS (SELECT 1 FROM "Pick" played WHERE played."userId" = u.id)
      AND NOT EXISTS (SELECT 1 FROM "Pick" p WHERE p."matchId" = m.id AND p."userId" = u.id)
      AND NOT EXISTS (SELECT 1 FROM "PickReminder" r WHERE r."matchId" = m.id AND r."userId" = u.id)
  `) as Candidate[];

  if (candidates.length === 0) return 0;

  const sentPairs: { matchId: number; userId: string }[] = [];
  for (const c of candidates) {
    const ok = await sendEmail({
      to: c.email,
      subject: `⏰ Your pick for ${c.homeName} vs ${c.awayName} closes in an hour`,
      html: reminderHtml(c),
    });
    if (ok) sentPairs.push({ matchId: c.matchId, userId: c.userId });
  }

  if (sentPairs.length > 0) {
    await prisma.pickReminder.createMany({ data: sentPairs, skipDuplicates: true });
  }

  return sentPairs.length;
}
