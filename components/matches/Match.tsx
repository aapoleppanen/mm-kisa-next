import {
  Box,
  Button,
  Grid,
  TextField,
  styled,
  useMediaQuery,
} from "@mui/material";
import { Match, Result, Team } from "@prisma/client";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { disabledToday } from "../../lib/config";
import Image from "next/image";
import ClearIcon from "@mui/icons-material/Clear";
import { theme } from "../../pages/_app";

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
  betAmount: number;
};

const MatchComponent = ({
  match,
  result,
  betAmount: initialBetAmount,
}: Props) => {
  const mobile = useMediaQuery(theme.breakpoints.down("lg"));

  const [currentPick, setCurrentPick] = useState<Result | "">(result);
  const [betAmount, setBetAmount] = useState<number | "">(initialBetAmount);
  const [potentialWin, setPotentialWin] = useState<number>(0);

  useEffect(() => {
    if (!betAmount) {
      setPotentialWin(0);
      return;
    }

    setPotentialWin(
      (betAmount *
        match[
          currentPick == Result.HOME_TEAM
            ? "homeWinOdds"
            : currentPick == Result.DRAW
            ? "drawOdds"
            : "awayWinOdds"
        ]) /
        100
    );
  }, [betAmount, currentPick, match]);

  useEffect(() => {
    const makeApiCall = async () => {
      if (currentPick && betAmount) {
        try {
          await fetch("/api/pick", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              matchId: match.id,
              result: currentPick,
              betAmount,
            }),
          });
        } catch (e) {
          console.error(e);
        }
      }
    };

    makeApiCall();
  }, [match.id, currentPick, betAmount]);

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
            onClick={() => setCurrentPick(Result.HOME_TEAM)}
            disabled={disabledToday(new Date(match.startTime))}
          >
            <StyledBox>
              <Image
                src={match.home.crest}
                alt="home_flag"
                loading="lazy"
                className="crest_img"
                layout="fill"
                objectFit="contain"
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
            onClick={() => setCurrentPick(Result.DRAW)}
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
            onClick={() => setCurrentPick(Result.AWAY_TEAM)}
            disabled={disabledToday(new Date(match.startTime))}
          >
            <StyledBox>
              <Image
                src={match.away.crest}
                alt="away_flag"
                loading="lazy"
                className="crest_img"
                layout="fill"
                objectFit="contain"
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
      <Grid
        item
        mb={2}
        mt={1}
        ml={1}
        display="flex"
        justifyContent="flex-start"
        alignItems={"center"}
        xs={12}
        width="100%"
      >
        <Box m={0.5}>
          <TextField
            label="Bet Amount"
            value={betAmount}
            type="number"
            size="small"
            sx={{
              width: "260px",
            }}
            inputProps={{ step: "0.01" }}
            InputProps={{
              endAdornment: (
                <Box
                  color="gray"
                  ml={1}
                  width="min-content"
                  sx={{ textWrap: "nowrap" }}
                >
                  = {potentialWin.toFixed(2)} points
                </Box>
              ),
            }}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setBetAmount(event.target.value && Number(event.target.value));
            }}
            onBlur={() => setBetAmount(betAmount || 0)}
            disabled={disabledToday(new Date(match.startTime))}
          />
        </Box>
        <Box m={0.5} alignItems={"center"} display="flex">
          <Button
            variant="text"
            onClick={() => {
              setBetAmount(0);
            }}
            disabled={disabledToday(new Date(match.startTime))}
          >
            Clear
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
