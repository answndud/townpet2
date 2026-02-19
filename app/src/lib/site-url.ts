import { runtimeEnv } from "@/lib/env";

const DEFAULT_DEV_SITE_URL = "http://localhost:3000";

function normalizeOrigin(value?: string) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return null;
  }
}

export function getSiteOrigin() {
  return (
    normalizeOrigin(runtimeEnv.appBaseUrl) ??
    normalizeOrigin(runtimeEnv.authUrl) ??
    normalizeOrigin(runtimeEnv.nextAuthUrl) ??
    DEFAULT_DEV_SITE_URL
  );
}

export function toAbsoluteUrl(path: string) {
  return new URL(path, getSiteOrigin()).toString();
}
