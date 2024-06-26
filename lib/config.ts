import { differenceInHours, isBefore } from "date-fns";

export const veikkausGraphQlEndpoint =
  "https://v3.middle.prod.gcp.veikkaus.fi/midas/graphql";

export const startDate = new Date("2022-11-20T15:00:00Z");
// export const startDate = new Date("2022-11-17T15:00:00Z");

export const euro2024startDate = new Date("2024-06-14T19:00:00Z");
export const maxBetAmount = 50;

export const disablePrePicks = () => isBefore(euro2024startDate, new Date());

export const disabledToday = (date: Date) => {
  const today = new Date();
  const diff = differenceInHours(date, today);
  if (diff < 1) return true;
  return false;
};
