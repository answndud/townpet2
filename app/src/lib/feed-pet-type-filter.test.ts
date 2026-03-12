import { describe, expect, it } from "vitest";

import { normalizeFeedPetTypeIds } from "@/lib/feed-pet-type-filter";

describe("normalizeFeedPetTypeIds", () => {
  it("returns a deduplicated subset when only some pet types are selected", () => {
    expect(
      normalizeFeedPetTypeIds(
        ["pet-dog", "pet-cat", "pet-dog"],
        ["pet-dog", "pet-cat", "pet-bird"],
      ),
    ).toEqual(["pet-dog", "pet-cat"]);
  });

  it("treats selecting every available pet type as no filter", () => {
    expect(
      normalizeFeedPetTypeIds(
        ["pet-dog", "pet-cat", "pet-bird"],
        ["pet-dog", "pet-cat", "pet-bird"],
      ),
    ).toEqual([]);
  });

  it("filters out ids that are not part of the available pet types", () => {
    expect(
      normalizeFeedPetTypeIds(
        ["pet-dog", "pet-unknown"],
        ["pet-dog", "pet-cat"],
      ),
    ).toEqual(["pet-dog"]);
  });
});
