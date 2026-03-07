import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { assertGuestNotBanned } from "@/server/services/guest-safety.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    guestBan: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    guestViolation: {
      create: vi.fn(),
      count: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  guestBan?: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  guestViolation?: {
    create: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

describe("guest safety control plane", () => {
  beforeEach(() => {
    mockPrisma.guestBan = {
      findFirst: vi.fn(),
      create: vi.fn(),
    };
    mockPrisma.guestViolation = {
      create: vi.fn(),
      count: vi.fn(),
    };
  });

  it("fails closed when guest ban delegate is missing", async () => {
    delete mockPrisma.guestBan;

    await expect(
      assertGuestNotBanned({
        ip: "127.0.0.1",
        fingerprint: "guest-fp",
      }),
    ).rejects.toMatchObject({
      code: "SCHEMA_SYNC_REQUIRED",
      status: 503,
    });
  });
});
