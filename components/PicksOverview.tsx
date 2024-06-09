import { Box, Divider, Grid } from "@mui/material";
import { LeaderBoardUser, UserPicks } from "../pages/leaderboard";

const PicksOverview = ({
  picks,
  user,
}: {
  picks: UserPicks;
  user: LeaderBoardUser;
}) => (
  <Box>
    <Grid container>
      <Grid item xs={6} textAlign="center" p={1}>
        <Box fontSize={36} fontWeight={"bold"}>
          {user.remainingcredits}
        </Box>
        <Box>Credits</Box>
      </Grid>
      <Grid item xs={6} textAlign="center" p={1}>
        <Box fontSize={36} fontWeight={"bold"}>
          {user.winnings}
        </Box>
        <Box>Points</Box>
      </Grid>
    </Grid>
    <Grid container>
      <Grid
        item
        xs={12}
        textAlign="center"
        p={1}
        fontWeight={picks.winnerPick?.id === 4 ? "bold" : "unset"}
      >
        Winner: {picks.winnerPick?.name}{" "}
        {picks.winnerPick?.winningOdds && picks.winnerPick.winningOdds / 100}
      </Grid>
      <Grid
        item
        xs={12}
        textAlign="center"
        p={1}
        fontWeight={picks.topScorerPick?.id === 95 ? "bold" : "unset"}
      >
        Top scorer: {picks.topScorerPick?.name}{" "}
        {picks.topScorerPick?.odds && picks.topScorerPick.odds / 100}
      </Grid>
    </Grid>
    <Box textAlign="center" fontWeight="bold" p={1}>
      Matches:
    </Box>
    <Grid container>
      {picks.picks.map((p) => (
        <Grid item xs={12} key={p.id}>
          {/* names */}
          <Box display="flex" alignItems="center">
            <Box
              fontWeight={p.pickedResult === "HOME_TEAM" ? "bold" : "unset"}
              flex={1}
            >
              {p.match.home.name}
            </Box>
            <Box fontWeight={p.pickedResult === "DRAW" ? "bold" : "unset"}>
              draw
            </Box>
            <Box
              fontWeight={p.pickedResult === "AWAY_TEAM" ? "bold" : "unset"}
              flex={1}
              textAlign="right"
            >
              {p.match.away.name}
            </Box>
          </Box>
          {/* odds */}
          <Box display="flex" alignItems="center">
            <Box
              flex={1}
              fontWeight={"HOME_TEAM" === p.match.result ? "bold" : "unset"}
            >
              {p.match.homeWinOdds / 100}
            </Box>
            <Box fontWeight={"DRAW" === p.match.result ? "bold" : "unset"}>
              {p.match.drawOdds / 100}
            </Box>
            <Box
              flex={1}
              textAlign="right"
              fontWeight={"AWAY_TEAM" === p.match.result ? "bold" : "unset"}
            >
              {p.match.awayWinOdds / 100}
            </Box>
          </Box>
          <Divider />
        </Grid>
      ))}
    </Grid>
  </Box>
);

export default PicksOverview;
