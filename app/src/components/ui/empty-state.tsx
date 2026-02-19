import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: EmptyStateProps) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#c8d7ef] bg-[#f5f9ff] text-xs font-semibold leading-none text-[#5c78a3]">
        EMPTY
      </div>
      <h2 className="text-lg font-semibold text-[#1d3660]">{title}</h2>
      <p className="mx-auto mt-2 max-w-[520px] text-sm text-[#5a7397]">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex h-10 items-center justify-center border border-[#3567b5] bg-[#3567b5] px-4 text-sm font-semibold text-white transition hover:bg-[#2f5da4]"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
