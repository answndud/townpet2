import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/users/[id]/relation/route";
import { getCurrentUserId } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getUserRelationState } from "@/server/queries/user-relation.queries";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/auth", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/user-relation.queries", () => ({
  getUserRelationState: vi.fn(),
}));

const mockGetCurrentUserId = vi.mocked(getCurrentUserId);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetUserRelationState = vi.mocked(getUserRelationState);

describe("GET /api/users/[id]/relation contract", () => {
  beforeEach(() => {
    mockGetCurrentUserId.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockGetUserRelationState.mockReset();
    mockGetCurrentUserId.mockResolvedValue(null);
    mockGetUserRelationState.mockResolvedValue({
      isBlockedByMe: false,
      hasBlockedMe: false,
      isMutedByMe: false,
    });
  });

  it("returns AUTH_REQUIRED when user is not authenticated", async () => {
    const request = new Request("http://localhost/api/users/user-2/relation") as NextRequest;

    const response = await GET(request, { params: Promise.resolve({ id: "user-2" }) });
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "AUTH_REQUIRED" },
    });
  });

  it("surfaces schema sync errors from relation query", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockGetUserRelationState.mockRejectedValue(
      new ServiceError("schema sync required", "SCHEMA_SYNC_REQUIRED", 503),
    );
    const request = new Request("http://localhost/api/users/user-2/relation") as NextRequest;

    const response = await GET(request, { params: Promise.resolve({ id: "user-2" }) });
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toMatchObject({
      ok: false,
      error: {
        code: "SCHEMA_SYNC_REQUIRED",
      },
    });
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockGetCurrentUserId.mockRejectedValue(new Error("auth down"));
    const request = new Request("http://localhost/api/users/user-2/relation") as NextRequest;

    const response = await GET(request, { params: Promise.resolve({ id: "user-2" }) });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledOnce();
  });
});
