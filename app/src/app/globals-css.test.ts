import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("globals.css semantic color roles", () => {
  it("defines shared text, border, and surface role classes", () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toContain(".tp-page-bg");
    expect(css).toContain("#fbfdff");
    expect(css).toContain(".tp-text-primary");
    expect(css).toContain(".tp-text-heading");
    expect(css).toContain(".tp-text-muted");
    expect(css).toContain(".tp-text-subtle");
    expect(css).toContain(".tp-text-label");
    expect(css).toContain(".tp-text-placeholder");
    expect(css).toContain(".tp-text-accent");
    expect(css).toContain(".tp-text-link");
    expect(css).toContain(".tp-border-soft");
    expect(css).toContain(".tp-border-muted");
    expect(css).toContain(".tp-border-danger-soft");
    expect(css).toContain(".tp-surface-soft");
    expect(css).toContain(".tp-surface-muted");
    expect(css).toContain(".tp-surface-danger-soft");
    expect(css).toContain(".tp-surface-alt");
    expect(css).toContain(".tp-text-disabled");
    expect(css).toContain(".tp-text-danger-soft");
    expect(css).toContain(".tp-btn-disabled");
    expect(css).toContain(".tp-form-section-bar");
    expect(css).toContain(".tp-form-section-title");
    expect(css).toContain(".tp-form-label");
    expect(css).toContain(".tp-form-note");
    expect(css).toContain(".tp-form-panel");
    expect(css).toContain(".tp-form-panel-muted");
    expect(css).toContain(".tp-editor-toolbar");
    expect(css).toContain(".tp-editor-toolbar-soft");
    expect(css).toContain(".tp-editor-surface");
    expect(css).toContain(".tp-divider-soft");
  });
});
