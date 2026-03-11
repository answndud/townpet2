import type { ReactNode } from "react";

type PostDetailInfoSectionProps = {
  title: string;
  children: ReactNode;
};

type PostDetailInfoItemProps = {
  label: string;
  value: ReactNode;
  span?: "base" | "wide" | "full";
};

export function resolvePostDetailInfoItemSpanClass(span?: string | null) {
  if (span === "wide") {
    return "md:col-span-2";
  }

  if (span === "full") {
    return "md:col-span-3";
  }

  return "";
}

export function PostDetailInfoSection({
  title,
  children,
}: PostDetailInfoSectionProps) {
  return (
    <section className="tp-card p-5 sm:p-6">
      <h2 className="tp-text-section-title tp-text-heading">{title}</h2>
      <div className="tp-text-accent mt-4 grid gap-3 text-sm md:grid-cols-3">{children}</div>
    </section>
  );
}

export function PostDetailInfoItem({
  label,
  value,
  span = "base",
}: PostDetailInfoItemProps) {
  const spanClassName = resolvePostDetailInfoItemSpanClass(span);

  return (
    <div className={`tp-border-soft tp-surface-soft rounded-lg border px-3 py-3 ${spanClassName}`}>
      <p className="tp-text-label text-[11px] uppercase tracking-[0.2em]">{label}</p>
      <div className="tp-text-heading mt-1 font-medium">{value}</div>
    </div>
  );
}
