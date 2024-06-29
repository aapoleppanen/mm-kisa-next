import {
  Box,
  Button,
  Grid,
  TextField,
  Typography,
  debounce,
  styled,
  useMediaQuery,
} from "@mui/material";
import { Match, Result, Team } from "@prisma/client";
import { format } from "date-fns";
import { useSnackbar } from "notistack";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { disabledToday, maxBetAmount } from "../../lib/config";
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
  updateUserCredits: (credits: number) => void;
};

const ZBetAmount = z.number().min(0);

const usePotentialWin = (
  betAmount: number | "",
  match: Match,
  currentPick: Result | ""
) => {
  const [potentialWin, setPotentialWin] = useState<number>(0);

  useEffect(() => {
    if (!betAmount || !currentPick) {
      setPotentialWin(0);
    } else {
      setPotentialWin(
        (Number(betAmount) *
          match[
            currentPick == Result.HOME_TEAM
              ? "homeWinOdds"
              : currentPick == Result.DRAW
              ? "drawOdds"
              : "awayWinOdds"
          ]) /
          100
      );
    }
  }, [betAmount, currentPick, match]);

  return potentialWin;
};

const MatchComponent = ({
  match,
  result,
  betAmount: initialBetAmount,
  updateUserCredits,
}: Props) => {
  const mobile = useMediaQuery(theme.breakpoints.down("lg"));
  const [currentPick, setCurrentPick] = useState<Result | "">(() => result);
  const [betAmount, setBetAmount] = useState<number | "">(
    () => initialBetAmount
  );
  const potentialWin = usePotentialWin(betAmount, match, currentPick);
  const { enqueueSnackbar } = useSnackbar();

  const latestValues = useRef({ currentPick, betAmount });

  useEffect(() => {
    latestValues.current = { currentPick, betAmount };
  }, [match, betAmount, currentPick]);

  const makeApiCall = useCallback(async () => {
    const { currentPick, betAmount } = latestValues.current;
    if (!currentPick && !ZBetAmount.safeParse(betAmount).success) {
      return;
    }
    if (!ZBetAmount.safeParse(betAmount).success || Number(betAmount) > 50) {
      enqueueSnackbar(`Invalid bet amount (max allowed bet: ${maxBetAmount})`, {
        variant: "error",
      });
      return;
    }

    try {
      const response = await fetch("/api/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          result: currentPick,
          betAmount,
        }),
      });

      if (response.status === 403) {
        const { error } = await response.json();
        enqueueSnackbar(error, { variant: "error" });
        return;
      }
      const {
        remainingCredits,
        betAmount: newBetAmount,
        notification,
      } = await response.json();
      updateUserCredits(remainingCredits);
      setBetAmount(newBetAmount);
      if (notification) enqueueSnackbar(notification, { variant: "success" });
      else enqueueSnackbar("Bet placed successfully!", { variant: "success" });
    } catch (e) {
      console.error(e);
      enqueueSnackbar("An unexpected error occurred.", { variant: "error" });
    }
  }, [match.id]);

  const debouncedApiCall = useRef(debounce(makeApiCall, 500)).current;

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
      mt={2}
      sx={{
        background:
          "linear-gradient(to bottom right, rgb(211, 211, 211), rgb(150, 160, 155))",
        border: "0px solid #FFFFFF",
        borderRadius: "50px",
        overflow: "hidden",
        p: 1,
        width: "100%",
        boxShadow: "3px 4px 5px rgba(0, 0, 0, 0.5)",
      }}
    >
      <Typography
        variant="h6"
        color="primary"
        sx={{
          fontSize: "40px",
          fontWeight: "bold",
          color: "white",
          textShadow: "2px 2px 5px rgba(0, 0, 0, 1)",
        }}
      >
        {format(new Date(match.startTime), "HH:mm")}
      </Typography>
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
            onClick={() => {
              setCurrentPick(Result.HOME_TEAM);
            }}
            disabled={disabledToday(new Date(match.startTime))}
            sx={{ borderColor: "primary.main", borderRadius: "12px" }}
          >
            <StyledBox>
              {/* <Image
                src={match.home.crest}
                alt="home_flag"
                loading="lazy"
                className="crest_img"
                layout="fill"
                objectFit="contain"
              /> */}
              <img
                src={match.home.crest}
                alt="home_flag"
                className="crest_img"
                style={{ objectFit: "contain" }}
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
            onClick={() => {
              setCurrentPick(Result.DRAW);
            }}
            disabled={disabledToday(new Date(match.startTime))}
            sx={{ borderColor: "primary.main", borderRadius: "12px" }}
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
            onClick={() => {
              setCurrentPick(Result.AWAY_TEAM);
            }}
            disabled={disabledToday(new Date(match.startTime))}
            sx={{ borderColor: "primary.main", borderRadius: "12px" }}
          >
            <StyledBox>
              {/* <Image
                src={match.away.crest}
                alt="away_flag"
                loading="lazy"
                className="crest_img"
                layout="fill"
                objectFit="contain"
              />*/}
              <img
                src={match.away.crest}
                alt="away_flag"
                className="crest_img"
                style={{ objectFit: "contain" }}
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
            sx={{ width: "260px" }}
            inputProps={{
              step: "0.01",
              min: "0",
              max: maxBetAmount.toString(),
            }}
            InputProps={{
              endAdornment: (
                <Box
                  color="black"
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
              setCurrentPick("");
              setBetAmount(0);
              debouncedApiCall();
            }}
            disabled={disabledToday(new Date(match.startTime))}
            sx={{ fontSize: "16px", fontWeight: "bold" }}
          >
            Clear
          </Button>
        </Box>
      </Grid>
      <Box m={0.5} alignItems={"center"} display="flex">
        <Button
          variant="text"
          onClick={() => {
            makeApiCall();
          }}
          disabled={disabledToday(new Date(match.startTime))}
          sx={{
            fontSize: "16px",
            fontWeight: "bold",
            borderWidth: "3px",
            borderRadius: "12px",
            borderColor: "primary.main",
            borderStyle: "solid",
            "&:active": {
              backgroundColor: "primary.main",
              color: "white",
            },
          }}
        >
          Place Bet
        </Button>
      </Box>
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
