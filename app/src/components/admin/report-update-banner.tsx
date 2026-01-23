"use client";

import { useEffect, useState } from "react";

type ReportUpdateBannerProps = {
  message: string;
  timeoutMs?: number;
};

export function ReportUpdateBanner({ message, timeoutMs = 5000 }: ReportUpdateBannerProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), timeoutMs);
    return () => clearTimeout(timer);
  }, [timeoutMs]);

  if (!visible) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#e3d6c4] bg-[#fdf9f2] px-4 py-3 text-xs text-[#6f6046]">
      {message}
    </div>
  );
}
