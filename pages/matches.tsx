import { Box, Button, Card, Grid, Paper, useMediaQuery } from "@mui/material";
import { Match, Pick, Result, Team } from "@prisma/client";
import { isSameDay } from "date-fns";
import { GetServerSideProps, NextPage } from "next";
import Image from "next/image";
import { auth } from "@/auth";
import useSWR, { Fetcher } from "swr";
import BottomNav from "../components/BottomNav";
import Header from "../components/Header";
import profile from "../assets/1.jpg";
import Leaderboard from "../components/Leaderboard";
import MatchComponent from "../components/matches/Match";
import prisma from "../lib/prisma";
import { theme } from "./_app";
import { ImagesearchRoller } from "@mui/icons-material";

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
interface AltsDictionary {
  [key: string]: string;
}
const Matches: NextPage<Props> = ({ matches }) => {
  const picsArray = [
    { id: "1", alt: "Alt text for pic1" },
    { id: "2", alt: "Alt text for pic2" },
    { id: "3", alt: "Alt text for pic3" },
    { id: "4", alt: "Alt text for pic4" },
    { id: "5", alt: "Alt text for pic5" },
    { id: "6", alt: "Alt text for pic6" },
    { id: "7", alt: "Alt text for pic7" },
    { id: "8", alt: "Alt text for pic8" },
    { id: "9", alt: "Alt text for pic9" },
    { id: "10", alt: "Alt text for pic10" },
    { id: "11", alt: "Alt text for pic11" },
    { id: "12", alt: "Alt text for pic12" },
  ];
  const renderMatchComponents = () => {
    try {
      var lastDate = new Date(matches[0].startTime);
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          sx={{
            position: "relative",
            width: "100vw",
            minHeight: "100vh",
            backgroundImage: `url(${profile.src})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
          }}
        >
          {/*picsArray.map(({ id, alt }) => (
            <Image
              key={id}
              src={`../assets/${id}.jpg`}
              alt={alt}
              width="64"
              height="64"
              
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                objectFit: "cover",
                left: 0,
                top: 0,
                zIndex: -1,
                // filter: "saturate(20%) contrast(60%)"
              }}
                
            />
          ))*/}
          <Box
            mt={4}
            sx={{
              color: "white",
              fontSize: "17px",
              fontWeight: "bold",
              textShadow: "2px 2px 2px rgba(0, 0, 0, 1)",
            }}
          >
            PICKS MUST BE MADE 1 HOUR BEFORE MATCH STARTS
          </Box>
          <Box
            typography="h4"
            mt={4}
            sx={{
              color: "white",
              textShadow: "2px 2px 2px rgba(0, 0, 0, 1)", // Adjust the shadow's spread and color as needed
            }}
          >
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
                    sx={{
                      backgroundColor: "rgb(211, 211, 211, 0.7)",
                      borderRadius: "12px",
                      width: "80%", // Adjust this to the desired width
                      height: "60px",
                    }}
                  >
                    <Box
                      typography="h4"
                      sx={{
                        color: "white",
                        textShadow: "2px 2px 5px rgba(0, 0, 0, 1)",
                      }}
                    >
                      {startDate.toDateString()}
                    </Box>
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
