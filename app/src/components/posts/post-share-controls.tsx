"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type PostShareControlsProps = {
  url: string;
  title: string;
};

function encode(value: string) {
  return encodeURIComponent(value);
}

export function PostShareControls({ url, title }: PostShareControlsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const xShareUrl = useMemo(
    () =>
      `https://x.com/intent/tweet?text=${encode(`${title} - TownPet`)}&url=${encode(url)}`,
    [title, url],
  );

  const kakaoShareUrl = useMemo(
    () => `https://sharer.kakao.com/talk/friends/picker/link?url=${encode(url)}`,
    [url],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("링크를 복사했습니다.");
      setIsOpen(false);
    } catch {
      setMessage("링크 복사에 실패했습니다.");
    }
  };

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="border border-[#bfd0ec] bg-white px-3 py-1.5 text-xs font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
        aria-expanded={isOpen}
        aria-controls="post-share-menu"
      >
        공유
      </button>

      {isOpen ? (
        <div
          id="post-share-menu"
          className="absolute left-0 top-[calc(100%+6px)] z-20 min-w-[140px] border border-[#c7d7ef] bg-white p-1.5 shadow-[0_8px_18px_rgba(16,40,74,0.12)]"
        >
          <button
            type="button"
            onClick={handleCopy}
            className="flex w-full items-center justify-start px-2.5 py-1.5 text-xs font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
          >
            링크 복사
          </button>
          <a
            href={xShareUrl}
            target="_blank"
            rel="noreferrer noopener"
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center justify-start px-2.5 py-1.5 text-xs font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
          >
            X 공유
          </a>
          <a
            href={kakaoShareUrl}
            target="_blank"
            rel="noreferrer noopener"
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center justify-start px-2.5 py-1.5 text-xs font-semibold text-[#6c5319] transition hover:bg-[#fff5df]"
          >
            카카오 공유
          </a>
          <Link
            href={url}
            target="_blank"
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center justify-start px-2.5 py-1.5 text-xs font-semibold text-[#4f678d] transition hover:bg-[#f3f7ff]"
          >
            새 탭에서 열기
          </Link>
        </div>
      ) : null}

      {message ? <span className="text-[11px] text-[#5a7398]">{message}</span> : null}
    </div>
  );
}
