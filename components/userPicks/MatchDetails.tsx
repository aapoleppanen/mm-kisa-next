import { Box, Divider, Grid } from "@mui/material";
import ItemPick from "./ItemPick";
import { UserPicks } from "@/pages/leaderboard";
import { Match, Result } from "@prisma/client";
import { disabledToday } from "@/lib/config";

/**
 *
    setPotentialWin(
      (Number(betAmount) *
        match[
          currentPick == Result.HOME_TEAM
            ? "homeWinOdds"
            : currentPick == Result.DRAW
            ? "drawOdds"
            : "awayWinOdds"
        ]) /
        100
    );

    for reference
 */

const getPotentialWin = (
  betAmount: number,
  pickedResult: Result | null,
  match: Match
) => {
  return (
    (betAmount *
      match[
        pickedResult === Result.HOME_TEAM
          ? "homeWinOdds"
          : pickedResult === Result.DRAW
          ? "drawOdds"
          : "awayWinOdds"
      ]) /
    100
  );
};

const MatchDetails = ({ picks }: { picks: UserPicks }) => (
  <Box>
    <Box textAlign="center" fontWeight="bold" p={1}>
      Matches:
    </Box>
    <Grid container rowGap={1}>
      {picks.picks.map((p) => (
        <Grid container rowGap={1} key={p.id}>
          <Grid item md={8} xs={12}>
            <ItemPick key={p.id} p={p} />
          </Grid>
          <Grid
            item
            md={4}
            xs={12}
            display="flex"
            alignItems={"center"}
            justifyContent={{
              xs: "center",
              md: "flex-end",
            }}
            fontSize="small"
          >
            Bet: {p.betAmount}
            <Box
              color={p.pickedResult === p.match.result ? "green" : "gray"}
              pl={1}
            >
              {!disabledToday(p.match.startTime) && !p.match.result && (
                <>
                  Potential win:{" "}
                  {getPotentialWin(p.betAmount, p.pickedResult, p.match)}{" "}
                </>
              )}

              {p.pickedResult === p.match.result && (
                <Box color="green">
                  Win: {getPotentialWin(p.betAmount, p.pickedResult, p.match)}
                </Box>
              )}
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Divider />
          </Grid>
        </Grid>
      ))}
    </Grid>
  </Box>
);

export default MatchDetails;
