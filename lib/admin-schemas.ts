import { z } from "zod";

export const TournamentSchema = z.object({
  name: z.string().min(1),
  fdCompetition: z.string().min(1),
  veikkausCtids: z.string().min(1),
  startDate: z.string().datetime(),
  veikkausWinnerEvent: z.string().min(1),
  veikkausScorerEvent: z.string().min(1),
  isActive: z.boolean().optional(),
});

export const TeamMapEntrySchema = z.object({
  veikkausName: z.string().min(1),
  teamId: z.number().int(),
});

export const TeamMapUpdateSchema = z.object({
  aliases: z.array(TeamMapEntrySchema),
});

export const ActualsSchema = z.object({
  actualWinnerTeamId: z.number().int().nullable().optional(),
  actualTopScorerId: z.number().int().nullable().optional(),
});

export const TeamCreateSchema = z.object({
  name: z.string().min(1),
  crest: z.string().url().or(z.string().min(1)),
});

export const TeamUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  crest: z.string().optional(),
  winningOdds: z.number().int().min(0).optional(),
});

export const PlayerCreateSchema = z.object({
  name: z.string().min(1),
  odds: z.number().int().min(0).default(0),
});

export const PlayerUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  odds: z.number().int().min(0).optional(),
});

export const MatchCreateSchema = z.object({
  homeId: z.number().int(),
  awayId: z.number().int(),
  startTime: z.string().datetime(),
  stage: z.enum(["GROUP", "R16", "QF", "SF", "FINAL"]).default("GROUP"),
});

export const MatchUpdateSchema = z.object({
  homeId: z.number().int().optional(),
  awayId: z.number().int().optional(),
  startTime: z.string().datetime().optional(),
  stage: z.enum(["GROUP", "R16", "QF", "SF", "FINAL"]).optional(),
  homeWinOdds: z.number().int().min(0).optional(),
  drawOdds: z.number().int().min(0).optional(),
  awayWinOdds: z.number().int().min(0).optional(),
});
