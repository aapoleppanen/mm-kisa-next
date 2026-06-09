export type SeedResult = {
  inserted: number;
  updated: number;
  skipped: number;
  unmapped: string[];
  errors: string[];
};

export function emptySeedResult(): SeedResult {
  return { inserted: 0, updated: 0, skipped: 0, unmapped: [], errors: [] };
}
