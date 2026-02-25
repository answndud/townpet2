import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/communities/route";
import { monitorUnhandledError } from "@/server/error-monitor";
import { listCommunities } from "@/server/queries/community.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";

vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/community.queries", () => ({ listCommunities: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));

const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockListCommunities = vi.mocked(listCommunities);
const mockGetClientIp = vi.mocked(getClientIp);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

describe("GET /api/communities contract", () => {
  beforeEach(() => {
    mockMonitorUnhandledError.mockReset();
    mockListCommunities.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();

    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockEnforceRateLimit.mockResolvedValue();
    mockListCommunities.mockResolvedValue({
      items: [
        {
          id: "ckc7k5qsj0000u0t8qv6d1d7k",
          slug: "dogs",
          labelKo: "강아지",
          description: null,
          sortOrder: 1,
          tags: [],
          defaultPostTypes: [],
          category: { slug: "dogs", labelKo: "강아지", sortOrder: 1 },
        },
      ],
      nextCursor: null,
    });
  });

  it("returns 400 for invalid params", async () => {
    const request = new Request("http://localhost/api/communities?cursor=invalid") as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INVALID_QUERY" },
    });
  });

  it("returns 200 for successful response", async () => {
    const request = new Request("http://localhost/api/communities?limit=10") as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockEnforceRateLimit).toHaveBeenCalledOnce();
    expect(mockListCommunities).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10 }),
    );
  });

  it("returns 500 and monitors unexpected errors", async () => {
    const request = new Request("http://localhost/api/communities") as NextRequest;
    mockListCommunities.mockRejectedValue(new Error("boom"));

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledOnce();
  });
});
