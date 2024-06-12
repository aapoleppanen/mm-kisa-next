import { Box } from "@mui/material";
import loginPic from "../assets/login.jpg";
import Layout from "../components/Layout";

const Home = () => {
  return (
    <Box
      typography="h1"
      sx={{
        backgroundImage: `url(${loginPic.src})`,
        backgroundPosition: "center",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        backgroundSize: "100%",
        backgroundRepeat: "no-repeat",
        justifyContent: "center",
        textAlign: "center",
        paddingTop: "70vh",
      }}
    >
      <Box
      sx={{
        fontFamily: "Roboto, sans-serif", 
        fontWeight: 700, 
        fontSize: "3rem", 
        color: "#26413c",
        textTransform: "uppercase", 
        letterSpacing: "0.1em", 
        textAlign: "center", 
        textShadow: "2px 2px 4px rgba(0, 0, 0, 0.3)", 
      }}
    >
      EM-kisa veikkaus app!
    </Box>
    </Box>
  );
};

export default Home;
