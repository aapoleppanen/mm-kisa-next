import { LeaderBoardUser } from "@/pages/leaderboard";
import { roundNumber } from "@/utils/numberUtils";
import { Box, Grid, Typography } from "@mui/material";


const UserInfo = ({ user }: { user: LeaderBoardUser }) => (
  <Grid container spacing={2}>
    <Grid item xs={6} textAlign="center">
      <Typography variant="h4" fontWeight="bold">
        {roundNumber(user.remainingCredits)}
      </Typography>
      <Typography variant="subtitle1">Credits</Typography>
    </Grid>
    <Grid item xs={6} textAlign="center">
      <Typography variant="h4" fontWeight="bold">
        {roundNumber(user.points / 100)}
      </Typography>
      <Typography variant="subtitle1">Points</Typography>
    </Grid>
  </Grid>
);

export default UserInfo;
