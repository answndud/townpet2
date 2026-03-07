import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Kakao from "next-auth/providers/kakao";
import Naver from "next-auth/providers/naver";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import type { Provider } from "next-auth/providers";

import { assertRuntimeEnv, isSocialDevLoginEnabled, runtimeEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  applyUserSessionStateToToken,
  syncSessionVersionToken,
} from "@/lib/session-version";
import { authorizeCredentialsLogin } from "@/server/auth-credentials";

const isProd = process.env.NODE_ENV === "production";
const socialDevLoginEnabled = isSocialDevLoginEnabled();

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

function stripUserName<T extends { name?: string | null }>(value: T): Omit<T, "name"> {
  const { name, ...rest } = value;
  void name;
  return rest;
}

assertRuntimeEnv();

const baseAdapter = PrismaAdapter(prisma);
type AdapterUpdateUser = Partial<AdapterUser> & Pick<AdapterUser, "id">;

const adapter: Adapter = {
  ...baseAdapter,
  async createUser(user: AdapterUser) {
    return baseAdapter.createUser!(stripUserName(user));
  },
  async updateUser(user: AdapterUpdateUser) {
    return baseAdapter.updateUser!(stripUserName(user));
  },
};

const providers: Provider[] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials, request) {
      return authorizeCredentialsLogin(credentials, request);
    },
  }),
];

if (socialDevLoginEnabled) {
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
            nickname: true,
            image: true,
            emailVerified: true,
            sessionVersion: true,
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
            nickname: existingUser.nickname,
            image: existingUser.image,
            sessionVersion: existingUser.sessionVersion,
          };
        }

        const createdUser = await prisma.user.create({
          data: {
            email,
            emailVerified: new Date(),
          },
          select: {
            id: true,
            email: true,
            nickname: true,
            image: true,
            sessionVersion: true,
          },
        });

        return {
          id: createdUser.id,
          email: createdUser.email,
          nickname: createdUser.nickname,
          image: createdUser.image,
          sessionVersion: createdUser.sessionVersion,
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

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  adapter,
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
    async jwt({ token, user, account, trigger, session }) {
      if (account?.provider) {
        token.authProvider = account.provider;
      }

      if (user && typeof user.id === "string" && user.id.length > 0) {
        applyUserSessionStateToToken(token, {
          id: user.id,
          nickname: "nickname" in user && user.nickname ? String(user.nickname) : null,
          sessionVersion:
            "sessionVersion" in user && typeof user.sessionVersion === "number"
              ? user.sessionVersion
              : undefined,
        });
      }

      if (trigger === "update" && session?.user) {
        if (typeof session.user.id === "string" && session.user.id.length > 0) {
          token.id = session.user.id;
        }
        token.nickname =
          typeof session.user.nickname === "string" && session.user.nickname
            ? String(session.user.nickname)
            : null;
        if (typeof session.user.authProvider === "string") {
          token.authProvider = session.user.authProvider;
        }
      }

      if (typeof token.id === "string" && token.id.length > 0) {
        const currentUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { sessionVersion: true, nickname: true },
        });

        return syncSessionVersionToken(
          token,
          currentUser
            ? {
                sessionVersion: currentUser.sessionVersion,
                nickname: currentUser.nickname,
              }
            : null,
        );
      }

      return token;
    },
    session({ session, token }) {
      if (
        !session.user ||
        !token ||
        token.sessionInvalidated ||
        typeof token.id !== "string" ||
        token.id.length === 0
      ) {
        return {
          ...session,
          user: undefined,
        };
      }

      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.nickname = token.nickname ? String(token.nickname) : null;
        session.user.authProvider =
          typeof token.authProvider === "string" ? String(token.authProvider) : null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
