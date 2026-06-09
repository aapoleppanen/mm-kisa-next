-- Migration: Switch from next-auth to better-auth schema, add Comment model
-- Run this against your database when deploying

-- 1. Add new columns to User (better-auth requires non-nullable name and emailVerified)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ALTER COLUMN "name" SET DEFAULT '';
UPDATE "User" SET "name" = '' WHERE "name" IS NULL;
ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 2. Migrate Session table to better-auth format
--    Old: sessionToken (unique), userId, expires
--    New: token (unique), userId, expiresAt, ipAddress, userAgent, createdAt, updatedAt
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "token" TEXT;
UPDATE "Session" SET "token" = session_token WHERE "token" IS NULL;
ALTER TABLE "Session" ALTER COLUMN "token" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
UPDATE "Session" SET "expiresAt" = expires WHERE "expiresAt" IS NULL;
ALTER TABLE "Session" ALTER COLUMN "expiresAt" SET NOT NULL;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
-- Rename user_id to userId if needed (prisma maps it)

-- 3. Migrate Account table to better-auth format
--    Old: provider, providerAccountId, access_token, refresh_token, id_token, ...
--    New: providerId, accountId, accessToken, refreshToken, idToken, ...
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "providerId" TEXT;
UPDATE "Account" SET "providerId" = provider WHERE "providerId" IS NULL;
ALTER TABLE "Account" ALTER COLUMN "providerId" SET NOT NULL;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "accountId" TEXT;
UPDATE "Account" SET "accountId" = provider_account_id WHERE "accountId" IS NULL;
ALTER TABLE "Account" ALTER COLUMN "accountId" SET NOT NULL;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "accessToken" TEXT;
UPDATE "Account" SET "accessToken" = access_token WHERE "accessToken" IS NULL;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "refreshToken" TEXT;
UPDATE "Account" SET "refreshToken" = refresh_token WHERE "refreshToken" IS NULL;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "idToken" TEXT;
UPDATE "Account" SET "idToken" = id_token WHERE "idToken" IS NULL;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "accessTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "refreshTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "password" TEXT;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX IF NOT EXISTS "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- 4. Create Verification table (replaces VerificationToken)
CREATE TABLE IF NOT EXISTS "Verification" (
  "id" TEXT NOT NULL,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Verification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Verification_identifier_value_key" UNIQUE ("identifier", "value")
);

-- 5. Create Comment table
CREATE TABLE IF NOT EXISTS "Comment" (
  "id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "matchId" INTEGER NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Comment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Comment_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Note: After running this migration, also run: prisma generate
-- The old columns (session_token, provider, providerAccountId, etc.) can be dropped
-- in a follow-up migration after verifying everything works.
