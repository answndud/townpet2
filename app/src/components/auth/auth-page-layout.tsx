import type { ReactNode } from "react";
import Link from "next/link";

type AuthFooterLink = {
  href: string;
  label: string;
};

type AuthPageLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  form: ReactNode;
  primaryFooterLink: AuthFooterLink;
  secondaryFooterLinks: AuthFooterLink[];
};

export function AuthPageLayout({
  eyebrow,
  title,
  description,
  form,
  primaryFooterLink,
  secondaryFooterLinks,
}: AuthPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f2f7ff_0%,#eef4ff_100%)]">
      <main className="mx-auto flex w-full max-w-[680px] flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
        <header className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.24em] text-[#365885]">{eyebrow}</p>
          <h1 className="text-3xl font-semibold text-[#10284a]">{title}</h1>
          <p className="text-sm text-[#2f4f78]">{description}</p>
        </header>

        <section className="rounded-md border border-[#adc3e6] bg-white p-5 shadow-[0_14px_30px_rgba(16,40,74,0.08)] sm:p-6">
          {form}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#355885]">
          <Link
            href={primaryFooterLink.href}
            className="text-base font-semibold text-[#ff6b00] transition hover:text-[#e85f00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]/35"
          >
            {primaryFooterLink.label}
          </Link>
          <div className="flex flex-wrap items-center gap-4 text-[#436089]">
            {secondaryFooterLinks.map((link) => (
              <Link
                key={`${link.href}:${link.label}`}
                href={link.href}
                className="transition hover:text-[#274b7a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/35"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
