import { z } from "zod";

export const ConfigUpdateSchema = z.object({
  scoringMode: z.enum(["FIXED_ODDS", "COMPRESSED_ODDS", "PARI_MUTUEL", "EXACT_SCORE"]).optional(),
  startingCredits: z.number().positive().optional(),
  maxBetAmount: z.number().positive().optional(),
  lockLeadHours: z.number().int().min(0).optional(),
  prePicksLockAt: z.string().datetime().nullable().optional(),
  rakePercent: z.number().min(0).max(100).optional(),
  exactScorePoints: z.number().int().min(0).optional(),
  goalDiffPoints: z.number().int().min(0).optional(),
  tendencyPoints: z.number().int().min(0).optional(),
  maintenanceMode: z.boolean().optional(),
  cronSecret: z.string().nullable().optional(),
  winnerBonusFactor: z.number().min(0).optional(),
  topScorerBonusFactor: z.number().min(0).optional(),
  actualWinnerTeamId: z.number().int().nullable().optional(),
  actualTopScorerId: z.number().int().nullable().optional(),
});

export const MatchResultSchema = z.object({
  result: z.enum(["HOME_TEAM", "AWAY_TEAM", "DRAW", "NO_RESULT"]),
  homeGoals: z.number().int().min(0).nullable().optional(),
  awayGoals: z.number().int().min(0).nullable().optional(),
});

export const StageResetSchema = z.object({
  stage: z.enum(["GROUP", "R16", "QF", "SF", "FINAL"]),
});
