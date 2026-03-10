import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/upload/route";
import { getCurrentUserId } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getGuestPostPolicy } from "@/server/queries/policy.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { assertGuestStepUp } from "@/server/guest-step-up";
import { assertUserInteractionAllowed } from "@/server/services/sanction.service";
import { ServiceError } from "@/server/services/service-error";
import { cleanupTemporaryUploadAssets } from "@/server/upload-asset.service";
import { saveUploadedImage } from "@/server/upload";

vi.mock("@/server/auth", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/policy.queries", () => ({ getGuestPostPolicy: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("@/server/guest-step-up", () => ({ assertGuestStepUp: vi.fn() }));
vi.mock("@/server/services/sanction.service", () => ({
  assertUserInteractionAllowed: vi.fn(),
}));
vi.mock("@/server/upload", () => ({ saveUploadedImage: vi.fn() }));
vi.mock("@/server/upload-asset.service", () => ({
  cleanupTemporaryUploadAssets: vi.fn(),
}));

const mockGetCurrentUserId = vi.mocked(getCurrentUserId);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetGuestPostPolicy = vi.mocked(getGuestPostPolicy);
const mockGetClientIp = vi.mocked(getClientIp);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockAssertGuestStepUp = vi.mocked(assertGuestStepUp);
const mockAssertUserInteractionAllowed = vi.mocked(assertUserInteractionAllowed);
const mockCleanupTemporaryUploadAssets = vi.mocked(cleanupTemporaryUploadAssets);
const mockSaveUploadedImage = vi.mocked(saveUploadedImage);

describe("POST /api/upload contract", () => {
  beforeEach(() => {
    mockGetCurrentUserId.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockGetGuestPostPolicy.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();
    mockAssertGuestStepUp.mockReset();
    mockAssertUserInteractionAllowed.mockReset();
    mockCleanupTemporaryUploadAssets.mockReset();
    mockSaveUploadedImage.mockReset();

    mockGetCurrentUserId.mockResolvedValue(null);
    mockGetGuestPostPolicy.mockResolvedValue({
      uploadRateLimit10m: 10,
    } as never);
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockEnforceRateLimit.mockResolvedValue();
    mockAssertGuestStepUp.mockResolvedValue({
      difficulty: 2,
      riskLevel: "NORMAL",
    } as never);
    mockAssertUserInteractionAllowed.mockResolvedValue();
    mockCleanupTemporaryUploadAssets.mockResolvedValue({
      cutoff: new Date("2026-03-10T00:00:00.000Z"),
      scannedCount: 0,
      deletedCount: 0,
      skippedCount: 0,
    } as never);
    mockSaveUploadedImage.mockResolvedValue({ url: "/media/uploads/image.webp" } as never);
  });

  it("returns INVALID_FILE when file is missing", async () => {
    const request = new Request("http://localhost/api/upload", {
      method: "POST",
      body: new FormData(),
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INVALID_FILE" },
    });
  });

  it("uses user rate key when authenticated", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    const form = new FormData();
    form.set("file", new File(["abc"], "test.png", { type: "image/png" }));
    const request = new Request("http://localhost/api/upload", {
      method: "POST",
      body: form,
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockEnforceRateLimit).toHaveBeenCalledWith({
      key: "upload:user:user-1:ip:127.0.0.1",
      limit: 20,
      windowMs: 60_000,
    });
    expect(mockSaveUploadedImage).toHaveBeenCalledWith(expect.any(File), {
      maxSizeBytes: undefined,
      ownerUserId: "user-1",
    });
    expect(mockCleanupTemporaryUploadAssets).toHaveBeenCalledWith({ limit: 5 });
  });

  it("returns guest step-up errors for unauthenticated uploads", async () => {
    mockAssertGuestStepUp.mockRejectedValue(
      new ServiceError("step-up", "GUEST_STEP_UP_REQUIRED", 428),
    );
    const form = new FormData();
    form.set("file", new File(["abc"], "test.png", { type: "image/png" }));
    const request = new Request("http://localhost/api/upload", {
      method: "POST",
      body: form,
      headers: { "x-guest-fingerprint": "guest-fp-1" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(428);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "GUEST_STEP_UP_REQUIRED" },
    });
    expect(mockSaveUploadedImage).not.toHaveBeenCalled();
  });

  it("returns sanction error for suspended user", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockAssertUserInteractionAllowed.mockRejectedValue(
      new ServiceError("정지", "ACCOUNT_SUSPENDED", 403),
    );
    const form = new FormData();
    form.set("file", new File(["abc"], "test.png", { type: "image/png" }));
    const request = new Request("http://localhost/api/upload", {
      method: "POST",
      body: form,
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "ACCOUNT_SUSPENDED" },
    });
    expect(mockSaveUploadedImage).not.toHaveBeenCalled();
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockEnforceRateLimit.mockRejectedValue(new Error("rate fail"));
    const request = new Request("http://localhost/api/upload", {
      method: "POST",
      body: new FormData(),
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledOnce();
  });
});
