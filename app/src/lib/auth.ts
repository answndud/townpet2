import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Kakao from "next-auth/providers/kakao";
import Naver from "next-auth/providers/naver";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Provider } from "next-auth/providers";

import { assertRuntimeEnv, runtimeEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/server/request-context";
import { buildLoginRateLimitRules } from "@/server/auth-login-rate-limit";
import { loginSchema } from "@/lib/validations/auth";
import { verifyPassword } from "@/server/password";
import { enforceRateLimit } from "@/server/rate-limit";

const isProd = process.env.NODE_ENV === "production";
const isSocialDevLoginEnabled =
  process.env.NODE_ENV !== "production" &&
  process.env.ENABLE_SOCIAL_DEV_LOGIN === "1";

type SocialDevProvider = "kakao" | "naver";

function isSocialDevProvider(value: string): value is SocialDevProvider {
  return value === "kakao" || value === "naver";
}

function resolveSocialDevEmail(provider: SocialDevProvider, requestedEmail?: string) {
  const trimmed = requestedEmail?.trim().toLowerCase();
  if (trimmed && trimmed.includes("@")) {
    return trimmed;
  }

  if (provider === "kakao") {
    return (process.env.E2E_SOCIAL_KAKAO_EMAIL ?? "e2e.kakao@townpet.dev")
      .trim()
      .toLowerCase();
  }

  return (process.env.E2E_SOCIAL_NAVER_EMAIL ?? "e2e.naver@townpet.dev")
    .trim()
    .toLowerCase();
}

assertRuntimeEnv();

const providers: Provider[] = [
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
        const clientIp = request?.headers ? getClientIp(request.headers) : "anonymous";
        const rateLimitRules = buildLoginRateLimitRules({
          email: parsed.data.email,
          clientIp,
        });

        for (const rule of rateLimitRules) {
          await enforceRateLimit(rule);
        }
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
];

if (isSocialDevLoginEnabled) {
  providers.push(
    Credentials({
      id: "social-dev",
      name: "Social Dev Login",
      credentials: {
        socialProvider: { label: "Social Provider", type: "text" },
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        const providerRaw =
          typeof credentials?.socialProvider === "string"
            ? credentials.socialProvider.trim().toLowerCase()
            : "";
        if (!isSocialDevProvider(providerRaw)) {
          return null;
        }

        const requestedEmail =
          typeof credentials?.email === "string" ? credentials.email : undefined;
        const email = resolveSocialDevEmail(providerRaw, requestedEmail);
        if (!email) {
          return null;
        }

        const existingUser = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            nickname: true,
            image: true,
            emailVerified: true,
          },
        });

        if (existingUser) {
          if (!existingUser.emailVerified) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { emailVerified: new Date() },
            });
          }

          return {
            id: existingUser.id,
            email: existingUser.email,
            name: existingUser.name,
            nickname: existingUser.nickname,
            image: existingUser.image,
          };
        }

        const createdUser = await prisma.user.create({
          data: {
            email,
            name: providerRaw === "kakao" ? "Kakao Dev User" : "Naver Dev User",
            emailVerified: new Date(),
          },
          select: {
            id: true,
            email: true,
            name: true,
            nickname: true,
            image: true,
          },
        });

        return {
          id: createdUser.id,
          email: createdUser.email,
          name: createdUser.name,
          nickname: createdUser.nickname,
          image: createdUser.image,
        };
      },
    }),
  );
}

if (runtimeEnv.isKakaoConfigured) {
  providers.push(
    Kakao({
      clientId: runtimeEnv.kakaoClientId,
      clientSecret: runtimeEnv.kakaoClientSecret,
      allowDangerousEmailAccountLinking: false,
    }),
  );
}

if (runtimeEnv.isNaverConfigured) {
  providers.push(
    Naver({
      clientId: runtimeEnv.naverClientId,
      clientSecret: runtimeEnv.naverClientSecret,
      allowDangerousEmailAccountLinking: false,
    }),
  );
}

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
  providers,
  callbacks: {
    signIn({ user, account }) {
      if (account?.provider === "kakao" && !user.email) {
        return "/login?error=KAKAO_EMAIL_REQUIRED";
      }
      if (account?.provider === "naver" && !user.email) {
        return "/login?error=NAVER_EMAIL_REQUIRED";
      }

      return true;
    },
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
