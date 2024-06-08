import { Box, Button, Grid, styled, useMediaQuery } from "@mui/material";
import { Match, Pick, Result, Team } from "@prisma/client";
import { format } from "date-fns";
import { useState } from "react";
import { disabledToday } from "../../lib/config";
import Image from "next/image";
import { theme } from "../../pages/_app";

// display="flex" width="300px" justifyContent="space-between"

const StyledBox = styled(Box)(() => ({
  width: "300px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  paddingTop: 8,
  paddingBottom: 8,
}));

type Props = {
  match: Match & {
    away: Team;
    home: Team;
  };
  result: Result | "";
};

const MatchComponent = ({ match, result }: Props) => {
  const mobile = useMediaQuery(theme.breakpoints.down("lg"));
  const handleClick = async (matchId: number, result: Result) => {
    try {
      setCurrentPick(result);
      const res = await fetch("/api/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, result }),
      });
    } catch (e) {
      setCurrentPick(result);
      console.error(e);
    }
  };

  const [currentPick, setCurrentPick] = useState<Result | "">(result);

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
      mt={2}
    >
      {format(new Date(match.startTime), "HH:mm")}
      <Grid
        item
        mb={2}
        mt={1}
        display="flex"
        justifyContent="center"
        xs={12}
        flexDirection={mobile ? "column" : "unset"}
      >
        <Box m={1}>
          <Button
            variant={currentPick == Result.HOME_TEAM ? "contained" : "outlined"}
            onClick={() => handleClick(match.id, Result.HOME_TEAM)}
            disabled={disabledToday(new Date(match.startTime))}
          >
            <StyledBox>
              <Image
                src={match.home.crest}
                alt="home_flag"
                loading="lazy"
                className="crest_img"
              />
              <Box display="flex">
                {match.home.name}
                {match.homeGoals != null && (
                  <Box ml={0.5} fontWeight="bold">{`(${match.homeGoals})`}</Box>
                )}
              </Box>
              <Box>{match.homeWinOdds / 100}</Box>
            </StyledBox>
          </Button>
        </Box>
        <Box m={1}>
          <Button
            variant={currentPick == Result.DRAW ? "contained" : "outlined"}
            onClick={() => handleClick(match.id, Result.DRAW)}
            disabled={disabledToday(new Date(match.startTime))}
          >
            <StyledBox>
              <Box>Draw</Box>
              <Box>{match.drawOdds / 100}</Box>
            </StyledBox>
          </Button>
        </Box>
        <Box m={1}>
          <Button
            variant={currentPick == Result.AWAY_TEAM ? "contained" : "outlined"}
            onClick={() => handleClick(match.id, Result.AWAY_TEAM)}
            disabled={disabledToday(new Date(match.startTime))}
          >
            <StyledBox>
              <Image
                src={match.away.crest}
                alt="away_flag"
                loading="lazy"
                className="crest_img"
              />
              <Box display="flex">
                {match.away.name}
                {match.awayGoals != null && (
                  <Box ml={0.5} fontWeight="bold">{`(${match.awayGoals})`}</Box>
                )}
              </Box>
              <Box>{match.awayWinOdds / 100}</Box>
            </StyledBox>
          </Button>
        </Box>
      </Grid>
      <style jsx>{`
        .crest_img {
          height: 20px;
          width: auto;
        }
      `}</style>
    </Box>
  );
};

export default MatchComponent;
