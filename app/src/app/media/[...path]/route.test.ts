import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/media/[...path]/route";
import { monitorUnhandledError } from "@/server/error-monitor";
import { findStoredUploadSourceByPathname } from "@/server/upload-asset.service";
import { readFile } from "fs/promises";

vi.mock("@/server/error-monitor", () => ({
  monitorUnhandledError: vi.fn(),
}));

vi.mock("@/server/upload-asset.service", () => ({
  findStoredUploadSourceByPathname: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
}));

const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockFindStoredUploadSourceByPathname = vi.mocked(findStoredUploadSourceByPathname);
const mockReadFile = vi.mocked(readFile);

describe("GET /media/[...path]", () => {
  beforeEach(() => {
    mockMonitorUnhandledError.mockReset();
    mockFindStoredUploadSourceByPathname.mockReset();
    mockReadFile.mockReset();
    vi.restoreAllMocks();
  });

  it("returns 404 for invalid pathnames", async () => {
    const request = new Request("http://localhost/media/etc/passwd") as NextRequest;

    const response = await GET(request, {
      params: Promise.resolve({ path: ["etc", "passwd"] }),
    });

    expect(response.status).toBe(404);
  });

  it("serves local upload assets through the media route", async () => {
    mockFindStoredUploadSourceByPathname.mockResolvedValue({
      sourceUrl: "/uploads/pet.webp",
      storageProvider: "LOCAL",
    } as never);
    mockReadFile.mockResolvedValue(Buffer.from("local-image"));

    const request = new Request("http://localhost/media/uploads/pet.webp") as NextRequest;
    const response = await GET(request, {
      params: Promise.resolve({ path: ["uploads", "pet.webp"] }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(await response.text()).toBe("local-image");
  });

  it("streams blob-backed upload assets through the media route", async () => {
    mockFindStoredUploadSourceByPathname.mockResolvedValue({
      sourceUrl: "https://blob.public.blob.vercel-storage.com/uploads/pet.webp",
      storageProvider: "BLOB",
    } as never);

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("blob-image", {
        status: 200,
        headers: {
          "content-type": "image/webp",
          "content-length": "10",
        },
      }),
    );

    const request = new Request("http://localhost/media/uploads/pet.webp") as NextRequest;
    const response = await GET(request, {
      params: Promise.resolve({ path: ["uploads", "pet.webp"] }),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://blob.public.blob.vercel-storage.com/uploads/pet.webp",
      expect.objectContaining({
        method: "GET",
        cache: "force-cache",
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(await response.text()).toBe("blob-image");
  });
});
