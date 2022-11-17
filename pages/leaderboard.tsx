import { Box, Grid } from "@mui/material";
import { User } from "@prisma/client";
import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import prisma from "../lib/prisma";

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const session = await getSession({ req });

  if (!session?.user) {
    return {
      redirect: {
        permanent: false,
        destination: "/",
      },
      props: {},
    };
  }

  const users: { total: number; name: string; id: string } =
    await prisma.$queryRaw`
  SELECT SUM(odds) AS total, name, User.id AS id
    FROM (
      SELECT homeWinOdds AS Odds, id
      FROM \`Match\`
      WHERE \`Match\`.result = "HOME_TEAM"
    UNION
      SELECT awayWinOdds AS Odds, id
      FROM \`Match\`
      WHERE \`Match\`.result = "AWAY_TEAM"
    UNION
      SELECT drawOdds AS Odds, id
      FROM \`Match\`
      WHERE \`Match\`.result = "DRAW") AS od
  INNER JOIN Pick ON od.id = Pick.matchId
  RIGHT JOIN User on User.id = Pick.userId
  GROUP BY User.id
  `;

  return {
    props: { users: JSON.parse(JSON.stringify(users)) },
  };
};

type Props = {
  users: { total: number; name: string; id: string }[];
};

const Leaderboard = ({ users }: Props) => (
  <Grid container display="flex" justifyContent="center">
    {users.map((user) => (
      <Grid
        item
        key={user.id}
        xs={2}
        borderBottom="1px solid black"
        my={1}
        p={1}
      >
        <Box display="flex" justifyContent="space-around">
          <Box>{user.name}</Box>
          <Box>{user.total ?? 0}</Box>
        </Box>
      </Grid>
    ))}
  </Grid>
);

export default Leaderboard;
