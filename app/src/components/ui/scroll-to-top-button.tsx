"use client";

type ScrollToTopButtonProps = {
  className?: string;
  label?: string;
};

export function ScrollToTopButton({
  className,
  label = "맨위로",
}: ScrollToTopButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      className={className}
    >
      {label}
    </button>
  );
}
