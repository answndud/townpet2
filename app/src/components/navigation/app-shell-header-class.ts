export const APP_SHELL_HEADER_CLASS_NAME = [
  "border-b",
  "border-[#d8e4f6]",
  "bg-[#f4f8ffeb]",
  "backdrop-blur-sm",
  "sm:sticky",
  "sm:top-0",
  "sm:z-40",
].join(" ");

export const APP_SHELL_MOBILE_QUICK_LINK_CLASS_NAME = [
  "inline-flex",
  "h-7",
  "items-center",
  "rounded-md",
  "border",
  "border-[#d7e4f8]",
  "bg-white/92",
  "px-2.5",
  "text-[11px]",
  "font-semibold",
  "leading-none",
  "text-[#315484]",
  "transition",
  "hover:bg-[#eef5ff]",
].join(" ");

export function hasMobileStickyHeader(className: string) {
  const tokens = className.split(/\s+/).filter(Boolean);
  return tokens.includes("sticky") || tokens.includes("top-0");
}

export function shouldRefreshViewerShellOnFocus(pathname?: string | null) {
  return !pathname?.startsWith("/feed");
}
