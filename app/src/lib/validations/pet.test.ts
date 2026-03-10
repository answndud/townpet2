import { describe, expect, it } from "vitest";

import {
  petCreateSchema,
  petUpdateSchema,
} from "@/lib/validations/pet";

describe("pet validations", () => {
  it("accepts trusted uploaded pet image urls", () => {
    const result = petCreateSchema.safeParse({
      name: "마루",
      species: "DOG",
      imageUrl: "/uploads/pet-avatar.png",
    });

    expect(result.success).toBe(true);
  });

  it("accepts proxied uploaded pet image urls", () => {
    const result = petCreateSchema.safeParse({
      name: "마루",
      species: "DOG",
      imageUrl: "/media/uploads/pet-avatar.webp",
    });

    expect(result.success).toBe(true);
  });

  it("rejects external pet image urls", () => {
    const result = petCreateSchema.safeParse({
      name: "마루",
      species: "DOG",
      imageUrl: "https://example.com/pet.png",
    });

    expect(result.success).toBe(false);
  });

  it("accepts empty string for optional pet image url on update", () => {
    const result = petUpdateSchema.safeParse({
      petId: "cmf2d6dhk000014xj3r1y2abc",
      name: "마루",
      species: "DOG",
      imageUrl: "",
    });

    expect(result.success).toBe(true);
  });
});
