import { describe, expect, it } from "vitest";

import {
  APP_SHELL_HEADER_CLASS_NAME,
  APP_SHELL_MOBILE_QUICK_LINK_CLASS_NAME,
  hasMobileStickyHeader,
  shouldRefreshViewerShellOnFocus,
} from "@/components/navigation/app-shell-header-class";

describe("app shell header classes", () => {
  it("keeps sticky positioning scoped to tablet and larger breakpoints", () => {
    expect(APP_SHELL_HEADER_CLASS_NAME).toContain("sm:sticky");
    expect(APP_SHELL_HEADER_CLASS_NAME).toContain("sm:top-0");
    expect(hasMobileStickyHeader(APP_SHELL_HEADER_CLASS_NAME)).toBe(false);
  });

  it("skips focus-based viewer shell refresh on feed routes", () => {
    expect(shouldRefreshViewerShellOnFocus("/feed")).toBe(false);
    expect(shouldRefreshViewerShellOnFocus("/feed/guest")).toBe(false);
    expect(shouldRefreshViewerShellOnFocus("/posts/abc")).toBe(true);
  });

  it("uses a smaller mobile quick-link style for top-row actions", () => {
    expect(APP_SHELL_MOBILE_QUICK_LINK_CLASS_NAME).toContain("text-[11px]");
    expect(APP_SHELL_MOBILE_QUICK_LINK_CLASS_NAME).toContain("h-7");
    expect(APP_SHELL_MOBILE_QUICK_LINK_CLASS_NAME).toContain("rounded-md");
  });
});
