import {
  detectContactSignals,
  type ContactSignalType,
} from "@/lib/contact-policy";

export type SearchTermSkipReason = "INVALID_TERM" | "SENSITIVE_TERM";

const TRACKABLE_TERM_MIN_LENGTH = 2;
const TRACKABLE_TERM_MAX_LENGTH = 50;
const SEARCH_TERM_SENSITIVE_SIGNALS = new Set<ContactSignalType>([
  "email",
  "phone",
  "open_kakao",
  "messenger_link",
  "kakao_id",
]);

export function normalizeSearchTerm(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (
    normalized.length < TRACKABLE_TERM_MIN_LENGTH ||
    normalized.length > TRACKABLE_TERM_MAX_LENGTH
  ) {
    return null;
  }

  return normalized;
}

export function detectSensitiveSearchSignals(value: string) {
  const normalized = normalizeSearchTerm(value);
  if (!normalized) {
    return [] as ContactSignalType[];
  }

  return detectContactSignals(normalized).filter((signal) =>
    SEARCH_TERM_SENSITIVE_SIGNALS.has(signal),
  );
}

export function shouldExcludeSearchTermFromStats(value: string) {
  return detectSensitiveSearchSignals(value).length > 0;
}
