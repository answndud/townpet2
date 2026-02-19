import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { verifyPassword } from "@/server/password";
import { enforceRateLimit } from "@/server/rate-limit";

const isProd = process.env.NODE_ENV === "production";

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
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        try {
          const forwardedFor = request?.headers?.get("x-forwarded-for");
          const clientIp = forwardedFor?.split(",")[0]?.trim() ?? "anonymous";
          enforceRateLimit({
            key: `auth:login:${clientIp}`,
            limit: 5,
            windowMs: 60_000,
          });
        } catch {
          return null;
        }

        const existingUser = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            email: true,
            name: true,
            nickname: true,
            image: true,
            passwordHash: true,
            emailVerified: true,
          },
        });

        if (!existingUser?.passwordHash || !existingUser.emailVerified) {
          return null;
        }

        const isValid = await verifyPassword(
          parsed.data.password,
          existingUser.passwordHash,
        );
        if (!isValid) {
          return null;
        }

        return {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          nickname: existingUser.nickname,
          image: existingUser.image,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.nickname =
          "nickname" in user && user.nickname ? String(user.nickname) : null;
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
