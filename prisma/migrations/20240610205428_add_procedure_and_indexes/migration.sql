-- AlterTable
ALTER TABLE "User" ADD COLUMN     "remainingCredits" REAL NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Pick_userId_matchId_idx" ON "Pick"("userId", "matchId");

-- CreateIndex
CREATE INDEX "User_id_idx" ON "User"("id");

-- Create function
CREATE OR REPLACE FUNCTION update_user_credits() RETURNS TRIGGER AS $user_credits$
BEGIN
  UPDATE
    "User"
  SET
    "remainingCredits" = "credits" - COALESCE(
      (
        SELECT
          SUM("betAmount")
        FROM
          "Pick"
        WHERE
          NEW."userId" = "User".id
      ),
      0
    )
  WHERE
    "User".id = NEW."userId";
  RETURN NEW;
END
$user_credits$ LANGUAGE plpgsql;

-- Create Trigger
DROP TRIGGER IF EXISTS after_pick_insert_or_update ON "Pick";
CREATE TRIGGER after_pick_insert_or_update
AFTER INSERT OR UPDATE ON "Pick"
FOR EACH ROW
EXECUTE FUNCTION update_user_credits();
