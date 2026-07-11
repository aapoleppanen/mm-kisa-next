"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient, magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "",
  plugins: [adminClient(), magicLinkClient()],
});

export const { signIn, signOut, signUp, useSession } = authClient;
