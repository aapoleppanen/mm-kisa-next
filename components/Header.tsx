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

  return (
    <>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        m={2}
      >
        <Box display="flex" m={1} gap={1}>
          <Link href="/profile">
            <a data-active={isActive("/profile")}>Profile</a>
          </Link>
          <Link href="/matches">
            <a data-active={isActive("/matches")}>Matches</a>
          </Link>
          <Link href="/winner">
            <a data-active={isActive("/winner")}>Winner</a>
          </Link>
          <Link href="/topScorer">
            <a data-active={isActive("/topScorer")}>Top Scorer</a>
          </Link>
          <Link href="/leaderboard">
            <a data-active={isActive("/leaderboard")}>Leaderboard</a>
          </Link>
        </Box>
        <Box>
          {!session ? (
            <Link href="/api/auth/signin">
              <a data-active={isActive("/signup")}>Log in</a>
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
      <style jsx>{`
        .bold {
          font-weight: bold;
        }

        a {
          text-decoration: none;
          color: var(--geist-foreground);
          color: blue;
          display: inline-block;
        }

        a[data-active="true"] {
          color: grey;
        }

        a + a {
          margin-left: 1rem;
        }
      `}</style>
    </>
  );
};

export default Header;
