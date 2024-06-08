import { Box, Button, TextField } from "@mui/material";
import { User } from "@prisma/client";
import { GetServerSideProps } from "next";
import Image from "next/image";
import { getSession, useSession } from "next-auth/react";
import prisma from "../../lib/prisma";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

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
  if (!user) return <>Not signed in</>;

  const router = useRouter();

  const { email, image, name } = user;

  const [newName, setNewName] = useState("");

  const handleSave = async () => {
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName }),
      });
      router.push("/profile");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Box m={1}>
      <Box width="250px" height="auto" my={1}>
        <Image
          src={image}
          width="100%"
          height="100%"
          layout="responsive"
          objectFit="contain"
        />
      </Box>
      <Box display="flex" alignItems="center" my={2}>
        <Box my={1} mr={1}>
          Name:
        </Box>{" "}
        <TextField
          label={name}
          value={newName}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setNewName(event.target.value);
          }}
        />
      </Box>
      <Box my={2}>Email: {email}</Box>
      <Box display="flex">
        <Box mr={1}>
          <Link href="/profile" passHref legacyBehavior>
            <Button variant="contained" color="secondary">
              Cancel
            </Button>
          </Link>
        </Box>
        <Box>
          <Button variant="contained" onClick={handleSave}>
            Save Profile
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Profile;
