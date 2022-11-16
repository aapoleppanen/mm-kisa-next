import { Box, Button, Grid } from "@mui/material";
import { Match, Pick, Result, Team } from "@prisma/client";
import { differenceInDays } from "date-fns";
import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import MatchComponent from "../components/matches/Match";
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
    orderBy: [
      {
        startTime: "asc",
      },
    ],
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

  const renderMatchComponents = () => {
    try {
      console.log(matches);
      var lastDate = new Date(matches[0].startTime);
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
        >
          {lastDate.toDateString()}
          {matches.map((match) => {
            const result =
              (match.Pick.length && match.Pick[0].pickedResult) ??
              Result.NO_RESULT;

            let renderStamp = false;
            const startDate = new Date(match.startTime);
            if (differenceInDays(startDate, lastDate) > 0) {
              renderStamp = true;
              lastDate = startDate;
            }

            return (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                key={match.id}
              >
                {renderStamp && startDate.toDateString()}
                <MatchComponent match={match} result={result} />
              </Box>
            );
          })}
        </Box>
      );
    } catch (e) {
      console.log(e);
      return <></>;
    }
  };

  return (
    <Box>
      <Grid container alignItems="center" justifyContent="center">
        {renderMatchComponents()}
      </Grid>
    </Box>
  );
};

export default Matches;
