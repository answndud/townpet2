import { randomUUID } from "crypto";

type HeaderCarrier = {
  headers: Headers;
};

const DEFAULT_TRUSTED_PROXY_HOPS_PROD = 1;
const MAX_TRUSTED_PROXY_HOPS = 5;

function resolveHeaders(input: HeaderCarrier | Headers) {
  return input instanceof Headers ? input : input.headers;
}

function resolveTrustedProxyHops() {
  const fallback = process.env.NODE_ENV === "production" ? DEFAULT_TRUSTED_PROXY_HOPS_PROD : 0;
  const raw = process.env.TRUSTED_PROXY_HOPS?.trim();

  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.min(parsed, MAX_TRUSTED_PROXY_HOPS);
}

function resolveForwardedForClientIp(forwardedFor: string) {
  const chain = forwardedFor
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (chain.length === 0) {
    return "";
  }

  const trustedProxyHops = resolveTrustedProxyHops();
  if (trustedProxyHops === 0) {
    return chain[0] ?? "";
  }

  const candidateIndex = chain.length - (trustedProxyHops + 1);
  if (candidateIndex >= 0) {
    return chain[candidateIndex] ?? "";
  }

  return chain[0] ?? "";
}

export function getClientIp(input: HeaderCarrier | Headers) {
  const headers = resolveHeaders(input);
  const forwardedFor = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");

  if (forwardedFor) {
    const clientIp = resolveForwardedForClientIp(forwardedFor);
    if (clientIp) {
      return clientIp;
    }
  }

  if (realIp) {
    return realIp.trim();
  }

  return "anonymous";
}

export function getRequestId(input: HeaderCarrier | Headers) {
  const headers = resolveHeaders(input);
  return headers.get("x-request-id")?.trim() || randomUUID();
}
