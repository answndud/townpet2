"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import {
  buildKakaoSharePayload,
  loadKakaoSdk,
  resolveKakaoShareErrorMessage,
} from "@/lib/kakao-share";

type PostShareControlsProps = {
  url: string;
  title: string;
  compact?: boolean;
};

function encode(value: string) {
  return encodeURIComponent(value);
}

export function PostShareControls({ url, title, compact = false }: PostShareControlsProps) {
  const kakaoJavaScriptKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY?.trim() ?? "";
  const [message, setMessage] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  const xShareUrl = useMemo(
    () =>
      `https://x.com/intent/tweet?text=${encode(`${title} - TownPet`)}&url=${encode(url)}`,
    [title, url],
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

  const handleKakaoShare = async () => {
    setMessage(null);

    if (kakaoJavaScriptKey.length === 0) {
      setMessage("카카오 공유 설정이 비어 있습니다. 링크 복사를 이용해 주세요.");
      return;
    }

    try {
      const kakao = await loadKakaoSdk(kakaoJavaScriptKey);
      kakao.Share.sendDefault(buildKakaoSharePayload({ title, url }));
      setIsOpen(false);
    } catch (error) {
      setMessage(resolveKakaoShareErrorMessage(error));
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    };

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      setIsOpen(false);
      buttonRef.current?.focus();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative flex flex-wrap items-center gap-1.5">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={
          compact
            ? "tp-btn-soft tp-btn-xs inline-flex items-center rounded-lg"
            : "tp-btn-soft tp-btn-sm inline-flex items-center rounded-lg"
        }
        aria-expanded={isOpen}
        aria-controls={menuId}
      >
        공유
      </button>

      {isOpen ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          className="absolute left-0 top-[calc(100%+6px)] z-20 min-w-[140px] rounded-lg border border-[#dbe6f6] bg-white p-1.5 shadow-[0_8px_18px_rgba(16,40,74,0.12)]"
        >
          <button
            type="button"
            onClick={handleCopy}
            role="menuitem"
            className="flex w-full items-center justify-start rounded-md px-2.5 py-1.5 text-xs font-semibold text-[#315484] transition hover:bg-[#f5f9ff]"
          >
            링크 복사
          </button>
          <a
            href={xShareUrl}
            target="_blank"
            rel="noreferrer noopener"
            onClick={() => setIsOpen(false)}
            role="menuitem"
            className="flex w-full items-center justify-start rounded-md px-2.5 py-1.5 text-xs font-semibold text-[#315484] transition hover:bg-[#f5f9ff]"
          >
            X 공유
          </a>
          <button
            type="button"
            onClick={handleKakaoShare}
            role="menuitem"
            className="flex w-full items-center justify-start rounded-md px-2.5 py-1.5 text-xs font-semibold text-[#6c5319] transition hover:bg-[#fff5df]"
          >
            카카오 공유
          </button>
          <Link
            href={url}
            target="_blank"
            onClick={() => setIsOpen(false)}
            role="menuitem"
            className="flex w-full items-center justify-start rounded-md px-2.5 py-1.5 text-xs font-semibold text-[#4f678d] transition hover:bg-[#f5f9ff]"
          >
            새 탭에서 열기
          </Link>
        </div>
      ) : null}

      {message ? <span className="hidden text-[11px] text-[#5a7398] sm:inline">{message}</span> : null}
    </div>
  );
}
