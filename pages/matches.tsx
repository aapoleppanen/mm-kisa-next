import { Box, Button, Card, Grid, Paper, useMediaQuery } from "@mui/material";
import { Match, Pick, Result, Team } from "@prisma/client";
import { isSameDay } from "date-fns";
import { GetServerSideProps, NextPage } from "next";
import React, { useState, useEffect } from "react";
import { createClient } from "@/supabase/client";
import Image from "next/image";
import { auth } from "@/auth";
import useSWR, { Fetcher } from "swr";
import BottomNav from "../components/BottomNav";
import Header from "../components/Header";
import profile from "../public/assets/1.jpg";
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
  const userId = session?.user?.id;

  const userCredits = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      remainingCredits: true,
    },
  });

  const supabase = createClient();
  const { data: emKisaNextContents, error } = await supabase.storage
    .from("em-kisa-next")
    .list("");

  if (error) {
    console.error(
      "Error fetching contents from Supabase Storage:",
      error.message
    );
    return {
      props: {
        error: "Failed to fetch contents from Supabase Storage",
      },
    };
  }

  const fetchPublicUrl = async (filePath: string) => {
    if (!filePath.startsWith("background")) {
      return null;
    }
    const { data } = await supabase.storage
      .from("em-kisa-next")
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const publicUrls = await Promise.all(
    emKisaNextContents.map((item) => fetchPublicUrl(item.name))
  );

  const filteredUrls = publicUrls.filter((url) => url !== null);
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
    props: {
      matches: JSON.parse(JSON.stringify(matches)),
      filteredUrls,
      userCredits,
    },
  };
};

type Props = {
  matches: (Match & {
    away: Team;
    home: Team;
    Pick?: [Pick];
  })[];
  filteredUrls: string[];
  userCredits: {
    remainingCredits: number;
  };
};
interface AltsDictionary {
  [key: string]: string;
}
const Matches: NextPage<Props> = ({ matches, filteredUrls, userCredits }) => {
  const [currentBackgroundIndex, setCurrentBackgroundIndex] = useState(() => {
    const currentDate = new Date();
    const totalImages = filteredUrls.length;
    const index = currentDate.getDate() % totalImages;
    return index;
  });
  const [currenUserCredits, setCurrentUserCredits] = useState(
    userCredits.remainingCredits
  );

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
          {filteredUrls && (
            <Image
              src={filteredUrls[currentBackgroundIndex]} // this works if profile is used here
              alt="background"
              width="100"
              height="100"
              style={{
                position: "fixed",
                width: "100%",
                height: "100%",
                objectFit: "cover",
                left: 0,
                top: 0,
                zIndex: -1,
                // filter: "saturate(20%) contrast(60%)"
              }}
            />
          )}
          <Box
            mt={4}
            sx={{
              color: "white",
              fontSize: { xs: "17px", md: "24px" },
              fontWeight: "bold",
              textShadow: "2px 2px 2px rgba(0, 0, 0, 1)",
              marginTop: "60px"
            }}
          >
            PICKS MUST BE MADE 1 HOUR BEFORE MATCH STARTS
          </Box>
          <Box
            sx={{
              position: "fixed",
              top: { xs: "10px", md: "auto" }, 
              bottom: { xs: "auto", md: "10px" },
              right: "20px", 
              backgroundColor: "white",
              zIndex: 9999,
              width: "auto",
              padding: "10px 20px",
              height: "auto",
              borderRadius: "12px",
              border: "2px solid black",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0px 4px 15px rgba(0, 0, 0, 0.1)",
              fontWeight: "bold",
            }}
          >
            Your Credits: {userCredits.remainingCredits}
          </Box>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexDirection="column"
            mt={4}
            sx={{
              marginTop: "150%",
              backgroundColor: "rgb(211, 211, 211, 1)",
              borderRadius: "12px",
              width: "80%",
              height: "60px",
            }}
          >
            <Box
              typography="h4"
              sx={{
                fontSize: "40px",
                fontWeight: "bold",
                color: "white",
                textShadow: "2px 2px 5px rgba(0, 0, 0, 1)",
              }}
            >
              {lastDate.toDateString()}
            </Box>
          </Box>
          {matches.map((match, index) => {
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
                      backgroundColor: "rgb(211, 211, 211, 1)",
                      borderRadius: "12px",
                      width: "90%",
                      height: "60px",
                    }}
                  >
                    <Box
                      typography="h4"
                      sx={{
                        fontSize: "40px",
                        fontWeight: "bold",
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
                  updateUserCredits={setCurrentUserCredits}
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
