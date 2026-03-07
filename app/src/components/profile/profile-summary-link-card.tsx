import Link from "next/link";

type ProfileSummaryLinkCardProps = {
  href: string;
  eyebrow: string;
  count: number;
  label: string;
  description: string;
};

export function ProfileSummaryLinkCard({
  href,
  eyebrow,
  count,
  label,
  description,
}: ProfileSummaryLinkCardProps) {
  return (
    <Link
      href={href}
      aria-label={`${eyebrow} 페이지로 이동`}
      className="tp-card block cursor-pointer p-4 transition hover:-translate-y-0.5 hover:border-[#bfd2ee] hover:shadow-[0_18px_34px_rgba(34,73,127,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/35"
    >
      <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">{eyebrow}</p>
      <p className="mt-2 text-3xl font-bold text-[#10284a]">{count}</p>
      <p className="text-xs text-[#4f678d]">{label}</p>
      <p className="mt-3 text-xs text-[#5a7398]">{description}</p>
    </Link>
  );
}
