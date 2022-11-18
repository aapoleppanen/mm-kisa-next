import { Box, Card, useMediaQuery } from "@mui/material";
import React, { ReactNode } from "react";
import { theme } from "../pages/_app";
import Header from "./Header";
import BottomNav from "./BottomNav";

type Props = {
  children: ReactNode;
};

const Layout: React.FC<Props> = (props) => {
  const mobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <>
      {!mobile && <Header />}
      <Box
        pt={mobile ? 0 : 10}
        pb={mobile ? 10 : 4}
        width={mobile ? "unset" : "80vw"}
        m="auto"
      >
        {props.children}
      </Box>
      {mobile && <BottomNav />}
    </>
  );
};

export default Layout;
