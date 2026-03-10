import { describe, expect, it } from "vitest";

import {
  getUploadProxyPath,
  getTrustedUploadPathname,
  getTrustedUploadStorageProvider,
  isTrustedUploadPathname,
  isTrustedUploadUrl,
} from "@/lib/upload-url";

describe("upload url trust policy", () => {
  it("accepts local upload paths", () => {
    expect(isTrustedUploadUrl("/uploads/image.png")).toBe(true);
  });

  it("accepts blob upload urls", () => {
    expect(
      isTrustedUploadUrl(
        "https://store-1.public.blob.vercel-storage.com/uploads/image.png",
      ),
    ).toBe(true);
  });

  it("accepts proxied upload urls", () => {
    expect(isTrustedUploadUrl("/media/uploads/image.webp")).toBe(true);
  });

  it("rejects external image urls", () => {
    expect(isTrustedUploadUrl("https://example.com/image.png")).toBe(false);
  });

  it("rejects upload path traversal", () => {
    expect(isTrustedUploadPathname("uploads/../../etc/passwd")).toBe(false);
  });

  it("extracts trusted upload pathname for local and blob urls", () => {
    expect(getTrustedUploadPathname("/uploads/a.png")).toBe("uploads/a.png");
    expect(getTrustedUploadPathname("/media/uploads/a.png")).toBe("uploads/a.png");
    expect(
      getTrustedUploadPathname(
        "https://store-1.public.blob.vercel-storage.com/uploads/b.png",
      ),
    ).toBe("uploads/b.png");
  });

  it("detects storage provider for trusted upload urls", () => {
    expect(getTrustedUploadStorageProvider("/uploads/a.png")).toBe("LOCAL");
    expect(
      getTrustedUploadStorageProvider(
        "https://store-1.public.blob.vercel-storage.com/uploads/b.png",
      ),
    ).toBe("BLOB");
    expect(getTrustedUploadStorageProvider("/media/uploads/b.png")).toBeNull();
    expect(getTrustedUploadStorageProvider("https://example.com/a.png")).toBeNull();
  });

  it("builds app proxy path for trusted uploads", () => {
    expect(getUploadProxyPath("/uploads/a.png")).toBe("/media/uploads/a.png");
    expect(
      getUploadProxyPath("https://store-1.public.blob.vercel-storage.com/uploads/b.png"),
    ).toBe("/media/uploads/b.png");
    expect(getUploadProxyPath("/media/uploads/c.png")).toBe("/media/uploads/c.png");
    expect(getUploadProxyPath("https://example.com/a.png")).toBeNull();
  });
});
