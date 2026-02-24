import { renderLiteMarkdown } from "@/lib/markdown-lite";

export function markupToEditorHtml(markup: string) {
  if (!markup.trim()) {
    return "";
  }
  return renderLiteMarkdown(markup);
}

function normalizeWhitespace(value: string) {
  return value.replace(/\u00a0/g, " ");
}

function serializeEditorNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return normalizeWhitespace(node.textContent ?? "");
  }

  if (!(node instanceof HTMLElement)) {
    return "";
  }

  const serializeChildren = () => Array.from(node.childNodes).map(serializeEditorNode).join("");

  if (node.tagName === "BR") {
    return "\n";
  }

  if (node.tagName === "H1") {
    return `# ${serializeChildren().trim()}\n\n`;
  }
  if (node.tagName === "H2") {
    return `## ${serializeChildren().trim()}\n\n`;
  }
  if (node.tagName === "H3") {
    return `### ${serializeChildren().trim()}\n\n`;
  }

  if (node.tagName === "UL") {
    const items = Array.from(node.children)
      .filter((child) => child.tagName === "LI")
      .map((child) => `- ${serializeEditorNode(child).trim()}`)
      .join("\n");
    return items ? `${items}\n\n` : "";
  }

  if (node.tagName === "OL") {
    const items = Array.from(node.children)
      .filter((child) => child.tagName === "LI")
      .map((child, index) => `${index + 1}. ${serializeEditorNode(child).trim()}`)
      .join("\n");
    return items ? `${items}\n\n` : "";
  }

  if (node.tagName === "LI") {
    return serializeChildren().replace(/\n+/g, " ").trim();
  }

  if (node.tagName === "BLOCKQUOTE") {
    const lines = serializeChildren()
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `> ${line}`)
      .join("\n");
    return lines ? `${lines}\n\n` : "";
  }

  if (node.tagName === "A") {
    const href = node.getAttribute("href")?.trim();
    const label = serializeChildren().trim();
    if (!href) {
      return label;
    }
    return `[${label.length > 0 ? label : href}](${href})`;
  }

  if (node.tagName === "IMG") {
    const src = node.getAttribute("src")?.trim();
    if (!src) {
      return "";
    }
    const rawAlt = normalizeWhitespace(node.getAttribute("alt") ?? "");
    const alt = rawAlt.replace(/[\[\]]/g, "").trim() || "첨부 이미지";
    const widthRaw = node.style.width || node.getAttribute("width") || "";
    const widthMatch = widthRaw.match(/\d+/);
    const widthToken = widthMatch ? `{width=${widthMatch[0]}}` : "";
    return `![${alt}](${src})${widthToken}\n\n`;
  }

  if (node.tagName === "STRONG" || node.tagName === "B") {
    return `**${serializeChildren()}**`;
  }
  if (node.tagName === "EM" || node.tagName === "I") {
    return `*${serializeChildren()}*`;
  }
  if (node.tagName === "U") {
    return `__${serializeChildren()}__`;
  }
  if (node.tagName === "S" || node.tagName === "DEL") {
    return `~~${serializeChildren()}~~`;
  }
  if (node.tagName === "CODE") {
    return `\`${serializeChildren()}\``;
  }
  if (node.tagName === "PRE") {
    return `\`${serializeChildren().trim()}\``;
  }

  if (node.tagName === "SPAN") {
    const className = node.className;
    const text = serializeChildren();
    const sizeToken = className.includes("text-xs")
      ? "small"
      : className.includes("text-lg")
        ? "large"
        : className.includes("text-xl")
          ? "xlarge"
          : className.includes("text-base")
            ? "normal"
            : null;
    const colorToken = className.includes("text-rose-600")
      ? "red"
      : className.includes("text-emerald-700")
        ? "green"
        : className.includes("text-slate-600")
          ? "gray"
          : className.includes("text-[#2f5da4]")
            ? "blue"
            : null;

    let output = text;
    if (sizeToken) {
      output = `[size=${sizeToken}]${output}[/size]`;
    }
    if (colorToken) {
      output = `[color=${colorToken}]${output}[/color]`;
    }
    return output;
  }

  if (node.tagName === "P" || node.tagName === "DIV") {
    const text = serializeChildren().trim();
    return text ? `${text}\n\n` : "\n";
  }

  return serializeChildren();
}

export function serializeEditorHtml(html: string) {
  if (!html.trim()) {
    return "";
  }

  const container = document.createElement("div");
  container.innerHTML = html;
  return Array.from(container.childNodes)
    .map(serializeEditorNode)
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
