import { Box, Button, Grid, styled } from "@mui/material";
import { Match, Pick, Result, Team } from "@prisma/client";
import { useState } from "react";

// display="flex" width="300px" justifyContent="space-between"

const StyledBox = styled(Box)(() => ({
  width: "300px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
}));

type Props = {
  match: Match & {
    away: Team;
    home: Team;
  };
  result: Result | "";
};

const MatchComponent = ({ match, result }: Props) => {
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
    <>
      <Grid item m={2} display="flex" xs={12} justifyContent="center">
        <Box onClick={() => handleClick(match.id, Result.HOME_TEAM)}>
          <Button
            variant={currentPick == Result.HOME_TEAM ? "contained" : "outlined"}
          >
            <StyledBox>
              <img
                src={match.home.crest}
                alt="home_flag"
                loading="lazy"
                className="crest_img"
              />
              <Box>{match.home.name}</Box>
              <Box>{match.homeWinOdds}</Box>
            </StyledBox>
          </Button>
        </Box>
        <Box onClick={() => handleClick(match.id, Result.DRAW)} mx={0.5}>
          <Button
            variant={currentPick == Result.DRAW ? "contained" : "outlined"}
          >
            <StyledBox>
              <Box>Draw</Box>
              <Box>{match.drawOdds}</Box>
            </StyledBox>
          </Button>
        </Box>
        <Box onClick={() => handleClick(match.id, Result.AWAY_TEAM)}>
          <Button
            variant={currentPick == Result.AWAY_TEAM ? "contained" : "outlined"}
          >
            <StyledBox>
              <img
                src={match.away.crest}
                alt="away_flag"
                loading="lazy"
                className="crest_img"
              />
              <Box>{match.away.name}</Box>
              <Box>{match.awayWinOdds}</Box>
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
    </>
  );
};

export default MatchComponent;
