import { auth } from "@/auth";
import { styled } from '@mui/system';
import { Box, Collapse, Divider } from "@mui/material";
import { Match, Pick, Player, Team, User } from "@prisma/client";
import { GetServerSideProps } from "next";
import { useState } from "react";
import PicksOverview from "../components/PicksOverview";
import prisma from "../lib/prisma";
import Image from "next/image";
import { roundNumber } from "@/utils/numberUtils";

const StyledBox = styled(Box)({
  fontSize: "20px",
  color: "black",
  fontWeight: "bold",
  textShadow: "0px 2px 4px rgba(255, 255, 255, 0.3)"
});

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
  const users: {
    name: User["name"];
    id: User["id"];
    image: User["image"];
    credits: User["credits"];
    points: User["points"];
    winnings: number;
    remainingCredits: number;
  }[] = await prisma.$queryRaw`
    SELECT
      "User".name as name, "User".id AS id, "User".image as image, "User".credits as credits, "User".points as points,
      CAST(COALESCE(SUM("Pick"."betAmount" * odds), 0) AS INTEGER) AS winnings,
      "User"."remainingCredits" as remainingCredits
    FROM (
      SELECT "homeWinOdds" AS odds, id, result
      FROM "Match"
      WHERE "Match".result = 'HOME_TEAM'
    UNION
      SELECT "awayWinOdds" AS odds, id, result
      FROM "Match"
      WHERE "Match".result = 'AWAY_TEAM'
    UNION
      SELECT "drawOdds" AS odds, id, result
      FROM "Match"
      WHERE "Match".result = 'DRAW'
    ) AS od
    INNER JOIN "Pick" ON od.id = "Pick"."matchId" AND od.result = "Pick"."pickedResult"
    RIGHT JOIN "User" ON "User".id = "Pick"."userId"
    LEFT JOIN "Team" ON "Team".id = "User"."teamId" AND "Team".id = 4
    LEFT JOIN (
      SELECT id, odds as playerOdds, name
      FROM "Player"
      WHERE "Player".id = 95
    ) AS player ON player.id = "User"."playerId" AND player.id = 95
    GROUP BY "User".id, "User".name, "Team"."winningOdds", playerOdds
    ORDER BY winnings DESC;
  `;

  return {
    props: { users: JSON.parse(JSON.stringify(users)) },
  };
};

export type LeaderBoardUser = {
  name: string;
  id: string;
  image: string;
  credits: number;
  points: number;
  winnings: number;
  remainingcredits: number;
};

type Props = {
  users?: LeaderBoardUser[];
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

  if (!users) return <>No users, yet.</>;

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
          sx={{
            cursor: "pointer",
            borderRadius: "12px",
            backgroundColor: "#f0f0f0",
            boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
            transition: "background-color 0.1s ease",
            "&:hover": {
              backgroundColor: "rgb(211, 211, 211)",
            }
          }}
        >
          <Box
            display="flex"
            justifyContent="space-between"
            mt={0.5}
            p={1}
            alignItems="center"
          >
            <Box display="flex" alignItems="center" gap={1}>
              {user.image && (
                <Image
                  src={user.image}
                  alt="profile_image"
                  width={45}
                  height={45}
                />
              )}
              <StyledBox>{user.name}</StyledBox>
            </Box>
            <StyledBox >{roundNumber(user.winnings / 100)}</StyledBox>
          </Box>
          <Divider />
          <Collapse in={selected === user.id && !!picks} unmountOnExit>
            {picks && <PicksOverview picks={picks} user={user} />}
          </Collapse>
          {/* {selected === user.id && picks && } */}
        </Box>
      ))}
    </Box>
  );
};

export default LeaderboardPage;
