function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function replaceLinkToken(value: string) {
  const tokens: string[] = [];

  const createToken = (html: string) => {
    const token = `@@LINK_TOKEN_${tokens.length}@@`;
    tokens.push(html);
    return token;
  };

  let transformed = value.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi,
    (_, rawLabel: string, rawUrl: string) => {
      const safeUrl = sanitizeHttpUrl(rawUrl);
      if (!safeUrl) {
        return rawLabel;
      }

      const label = rawLabel.trim().length > 0 ? rawLabel : safeUrl;
      return createToken(
        `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer nofollow" class="text-[#2f5da4] underline">${label}</a>`,
      );
    },
  );

  transformed = transformed.replace(/https?:\/\/[^\s<]+/gi, (rawUrl: string) => {
    const safeUrl = sanitizeHttpUrl(rawUrl);
    if (!safeUrl) {
      return rawUrl;
    }

    return createToken(
      `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer nofollow" class="text-[#2f5da4] underline">${safeUrl}</a>`,
    );
  });

  return {
    transformed,
    restore: (source: string) =>
      source.replace(/@@LINK_TOKEN_(\d+)@@/g, (_, rawIndex: string) => {
        const index = Number(rawIndex);
        return Number.isInteger(index) && tokens[index] ? tokens[index] : "";
      }),
  };
}

function renderInline(value: string) {
  const escaped = escapeHtml(value);
  const { transformed, restore } = replaceLinkToken(escaped);

  const withStyles = transformed
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code class="rounded bg-[#eef4ff] px-1 py-0.5">$1</code>');

  return restore(withStyles);
}

export function renderLiteMarkdown(value: string) {
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  if (!normalized) {
    return '<p class="text-sm text-[#5a7398]">미리보기 내용이 없습니다.</p>';
  }

  const blocks: string[] = [];
  const listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length === 0) {
      return;
    }
    blocks.push(
      `<ul class="list-disc space-y-1 pl-5">${listBuffer
        .map((item) => `<li>${renderInline(item)}</li>`)
        .join("")}</ul>`,
    );
    listBuffer.length = 0;
  };

  for (const line of normalized.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      flushList();
      continue;
    }

    if (trimmed.startsWith("- ")) {
      listBuffer.push(trimmed.slice(2).trim());
      continue;
    }

    flushList();
    if (trimmed.startsWith("> ")) {
      blocks.push(
        `<blockquote class="border-l-2 border-[#bfd0ec] pl-3 text-[#4f678d]">${renderInline(
          trimmed.slice(2).trim(),
        )}</blockquote>`,
      );
      continue;
    }

    blocks.push(`<p>${renderInline(line)}</p>`);
  }

  flushList();
  return blocks.join("");
}
