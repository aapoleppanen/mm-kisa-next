import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { getSession, signOut, useSession } from "next-auth/react";
import { Box, Button } from "@mui/material";

const Header = () => {
  const router = useRouter();
  const { data: session, status } = useSession();

  const isActive: (pathname: string) => boolean = (pathname) =>
    router.pathname === pathname;

  return <>
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      p={2}
      position="fixed"
      width="100%"
      bgcolor="white"
      zIndex={2}
    >
      <Box display="flex" m={1} gap={1}>
        {session && (
          <>
            <Link href="/profile" legacyBehavior>
              <Button
                LinkComponent="a"
                color={isActive("/profile") ? "secondary" : "primary"}
              >
                Profile
              </Button>
            </Link>
            <Link href="/matches" legacyBehavior>
              <Button
                LinkComponent="a"
                color={isActive("/matches") ? "secondary" : "primary"}
              >
                Matches
              </Button>
            </Link>
            <Link href="/winner" legacyBehavior>
              <Button
                LinkComponent="a"
                color={isActive("/winner") ? "secondary" : "primary"}
              >
                Winner
              </Button>
            </Link>
            <Link href="/topScorer" legacyBehavior>
              <Button
                LinkComponent="a"
                color={isActive("/topScorer") ? "secondary" : "primary"}
              >
                Top Scorer
              </Button>
            </Link>
            <Link href="/leaderboard" legacyBehavior>
              <Button
                LinkComponent="a"
                color={isActive("/leaderboard") ? "secondary" : "primary"}
              >
                Leaderboard
              </Button>
            </Link>
          </>
        )}
      </Box>
      <Box>
        {!session ? (
          <Link href="/api/auth/signin" data-active={isActive("/signup")}>
            Log in
          </Link>
        ) : (
          <Box display="flex">
            <Box m={1}>
              {session.user.name} ({session.user.email})
            </Box>
            <Button onClick={() => signOut()}>
              <a>Log out</a>
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  </>;
};

export default Header;
