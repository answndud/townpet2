import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/neighborhoods/route";
import { monitorUnhandledError } from "@/server/error-monitor";
import {
  listNeighborhoodCities,
  listNeighborhoodDistricts,
  searchNeighborhoods,
} from "@/server/queries/neighborhood.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";

vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/neighborhood.queries", () => ({
  listNeighborhoodCities: vi.fn(),
  listNeighborhoodDistricts: vi.fn(),
  searchNeighborhoods: vi.fn(),
}));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));

const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockListNeighborhoodCities = vi.mocked(listNeighborhoodCities);
const mockListNeighborhoodDistricts = vi.mocked(listNeighborhoodDistricts);
const mockSearchNeighborhoods = vi.mocked(searchNeighborhoods);
const mockGetClientIp = vi.mocked(getClientIp);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

describe("GET /api/neighborhoods contract", () => {
  beforeEach(() => {
    mockMonitorUnhandledError.mockReset();
    mockListNeighborhoodCities.mockReset();
    mockListNeighborhoodDistricts.mockReset();
    mockSearchNeighborhoods.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();

    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockEnforceRateLimit.mockResolvedValue();
    mockListNeighborhoodCities.mockResolvedValue(["서울특별시"]);
    mockListNeighborhoodDistricts.mockResolvedValue(["강남구"]);
    mockSearchNeighborhoods.mockResolvedValue([
      {
        id: "hood-1",
        name: "역삼동",
        city: "서울특별시",
        district: "강남구",
      },
    ]);
  });

  it("returns INVALID_QUERY for malformed query params", async () => {
    const request = new Request("http://localhost/api/neighborhoods?limit=0") as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INVALID_QUERY" },
    });
  });

  it("returns cities, districts and filtered items", async () => {
    const request = new Request(
      "http://localhost/api/neighborhoods?city=%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C&district=%EA%B0%95%EB%82%A8%EA%B5%AC&q=%EC%97%AD%EC%82%BC",
    ) as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      data: {
        cities: ["서울특별시"],
        districts: ["강남구"],
        items: [
          {
            id: "hood-1",
            name: "역삼동",
          },
        ],
      },
    });
    expect(mockListNeighborhoodDistricts).toHaveBeenCalledWith("서울특별시");
    expect(mockSearchNeighborhoods).toHaveBeenCalledWith(
      expect.objectContaining({
        city: "서울특별시",
        district: "강남구",
        q: "역삼",
      }),
    );
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockEnforceRateLimit.mockRejectedValue(new Error("boom"));

    const request = new Request("http://localhost/api/neighborhoods") as NextRequest;
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
