"use client";

import { useEffect } from "react";

type PostViewTrackerProps = {
  postId: string;
};

export function PostViewTracker({ postId }: PostViewTrackerProps) {
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        await fetch(`/api/posts/${postId}/view`, {
          method: "POST",
          credentials: "same-origin",
        });
      } catch {
        if (cancelled) return;
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  return null;
}
