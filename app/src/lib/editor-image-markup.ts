const IMAGE_TOKEN_REGEX = /!\[[^\]]*\]\(([^)\s]+)\)(?:\{\s*width\s*=\s*\d{2,4}\s*\})?/g;

function normalizeUrls(urls: string[]) {
  return Array.from(
    new Set(
      urls
        .map((url) => url.trim())
        .filter((url) => url.length > 0),
    ),
  );
}

export function extractImageUrlsFromMarkup(markup: string) {
  const urls: string[] = [];
  for (const match of markup.matchAll(IMAGE_TOKEN_REGEX)) {
    const rawUrl = match[1]?.trim();
    if (rawUrl) {
      urls.push(rawUrl);
    }
  }
  return normalizeUrls(urls);
}

export function removeImageTokensByUrls(markup: string, removedUrls: string[]) {
  if (removedUrls.length === 0) {
    return markup;
  }
  const removedSet = new Set(normalizeUrls(removedUrls));
  const next = markup.replace(IMAGE_TOKEN_REGEX, (fullMatch, rawUrl: string) =>
    removedSet.has(rawUrl.trim()) ? "" : fullMatch,
  );
  return next.replace(/\n{3,}/g, "\n\n").trim();
}

export function buildImageMarkdown(urls: string[], startIndex = 1) {
  return urls
    .map((url, index) => `![첨부 이미지 ${startIndex + index}](${url})`)
    .join("\n");
}

export function areSameStringArray(a: string[], b: string[]) {
  if (a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) {
      return false;
    }
  }
  return true;
}
