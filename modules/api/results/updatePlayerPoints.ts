import { settleAll } from "@/modules/api/scoring/settle";

/** @deprecated Use settleAll() directly */
export const updatePlayerPoints = async () => {
  try {
    await settleAll();
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};
