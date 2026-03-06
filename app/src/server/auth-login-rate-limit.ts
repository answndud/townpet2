import { hashLoginIdentifierEmail, normalizeLoginIdentifierEmail } from "@/server/auth-login-identifier";

export const LOGIN_ACCOUNT_IP_RULE_PREFIX = "auth:login:account-ip:";
export const LOGIN_ACCOUNT_RULE_PREFIX = "auth:login:account:";

export type LoginRateLimitRule = {
  key: string;
  limit: number;
  windowMs: number;
};

export function buildLoginRateLimitRules(params: {
  email: string;
  clientIp: string;
}): LoginRateLimitRule[] {
  const normalizedEmail = normalizeLoginIdentifierEmail(params.email);
  const emailHash = hashLoginIdentifierEmail(normalizedEmail || "unknown");

  return [
    {
      key: `auth:login:ip:${params.clientIp}`,
      limit: 10,
      windowMs: 60_000,
    },
    {
      key: `${LOGIN_ACCOUNT_IP_RULE_PREFIX}${emailHash}:${params.clientIp}`,
      limit: 5,
      windowMs: 15 * 60_000,
    },
    {
      key: `${LOGIN_ACCOUNT_RULE_PREFIX}${emailHash}`,
      limit: 30,
      windowMs: 24 * 60 * 60_000,
    },
  ];
}
