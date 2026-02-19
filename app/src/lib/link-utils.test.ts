import { describe, expect, it } from "vitest";

import {
  extractYoutubeEmbedLinks,
  extractYoutubeVideoId,
  getLinkProvider,
  parseLinkTokens,
} from "@/lib/link-utils";

describe("link utils", () => {
  it("classifies known providers", () => {
    expect(getLinkProvider("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "youtube",
    );
    expect(getLinkProvider("https://www.instagram.com/p/abc123")).toBe(
      "instagram",
    );
    expect(getLinkProvider("https://x.com/openai")).toBe("twitter");
    expect(getLinkProvider("https://example.com")).toBe("external");
  });

  it("extracts youtube video ids from multiple formats", () => {
    expect(
      extractYoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
    expect(extractYoutubeVideoId("https://youtu.be/dQw4w9WgXcQ?t=10")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(
      extractYoutubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("parses text into link tokens and trims trailing punctuation", () => {
    const tokens = parseLinkTokens(
      "인스타 https://instagram.com/p/abc123, 유튜브 https://youtu.be/dQw4w9WgXcQ.",
    );

    const linkTokens = tokens.filter((token) => token.type === "link");
    expect(linkTokens).toHaveLength(2);
    expect(linkTokens[0]?.href).toBe("https://instagram.com/p/abc123");
    expect(linkTokens[1]?.href).toBe("https://youtu.be/dQw4w9WgXcQ");
  });

  it("returns unique youtube embed links", () => {
    const tokens = parseLinkTokens(
      "a https://youtu.be/dQw4w9WgXcQ b https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    const embeds = extractYoutubeEmbedLinks(tokens);

    expect(embeds).toHaveLength(1);
    expect(embeds[0]?.videoId).toBe("dQw4w9WgXcQ");
  });
});
