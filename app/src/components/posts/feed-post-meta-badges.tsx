type FeedPostMetaBadgesProps = {
  label: string;
  chipClass: string;
  status: "ACTIVE" | "HIDDEN" | "DELETED";
  className?: string;
};

export function FeedPostMetaBadges({
  label,
  chipClass,
  status,
  className,
}: FeedPostMetaBadgesProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-1 text-[10px] sm:text-[11px] ${className ?? "mb-1 justify-end"}`}
    >
      <span
        className={`inline-flex max-w-full items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none ${chipClass}`}
      >
        {label}
      </span>
      {status === "HIDDEN" ? (
        <span className="rounded-md border border-rose-300 bg-rose-50 px-1.5 py-0.5 text-[10px] leading-none text-rose-700">
          숨김
        </span>
      ) : null}
    </div>
  );
}
