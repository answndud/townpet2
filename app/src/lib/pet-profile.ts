export const PET_SPECIES_VALUES = [
  "DOG",
  "CAT",
  "BIRD",
  "REPTILE",
  "SMALL_PET",
  "AQUATIC",
  "AMPHIBIAN",
  "ARTHROPOD",
  "SPECIAL_OTHER",
] as const;

export const PET_SIZE_CLASS_VALUES = [
  "TOY",
  "SMALL",
  "MEDIUM",
  "LARGE",
  "GIANT",
  "UNKNOWN",
] as const;

export const PET_LIFE_STAGE_VALUES = [
  "PUPPY_KITTEN",
  "YOUNG",
  "ADULT",
  "SENIOR",
  "UNKNOWN",
] as const;

export type PetSpeciesValue = (typeof PET_SPECIES_VALUES)[number];
export type PetSizeClassValue = (typeof PET_SIZE_CLASS_VALUES)[number];
export type PetLifeStageValue = (typeof PET_LIFE_STAGE_VALUES)[number];

export const PET_SIZE_CLASS_OPTIONS: Array<{ value: PetSizeClassValue; label: string }> = [
  { value: "UNKNOWN", label: "체급 미상" },
  { value: "TOY", label: "초소형" },
  { value: "SMALL", label: "소형" },
  { value: "MEDIUM", label: "중형" },
  { value: "LARGE", label: "대형" },
  { value: "GIANT", label: "초대형" },
];

export const PET_LIFE_STAGE_OPTIONS: Array<{ value: PetLifeStageValue; label: string }> = [
  { value: "UNKNOWN", label: "생애단계 미상" },
  { value: "PUPPY_KITTEN", label: "퍼피/키튼" },
  { value: "YOUNG", label: "영유기" },
  { value: "ADULT", label: "성체" },
  { value: "SENIOR", label: "시니어" },
];

export type PetAudienceSource = {
  species: PetSpeciesValue | string;
  breedCode?: string | null;
  breedLabel?: string | null;
  sizeClass?: PetSizeClassValue | string | null;
  lifeStage?: PetLifeStageValue | string | null;
};

export type AudienceSegmentDraft = {
  species: PetSpeciesValue;
  breedCode: string | null;
  sizeClass: PetSizeClassValue | null;
  lifeStage: PetLifeStageValue | null;
  interestTags: string[];
  confidenceScore: number;
  displayLabel: string;
};

const SPECIES_LABELS: Record<PetSpeciesValue, string> = {
  DOG: "강아지",
  CAT: "고양이",
  BIRD: "조류",
  REPTILE: "파충류",
  SMALL_PET: "소동물",
  AQUATIC: "어류/수조",
  AMPHIBIAN: "양서류",
  ARTHROPOD: "절지류/곤충",
  SPECIAL_OTHER: "특수동물/기타",
};

const SIZE_LABELS: Record<PetSizeClassValue, string> = {
  TOY: "초소형",
  SMALL: "소형",
  MEDIUM: "중형",
  LARGE: "대형",
  GIANT: "초대형",
  UNKNOWN: "체급 미상",
};

const LIFE_STAGE_LABELS: Record<PetLifeStageValue, string> = {
  PUPPY_KITTEN: "퍼피/키튼",
  YOUNG: "영유기",
  ADULT: "성체",
  SENIOR: "시니어",
  UNKNOWN: "생애단계 미상",
};

export function normalizePetSpecies(value: string | null | undefined): PetSpeciesValue {
  return PET_SPECIES_VALUES.find((candidate) => candidate === value) ?? "DOG";
}

export function normalizePetSizeClass(
  value: string | null | undefined,
): PetSizeClassValue | null {
  return PET_SIZE_CLASS_VALUES.find((candidate) => candidate === value) ?? null;
}

export function normalizePetLifeStage(
  value: string | null | undefined,
): PetLifeStageValue | null {
  return PET_LIFE_STAGE_VALUES.find((candidate) => candidate === value) ?? null;
}

export function normalizePetBreedCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

export function hasBreedLoungeRoute(value: string | null | undefined) {
  const breedCode = normalizePetBreedCode(value);
  return Boolean(breedCode) && breedCode !== "UNKNOWN" && breedCode !== "MIXED";
}

export function getPetSpeciesLabel(value: string | null | undefined) {
  return SPECIES_LABELS[normalizePetSpecies(value)];
}

export function getPetSizeClassLabel(
  value: string | null | undefined,
  options?: { includeUnknown?: boolean },
) {
  const sizeClass = normalizePetSizeClass(value);
  if (!sizeClass) {
    return null;
  }
  if (!options?.includeUnknown && sizeClass === "UNKNOWN") {
    return null;
  }
  return SIZE_LABELS[sizeClass];
}

export function getPetLifeStageLabel(
  value: string | null | undefined,
  options?: { includeUnknown?: boolean },
) {
  const lifeStage = normalizePetLifeStage(value);
  if (!lifeStage) {
    return null;
  }
  if (!options?.includeUnknown && lifeStage === "UNKNOWN") {
    return null;
  }
  return LIFE_STAGE_LABELS[lifeStage];
}

