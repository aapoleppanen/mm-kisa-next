import Link from "next/link";
import { Box, Button } from "@mui/material";
import { User } from "@prisma/client";
import { GetServerSideProps } from "next";
import Image from "next/image";
import { getSession, useSession } from "next-auth/react";
import prisma from "../../lib/prisma";

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const session = await getSession({ req });

  if (!session?.user) {
    return {
      redirect: {
        permanent: false,
        destination: "/",
      },
      props: {},
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
  });

  return {
    props: { user },
  };
};

type Props = {
  user: User;
};

const Profile = ({ user }: Props) => {
  const { email, image, name } = user;

  return (
    <Box m={1}>
      <Link href="/profile/editProfile" passHref>
        <Button variant="contained">Edit profile</Button>
      </Link>
      <Box width="250px" height="auto" my={1}>
        <Image
          src={image}
          width="100%"
          height="100%"
          layout="responsive"
          objectFit="contain"
        />
      </Box>
      <Box my={1}>Name: {name}</Box>
      <Box my={1}>Email: {email}</Box>
    </Box>
  );
};

export default Profile;
