/*
  Warnings:

  - A unique constraint covering the columns `[userId,matchId]` on the table `Pick` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Pick_userId_matchId_key" ON "Pick"("userId", "matchId");
