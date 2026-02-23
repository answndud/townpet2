import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { createPet, deletePet, updatePet } from "@/server/services/pet.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    pet: {
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  pet: {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

describe("pet service", () => {
  beforeEach(() => {
    mockPrisma.pet.count.mockReset();
    mockPrisma.pet.create.mockReset();
    mockPrisma.pet.findUnique.mockReset();
    mockPrisma.pet.update.mockReset();
    mockPrisma.pet.delete.mockReset();

    mockPrisma.pet.count.mockResolvedValue(0);
  });

  it("creates pet with normalized values", async () => {
    mockPrisma.pet.create.mockResolvedValue({ id: "pet-1" });

    await createPet({
      userId: "user-1",
      input: {
        name: "  마루 ",
        species: "DOG",
        breedCode: " maltese ",
        breedLabel: "  말티즈 ",
        sizeClass: "SMALL",
        lifeStage: "ADULT",
        age: "3",
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
        age: 3,
        imageUrl: "https://img.example.com/pet.jpg",
        bio: "사람 좋아해요",
      },
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
        age: "4",
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
        sizeClass: "UNKNOWN",
        lifeStage: "UNKNOWN",
        age: 4,
        imageUrl: null,
        bio: null,
      },
    });
  });

  it("deletes pet when owner matches", async () => {
    mockPrisma.pet.findUnique.mockResolvedValue({
      id: "clwpet000000000000000002",
      userId: "user-1",
    });
    mockPrisma.pet.delete.mockResolvedValue({ id: "clwpet000000000000000002" });

    await deletePet({
      userId: "user-1",
      input: { petId: "clwpet000000000000000002" },
    });

    expect(mockPrisma.pet.delete).toHaveBeenCalledWith({
      where: { id: "clwpet000000000000000002" },
      select: { id: true },
    });
  });
});
