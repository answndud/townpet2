export type LinkProvider = "youtube" | "instagram" | "twitter" | "external";

export type LinkToken =
  | { type: "text"; value: string }
  | {
      type: "link";
      href: string;
      label: string;
      provider: LinkProvider;
      youtubeVideoId?: string;
    };

export type YoutubeEmbedLink = {
  videoId: string;
  href: string;
  label: string;
};

const URL_REGEX = /https?:\/\/[^\s<>"']+/gi;

function trimTrailingPunctuation(value: string) {
  const trimmed = value.replace(/[.,!?;:]+$/g, "");
  return {
    clean: trimmed,
    trailing: value.slice(trimmed.length),
  };
}

function parseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function getLinkProvider(href: string): LinkProvider {
  const parsed = parseUrl(href);
  const host = parsed?.hostname.replace(/^www\./, "").toLowerCase() ?? "";

  if (
    host === "youtube.com" ||
    host.endsWith(".youtube.com") ||
    host === "youtu.be"
  ) {
    return "youtube";
  }

  if (host === "instagram.com" || host === "instagr.am") {
    return "instagram";
  }

  if (host === "twitter.com" || host === "x.com" || host === "t.co") {
    return "twitter";
  }

  return "external";
}

export function extractYoutubeVideoId(href: string) {
  const parsed = parseUrl(href);
  if (!parsed) {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  let candidate = "";

  if (host === "youtu.be") {
    candidate = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
  } else if (host === "youtube.com" || host.endsWith(".youtube.com")) {
    if (parsed.pathname === "/watch") {
      candidate = parsed.searchParams.get("v") ?? "";
    } else if (parsed.pathname.startsWith("/shorts/")) {
      candidate = parsed.pathname.split("/")[2] ?? "";
    } else if (parsed.pathname.startsWith("/live/")) {
      candidate = parsed.pathname.split("/")[2] ?? "";
    } else if (parsed.pathname.startsWith("/embed/")) {
      candidate = parsed.pathname.split("/")[2] ?? "";
    }
  }

  const normalized = candidate.trim();
  if (!/^[a-zA-Z0-9_-]{6,20}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

export function parseLinkTokens(text: string): LinkToken[] {
  if (!text) {
    return [];
  }

  const tokens: LinkToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const matcher = new RegExp(URL_REGEX);

  while ((match = matcher.exec(text)) !== null) {
    const index = match.index;
    const raw = match[0] ?? "";

    if (index > lastIndex) {
      tokens.push({
        type: "text",
        value: text.slice(lastIndex, index),
      });
    }

    const { clean, trailing } = trimTrailingPunctuation(raw);
    if (clean.length > 0) {
      const provider = getLinkProvider(clean);
      const youtubeVideoId =
        provider === "youtube" ? extractYoutubeVideoId(clean) : null;
      tokens.push({
        type: "link",
        href: clean,
        label: clean,
        provider,
        ...(youtubeVideoId ? { youtubeVideoId } : {}),
      });
    }

    if (trailing.length > 0) {
      tokens.push({
        type: "text",
        value: trailing,
      });
    }

    lastIndex = index + raw.length;
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: "text",
      value: text.slice(lastIndex),
    });
  }

  return tokens;
}

export function extractYoutubeEmbedLinks(tokens: LinkToken[]): YoutubeEmbedLink[] {
  const map = new Map<string, YoutubeEmbedLink>();

  for (const token of tokens) {
    if (token.type !== "link" || !token.youtubeVideoId) {
      continue;
    }

    if (map.has(token.youtubeVideoId)) {
      continue;
    }

    map.set(token.youtubeVideoId, {
      videoId: token.youtubeVideoId,
      href: token.href,
      label: token.label,
    });
  }

  return Array.from(map.values());
}
