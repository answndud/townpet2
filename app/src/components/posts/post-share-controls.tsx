"use client";

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
    } catch {
      setMessage("링크 복사에 실패했습니다.");
    }
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className="border border-[#bfd0ec] bg-white px-3 py-1.5 text-xs font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
      >
        링크 복사
      </button>
      <a
        href={xShareUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="border border-[#bfd0ec] bg-white px-3 py-1.5 text-xs font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
      >
        X 공유
      </a>
      <a
        href={kakaoShareUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="border border-[#f3d899] bg-[#fff7e5] px-3 py-1.5 text-xs font-semibold text-[#6c5319] transition hover:bg-[#fff0cb]"
      >
        카카오 공유
      </a>
      {message ? <span className="text-[11px] text-[#5a7398]">{message}</span> : null}
    </div>
  );
}
