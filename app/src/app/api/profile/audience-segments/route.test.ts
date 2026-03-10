import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/profile/audience-segments/route";
import { requireCurrentUserId } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { listAudienceSegmentsByUserId } from "@/server/queries/audience-segment.queries";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/auth", () => ({ requireCurrentUserId: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/audience-segment.queries", () => ({
  listAudienceSegmentsByUserId: vi.fn(),
}));

const mockRequireCurrentUserId = vi.mocked(requireCurrentUserId);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockListAudienceSegmentsByUserId = vi.mocked(listAudienceSegmentsByUserId);

describe("GET /api/profile/audience-segments contract", () => {
  beforeEach(() => {
    mockRequireCurrentUserId.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockListAudienceSegmentsByUserId.mockReset();

    mockRequireCurrentUserId.mockResolvedValue("user-1");
    mockListAudienceSegmentsByUserId.mockResolvedValue([]);
  });

  it("returns AUTH_REQUIRED when user is not authenticated", async () => {
    mockRequireCurrentUserId.mockRejectedValue(
      new ServiceError("login", "AUTH_REQUIRED", 401),
    );

    const response = await GET(
      new Request("http://localhost/api/profile/audience-segments") as NextRequest,
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "AUTH_REQUIRED" },
    });
  });

  it("returns ACCOUNT_SUSPENDED when the current user is sanctioned", async () => {
    mockRequireCurrentUserId.mockRejectedValue(
      new ServiceError("account suspended", "ACCOUNT_SUSPENDED", 403),
    );

    const response = await GET(
      new Request("http://localhost/api/profile/audience-segments") as NextRequest,
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "ACCOUNT_SUSPENDED" },
    });
    expect(mockListAudienceSegmentsByUserId).not.toHaveBeenCalled();
  });

  it("returns no-store audience segment payload", async () => {
    mockListAudienceSegmentsByUserId.mockResolvedValue([
      {
        id: "seg-1",
        species: "DOG",
        speciesLabel: "강아지",
        breedCode: "MALTESE",
        breedLabel: "말티즈",
        sizeClass: "SMALL",
        sizeLabel: "소형",
        lifeStage: "ADULT",
        lifeStageLabel: "성체",
        confidenceScore: 0.89,
        interestTags: ["species:DOG", "breed:MALTESE"],
        label: "강아지 · 말티즈 · 소형 · 성체",
      },
    ] as never);

    const response = await GET(
      new Request("http://localhost/api/profile/audience-segments") as NextRequest,
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mockListAudienceSegmentsByUserId).toHaveBeenCalledWith("user-1");
    expect(payload).toMatchObject({
      ok: true,
      data: {
        segments: [
          {
            id: "seg-1",
            breedCode: "MALTESE",
            confidenceScore: 0.89,
          },
        ],
      },
    });
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockListAudienceSegmentsByUserId.mockRejectedValue(new Error("db down"));

    const response = await GET(
      new Request("http://localhost/api/profile/audience-segments") as NextRequest,
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledOnce();
  });
});
