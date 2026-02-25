import { createHash } from "crypto";

export type LoginRateLimitRule = {
  key: string;
  limit: number;
  windowMs: number;
};

function hashLoginIdentity(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function buildLoginRateLimitRules(params: {
  email: string;
  clientIp: string;
}): LoginRateLimitRule[] {
  const normalizedEmail = params.email.trim().toLowerCase();
  const emailHash = hashLoginIdentity(normalizedEmail || "unknown");

  return [
    {
      key: `auth:login:ip:${params.clientIp}`,
      limit: 10,
      windowMs: 60_000,
    },
    {
      key: `auth:login:account-ip:${emailHash}:${params.clientIp}`,
      limit: 5,
      windowMs: 15 * 60_000,
    },
    {
      key: `auth:login:account:${emailHash}`,
      limit: 30,
      windowMs: 24 * 60 * 60_000,
    },
  ];
}
