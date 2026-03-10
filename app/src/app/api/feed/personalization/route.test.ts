import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/feed/personalization/route";
import { requireCurrentUserId } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { enforceRateLimit } from "@/server/rate-limit";
import { recordFeedPersonalizationMetric } from "@/server/services/feed-personalization-metrics.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/auth", () => ({ requireCurrentUserId: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn(() => "127.0.0.1") }));
vi.mock("@/server/services/feed-personalization-metrics.service", () => ({
  recordFeedPersonalizationMetric: vi.fn(),
}));

const mockRequireCurrentUserId = vi.mocked(requireCurrentUserId);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockRecordFeedPersonalizationMetric = vi.mocked(recordFeedPersonalizationMetric);

describe("POST /api/feed/personalization contract", () => {
  beforeEach(() => {
    mockRequireCurrentUserId.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockEnforceRateLimit.mockReset();
    mockRecordFeedPersonalizationMetric.mockReset();
  });

  it("returns 401 when authentication is required", async () => {
    mockRequireCurrentUserId.mockRejectedValue(
      new ServiceError("auth", "AUTH_REQUIRED", 401),
    );

    const request = new Request("http://localhost/api/feed/personalization", {
      method: "POST",
      body: JSON.stringify({ surface: "FEED", event: "VIEW", audienceSource: "NONE" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "AUTH_REQUIRED" },
    });
  });

  it("returns 202 when metric storage is not ready", async () => {
    mockRequireCurrentUserId.mockResolvedValue("user-1");
    mockEnforceRateLimit.mockResolvedValue();
    mockRecordFeedPersonalizationMetric.mockResolvedValue({
      ok: false,
      reason: "SCHEMA_SYNC_REQUIRED",
    });

    const request = new Request("http://localhost/api/feed/personalization", {
      method: "POST",
      body: JSON.stringify({ surface: "FEED", event: "VIEW", audienceSource: "PET" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(payload).toMatchObject({
      ok: true,
      data: {
        recorded: false,
        skippedReason: "SCHEMA_SYNC_REQUIRED",
      },
    });
    expect(mockRecordFeedPersonalizationMetric).toHaveBeenCalledWith({
      surface: "FEED",
      event: "VIEW",
      audienceSource: "PET",
      userId: "user-1",
    });
  });

  it("returns 400 when post click payload omits postId", async () => {
    mockRequireCurrentUserId.mockResolvedValue("user-1");
    mockEnforceRateLimit.mockResolvedValue();

    const request = new Request("http://localhost/api/feed/personalization", {
      method: "POST",
      body: JSON.stringify({
        surface: "FEED",
        event: "POST_CLICK",
        audienceSource: "SEGMENT",
      }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INVALID_INPUT" },
    });
    expect(mockRecordFeedPersonalizationMetric).not.toHaveBeenCalled();
  });

  it("returns 400 when dwell payload omits postId", async () => {
    mockRequireCurrentUserId.mockResolvedValue("user-1");
    mockEnforceRateLimit.mockResolvedValue();

    const request = new Request("http://localhost/api/feed/personalization", {
      method: "POST",
      body: JSON.stringify({
        surface: "FEED",
        event: "POST_DWELL",
        audienceSource: "NONE",
      }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INVALID_INPUT" },
    });
    expect(mockRecordFeedPersonalizationMetric).not.toHaveBeenCalled();
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockRequireCurrentUserId.mockResolvedValue("user-1");
    mockEnforceRateLimit.mockResolvedValue();
    mockRecordFeedPersonalizationMetric.mockRejectedValue(new Error("db down"));

    const request = new Request("http://localhost/api/feed/personalization", {
      method: "POST",
      body: JSON.stringify({
        surface: "FEED",
        event: "POST_CLICK",
        audienceSource: "SEGMENT",
        postId: "post-1",
      }),
      headers: { "content-type": "application/json" },
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

  it("returns 403 when the current account is suspended", async () => {
    mockRequireCurrentUserId.mockRejectedValue(
      new ServiceError("정지", "ACCOUNT_SUSPENDED", 403),
    );

    const request = new Request("http://localhost/api/feed/personalization", {
      method: "POST",
      body: JSON.stringify({ surface: "FEED", event: "VIEW", audienceSource: "NONE" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "ACCOUNT_SUSPENDED" },
    });
    expect(mockRecordFeedPersonalizationMetric).not.toHaveBeenCalled();
  });
});
