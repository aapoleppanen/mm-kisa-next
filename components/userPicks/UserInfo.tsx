import { LeaderBoardUser } from "@/pages/leaderboard";
import { Box, Grid, Typography } from "@mui/material";


const UserInfo = ({ user }: { user: LeaderBoardUser }) => (
  <Grid container spacing={2}>
    <Grid item xs={6} textAlign="center">
      <Typography variant="h4" fontWeight="bold">
        {user.remainingcredits}
      </Typography>
      <Typography variant="subtitle1">Credits</Typography>
    </Grid>
    <Grid item xs={6} textAlign="center">
      <Typography variant="h4" fontWeight="bold">
        {user.winnings / 100}
      </Typography>
      <Typography variant="subtitle1">Points</Typography>
    </Grid>
  </Grid>
);

export default UserInfo;
