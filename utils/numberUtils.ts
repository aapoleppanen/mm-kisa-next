import { z } from "zod";

export const roundNumber = (
  num: number | string,
  decimalPlaces: number = 2
) => {
  const result = z.number().safeParse(num);

  if (!result.success) return 0;

  return Number(
    result.data.toLocaleString(undefined, {
      maximumFractionDigits: decimalPlaces,
      minimumFractionDigits: decimalPlaces,
    })
  );
};
