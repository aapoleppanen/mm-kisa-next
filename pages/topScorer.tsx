import { Box, Button, Grid } from "@mui/material";
import { Player } from "@prisma/client";
import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import { useState } from "react";
import prisma from "../lib/prisma";

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const session = await getSession({ req });

  const players = await prisma.player.findMany({
    orderBy: {
      odds: "asc",
    },
  });

  if (!session.user.id) {
    return {
      props: {
        players,
        userPick: null,
      },
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
  });

  return {
    props: {
      players: JSON.parse(JSON.stringify(players)),
      userPick: user.playerId,
    },
  };
};

type Props = {
  players: Player[];
  userPick: Player["id"] | null;
};

const TopScorer = ({ players, userPick }: Props) => {
  const [picked, setPicked] = useState<number>(userPick);

  const handleClick = async (playerId: number) => {
    try {
      setPicked(playerId);
      const res = await fetch("/api/topScorer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
    } catch (e) {
      setPicked(userPick);
      console.error(e);
    }
  };

  return (
    <Box>
      <Grid container>
        {players.map((player) => (
          <Grid item key={player.id} m={0.5}>
            <Button
              onClick={() => handleClick(player.id)}
              variant={player.id == picked ? "contained" : "outlined"}
              fullWidth
            >
              <Box
                display="flex"
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                width="230px"
              >
                <Box mr={1} textAlign="center">
                  {player.name}
                </Box>
                <Box textAlign="center">{player.odds}</Box>
              </Box>
            </Button>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default TopScorer;
