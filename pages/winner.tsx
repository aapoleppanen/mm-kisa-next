import { Autocomplete, Box, Grid, TextField } from "@mui/material";
import { Match, Team } from "@prisma/client";
import { match } from "assert";
import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import { useEffect, useState } from "react";
import prisma from "../lib/prisma";

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const session = await getSession({ req });

  const teams = await prisma.team.findMany();

  if (!session.user.id) {
    return {
      props: {
        teams,
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
      teams: JSON.parse(JSON.stringify(teams)),
      userPick: user.teamId,
    },
  };
};

type Props = {
  teams: Team[];
  userPick: Team["id"] | null;
};

const Winner = ({ teams, userPick }: Props) => {
  const [picked, setPicked] = useState<number>(userPick);

  const handleClick = async (teamId: number) => {
    try {
      setPicked(teamId);
      const res = await fetch("/api/winner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
    } catch (e) {
      setPicked(userPick);
      console.error(e);
    }
  };

  return (
    <Box>
      <Box>Pick a winner</Box>
      <Grid container>
        {teams.map((team) => (
          <Grid
            item
            key={team.id}
            onClick={() => handleClick(team.id)}
            sx={{
              cursor: "pointer",
              backgroundColor: team.id == picked ? "lightblue" : "unset",
            }}
          >
            <Box>{team.name}</Box>
            <Box>{team.winningOdds}</Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Winner;
