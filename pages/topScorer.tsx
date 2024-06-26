import { Box, Button, Grid, Paper, useMediaQuery } from "@mui/material";
import { Player } from "@prisma/client";
import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { disablePrePicks } from "../lib/config";
import prisma from "../lib/prisma";
import { theme } from "./_app";
import { auth } from "@/auth";

export const getStaticProps: GetServerSideProps = async () => {
  // const session = await auth(context);

  // if (!session?.user) {
  //   return {
  //     redirect: {
  //       permanent: false,
  //       destination: "/",
  //     },
  //     props: {},
  //   };
  // }

  const players = await prisma.player.findMany({
    orderBy: {
      odds: "asc",
    },
  });

  // if (!session.user.id) {
  //   return {
  //     props: {
  //       players,
  //       userPick: null,
  //     },
  //   };
  // }

  // const user = await prisma.user.findUnique({
  //   where: {
  //     id: session.user.id,
  //   },
  // });

  return {
    props: {
      players: JSON.parse(JSON.stringify(players)),
      // userPick: user?.playerId,
    },
  };
};

type Props = {
  players: Player[];
  // userPick: Player["id"] | null;
};

const TopScorer = ({ players }: Props) => {
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    const fetchPicks = async () => {
      const res = await fetch("/api/userWinnerAndScorer");
      const body = await res.json();
      if (body.playerPick) {
        setPicked(body.playerPick);
      }
    };

    try {
      fetchPicks();
    } catch (e) {}
  }, []);

  const handleClick = async (playerId: number) => {
    let oldPick = picked;
    try {
      setPicked(playerId);
      const res = await fetch("/api/topScorer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
    } catch (e) {
      setPicked(oldPick);
      console.error(e);
    }
  };

  return (
    <Grid container p={2} justifyContent="center" spacing={1}>
      {players.map((player) => (
        <Grid item key={player.id} xs={12} sm={6} md={3}>
          <Button
            onClick={() => handleClick(player.id)}
            variant={player.id == picked ? "contained" : "outlined"}
            fullWidth
            disabled={disablePrePicks()}
            sx={{ borderColor: 'primary.main' , borderRadius: '12px'}}
          >
            <Box
              display="flex"
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
              width="230px"
              py={1}
            >
              <Box mr={1} textAlign="center">
                {player.name}
              </Box>
              <Box textAlign="center">{player.odds / 100}</Box>
            </Box>
          </Button>
        </Grid>
      ))}
    </Grid>
  );
};

export default TopScorer;
