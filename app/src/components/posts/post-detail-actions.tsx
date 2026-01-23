"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deletePostAction } from "@/server/actions/post";

type PostDetailActionsProps = {
  postId: string;
};

export function PostDetailActions({ postId }: PostDetailActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!window.confirm("게시물을 삭제할까요?")) {
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await deletePostAction(postId);
      if (!result.ok) {
        setError(result.message);
        return;
      }

      router.push("/");
    });
  };

  return (
    <div className="flex items-center gap-3">
      {error ? <span className="text-xs text-red-500">{error}</span> : null}
      <button
        type="button"
        onClick={handleDelete}
        className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-[#e3d6c4] disabled:text-[#cbbba5]"
        disabled={isPending}
      >
        {isPending ? "삭제 중..." : "삭제"}
      </button>
    </div>
  );
}
