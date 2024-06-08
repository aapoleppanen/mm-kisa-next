import { auth } from "@/auth";
import { Box, Collapse, Divider } from "@mui/material";
import { Match, Pick, Player, Team, User } from "@prisma/client";
import { GetServerSideProps } from "next";
import { useState } from "react";
import PicksOverview from "../components/PicksOverview";
import prisma from "../lib/prisma";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await auth(context);

  if (!session?.user) {
    return {
      redirect: {
        permanent: false,
        destination: "/",
      },
      props: {},
    };
  }

  const users: { total: number; name: string; id: string }[] =
  await prisma.$queryRaw`
SELECT COALESCE(SUM(odds), 0) + COALESCE(winningOdds, 0) + COALESCE(playerOdds, 0) AS total, User.name as name, User.id AS id
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
LEFT JOIN Team on Team.id = User.teamId AND Team.id = 4
LEFT JOIN (
SELECT id, odds as playerOdds, name
FROM Player
WHERE Player.id = 95
) as player on player.id = User.playerId AND player.id = 95
GROUP BY User.id
ORDER BY total DESC
`;

console.log(users);

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
            {picks && <PicksOverview picks={picks} />}
          </Collapse>
          {/* {selected === user.id && picks && } */}
        </Box>
      ))}
    </Box>
  );
};

export default LeaderboardPage;
