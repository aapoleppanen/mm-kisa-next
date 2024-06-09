import { PrismaAdapter } from "@auth/prisma-adapter"
import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import prisma from "./lib/prisma"

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [GitHub, Google],
  adapter: PrismaAdapter(prisma),
})

// import { PrismaAdapter } from "@auth/prisma-adapter";
// import { NextApiHandler } from "next";
// import NextAuth from "next-auth";
// import GitHubProvider from "next-auth/providers/github";
// import GoogleProvider from "next-auth/providers/google";
// import prisma from "../../../lib/prisma";

// // TODO: fix authentication

// const authHandler: NextApiHandler = (req, res) => NextAuth(options);
// export default authHandler;

// export const options = {
//   site: process.env.NEXTAUTH_URL,
//   providers: [
//     GoogleProvider({
//       clientId: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//     }),
//     GitHubProvider({
//       clientId: process.env.GITHUB_ID,
//       clientSecret: process.env.GITHUB_SECRET,
//     }),
//   ],
//   adapter: PrismaAdapter(prisma),
//   secret: process.env.SECRET,
//   callbacks: {
//     async session({ session, user }) {
//       if (session?.user) {
//         session.user.id = user.id;
//       }

//       return session;
//     },
//   },
// };
