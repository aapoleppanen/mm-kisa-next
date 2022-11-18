import { Box, Divider } from "@mui/material";

type Props = {
  users: { total: number; name: string; id: string }[];
};

const Leaderboard = ({ users }: Props) => (
  <Box>
    <Box typography="h4" textAlign="center" p={1}>
      Leaderboard
    </Box>
    {users.map((user) => (
      <Box key={user.id} width="100%" p={1}>
        <Box display="flex" justifyContent="space-between" mt={0.5} p={1}>
          <Box>{user.name}</Box>
          <Box>{user.total ?? 0}</Box>
        </Box>
        <Divider />
      </Box>
    ))}
  </Box>
);

export default Leaderboard;
