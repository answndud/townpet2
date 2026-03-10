const LOCAL_UPLOAD_PREFIX = "/uploads/";
const MEDIA_UPLOAD_PREFIX = "/media/";
const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

function normalizeUploadPathname(pathname: string) {
  const trimmed = pathname.trim();
  if (!trimmed) {
    return "";
  }

  const normalized = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  if (!normalized.startsWith("uploads/")) {
    return "";
  }

  if (
    normalized.includes("..") ||
    normalized.includes("\\") ||
    normalized.includes("?") ||
    normalized.includes("#") ||
    normalized.endsWith("/")
  ) {
    return "";
  }

  return normalized;
}

function normalizeMediaUploadPathname(pathname: string) {
  const trimmed = pathname.trim();
  if (!trimmed) {
    return "";
  }

  const normalized = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  if (!normalized.startsWith("media/")) {
    return "";
  }

  return normalizeUploadPathname(normalized.slice("media/".length));
}

export function isTrustedUploadPathname(pathname: string) {
  return normalizeUploadPathname(pathname).length > 0;
}

export function getTrustedUploadPathname(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith(LOCAL_UPLOAD_PREFIX)) {
    const normalized = normalizeUploadPathname(trimmed);
    return normalized || null;
  }

  if (trimmed.startsWith(MEDIA_UPLOAD_PREFIX)) {
    const normalized = normalizeMediaUploadPathname(trimmed);
    return normalized || null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") {
    return null;
  }

  if (!parsed.hostname.toLowerCase().endsWith(BLOB_HOST_SUFFIX)) {
    return null;
  }

  const normalized = normalizeUploadPathname(parsed.pathname);
  return normalized || null;
}

export function getTrustedUploadStorageProvider(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith(LOCAL_UPLOAD_PREFIX)) {
    return "LOCAL" as const;
  }

  try {
    const parsed = new URL(trimmed);
    if (
      parsed.protocol === "https:" &&
      parsed.hostname.toLowerCase().endsWith(BLOB_HOST_SUFFIX)
    ) {
      return "BLOB" as const;
    }
  } catch {
    return null;
  }

  return null;
}

export function getUploadProxyPath(value: string) {
  const trustedPathname = getTrustedUploadPathname(value);
  if (!trustedPathname) {
    return null;
  }

  return `${MEDIA_UPLOAD_PREFIX}${trustedPathname}`;
}

export function isTrustedUploadUrl(value: string) {
  return getTrustedUploadPathname(value) !== null;
}
