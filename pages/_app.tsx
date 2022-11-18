import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { AppProps } from "next/app";
import Layout from "../components/Layout";
import { themeOptions } from "../theme";

export const theme = createTheme(themeOptions);

const App = ({ Component, pageProps }: AppProps<{ session: Session }>) => {
  // @ts-ignore next-line
  const getLayout = Component.getLayout || ((page) => <Layout>{page}</Layout>);

  return (
    <SessionProvider session={pageProps.session}>
      <ThemeProvider theme={theme}>
        <CssBaseline>{getLayout(<Component {...pageProps} />)}</CssBaseline>
      </ThemeProvider>
    </SessionProvider>
  );
};

export default App;
