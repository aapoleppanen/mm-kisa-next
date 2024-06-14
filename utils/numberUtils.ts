import { z } from "zod";

export const roundNumber = (
  num: number | string | undefined,
  decimalPlaces: number = 2
) => {
  console.log(num)
  if (num === undefined || num === null) return 0;

  const parsedNum = typeof num === 'string' ? parseFloat(num) : num;
  const result = z.number().safeParse(parsedNum);

  if (!result.success) return 0;

  return Number(
    result.data.toFixed(decimalPlaces)
  );
};
