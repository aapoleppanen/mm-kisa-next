import { Box, Button, Grid } from "@mui/material";
import { styled } from "@mui/system";
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

const StyledBox = styled(Box)(() => ({
  width: "125px",
}));

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
      <Grid container alignItems="center">
        {matches.map((match) => {
          const pick =
            (match.Pick.length && match.Pick[0].pickedResult) ??
            Result.NO_RESULT;

          return (
            <Grid
              item
              key={match.id}
              m={2}
              display="flex"
              xs={12}
              justifyContent="center"
            >
              <Box onClick={() => handleClick(match.id, Result.HOME_TEAM)}>
                <Button
                  variant={pick == Result.HOME_TEAM ? "contained" : "outlined"}
                >
                  <StyledBox mr={1}>{match.home.name}</StyledBox>
                  <StyledBox>{match.homeWinOdds}</StyledBox>
                </Button>
              </Box>
              <Box onClick={() => handleClick(match.id, Result.DRAW)} mx={0.5}>
                <Button
                  variant={pick == Result.DRAW ? "contained" : "outlined"}
                >
                  <StyledBox mr={1}>Draw</StyledBox>
                  <StyledBox>{match.drawOdds}</StyledBox>
                </Button>
              </Box>
              <Box onClick={() => handleClick(match.id, Result.AWAY_TEAM)}>
                <Button
                  variant={pick == Result.AWAY_TEAM ? "contained" : "outlined"}
                >
                  <StyledBox mr={1}>{match.away.name}</StyledBox>
                  <StyledBox>{match.awayWinOdds}</StyledBox>
                </Button>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default Matches;
