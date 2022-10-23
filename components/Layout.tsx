import { Box } from "@mui/material";
import React, { ReactNode } from "react";
import Header from "./Header";

type Props = {
  children: ReactNode;
};

const Layout: React.FC<Props> = (props) => (
  <>
    <Header />
    <Box mx={2}>{props.children}</Box>
  </>
);

export default Layout;
