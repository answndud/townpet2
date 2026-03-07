import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  deleteBreedCatalogEntry,
  upsertBreedCatalogEntry,
} from "@/server/services/breed-catalog.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    breedCatalog: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  breedCatalog: {
    upsert: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

describe("breed catalog service", () => {
  beforeEach(() => {
    mockPrisma.breedCatalog.upsert.mockReset();
    mockPrisma.breedCatalog.findUnique.mockReset();
    mockPrisma.breedCatalog.delete.mockReset();
  });

  it("upserts normalized breed catalog entry", async () => {
    mockPrisma.breedCatalog.upsert.mockResolvedValue({ id: "breed-1" });

    await upsertBreedCatalogEntry({
      input: {
        species: "DOG",
        code: " maltese ",
        labelKo: " 말티즈 ",
        aliases: [" 말티 ", "말티", " "],
        defaultSize: "SMALL",
        isActive: true,
      },
    });

    expect(mockPrisma.breedCatalog.upsert).toHaveBeenCalledWith({
      where: {
        species_code: {
          species: "DOG",
          code: "MALTESE",
        },
      },
      create: {
        species: "DOG",
        code: "MALTESE",
        labelKo: "말티즈",
        aliases: ["말티"],
        defaultSize: "SMALL",
        isActive: true,
      },
      update: {
        labelKo: "말티즈",
        aliases: ["말티"],
        defaultSize: "SMALL",
        isActive: true,
      },
    });
  });

  it("rejects invalid breed catalog input", async () => {
    await expect(
      upsertBreedCatalogEntry({
        input: {
          species: "DOG",
          code: "!",
          labelKo: "",
          aliases: [],
          defaultSize: "SMALL",
          isActive: true,
        },
      }),
    ).rejects.toMatchObject({
      code: "INVALID_INPUT",
      status: 400,
    } satisfies Partial<ServiceError>);
  });

  it("deletes persisted breed catalog entry", async () => {
    mockPrisma.breedCatalog.findUnique.mockResolvedValue({ id: "clwbreed0000000000000001" });
    mockPrisma.breedCatalog.delete.mockResolvedValue({ id: "clwbreed0000000000000001" });

    await deleteBreedCatalogEntry({
      input: { id: "clwbreed0000000000000001" },
    });

    expect(mockPrisma.breedCatalog.delete).toHaveBeenCalledWith({
      where: { id: "clwbreed0000000000000001" },
      select: { id: true },
    });
  });

  it("rejects delete when breed catalog entry does not exist", async () => {
    mockPrisma.breedCatalog.findUnique.mockResolvedValue(null);

    await expect(
      deleteBreedCatalogEntry({
        input: { id: "clwbreed0000000000000001" },
      }),
    ).rejects.toMatchObject({
      code: "BREED_ENTRY_NOT_FOUND",
      status: 404,
    } satisfies Partial<ServiceError>);
  });
});
