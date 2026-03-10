"use client";

import { useState } from "react";

import { copyPostShareUrl } from "@/lib/post-share";

type PostShareControlsProps = {
  url: string;
  compact?: boolean;
};

export function PostShareControls({ url, compact = false }: PostShareControlsProps) {
  const [message, setMessage] = useState<string | null>(null);

  const handleCopy = async () => {
    const result = await copyPostShareUrl(
      typeof navigator === "undefined" ? undefined : navigator.clipboard,
      url,
    );
    setMessage(result.message);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={handleCopy}
        className={
          compact
            ? "tp-btn-soft tp-btn-xs inline-flex items-center rounded-lg"
            : "tp-btn-soft tp-btn-sm inline-flex items-center rounded-lg"
        }
      >
        공유
      </button>

      {message ? (
        <span aria-live="polite" className="hidden text-[11px] text-[#5a7398] sm:inline">
          {message}
        </span>
      ) : null}
    </div>
  );
}
