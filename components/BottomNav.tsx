import {
  AccountBox,
  EmojiEvents,
  Leaderboard,
  Login,
  LooksOne,
  SportsSoccer,
} from "@mui/icons-material";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import MuiLink from "./MuiLink";

export default function BottomNav() {
  const router = useRouter();
  const { data: session, status } = useSession();

  console.log(router.pathname);

  return (
    <BottomNavigation
      sx={{ width: "100%", position: "fixed", bottom: 0 }}
      value={router.pathname}
    >
      {/* @ts-ignore next-line */}
      <BottomNavigationAction
        label="Profile"
        value="/profile"
        to="/profile"
        href="/profile"
        LinkComponent={MuiLink}
        icon={<AccountBox />}
      />
      {/* @ts-ignore next-line */}
      <BottomNavigationAction
        label="Matches"
        value="/matches"
        to="/matches"
        href="/matches"
        LinkComponent={MuiLink}
        icon={<SportsSoccer />}
      />
      {/* @ts-ignore next-line */}
      <BottomNavigationAction
        label="Winner"
        value="/winner"
        icon={<EmojiEvents />}
        to="/winner"
        href="/winner"
        LinkComponent={MuiLink}
      />
      {/* @ts-ignore next-line */}
      <BottomNavigationAction
        label="TopScorer"
        value="/topScorer"
        icon={<LooksOne />}
        to="/topScorer"
        href="/topScorer"
        LinkComponent={MuiLink}
      />
      {/* @ts-ignore next-line */}
      <BottomNavigationAction
        label="Leaderboard"
        value="/leaderboard"
        icon={<Leaderboard />}
        to="/leaderboard"
        href="/leaderboard"
        LinkComponent={MuiLink}
      />
      {!session && (
        // @ts-ignore next-line
        <BottomNavigationAction
          label="Login"
          value="/api/auth/signin"
          icon={<Login />}
          to="/api/auth/signin"
          href="/api/auth/signin"
          LinkComponent={MuiLink}
        />
      )}
    </BottomNavigation>
  );
}
