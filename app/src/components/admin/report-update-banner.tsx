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
    <div className="border border-[#bfd0ec] bg-[#f6f9ff] px-4 py-3 text-xs text-[#4f678d]">
      {message}
    </div>
  );
}
