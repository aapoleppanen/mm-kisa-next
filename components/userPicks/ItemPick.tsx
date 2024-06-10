import { Box, Grid } from "@mui/material";
import Image from "next/image";
import { UserPicks } from "@/pages/leaderboard";

type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;

const ItemPick = ({ p }: { p: ArrayElement<UserPicks["picks"]> }) => (
  <>
    <Box display="flex" alignItems="center">
      <Box flex={1}>
        <Box
          sx={{
            border: p.pickedResult === "HOME_TEAM" ? "1px solid red" : "unset",
            padding: "2px",
            display: "flex",
            alignItems: "center",
            gap: 1,
            textDecoration:
              p.match.result === "HOME_TEAM" ? "underline" : "unset",
            textDecorationColor: "green",
            textDecorationThickness: "2.5px",
          }}
          width="min-content"
        >
          <Image
            src={p.match.home.crest}
            alt="home_flag"
            className="crest_img"
            width={20}
            height={20}
          />
          {p.match.home.name}
        </Box>
      </Box>
      <Box
        sx={{
          border: p.pickedResult === "DRAW" ? "1px solid red" : "unset",
          padding: "2px",
          textDecoration: p.match.result === "DRAW" ? "underline" : "unset",
          textDecorationColor: "green",
          textDecorationThickness: "2.5px",
        }}
      >
        draw
      </Box>
      <Box flex={1} display="flex" justifyContent={"flex-end"}>
        <Box
          sx={{
            border: p.pickedResult === "AWAY_TEAM" ? "1px solid red" : "unset",
            padding: "2px",
            display: "flex",
            alignItems: "center",
            gap: 1,
            justifyContent: "flex-end",
            textDecoration:
              p.match.result === "AWAY_TEAM" ? "underline" : "unset",
            textDecorationColor: "green",
            textDecorationThickness: "2.5px",
          }}
          width="min-content"
        >
          {p.match.away.name}
          <Image
            src={p.match.away.crest}
            alt="away_flag"
            className="crest_img"
            width={20}
            height={20}
          />
        </Box>
      </Box>
    </Box>
    <Box display="flex" alignItems="center">
      <Box flex={1}>{p.match.homeWinOdds / 100}</Box>
      <Box>{p.match.drawOdds / 100}</Box>
      <Box flex={1} textAlign="right">
        {p.match.awayWinOdds / 100}
      </Box>
    </Box>
  </>
);

export default ItemPick;
