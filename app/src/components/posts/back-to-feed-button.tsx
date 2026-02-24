"use client";

import { useRouter } from "next/navigation";

type BackToFeedButtonProps = {
  href?: string;
  className?: string;
};

export function BackToFeedButton({
  href = "/feed",
  className,
}: BackToFeedButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        router.push(href);
      }}
    >
      목록으로
    </button>
  );
}
