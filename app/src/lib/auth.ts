import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Kakao from "next-auth/providers/kakao";
import Naver from "next-auth/providers/naver";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import type { Provider } from "next-auth/providers";

import { normalizeAuthEmail } from "@/lib/auth-email";
import { assertRuntimeEnv, isSocialDevLoginEnabled, runtimeEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { normalizeSocialAuthProvider } from "@/lib/social-auth";
import {
  applyUserSessionStateToToken,
  syncSessionVersionToken,
} from "@/lib/session-version";
import { authorizeCredentialsLogin } from "@/server/auth-credentials";
import { findUserByEmailInsensitive } from "@/server/queries/user.queries";
import { getActiveInteractionSanction } from "@/server/services/sanction.service";

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

function normalizeAdapterUserEmail<T extends { email?: string | null }>(value: T): T {
  if (typeof value.email !== "string" || value.email.length === 0) {
    return value;
  }

  return {
    ...value,
    email: normalizeAuthEmail(value.email),
  };
}

function invalidateAuthToken<
  TToken extends { id?: string; nickname?: string | null; image?: string | null; sessionInvalidated?: boolean },
>(token: TToken) {
  token.id = undefined;
  token.nickname = null;
  token.image = null;
  token.sessionInvalidated = true;
  return token;
}

assertRuntimeEnv();

const baseAdapter = PrismaAdapter(prisma);
type AdapterUpdateUser = Partial<AdapterUser> & Pick<AdapterUser, "id">;

const adapter: Adapter = {
  ...baseAdapter,
  async createUser(user: AdapterUser) {
    return baseAdapter.createUser!(stripUserName(normalizeAdapterUserEmail(user)));
  },
  async updateUser(user: AdapterUpdateUser) {
    return baseAdapter.updateUser!(stripUserName(normalizeAdapterUserEmail(user)));
  },
  async getUserByEmail(email) {
    const user = await findUserByEmailInsensitive(email, {
      id: true,
      email: true,
      emailVerified: true,
      image: true,
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      name: null,
    };
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

        const existingUser = await findUserByEmailInsensitive(email, {
          id: true,
          email: true,
          nickname: true,
          image: true,
          emailVerified: true,
          sessionVersion: true,
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
    async signIn({ user, account }) {
      if (account?.provider === "kakao" && !user.email) {
        return "/login?error=KAKAO_EMAIL_REQUIRED";
      }
      if (account?.provider === "naver" && !user.email) {
        return "/login?error=NAVER_EMAIL_REQUIRED";
      }

      const socialProvider = normalizeSocialAuthProvider(account?.provider);
      if (
        socialProvider &&
        typeof user.id === "string" &&
        user.id.length > 0 &&
        typeof account?.providerAccountId === "string" &&
        account.providerAccountId.length > 0
      ) {
        const existingLinkedAccount = await prisma.account.findFirst({
          where: {
            userId: user.id,
            provider: socialProvider,
          },
          select: {
            providerAccountId: true,
          },
        });

        if (
          existingLinkedAccount &&
          existingLinkedAccount.providerAccountId !== account.providerAccountId
        ) {
          return "/login?error=OAuthAccountNotLinked";
        }
      }

      if (typeof user.id === "string" && user.id.length > 0) {
        const activeSanction = await getActiveInteractionSanction(user.id);
        if (activeSanction) {
          return `/login?error=${encodeURIComponent(
            activeSanction.level === "PERMANENT_BAN"
              ? "ACCOUNT_PERMANENTLY_BANNED"
              : "ACCOUNT_SUSPENDED",
          )}`;
        }
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
        token.image =
          "image" in user && typeof user.image === "string" && user.image.length > 0
            ? String(user.image)
            : null;
      }

      if (trigger === "update" && session?.user) {
        if (typeof session.user.id === "string" && session.user.id.length > 0) {
          token.id = session.user.id;
        }
        token.nickname =
          typeof session.user.nickname === "string" && session.user.nickname
            ? String(session.user.nickname)
            : null;
        token.image =
          typeof session.user.image === "string" && session.user.image.length > 0
            ? String(session.user.image)
            : null;
        if (typeof session.user.authProvider === "string") {
          token.authProvider = session.user.authProvider;
        }
      }

      if (typeof token.id === "string" && token.id.length > 0) {
        const currentUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { sessionVersion: true, nickname: true, image: true },
        });

        if (!currentUser) {
          return invalidateAuthToken(token);
        }

        const activeSanction = await getActiveInteractionSanction(token.id);
        if (activeSanction) {
          return invalidateAuthToken(token);
        }

        token.image = currentUser.image ?? null;

        return syncSessionVersionToken(
          token,
          {
            sessionVersion: currentUser.sessionVersion,
            nickname: currentUser.nickname,
          },
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
        session.user.image = typeof token.image === "string" ? String(token.image) : null;
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
