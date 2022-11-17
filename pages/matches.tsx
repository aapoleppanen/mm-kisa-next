import { Box, Button, Grid } from "@mui/material";
import { Match, Pick, Result, Team } from "@prisma/client";
import { isSameDay } from "date-fns";
import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import MatchComponent from "../components/matches/Match";
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
      var lastDate = new Date(matches[0].startTime);
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
        >
          <Box mt={4}>
            Remember to make your pick 1 hour before the match starts.
          </Box>
          <Box typography="h4" mt={4}>
            {lastDate.toDateString()}
          </Box>
          {matches.map((match) => {
            const result =
              (match.Pick.length && match.Pick[0].pickedResult) ??
              Result.NO_RESULT;

            let renderStamp = false;
            const startDate = new Date(match.startTime);
            if (!isSameDay(startDate, lastDate)) {
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
                {renderStamp && (
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    flexDirection="column"
                    mt={4}
                  >
                    <Box typography="h4">{startDate.toDateString()}</Box>
                  </Box>
                )}
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
