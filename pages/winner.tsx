import { auth } from "@/auth";
import { Box, Button, Grid } from "@mui/material";
import { Team } from "@prisma/client";
import { GetServerSideProps } from "next";
import { useEffect, useState } from "react";
import { disablePrePicks } from "../lib/config";
import prisma from "../lib/prisma";

export const getStaticProps: GetServerSideProps = async () => {
  // const session = await auth(context)

  // if (!session?.user) {
  //   return {
  //     redirect: {
  //       permanent: false,
  //       destination: "/",
  //     },
  //     props: {},
  //   };
  // }

  const teams = await prisma.team.findMany({
    orderBy: {
      winningOdds: "asc",
    },
  });

  // if (!session.user.id) {
  //   return {
  //     props: {
  //       teams,
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
      teams: JSON.parse(JSON.stringify(teams)),
      // userPick: user?.teamId,
    },
  };
};

type Props = {
  teams: Team[];
  // userPick: Team["id"] | null;
};

const Winner = ({ teams }: Props) => {
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    const fetchPicks = async () => {
      const res = await fetch("/api/userWinnerAndScorer");
      const body = await res.json();
      if (body.teamPick) {
        setPicked(body.teamPick);
      }
    };

    try {
      fetchPicks();
    } catch (e) {}
  }, []);

  const handleClick = async (teamId: number) => {
    let oldPick = picked;
    try {
      setPicked(teamId);
      const res = await fetch("/api/winner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
    } catch (e) {
      setPicked(oldPick);
      console.error(e);
    }
  };

  return (
    <Grid container p={2} spacing={1}>
      {teams
        .filter((team) => team.winningOdds > 0)
        .map((team) => (
          <Grid item key={team.id} xs={12} sm={6} md={3}>
            <Button
              onClick={() => handleClick(team.id)}
              variant={team.id == picked ? "contained" : "outlined"}
              fullWidth
              disabled={disablePrePicks()}
              sx={{ borderColor: "primary.main", borderRadius: "12px" }}
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
                  {team.name}
                </Box>
                <Box textAlign="center">{team.winningOdds / 100}</Box>
              </Box>
            </Button>
          </Grid>
        ))}
    </Grid>
  );
};

export default Winner;
