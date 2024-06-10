/*
  Warnings:

  - You are about to drop the `Post` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_authorId_fkey";

-- AlterTable
ALTER TABLE "Pick" ALTER COLUMN "betAmount" SET DEFAULT 0,
ALTER COLUMN "betAmount" SET DATA TYPE REAL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "credits" SET DEFAULT 0,
ALTER COLUMN "credits" SET DATA TYPE REAL,
ALTER COLUMN "points" SET DEFAULT 0,
ALTER COLUMN "points" SET DATA TYPE REAL;

-- DropTable
DROP TABLE "Post";
