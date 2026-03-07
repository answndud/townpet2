import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { findBreedCatalogEntryBySpeciesAndCode } from "@/server/queries/breed-catalog.queries";
import { createPet, deletePet, updatePet } from "@/server/services/pet.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    pet: {
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    userAudienceSegment: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

vi.mock("@/server/queries/breed-catalog.queries", () => ({
  findBreedCatalogEntryBySpeciesAndCode: vi.fn(),
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  $transaction: ReturnType<typeof vi.fn>;
  pet: {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  userAudienceSegment: {
    deleteMany: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
  };
};
const mockFindBreedCatalogEntryBySpeciesAndCode = vi.mocked(
  findBreedCatalogEntryBySpeciesAndCode,
);

describe("pet service", () => {
  beforeEach(() => {
    mockPrisma.$transaction.mockReset();
    mockPrisma.pet.count.mockReset();
    mockPrisma.pet.create.mockReset();
    mockPrisma.pet.findUnique.mockReset();
    mockPrisma.pet.findMany.mockReset();
    mockPrisma.pet.update.mockReset();
    mockPrisma.pet.delete.mockReset();
    mockPrisma.userAudienceSegment.deleteMany.mockReset();
    mockPrisma.userAudienceSegment.createMany.mockReset();

    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => unknown) =>
      callback(mockPrisma),
    );
    mockPrisma.pet.count.mockResolvedValue(0);
    mockPrisma.pet.findMany.mockResolvedValue([]);
    mockPrisma.userAudienceSegment.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.userAudienceSegment.createMany.mockResolvedValue({ count: 0 });
    mockFindBreedCatalogEntryBySpeciesAndCode.mockReset();
    mockFindBreedCatalogEntryBySpeciesAndCode.mockResolvedValue(null);
  });

  it("creates pet with normalized values", async () => {
    mockPrisma.pet.create.mockResolvedValue({ id: "pet-1" });
    mockPrisma.pet.findMany.mockResolvedValue([
      {
        species: "DOG",
        breedCode: "MALTESE",
        breedLabel: "말티즈",
        sizeClass: "SMALL",
        lifeStage: "ADULT",
      },
    ]);
    mockFindBreedCatalogEntryBySpeciesAndCode.mockResolvedValue({
      species: "DOG",
      code: "MALTESE",
      labelKo: "말티즈",
      aliases: [],
      defaultSize: "SMALL",
    });

    await createPet({
      userId: "user-1",
      input: {
        name: "  마루 ",
        species: "DOG",
        breedCode: " maltese ",
        breedLabel: "  말티즈 ",
        sizeClass: "SMALL",
        lifeStage: "ADULT",
        weightKg: "4.3",
        birthYear: "2021",
        imageUrl: " https://img.example.com/pet.jpg ",
        bio: "  사람 좋아해요 ",
      },
    });

    expect(mockPrisma.pet.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        name: "마루",
        species: "DOG",
        breedCode: "MALTESE",
        breedLabel: "말티즈",
        sizeClass: "SMALL",
        lifeStage: "ADULT",
        age: null,
        weightKg: 4.3,
        birthYear: 2021,
        imageUrl: "https://img.example.com/pet.jpg",
        bio: "사람 좋아해요",
      },
    });
    expect(mockPrisma.userAudienceSegment.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(mockPrisma.userAudienceSegment.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: "user-1",
          species: "DOG",
          breedCode: "MALTESE",
          sizeClass: "SMALL",
          lifeStage: "ADULT",
          interestTags: expect.arrayContaining([
            "source:pet-profile",
            "signal:explicit-pet",
            "species:DOG",
            "breed:MALTESE",
            "breedLabel:말티즈",
            "size:SMALL",
            "lifeStage:ADULT",
          ]),
        }),
      ],
    });
  });

  it("rejects when pet count exceeds limit", async () => {
    mockPrisma.pet.count.mockResolvedValue(10);

    await expect(
      createPet({
        userId: "user-1",
        input: { name: "콩이", species: "DOG" },
      }),
    ).rejects.toMatchObject({
      code: "PET_LIMIT_EXCEEDED",
      status: 400,
    } satisfies Partial<ServiceError>);
  });

  it("rejects update when pet does not exist", async () => {
    mockPrisma.pet.findUnique.mockResolvedValue(null);

    await expect(
      updatePet({
        userId: "user-1",
        input: {
          petId: "clwpet000000000000000001",
          name: "콩이",
          species: "DOG",
        },
      }),
    ).rejects.toMatchObject({
      code: "PET_NOT_FOUND",
      status: 404,
    } satisfies Partial<ServiceError>);
  });

  it("rejects update when owner does not match", async () => {
    mockPrisma.pet.findUnique.mockResolvedValue({
      id: "clwpet000000000000000001",
      userId: "user-2",
    });

    await expect(
      updatePet({
        userId: "user-1",
        input: {
          petId: "clwpet000000000000000001",
          name: "콩이",
          species: "DOG",
        },
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    } satisfies Partial<ServiceError>);
  });

  it("updates pet when owner matches", async () => {
    mockPrisma.pet.findUnique.mockResolvedValue({
      id: "clwpet000000000000000001",
      userId: "user-1",
    });
    mockPrisma.pet.findMany.mockResolvedValue([
      {
        species: "DOG",
        breedCode: "MALTESE",
        breedLabel: "말티즈",
        sizeClass: "SMALL",
        lifeStage: "ADULT",
      },
    ]);
    mockFindBreedCatalogEntryBySpeciesAndCode.mockResolvedValue({
      species: "DOG",
      code: "MALTESE",
      labelKo: "말티즈",
      aliases: [],
      defaultSize: "SMALL",
    });
    mockPrisma.pet.update.mockResolvedValue({
      id: "clwpet000000000000000001",
    });

    await updatePet({
      userId: "user-1",
      input: {
        petId: "clwpet000000000000000001",
        name: " 마루 ",
        species: "DOG",
        breedCode: " maltese ",
        breedLabel: " 말티즈 ",
        sizeClass: "SMALL",
        lifeStage: "ADULT",
        weightKg: "4.8",
        birthYear: "2020",
        imageUrl: "",
        bio: " ",
      },
    });

    expect(mockPrisma.pet.update).toHaveBeenCalledWith({
      where: { id: "clwpet000000000000000001" },
      data: {
        name: "마루",
        species: "DOG",
        breedCode: "MALTESE",
        breedLabel: "말티즈",
        sizeClass: "SMALL",
        lifeStage: "ADULT",
        age: null,
        weightKg: 4.8,
        birthYear: 2020,
        imageUrl: null,
        bio: null,
      },
    });
  });

  it("rejects unknown breed code when no manual label is provided", async () => {
    await expect(
      createPet({
        userId: "user-1",
        input: {
          name: "콩이",
          species: "DOG",
          breedCode: "NOT_REAL_BREED",
        },
      }),
    ).rejects.toMatchObject({
      code: "INVALID_BREED_CODE",
      status: 400,
    } satisfies Partial<ServiceError>);
  });

  it("allows manual breed label when breed code is omitted", async () => {
    mockPrisma.pet.create.mockResolvedValue({ id: "pet-2" });
    mockPrisma.pet.findMany.mockResolvedValue([
      {
        species: "BIRD",
        breedCode: null,
        breedLabel: "희귀 앵무 계열",
        sizeClass: "UNKNOWN",
        lifeStage: "UNKNOWN",
      },
    ]);

    await createPet({
      userId: "user-1",
      input: {
        name: "루미",
        species: "BIRD",
        breedLabel: " 희귀 앵무 계열 ",
      },
    });

    expect(mockPrisma.pet.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        species: "BIRD",
        breedCode: null,
        breedLabel: "희귀 앵무 계열",
      }),
    });
  });

  it("deletes pet when owner matches", async () => {
    mockPrisma.pet.findUnique.mockResolvedValue({
      id: "clwpet000000000000000002",
      userId: "user-1",
    });
    mockPrisma.pet.delete.mockResolvedValue({ id: "clwpet000000000000000002" });
    mockPrisma.pet.findMany.mockResolvedValue([]);

    await deletePet({
      userId: "user-1",
      input: { petId: "clwpet000000000000000002" },
    });

    expect(mockPrisma.pet.delete).toHaveBeenCalledWith({
      where: { id: "clwpet000000000000000002" },
      select: { id: true },
    });
    expect(mockPrisma.userAudienceSegment.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(mockPrisma.userAudienceSegment.createMany).not.toHaveBeenCalled();
  });
});
