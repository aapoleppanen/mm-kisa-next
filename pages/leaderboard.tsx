import { Box, Collapse, Divider, Grid } from "@mui/material";
import { Match, Player, Team, User, Pick } from "@prisma/client";
import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import { useState } from "react";
import PicksOverview from "../components/PicksOverview";
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
      SELECT homeWinOdds AS Odds, id, result
      FROM \`Match\`
      WHERE \`Match\`.result = "HOME_TEAM"
    UNION
      SELECT awayWinOdds AS Odds, id, result
      FROM \`Match\`
      WHERE \`Match\`.result = "AWAY_TEAM"
    UNION
      SELECT drawOdds AS Odds, id, result
      FROM \`Match\`
      WHERE \`Match\`.result = "DRAW") AS od
  INNER JOIN Pick ON od.id = Pick.matchId AND od.result = Pick.pickedResult
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

export type UserPicks = User & {
  picks: (Pick & {
    match: Match & {
      home: Team;
      away: Team;
    };
  })[];
  winnerPick: Team;
  topScorerPick: Player;
};

const LeaderboardPage = ({ users }: Props) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [picks, setPicks] = useState<UserPicks | null>(null);

  const handleExpand = async (id: string) => {
    try {
      if (selected === id) {
        setSelected(null);
        return;
      }
      const res = await fetch(`api/${id}/picks`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const { picks: picksRes }: { picks: UserPicks } = await res.json();

      setPicks(picksRes);
      setSelected(id);
    } catch (e) {
      console.error(e);
      setPicks(null);
      setSelected(null);
    }
  };

  return (
    <Box>
      <Box typography="h4" textAlign="center" p={1}>
        Leaderboard
      </Box>
      {users.map((user) => (
        <Box
          key={user.id}
          width="100%"
          p={1}
          onClick={() => handleExpand(user.id)}
        >
          <Box display="flex" justifyContent="space-between" mt={0.5} p={1}>
            <Box>{user.name}</Box>
            <Box>{user.total ?? 0}</Box>
          </Box>
          <Divider />
          <Collapse in={selected === user.id && !!picks} unmountOnExit>
            <PicksOverview picks={picks} />
          </Collapse>
          {/* {selected === user.id && picks && } */}
        </Box>
      ))}
    </Box>
  );
};

export default LeaderboardPage;
