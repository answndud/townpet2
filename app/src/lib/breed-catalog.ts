import {
  PET_SPECIES_VALUES,
  type PetSizeClassValue,
  type PetSpeciesValue,
} from "@/lib/pet-profile";

export type BreedCatalogEntry = {
  species: PetSpeciesValue;
  code: string;
  labelKo: string;
  aliases: string[];
  defaultSize: PetSizeClassValue;
};

export const BREED_CATALOG_CUSTOM_VALUE = "__CUSTOM__";

export const DEFAULT_BREED_CATALOG: BreedCatalogEntry[] = [
  { species: "DOG", code: "MALTESE", labelKo: "말티즈", aliases: ["말티"], defaultSize: "SMALL" },
  { species: "DOG", code: "POODLE", labelKo: "푸들", aliases: ["토이푸들", "미니어처 푸들"], defaultSize: "SMALL" },
  { species: "DOG", code: "POMERANIAN", labelKo: "포메라니안", aliases: ["포메"], defaultSize: "SMALL" },
  { species: "DOG", code: "CHIHUAHUA", labelKo: "치와와", aliases: [], defaultSize: "TOY" },
  { species: "DOG", code: "SHIH_TZU", labelKo: "시추", aliases: [], defaultSize: "SMALL" },
  { species: "DOG", code: "BICHON_FRISE", labelKo: "비숑 프리제", aliases: ["비숑"], defaultSize: "SMALL" },
  { species: "DOG", code: "WELSH_CORGI", labelKo: "웰시코기", aliases: ["코기"], defaultSize: "MEDIUM" },
  { species: "DOG", code: "FRENCH_BULLDOG", labelKo: "프렌치 불도그", aliases: ["프불"], defaultSize: "MEDIUM" },
  { species: "DOG", code: "GOLDEN_RETRIEVER", labelKo: "골든 리트리버", aliases: ["골든"], defaultSize: "LARGE" },
  { species: "DOG", code: "LABRADOR_RETRIEVER", labelKo: "래브라도 리트리버", aliases: ["라브라도"], defaultSize: "LARGE" },
  { species: "DOG", code: "JINDO", labelKo: "진돗개", aliases: ["진도"], defaultSize: "MEDIUM" },
  { species: "CAT", code: "KOREAN_SHORTHAIR", labelKo: "코리안 숏헤어", aliases: ["코숏"], defaultSize: "SMALL" },
  { species: "CAT", code: "PERSIAN", labelKo: "페르시안", aliases: [], defaultSize: "SMALL" },
  { species: "CAT", code: "SCOTTISH_FOLD", labelKo: "스코티시 폴드", aliases: ["스코티시"], defaultSize: "SMALL" },
  { species: "CAT", code: "RAGDOLL", labelKo: "랙돌", aliases: [], defaultSize: "MEDIUM" },
  { species: "CAT", code: "RUSSIAN_BLUE", labelKo: "러시안 블루", aliases: [], defaultSize: "SMALL" },
  { species: "CAT", code: "BENGAL", labelKo: "벵갈", aliases: [], defaultSize: "MEDIUM" },
  { species: "CAT", code: "SIAMESE", labelKo: "샴", aliases: ["샴고양이"], defaultSize: "SMALL" },
  { species: "CAT", code: "BRITISH_SHORTHAIR", labelKo: "브리티시 숏헤어", aliases: ["브숏"], defaultSize: "MEDIUM" },
  { species: "CAT", code: "NORWEGIAN_FOREST", labelKo: "노르웨이 숲", aliases: ["노르웨이숲"], defaultSize: "MEDIUM" },
  { species: "BIRD", code: "BUDGERIGAR", labelKo: "잉꼬", aliases: ["버지"], defaultSize: "UNKNOWN" },
  { species: "BIRD", code: "COCKATIEL", labelKo: "코카티엘", aliases: ["왕관앵무"], defaultSize: "UNKNOWN" },
  { species: "BIRD", code: "PARROT", labelKo: "앵무새", aliases: [], defaultSize: "UNKNOWN" },
  { species: "REPTILE", code: "LEOPARD_GECKO", labelKo: "레오파드 게코", aliases: ["레게"], defaultSize: "UNKNOWN" },
  { species: "REPTILE", code: "BEARDED_DRAGON", labelKo: "비어디 드래곤", aliases: ["비어디"], defaultSize: "UNKNOWN" },
  { species: "REPTILE", code: "CORN_SNAKE", labelKo: "콘스네이크", aliases: ["콘스네이크"], defaultSize: "UNKNOWN" },
  { species: "SMALL_PET", code: "HAMSTER", labelKo: "햄스터", aliases: [], defaultSize: "TOY" },
  { species: "SMALL_PET", code: "GUINEA_PIG", labelKo: "기니피그", aliases: [], defaultSize: "SMALL" },
  { species: "SMALL_PET", code: "RABBIT", labelKo: "토끼", aliases: [], defaultSize: "SMALL" },
  { species: "SMALL_PET", code: "FERRET", labelKo: "페럿", aliases: [], defaultSize: "SMALL" },
  { species: "AQUATIC", code: "GOLDFISH", labelKo: "금붕어", aliases: [], defaultSize: "UNKNOWN" },
  { species: "AQUATIC", code: "BETTA", labelKo: "베타", aliases: [], defaultSize: "UNKNOWN" },
  { species: "AQUATIC", code: "GUPPY", labelKo: "구피", aliases: [], defaultSize: "UNKNOWN" },
  { species: "AMPHIBIAN", code: "AXOLOTL", labelKo: "아홀로틀", aliases: ["우파루파"], defaultSize: "UNKNOWN" },
  { species: "AMPHIBIAN", code: "TREE_FROG", labelKo: "청개구리", aliases: [], defaultSize: "UNKNOWN" },
  { species: "ARTHROPOD", code: "TARANTULA", labelKo: "타란툴라", aliases: [], defaultSize: "UNKNOWN" },
  { species: "ARTHROPOD", code: "BEETLE", labelKo: "장수풍뎅이/사슴벌레", aliases: ["장수풍뎅이", "사슴벌레"], defaultSize: "UNKNOWN" },
  { species: "SPECIAL_OTHER", code: "HEDGEHOG", labelKo: "고슴도치", aliases: [], defaultSize: "TOY" },
  { species: "SPECIAL_OTHER", code: "SUGAR_GLIDER", labelKo: "슈가글라이더", aliases: ["슈가 글라이더"], defaultSize: "TOY" },
];

export function listDefaultBreedCatalogBySpecies(species: PetSpeciesValue) {
  return DEFAULT_BREED_CATALOG.filter((entry) => entry.species === species).sort((left, right) =>
    left.labelKo.localeCompare(right.labelKo, "ko"),
  );
}

export function findDefaultBreedCatalogEntry(
  species: PetSpeciesValue,
  code: string | null | undefined,
) {
  const normalized = code?.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  return (
    DEFAULT_BREED_CATALOG.find(
      (entry) => entry.species === species && entry.code === normalized,
    ) ?? null
  );
}

export function buildDefaultBreedCatalogBySpecies() {
  return PET_SPECIES_VALUES.reduce(
    (acc, species) => ({
      ...acc,
      [species]: listDefaultBreedCatalogBySpecies(species),
    }),
    {} as Record<PetSpeciesValue, BreedCatalogEntry[]>,
  );
}
