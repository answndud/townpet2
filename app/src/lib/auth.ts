import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const isProd = process.env.NODE_ENV === "production";

const credentialsSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(40).optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name: "townpet.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, name } = parsed.data;
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
          return existingUser;
        }

        const created = await prisma.user.create({
          data: { email, name },
        });
        return created;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.nickname = user.nickname ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token) {
        session.user.id = String(token.id ?? "");
        session.user.nickname = token.nickname ? String(token.nickname) : null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
