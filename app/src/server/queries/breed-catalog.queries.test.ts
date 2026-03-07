import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  findBreedCatalogEntryBySpeciesAndCode,
  listBreedCatalogAdminEntries,
  listBreedCatalogBySpecies,
  listEffectiveBreedCatalogGroupedBySpecies,
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
        id: "breed-1",
        species: "DOG",
        code: "JINDO",
        labelKo: "진돗개",
        aliases: ["진도"],
        defaultSize: "MEDIUM",
        isActive: true,
        createdAt: new Date("2026-03-07T00:00:00Z"),
        updatedAt: new Date("2026-03-07T00:00:00Z"),
      },
    ]);

    const items = await listBreedCatalogBySpecies("DOG");

    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          species: "DOG",
          code: "JINDO",
          labelKo: "진돗개",
        }),
      ]),
    );
  });

  it("fills missing species from defaults when grouped DB rows are partial", async () => {
    mockPrisma.breedCatalog.findMany.mockResolvedValue([
      {
        id: "breed-1",
        species: "DOG",
        code: "JINDO",
        labelKo: "진돗개",
        aliases: ["진도"],
        defaultSize: "MEDIUM",
        isActive: true,
        createdAt: new Date("2026-03-07T00:00:00Z"),
        updatedAt: new Date("2026-03-07T00:00:00Z"),
      },
    ]);

    const grouped = await listBreedCatalogGroupedBySpecies();

    expect(grouped.DOG).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "JINDO", labelKo: "진돗개" }),
      ]),
    );
    expect(grouped.CAT.length).toBeGreaterThan(0);
  });

  it("finds exact code from DB or fallback catalog", async () => {
    mockPrisma.breedCatalog.findFirst.mockResolvedValue(null);

    await expect(findBreedCatalogEntryBySpeciesAndCode("CAT", "korean_shorthair")).resolves.toMatchObject({
      code: "KOREAN_SHORTHAIR",
      labelKo: "코리안 숏헤어",
    });
  });

  it("merges partial overrides with default entries within the same species", async () => {
    mockPrisma.breedCatalog.findMany.mockResolvedValue([
      {
        id: "breed-2",
        species: "DOG",
        code: "MALTESE",
        labelKo: "말티즈 커스텀",
        aliases: ["말티"],
        defaultSize: "SMALL",
        isActive: true,
        createdAt: new Date("2026-03-07T00:00:00Z"),
        updatedAt: new Date("2026-03-07T01:00:00Z"),
      },
      {
        id: "breed-3",
        species: "DOG",
        code: "RESCUE_SPECIAL",
        labelKo: "구조견 믹스",
        aliases: [],
        defaultSize: "MEDIUM",
        isActive: true,
        createdAt: new Date("2026-03-07T00:00:00Z"),
        updatedAt: new Date("2026-03-07T02:00:00Z"),
      },
    ]);

    const grouped = await listEffectiveBreedCatalogGroupedBySpecies();

    expect(grouped.DOG).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MALTESE",
          labelKo: "말티즈 커스텀",
          source: "override",
          persistedId: "breed-2",
        }),
        expect.objectContaining({
          code: "POMERANIAN",
          source: "default",
        }),
        expect.objectContaining({
          code: "RESCUE_SPECIAL",
          labelKo: "구조견 믹스",
          source: "custom",
        }),
      ]),
    );
  });

  it("hides default entry when inactive override exists", async () => {
    mockPrisma.breedCatalog.findMany.mockResolvedValue([
      {
        id: "breed-4",
        species: "DOG",
        code: "MALTESE",
        labelKo: "말티즈",
        aliases: [],
        defaultSize: "SMALL",
        isActive: false,
        createdAt: new Date("2026-03-07T00:00:00Z"),
        updatedAt: new Date("2026-03-07T03:00:00Z"),
      },
    ]);

    const items = await listBreedCatalogBySpecies("DOG");

    expect(items.some((entry) => entry.code === "MALTESE")).toBe(false);
  });

  it("returns null when a code is explicitly disabled in DB", async () => {
    mockPrisma.breedCatalog.findFirst.mockResolvedValue({
      id: "breed-4",
      species: "DOG",
      code: "MALTESE",
      labelKo: "말티즈",
      aliases: [],
      defaultSize: "SMALL",
      isActive: false,
      createdAt: new Date("2026-03-07T00:00:00Z"),
      updatedAt: new Date("2026-03-07T03:00:00Z"),
    });

    await expect(findBreedCatalogEntryBySpeciesAndCode("DOG", "MALTESE")).resolves.toBeNull();
  });

  it("labels persisted entries as override or custom for admin view", async () => {
    mockPrisma.breedCatalog.findMany.mockResolvedValue([
      {
        id: "breed-5",
        species: "DOG",
        code: "MALTESE",
        labelKo: "말티즈 커스텀",
        aliases: [],
        defaultSize: "SMALL",
        isActive: true,
        createdAt: new Date("2026-03-07T00:00:00Z"),
        updatedAt: new Date("2026-03-07T04:00:00Z"),
      },
      {
        id: "breed-6",
        species: "DOG",
        code: "RESCUE_SPECIAL",
        labelKo: "구조견 믹스",
        aliases: [],
        defaultSize: "MEDIUM",
        isActive: true,
        createdAt: new Date("2026-03-07T00:00:00Z"),
        updatedAt: new Date("2026-03-07T05:00:00Z"),
      },
    ]);

    const items = await listBreedCatalogAdminEntries();

    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "MALTESE", source: "override" }),
        expect.objectContaining({ code: "RESCUE_SPECIAL", source: "custom" }),
      ]),
    );
  });
});
