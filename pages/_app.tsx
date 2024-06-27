import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { AppProps } from "next/app";
import Layout from "../components/Layout";
import { themeOptions } from "../theme";
import { SnackbarProvider } from "notistack";

export const theme = createTheme(themeOptions);

const App = ({ Component, pageProps }: AppProps<{ session: Session }>) => {
  // @ts-ignore next-line
  const getLayout = Component.getLayout || ((page) => <Layout>{page}</Layout>);

  return (
    <div>
      In Maintenance. Should be up by tomorrow (Friday, 28/6). Sorry for the inconvenience.
    </div>
  )

  return (
    <SessionProvider session={pageProps.session}>
      <ThemeProvider theme={theme}>
        <SnackbarProvider autoHideDuration={3000} >
        <CssBaseline>{getLayout(<Component {...pageProps} />)}</CssBaseline>
        </SnackbarProvider>
      </ThemeProvider>
    </SessionProvider>
  );
};

export default App;
