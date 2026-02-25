import { z } from "zod";

const runtimeEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  AUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().optional(),
  AUTH_URL: z.string().optional(),
  APP_BASE_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
  HEALTH_INTERNAL_TOKEN: z.string().optional(),
  KAKAO_CLIENT_ID: z.string().optional(),
  KAKAO_CLIENT_SECRET: z.string().optional(),
  NAVER_CLIENT_ID: z.string().optional(),
  NAVER_CLIENT_SECRET: z.string().optional(),
});

const parsed = runtimeEnvSchema.parse(process.env);

function splitCsv(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

const authSecret = parsed.AUTH_SECRET ?? parsed.NEXTAUTH_SECRET ?? "";

export const runtimeEnv = {
  nodeEnv: parsed.NODE_ENV,
  databaseUrl: parsed.DATABASE_URL ?? "",
  authSecret,
  nextAuthSecret: parsed.NEXTAUTH_SECRET ?? "",
  authUrl: parsed.AUTH_URL ?? "",
  nextAuthUrl: parsed.NEXTAUTH_URL ?? "",
  appBaseUrl: parsed.APP_BASE_URL ?? "",
  resendApiKey: parsed.RESEND_API_KEY ?? "",
  upstashRedisRestUrl: parsed.UPSTASH_REDIS_REST_URL ?? "",
  upstashRedisRestToken: parsed.UPSTASH_REDIS_REST_TOKEN ?? "",
  blobReadWriteToken: parsed.BLOB_READ_WRITE_TOKEN ?? "",
  sentryDsn: parsed.SENTRY_DSN ?? "",
  corsOrigin: parsed.CORS_ORIGIN ?? "",
  healthInternalToken: parsed.HEALTH_INTERNAL_TOKEN ?? "",
  kakaoClientId: parsed.KAKAO_CLIENT_ID ?? "",
  kakaoClientSecret: parsed.KAKAO_CLIENT_SECRET ?? "",
  isKakaoConfigured:
    Boolean(parsed.KAKAO_CLIENT_ID) && Boolean(parsed.KAKAO_CLIENT_SECRET),
  naverClientId: parsed.NAVER_CLIENT_ID ?? "",
  naverClientSecret: parsed.NAVER_CLIENT_SECRET ?? "",
  isNaverConfigured:
    Boolean(parsed.NAVER_CLIENT_ID) && Boolean(parsed.NAVER_CLIENT_SECRET),
  isUpstashConfigured:
    Boolean(parsed.UPSTASH_REDIS_REST_URL) && Boolean(parsed.UPSTASH_REDIS_REST_TOKEN),
  isBlobConfigured: Boolean(parsed.BLOB_READ_WRITE_TOKEN),
  isProduction: parsed.NODE_ENV === "production",
} as const;

type EnvValidationResult = {
  ok: boolean;
  missing: string[];
};

export function validateRuntimeEnv(): EnvValidationResult {
  const missing: string[] = [];

  if (!runtimeEnv.databaseUrl) {
    missing.push("DATABASE_URL");
  }

  if (!runtimeEnv.authSecret) {
    missing.push("AUTH_SECRET_OR_NEXTAUTH_SECRET");
  }

  const hasUpstashUrl = Boolean(runtimeEnv.upstashRedisRestUrl);
  const hasUpstashToken = Boolean(runtimeEnv.upstashRedisRestToken);
  if (hasUpstashUrl !== hasUpstashToken) {
    missing.push("UPSTASH_REDIS_REST_URL_AND_TOKEN_PAIR");
  }

  const hasKakaoClientId = Boolean(runtimeEnv.kakaoClientId);
  const hasKakaoClientSecret = Boolean(runtimeEnv.kakaoClientSecret);
  if (hasKakaoClientId !== hasKakaoClientSecret) {
    missing.push("KAKAO_CLIENT_ID_AND_SECRET_PAIR");
  }

  const hasNaverClientId = Boolean(runtimeEnv.naverClientId);
  const hasNaverClientSecret = Boolean(runtimeEnv.naverClientSecret);
  if (hasNaverClientId !== hasNaverClientSecret) {
    missing.push("NAVER_CLIENT_ID_AND_SECRET_PAIR");
  }

  if (runtimeEnv.isProduction && !runtimeEnv.appBaseUrl) {
    missing.push("APP_BASE_URL");
  }

  return {
    ok: missing.length === 0,
    missing,
  };
}

export function assertRuntimeEnv() {
  const validation = validateRuntimeEnv();

  if (!validation.ok && runtimeEnv.isProduction) {
    throw new Error(
      `필수 환경변수가 누락되었습니다: ${validation.missing.join(", ")}`,
    );
  }
}

export function getAllowedCorsOrigins() {
  const fromCsv = splitCsv(runtimeEnv.corsOrigin);
  const fromBase = [
    runtimeEnv.appBaseUrl,
    runtimeEnv.nextAuthUrl,
    runtimeEnv.authUrl,
  ].filter((origin) => origin.length > 0);

  return [...new Set([...fromCsv, ...fromBase])];
}
