import { Box, Grid } from "@mui/material";
import { Match, Pick, Result, Team } from "@prisma/client";
import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import prisma from "../lib/prisma";

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const session = await getSession({ req });

  const matches = await prisma.match.findMany({
    include: {
      away: true,
      home: true,
      ...(session.user.id
        ? {
            Pick: {
              where: {
                userId: session.user.id,
              },
            },
          }
        : {}),
    },
  });

  return {
    props: { matches: JSON.parse(JSON.stringify(matches)) },
  };
};

type Props = {
  matches: (Match & {
    away: Team;
    home: Team;
    Pick?: [Pick];
  })[];
};

const Matches = ({ matches }: Props) => {
  const handleClick = async (matchId: number, result: Result) => {
    try {
      const res = await fetch("/api/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, result }),
      });
    } catch (e) {
      console.error;
    }
  };

  return (
    <Box>
      <Grid container>
        {matches.map((match) => {
          const pick =
            (match.Pick.length && match.Pick[0].pickedResult) ??
            Result.NO_RESULT;

          return (
            <Grid item key={match.id}>
              <Box
                onClick={() => handleClick(match.id, Result.HOME_TEAM)}
                sx={{
                  cursor: "pointer",
                  backgroundColor:
                    pick == Result.HOME_TEAM ? "lightblue" : "unset",
                }}
              >
                {match.home.name}
              </Box>
              <Box
                onClick={() => handleClick(match.id, Result.DRAW)}
                sx={{
                  cursor: "pointer",
                  backgroundColor: pick == Result.DRAW ? "lightblue" : "unset",
                }}
              >
                Draw
              </Box>
              <Box
                onClick={() => handleClick(match.id, Result.AWAY_TEAM)}
                sx={{
                  cursor: "pointer",
                  backgroundColor:
                    pick == Result.AWAY_TEAM ? "lightblue" : "unset",
                }}
              >
                {match.home.name}
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default Matches;
