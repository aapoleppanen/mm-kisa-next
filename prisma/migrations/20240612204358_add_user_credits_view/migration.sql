CREATE OR REPLACE VIEW "UserCreditsView" AS
SELECT
  "User".id AS "userId",
  "User"."remainingCredits" AS "oldRemainingCredits",
  "User".credits - COALESCE(
    (
      SELECT
        SUM("Pick"."betAmount")
      FROM
        "Pick"
      WHERE
        "Pick"."userId" = "User".id
    ),
    0
  ) AS "remainingCredits"
FROM
  "User";
