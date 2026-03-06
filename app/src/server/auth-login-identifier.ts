import { createHash } from "crypto";

const LOGIN_IDENTIFIER_MAX_LENGTH = 320;

export function normalizeLoginIdentifierEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().slice(0, LOGIN_IDENTIFIER_MAX_LENGTH);
}

export function hashLoginIdentifierEmail(value: string | null | undefined) {
  return createHash("sha256")
    .update(normalizeLoginIdentifierEmail(value) || "unknown")
    .digest("hex");
}

export function maskLoginIdentifierEmail(value: string | null | undefined) {
  const normalized = normalizeLoginIdentifierEmail(value);
  if (!normalized) {
    return null;
  }

  const [localPart, domain = ""] = normalized.split("@");
  if (!domain) {
    const head = localPart.slice(0, 1);
    return `${head || "*"}***`;
  }

  const [domainName, ...domainSuffixParts] = domain.split(".");
  const domainSuffix = domainSuffixParts.join(".");

  const maskedLocal =
    localPart.length <= 1 ? `${localPart || "*"}***` : `${localPart.slice(0, 2)}***`;
  const maskedDomain =
    domainName.length <= 1 ? `${domainName || "*"}***` : `${domainName.slice(0, 2)}***`;

  return domainSuffix
    ? `${maskedLocal}@${maskedDomain}.${domainSuffix}`
    : `${maskedLocal}@${maskedDomain}`;
}
