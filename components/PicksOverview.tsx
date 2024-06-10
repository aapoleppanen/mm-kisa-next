import { Box, Divider, Grid } from "@mui/material";
import { LeaderBoardUser, UserPicks } from "../pages/leaderboard";
import UserInfo from "./userPicks/UserInfo";
import MatchDetails from "./userPicks/MatchDetails";

const PicksOverview = ({
  picks,
  user,
}: {
  picks: UserPicks;
  user: LeaderBoardUser;
}) => (
  <Box py={2}>
    <UserInfo user={user} />
    <Divider sx={{ my: 2 }} />
    <Grid container>
      <Grid
        item
        xs={6}
        textAlign="center"
        p={1}
        fontWeight={picks.winnerPick?.id === 4 ? "bold" : "unset"}
      >
        Winner: {picks.winnerPick?.name}{" "}
        {picks.winnerPick?.winningOdds && `(${picks.winnerPick.winningOdds / 100})`}
      </Grid>
      <Grid
        item
        xs={6}
        textAlign="center"
        p={1}
        fontWeight={picks.topScorerPick?.id === 95 ? "bold" : "unset"}
      >
        Top scorer: {picks.topScorerPick?.name}{" "}
        {picks.topScorerPick?.odds && `(${picks.topScorerPick.odds / 100})`}
      </Grid>
    </Grid>
    <MatchDetails picks={picks} />
  </Box>
);

export default PicksOverview;
