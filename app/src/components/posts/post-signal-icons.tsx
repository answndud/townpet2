import type { PostSignal } from "@/lib/post-presenter";

type PostSignalIconsProps = {
  signals: PostSignal[];
};

function SignalIconFrame({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex h-4 w-4 items-center justify-center text-[#8e939c]"
      aria-label={label}
      title={label}
    >
      {children}
    </span>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">
      <rect x="1.5" y="2" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="5.2" cy="6.1" r="1.2" fill="currentColor" />
      <path d="M3.2 12.2 6.7 8.9l2.1 2 1.6-1.5 2.4 2.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M3 2.5h2.2l2.7 3.9 3.1-3.9H13l-4.1 5.2 4.3 5.8h-2.2L8 9.4l-3.2 4.1H3l4.2-5.3L3 2.5Z" fill="currentColor" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="8" r="2.6" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="11.4" cy="4.7" r="0.9" fill="currentColor" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M6.4 5.1 4.9 6.6a2.3 2.3 0 0 0 3.3 3.2l1.5-1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M9.6 10.9l1.5-1.5a2.3 2.3 0 1 0-3.3-3.2L6.3 7.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function PostSignalIcons({ signals }: PostSignalIconsProps) {
  if (signals.length === 0) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      {signals.map((signal) => {
        if (signal === "image") {
          return (
            <SignalIconFrame key={signal} label="이미지 첨부">
              <ImageIcon />
            </SignalIconFrame>
          );
        }
        if (signal === "twitter") {
          return (
            <SignalIconFrame key={signal} label="X(트위터) 링크 포함">
              <XIcon />
            </SignalIconFrame>
          );
        }
        if (signal === "instagram") {
          return (
            <SignalIconFrame key={signal} label="인스타그램 링크 포함">
              <InstagramIcon />
            </SignalIconFrame>
          );
        }
        return (
          <SignalIconFrame key={signal} label="외부 링크 포함">
            <LinkIcon />
          </SignalIconFrame>
        );
      })}
    </span>
  );
}
