import { Box, Button, TextField } from "@mui/material";
import { User } from "@prisma/client";
import { GetServerSideProps } from "next";
import Image from "next/image";
import prisma from "../../lib/prisma";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { auth } from "@/auth";
import Avatar from "@/components/profile/avatar";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await auth(context);

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
  const router = useRouter();

  const { email, image, name } = user;

  const [newName, setNewName] = useState(name);

  const [avatar_url, setAvatarUrl] = useState<string | null>(image);

  if (!user) return <>Not signed in</>;

  const handleSave = async () => {
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName, avatar_url }),
      });
      router.push("/profile");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Box m={1}>
      <Box width="250px" height="auto" my={1}>
      <Avatar
      uid={user?.id ?? null}
      url={avatar_url}
      size={150}
      onUpload={(url) => {
        console.log(url)
        setAvatarUrl(url)
      }}
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
