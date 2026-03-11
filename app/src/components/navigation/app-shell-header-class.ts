export const APP_SHELL_HEADER_CLASS_NAME = [
  "border-b",
  "border-[#d8e4f6]",
  "bg-[#f4f8ffeb]",
  "backdrop-blur-sm",
  "sm:sticky",
  "sm:top-0",
  "sm:z-40",
].join(" ");

export const APP_SHELL_NAV_LINK_CLASS_NAME = [
  "inline-flex",
  "h-8",
  "items-center",
  "rounded-md",
  "px-2.5",
  "text-[13px]",
  "font-medium",
  "leading-none",
  "text-[#315484]",
  "transition",
  "hover:bg-[#dcecff]",
  "hover:text-[#1f4f8f]",
].join(" ");

export const APP_SHELL_DESKTOP_NAV_CLUSTER_CLASS_NAME = [
  "items-center",
  "gap-1.5",
].join(" ");

export const APP_SHELL_DESKTOP_SEARCH_INPUT_CLASS_NAME = [
  "h-8",
  "w-[150px]",
  "rounded-md",
  "border",
  "border-[#dbe6f6]",
  "bg-white/92",
  "px-3",
  "text-[13px]",
  "leading-none",
  "text-[#315484]",
  "outline-none",
  "transition",
  "placeholder:text-[#6a84ab]",
  "focus:border-[#bcd4f4]",
  "focus:bg-white",
  "sm:w-[190px]",
].join(" ");

export const APP_SHELL_DESKTOP_GROUP_CLASS_NAME = [
  "items-center",
  "gap-1",
  "rounded-full",
  "border",
  "border-[#dbe6f6]",
  "bg-white/88",
  "px-1.5",
  "py-1",
  "shadow-[0_8px_18px_rgba(16,40,74,0.06)]",
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

export const APP_SHELL_MOBILE_PANEL_CLASS_NAME = [
  "overflow-hidden",
  "rounded-xl",
  "border",
  "border-[#dbe6f6]",
  "bg-white/92",
  "shadow-[0_10px_20px_rgba(16,40,74,0.06)]",
].join(" ");

export const APP_SHELL_MOBILE_PANEL_SUMMARY_CLASS_NAME = [
  "flex",
  "cursor-pointer",
  "list-none",
  "items-start",
  "justify-between",
  "gap-3",
  "px-3",
  "py-2.5",
].join(" ");

export const APP_SHELL_MOBILE_PANEL_PILL_CLASS_NAME = [
  "inline-flex",
  "items-center",
  "rounded-full",
  "border",
  "border-[#c9daf4]",
  "bg-white",
  "px-2.5",
  "py-1",
  "text-[11px]",
  "font-semibold",
  "text-[#315b9a]",
  "transition",
  "hover:bg-[#f5f9ff]",
].join(" ");

export function hasMobileStickyHeader(className: string) {
  const tokens = className.split(/\s+/).filter(Boolean);
  return tokens.includes("sticky") || tokens.includes("top-0");
}

export function shouldRefreshViewerShellOnFocus(pathname?: string | null) {
  return !pathname?.startsWith("/feed");
}
