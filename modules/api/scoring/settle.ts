import { getConfig } from "@/lib/config";
import { settleCompressedOdds } from "./settleCompressedOdds";
import { settleContrarian } from "./settleContrarian";
import { settleExactScore } from "./settleExactScore";
import { settleFixedOdds } from "./settleFixedOdds";
import { settlePariMutuel } from "./settlePariMutuel";

export async function settleAll(): Promise<void> {
  const cfg = await getConfig();
  switch (cfg.scoringMode) {
    case "FIXED_ODDS":
      return settleFixedOdds(cfg);
    case "COMPRESSED_ODDS":
      return settleCompressedOdds(cfg);
    case "PARI_MUTUEL":
      return settlePariMutuel(cfg);
    case "EXACT_SCORE":
      return settleExactScore(cfg);
    case "CONTRARIAN":
      return settleContrarian(cfg);
  }
}