export function getPetBreedDisplayLabel(input: {
  breedLabel?: string | null;
  breedCode?: string | null;
}) {
  const breedLabel = input.breedLabel?.trim();
  if (breedLabel) {
    return breedLabel;
  }

  const breedCode = normalizePetBreedCode(input.breedCode);
  if (!breedCode) {
    return null;
  }
  if (breedCode === "MIXED") {
    return "혼종";
  }
  if (breedCode === "UNKNOWN") {
    return "품종 미상";
  }
  return breedCode;
}

export function extractAudienceSegmentBreedLabel(interestTags: string[]) {
  const match = interestTags.find((tag) => tag.startsWith("breedLabel:"));
  if (!match) {
    return null;
  }
  const value = match.slice("breedLabel:".length).trim();
  return value.length > 0 ? value : null;
}

export function buildAudienceSegmentLabel(input: {
  species: string | null | undefined;
  breedCode?: string | null;
  breedLabel?: string | null;
  interestTags?: string[];
  sizeClass?: string | null;
  lifeStage?: string | null;
}) {
  const parts = [getPetSpeciesLabel(input.species)];
  const breedLabel =
    getPetBreedDisplayLabel({
      breedLabel: input.breedLabel ?? extractAudienceSegmentBreedLabel(input.interestTags ?? []),
      breedCode: input.breedCode,
    }) ?? null;
  const sizeLabel = getPetSizeClassLabel(input.sizeClass);
  const lifeStageLabel = getPetLifeStageLabel(input.lifeStage);

  if (breedLabel) {
    parts.push(breedLabel);
  }
  if (sizeLabel) {
    parts.push(sizeLabel);
  }
  if (lifeStageLabel) {
    parts.push(lifeStageLabel);
  }

  return parts.join(" · ");
}

export function buildAudienceSegmentsFromPets(
  pets: PetAudienceSource[],
): AudienceSegmentDraft[] {
  const grouped = new Map<
    string,
    {
      species: PetSpeciesValue;
      breedCode: string | null;
      breedLabel: string | null;
      sizeClass: PetSizeClassValue | null;
      lifeStage: PetLifeStageValue | null;
      count: number;
    }
  >();

  for (const pet of pets) {
    const species = normalizePetSpecies(pet.species);
    const breedCode = normalizePetBreedCode(pet.breedCode);
    const breedLabel = pet.breedLabel?.trim() ? pet.breedLabel.trim() : null;
    const sizeClass = normalizePetSizeClass(pet.sizeClass) ?? "UNKNOWN";
    const lifeStage = normalizePetLifeStage(pet.lifeStage) ?? "UNKNOWN";
    const key = [species, breedCode ?? "", sizeClass, lifeStage].join("|");
    const existing = grouped.get(key);

    if (existing) {
      existing.count += 1;
      if (!existing.breedLabel && breedLabel) {
        existing.breedLabel = breedLabel;
      }
      continue;
    }

    grouped.set(key, {
      species,
      breedCode,
      breedLabel,
      sizeClass,
      lifeStage,
      count: 1,
    });
  }

  return Array.from(grouped.values())
    .map((segment) => {
      const interestTags = [
        "source:pet-profile",
        "signal:explicit-pet",
        `species:${segment.species}`,
      ];

      if (segment.breedCode) {
        interestTags.push(`breed:${segment.breedCode}`);
      }
      if (segment.breedLabel) {
        interestTags.push(`breedLabel:${segment.breedLabel}`);
      }
      if (segment.sizeClass !== "UNKNOWN") {
        interestTags.push(`size:${segment.sizeClass}`);
      }
      if (segment.lifeStage !== "UNKNOWN") {
        interestTags.push(`lifeStage:${segment.lifeStage}`);
      }

      const confidenceScore = Number(
        Math.min(
          0.95,
          0.55 +
            (segment.breedCode ? 0.18 : 0) +
            (segment.breedLabel && !segment.breedCode ? 0.08 : 0) +
            (segment.sizeClass !== "UNKNOWN" ? 0.08 : 0) +
            (segment.lifeStage !== "UNKNOWN" ? 0.08 : 0) +
            Math.min(0.06, (segment.count - 1) * 0.03),
        ).toFixed(2),
      );

      return {
        species: segment.species,
        breedCode: segment.breedCode,
        sizeClass: segment.sizeClass === "UNKNOWN" ? null : segment.sizeClass,
        lifeStage: segment.lifeStage === "UNKNOWN" ? null : segment.lifeStage,
        interestTags,
        confidenceScore,
        displayLabel: buildAudienceSegmentLabel({
          species: segment.species,
          breedCode: segment.breedCode,
          breedLabel: segment.breedLabel,
          sizeClass: segment.sizeClass,
          lifeStage: segment.lifeStage,
        }),
      } satisfies AudienceSegmentDraft;
    })
    .sort((left, right) => {
      if (right.confidenceScore !== left.confidenceScore) {
        return right.confidenceScore - left.confidenceScore;
      }
      return left.displayLabel.localeCompare(right.displayLabel, "ko");
    });
}
