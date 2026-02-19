export const FORBIDDEN_KEYWORDS_POLICY_KEY = "forbidden_keywords";
export const DEFAULT_FORBIDDEN_KEYWORDS: string[] = [];

const MAX_KEYWORD_LENGTH = 40;

function normalizeKeyword(keyword: string) {
  return keyword.trim().toLowerCase();
}

function compactText(value: string) {
  return value.replace(/\s+/g, "");
}

export function normalizeForbiddenKeywords(
  value: unknown,
  fallback: string[] = DEFAULT_FORBIDDEN_KEYWORDS,
  options?: { allowEmpty?: boolean },
) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const normalized = Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => normalizeKeyword(item))
        .filter((item) => item.length > 0 && item.length <= MAX_KEYWORD_LENGTH),
    ),
  );

  if (normalized.length > 0) {
    return normalized;
  }

  if (options?.allowEmpty && value.length === 0) {
    return [];
  }

  return [...fallback];
}

export function findMatchedForbiddenKeywords(text: string, keywords: string[]) {
  if (text.trim().length === 0 || keywords.length === 0) {
    return [];
  }

  const normalizedText = text.toLowerCase();
  const compactedText = compactText(normalizedText);
  const matches = new Set<string>();

  for (const keyword of keywords) {
    const normalizedKeyword = normalizeKeyword(keyword);
    if (!normalizedKeyword) {
      continue;
    }

    const compactedKeyword = compactText(normalizedKeyword);
    if (
      normalizedText.includes(normalizedKeyword) ||
      compactedText.includes(compactedKeyword)
    ) {
      matches.add(normalizedKeyword);
    }
  }

  return Array.from(matches);
}
