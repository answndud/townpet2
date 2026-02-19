import { randomUUID } from "crypto";

type HeaderCarrier = {
  headers: Headers;
};

function resolveHeaders(input: HeaderCarrier | Headers) {
  return input instanceof Headers ? input : input.headers;
}

export function getClientIp(input: HeaderCarrier | Headers) {
  const headers = resolveHeaders(input);
  const forwardedFor = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "anonymous";
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
