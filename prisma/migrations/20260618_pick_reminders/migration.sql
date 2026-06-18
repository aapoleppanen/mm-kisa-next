-- Opt-out for "picks lock soon" reminder emails
ALTER TABLE "User" ADD COLUMN "notifyReminders" BOOLEAN NOT NULL DEFAULT true;

-- Dedup table so the cron never reminds the same player about the same match twice
CREATE TABLE "PickReminder" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PickReminder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PickReminder_userId_matchId_key" ON "PickReminder"("userId", "matchId");
CREATE INDEX "PickReminder_matchId_idx" ON "PickReminder"("matchId");

ALTER TABLE "PickReminder" ADD CONSTRAINT "PickReminder_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PickReminder" ADD CONSTRAINT "PickReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
