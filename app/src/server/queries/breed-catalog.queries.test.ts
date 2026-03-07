import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  findBreedCatalogEntryBySpeciesAndCode,
  listBreedCatalogBySpecies,
  listBreedCatalogGroupedBySpecies,
} from "@/server/queries/breed-catalog.queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    breedCatalog: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  breedCatalog: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
};

describe("breed catalog queries", () => {
  beforeEach(() => {
    mockPrisma.breedCatalog.findMany.mockReset();
    mockPrisma.breedCatalog.findFirst.mockReset();
    mockPrisma.breedCatalog.findMany.mockResolvedValue([]);
    mockPrisma.breedCatalog.findFirst.mockResolvedValue(null);
  });

  it("falls back to default catalog when DB rows are empty", async () => {
    const items = await listBreedCatalogBySpecies("DOG");

    expect(items.length).toBeGreaterThan(0);
    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ species: "DOG", code: "MALTESE", labelKo: "말티즈" }),
      ]),
    );
  });

  it("returns DB rows when breed catalog is populated", async () => {
    mockPrisma.breedCatalog.findMany.mockResolvedValue([
      {
        species: "DOG",
        code: "JINDO",
        labelKo: "진돗개",
        aliases: ["진도"],
        defaultSize: "MEDIUM",
      },
    ]);

    const items = await listBreedCatalogBySpecies("DOG");

    expect(items).toEqual([
      expect.objectContaining({
        species: "DOG",
        code: "JINDO",
        labelKo: "진돗개",
      }),
    ]);
  });

  it("fills missing species from defaults when grouped DB rows are partial", async () => {
    mockPrisma.breedCatalog.findMany.mockResolvedValue([
      {
        species: "DOG",
        code: "JINDO",
        labelKo: "진돗개",
        aliases: ["진도"],
        defaultSize: "MEDIUM",
      },
    ]);

    const grouped = await listBreedCatalogGroupedBySpecies();

    expect(grouped.DOG).toEqual([
      expect.objectContaining({ code: "JINDO", labelKo: "진돗개" }),
    ]);
    expect(grouped.CAT.length).toBeGreaterThan(0);
  });

  it("finds exact code from DB or fallback catalog", async () => {
    mockPrisma.breedCatalog.findFirst.mockResolvedValue(null);

    await expect(findBreedCatalogEntryBySpeciesAndCode("CAT", "korean_shorthair")).resolves.toMatchObject({
      code: "KOREAN_SHORTHAIR",
      labelKo: "코리안 숏헤어",
    });
  });
});
