"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

import {
  extractYoutubeEmbedLinks,
  parseLinkTokens,
  type LinkToken,
  type YoutubeEmbedLink,
} from "@/lib/link-utils";

type LinkifiedContentProps = {
  text: string;
  className?: string;
  showYoutubeEmbeds?: boolean;
};

function linkClassName(token: LinkToken) {
  if (token.type !== "link") {
    return "";
  }

  const base =
    "break-all font-medium underline decoration-[#8ea6cb] underline-offset-2 transition hover:text-[#244b86]";

  if (token.provider === "youtube") {
    return `${base} text-[#b32727]`;
  }
  if (token.provider === "instagram") {
    return `${base} text-[#8f3aa0]`;
  }
  if (token.provider === "twitter") {
    return `${base} text-[#1f467f]`;
  }

  return `${base} text-[#2d5a9c]`;
}

export function LinkifiedContent({
  text,
  className,
  showYoutubeEmbeds = false,
}: LinkifiedContentProps) {
  const [activeEmbed, setActiveEmbed] = useState<YoutubeEmbedLink | null>(null);

  const tokens = useMemo(() => parseLinkTokens(text), [text]);
  const youtubeLinks = useMemo(
    () => (showYoutubeEmbeds ? extractYoutubeEmbedLinks(tokens) : []),
    [showYoutubeEmbeds, tokens],
  );

  useEffect(() => {
    if (!activeEmbed) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveEmbed(null);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeEmbed]);

  return (
    <div className={className}>
      <span className="whitespace-pre-wrap break-words">
        {tokens.map((token, index) => {
          if (token.type === "text") {
            return <Fragment key={`text-${index}`}>{token.value}</Fragment>;
          }

          return (
            <a
              key={`link-${index}-${token.href}`}
              href={token.href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className={linkClassName(token)}
            >
              {token.label}
            </a>
          );
        })}
      </span>

      {showYoutubeEmbeds && youtubeLinks.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {youtubeLinks.map((item) => (
            <button
              key={item.videoId}
              type="button"
              onClick={() => setActiveEmbed(item)}
              className="inline-flex items-center gap-1 border border-[#f0b4b4] bg-[#fff3f3] px-3 py-1.5 text-xs font-semibold text-[#a02828] transition hover:bg-[#ffe7e7]"
            >
              유튜브 영상 보기
            </button>
          ))}
        </div>
      ) : null}

      {activeEmbed ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setActiveEmbed(null)}
        >
          <div
            className="w-full max-w-4xl border border-[#2e3e55] bg-[#0f1725]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#2e3e55] px-4 py-2 text-sm text-[#dbe6ff]">
              <span className="truncate">YouTube 영상 미리보기</span>
              <button
                type="button"
                onClick={() => setActiveEmbed(null)}
                className="border border-[#4a5e7c] px-2 py-0.5 text-xs transition hover:bg-[#1d2a3f]"
              >
                닫기
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                title="YouTube video preview"
                src={`https://www.youtube-nocookie.com/embed/${activeEmbed.videoId}?autoplay=1&rel=0`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
