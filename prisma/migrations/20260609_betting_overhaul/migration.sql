-- Betting & scoring overhaul migration

-- Enums
CREATE TYPE "ScoringMode" AS ENUM ('FIXED_ODDS', 'COMPRESSED_ODDS', 'PARI_MUTUEL', 'EXACT_SCORE');
CREATE TYPE "Stage" AS ENUM ('GROUP', 'R16', 'QF', 'SF', 'FINAL');

-- Config singleton
CREATE TABLE "Config" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "scoringMode" "ScoringMode" NOT NULL DEFAULT 'FIXED_ODDS',
  "startingCredits" REAL NOT NULL DEFAULT 500,
  "maxBetAmount" REAL NOT NULL DEFAULT 50,
  "lockLeadHours" INTEGER NOT NULL DEFAULT 1,
  "prePicksLockAt" TIMESTAMP(3),
  "rakePercent" REAL NOT NULL DEFAULT 0,
  "exactScorePoints" INTEGER NOT NULL DEFAULT 3,
  "goalDiffPoints" INTEGER NOT NULL DEFAULT 2,
  "tendencyPoints" INTEGER NOT NULL DEFAULT 1,
  "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
  "cronSecret" TEXT,
  "winnerBonusFactor" REAL NOT NULL DEFAULT 10,
  "topScorerBonusFactor" REAL NOT NULL DEFAULT 10,
  "actualWinnerTeamId" INTEGER,
  "actualTopScorerId" INTEGER,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Config" ("id") VALUES (1) ON CONFLICT DO NOTHING;

-- Match extensions
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "stage" "Stage" NOT NULL DEFAULT 'GROUP';
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "resultOverridden" BOOLEAN NOT NULL DEFAULT false;

-- Pick extensions
ALTER TABLE "Pick" ADD COLUMN IF NOT EXISTS "predHome" INTEGER;
ALTER TABLE "Pick" ADD COLUMN IF NOT EXISTS "predAway" INTEGER;
ALTER TABLE "Pick" ADD COLUMN IF NOT EXISTS "awardedPoints" REAL NOT NULL DEFAULT 0;

-- better-auth admin plugin columns
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banned" BOOLEAN;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banReason" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banExpires" TIMESTAMP(3);
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "impersonatedBy" TEXT;

-- Normalize existing points from ×100 storage to real values
UPDATE "User" SET "points" = "points" / 100 WHERE "points" > 0;
