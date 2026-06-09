-- Tournament config and team name aliases (§6.5)
CREATE TABLE IF NOT EXISTS "Tournament" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "fdCompetition" TEXT NOT NULL,
    "veikkausCtids" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "veikkausWinnerEvent" TEXT NOT NULL,
    "veikkausScorerEvent" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TeamNameAlias" (
    "id" SERIAL NOT NULL,
    "veikkausName" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    CONSTRAINT "TeamNameAlias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TeamNameAlias_veikkausName_key" ON "TeamNameAlias"("veikkausName");

ALTER TABLE "TeamNameAlias" DROP CONSTRAINT IF EXISTS "TeamNameAlias_teamId_fkey";
ALTER TABLE "TeamNameAlias" ADD CONSTRAINT "TeamNameAlias_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Config" ADD COLUMN IF NOT EXISTS "lastCronRunAt" TIMESTAMP(3);

-- Seed default Euro 2024 tournament if none exists
INSERT INTO "Tournament" ("name", "fdCompetition", "veikkausCtids", "startDate", "veikkausWinnerEvent", "veikkausScorerEvent", "isActive")
SELECT 'Euro 2024', 'EC', '1-15-149', '2024-06-14 19:00:00', 'Euro 2024 - Mestari', 'Euro 2024 - Paras maalintekijä', true
WHERE NOT EXISTS (SELECT 1 FROM "Tournament");
