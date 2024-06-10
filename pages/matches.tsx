import { Box, Button, Card, Grid, Paper, useMediaQuery } from "@mui/material";
import { Match, Pick, Result, Team } from "@prisma/client";
import { isSameDay } from "date-fns";
import { GetServerSideProps, NextPage } from "next";
import { auth } from "@/auth";
import useSWR, { Fetcher } from "swr";
import BottomNav from "../components/BottomNav";
import Header from "../components/Header";
import Leaderboard from "../components/Leaderboard";
import MatchComponent from "../components/matches/Match";
import prisma from "../lib/prisma";
import { theme } from "./_app";

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

const Matches: NextPage<Props> = ({ matches }) => {
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
          <Box mt={4}>PICKS MUST BE MADE 1 HOUR BEFORE MATCH STARTS</Box>
          <Box typography="h4" mt={4}>
            {lastDate.toDateString()}
          </Box>
          {matches.map((match) => {
            const result =
              (match.Pick?.length && match.Pick[0].pickedResult) ??
              Result.NO_RESULT;

            const betAmount =
              (match.Pick?.length && match.Pick[0].betAmount) ?? 0;

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
                <MatchComponent
                  match={match}
                  result={result}
                  betAmount={betAmount}
                />
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
    <Grid container alignItems="center" justifyContent="center">
      {renderMatchComponents()}
    </Grid>
  );
};

// type LBoard = {
//   users: { total: number; name: string; id: string }[];
// };

// const fetcher: Fetcher<LBoard, string> = (path) =>
//   fetch(path).then((res) => res.json());

// // @ts-ignore next-line
// Matches.getLayout = function getLayout(page) {
//   // eslint-disable-next-line react-hooks/rules-of-hooks
//   const { data, error } = useSWR("/api/leaderboard", fetcher);
//   // eslint-disable-next-line react-hooks/rules-of-hooks
//   const mobile = useMediaQuery(theme.breakpoints.down("sm"));

//   return (
//     <Box>
//       {!mobile && <Header />}
//       <Box display="flex">
//         <Box
//           height="100vh"
//           overflow="scroll"
//           pt={mobile ? 0 : 10}
//           pb={mobile ? 10 : 4}
//           px={2}
//           flexGrow={1}
//         >
//           {page}
//         </Box>
//         {!mobile && data && (
//           <Box height="100vh" overflow="scroll" pt={10} pb={4} px={4}>
//             <Leaderboard users={data.users} />
//           </Box>
//         )}
//       </Box>
//       {mobile && <BottomNav />}
//     </Box>
//   );
// };

export default Matches;
