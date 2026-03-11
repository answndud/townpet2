import { DEFAULT_BREED_CATALOG } from "@/lib/breed-catalog";
import { normalizeNeighborhoodCity } from "@/lib/neighborhood-region";
import { normalizeStoredText } from "@/lib/text-normalization";

const MULTISPACE_REGEX = /\s+/g;
const DISTRICT_SUFFIX_REGEX = /(시|군|구)$/;

const HOSPITAL_TREATMENT_ALIAS_TO_CANONICAL: Record<string, string> = {
  검진: "건강 검진",
  건강검진: "건강 검진",
  정기검진: "건강 검진",
  예방접종: "예방 접종",
  접종: "예방 접종",
  중성화: "중성화 수술",
  중성화수술: "중성화 수술",
  피부염: "피부 질환",
  피부질환: "피부 질환",
  치석제거: "스케일링",
  스케일링: "스케일링",
  치과검진: "치과 검진",
};

const ANIMAL_TYPE_ALIAS_TO_CANONICAL: Record<string, string> = {
  dog: "강아지",
  개: "강아지",
  강아지: "강아지",
  멍멍이: "강아지",
  puppy: "강아지",
  cat: "고양이",
  고양이: "고양이",
  냥이: "고양이",
  kitten: "고양이",
  rabbit: "토끼",
  토끼: "토끼",
  hamster: "햄스터",
  햄스터: "햄스터",
  bird: "새",
  조류: "새",
  새: "새",
  reptile: "파충류",
  파충류: "파충류",
};

const VOLUNTEER_TYPE_ALIAS_TO_CANONICAL: Record<string, string> = {
  산책봉사: "산책",
  산책도우미: "산책",
  청소봉사: "청소",
  목욕봉사: "목욕",
  사진촬영: "사진 촬영",
  사진촬영봉사: "사진 촬영",
  임시보호상담: "임시보호 상담",
  sns홍보: "SNS 홍보",
};

function normalizeWhitespace(value: string) {
  return normalizeStoredText(value).replace(MULTISPACE_REGEX, " ").trim();
}

function toLookupKey(value: string) {
  return normalizeWhitespace(value).replace(MULTISPACE_REGEX, "").toLowerCase();
}

function buildBreedAliasMap() {
  const aliasGroups = new Map<string, Set<string>>();

  for (const entry of DEFAULT_BREED_CATALOG) {
    for (const alias of [entry.labelKo, ...entry.aliases]) {
      const key = toLookupKey(alias);
      if (!key) {
        continue;
      }
      const labels = aliasGroups.get(key) ?? new Set<string>();
      labels.add(entry.labelKo);
      aliasGroups.set(key, labels);
    }
  }

  const aliasMap = new Map<string, string>();
  for (const [key, labels] of aliasGroups.entries()) {
    if (labels.size === 1) {
      aliasMap.set(key, Array.from(labels)[0]!);
    }
  }

  return aliasMap;
}

const BREED_ALIAS_TO_CANONICAL = buildBreedAliasMap();

export const HOSPITAL_TREATMENT_TYPE_SUGGESTIONS = [
  "건강 검진",
  "예방 접종",
  "중성화 수술",
  "피부 질환",
  "스케일링",
  "슬개골 검사",
  "혈액 검사",
  "영상 검사",
] as const;

export const STRUCTURED_REGION_SUGGESTIONS = [
  "서울특별시 마포구",
  "서울특별시 서초구",
  "서울특별시 강남구",
  "경기도 성남시 분당구",
  "경기도 수원시 영통구",
  "인천광역시 연수구",
] as const;

export const ADOPTION_ANIMAL_TYPE_SUGGESTIONS = [
  "강아지",
  "고양이",
  "토끼",
  "햄스터",
  "새",
  "파충류",
] as const;

export const ADOPTION_BREED_SUGGESTIONS = DEFAULT_BREED_CATALOG.filter(
  (entry) => entry.species === "DOG" || entry.species === "CAT",
)
  .map((entry) => entry.labelKo)
  .filter((label, index, items) => items.indexOf(label) === index)
  .slice(0, 20);

export const ADOPTION_AGE_LABEL_SUGGESTIONS = [
  "2개월",
  "6개월",
  "1살",
  "2살",
  "2살 추정",
  "성묘",
  "노령견",
] as const;

export const VOLUNTEER_TYPE_SUGGESTIONS = [
  "산책",
  "청소",
  "목욕",
  "사진 촬영",
  "SNS 홍보",
  "임시보호 상담",
] as const;

export function normalizeStructuredTextValue(value: string | null | undefined) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = normalizeWhitespace(value);
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeHospitalName(value: string | null | undefined) {
  const normalized = normalizeStructuredTextValue(value);
  if (!normalized) {
    return undefined;
  }

  return normalized
    .replace(/24\s*(시간|시)/g, "24시")
    .replace(/동물\s+병원/g, "동물병원")
    .replace(/동물\s+의료원/g, "동물의료원")
    .replace(/의료\s+원/g, "의료원");
}

export function normalizeShelterName(value: string | null | undefined) {
  const normalized = normalizeStructuredTextValue(value);
  if (!normalized) {
    return undefined;
  }

  return normalized
    .replace(/보호\s+소/g, "보호소")
    .replace(/보호\s+센터/g, "보호센터")
    .replace(/동물\s+보호\s+센터/g, "동물보호센터")
    .replace(/동물\s+보호센터/g, "동물보호센터")
    .replace(/유기\s+동물/g, "유기동물");
}

export function normalizeHospitalTreatmentType(value: string | null | undefined) {
  const normalized = normalizeStructuredTextValue(value);
  if (!normalized) {
    return undefined;
  }

  const key = toLookupKey(normalized);
  return HOSPITAL_TREATMENT_ALIAS_TO_CANONICAL[key] ?? normalized;
}

export function normalizeAnimalType(value: string | null | undefined) {
  const normalized = normalizeStructuredTextValue(value);
  if (!normalized) {
    return undefined;
  }

  const key = toLookupKey(normalized);
  return ANIMAL_TYPE_ALIAS_TO_CANONICAL[key] ?? normalized;
}

export function normalizeBreedLabel(
  value: string | null | undefined,
  animalType?: string | null | undefined,
) {
  const normalized = normalizeStructuredTextValue(value);
  if (!normalized) {
    return undefined;
  }

  const canonicalAnimalType = normalizeAnimalType(animalType);
  const resolved = BREED_ALIAS_TO_CANONICAL.get(toLookupKey(normalized)) ?? normalized;

  if (!canonicalAnimalType) {
    return resolved;
  }

  if (canonicalAnimalType === "강아지" || canonicalAnimalType === "고양이") {
    return resolved;
  }

  return normalized;
}

export function normalizeAdoptionAgeLabel(value: string | null | undefined) {
  const normalized = normalizeStructuredTextValue(value);
  if (!normalized) {
    return undefined;
  }

  return normalized
    .replace(/(\d+)\s*세/g, "$1살")
    .replace(/(\d+)\s*살/g, "$1살")
    .replace(/(\d+)\s*개?월/g, "$1개월")
    .replace(/\s+추정/g, " 추정");
}

export function normalizeVolunteerType(value: string | null | undefined) {
  const normalized = normalizeStructuredTextValue(value);
  if (!normalized) {
    return undefined;
  }

  const key = toLookupKey(normalized);
  return VOLUNTEER_TYPE_ALIAS_TO_CANONICAL[key] ?? normalized;
}

export function normalizeStructuredRegion(value: string | null | undefined) {
  const normalized = normalizeStructuredTextValue(value);
  if (!normalized) {
    return undefined;
  }

  const tokens = normalized.split(" ").filter(Boolean);
  if (tokens.length === 0) {
    return undefined;
  }

  const canonicalCity = normalizeNeighborhoodCity(tokens[0]) || tokens[0];
  if (tokens.length === 1) {
    return canonicalCity;
  }

  let district = tokens[1]!;
  if (/(특별시|광역시)$/.test(canonicalCity) && !DISTRICT_SUFFIX_REGEX.test(district)) {
    district = `${district}구`;
  }

  return [canonicalCity, district, ...tokens.slice(2)].join(" ");
}

export function normalizeHospitalReviewFields<T extends { hospitalName?: string; treatmentType?: string }>(
  input: T,
) {
  return {
    ...input,
    hospitalName: normalizeHospitalName(input.hospitalName),
    treatmentType: normalizeHospitalTreatmentType(input.treatmentType),
  };
}

export function normalizeAdoptionListingFields<
  T extends {
    shelterName?: string;
    region?: string;
    animalType?: string;
    breed?: string;
    ageLabel?: string;
    sizeLabel?: string;
  },
>(input: T) {
  const animalType = normalizeAnimalType(input.animalType);
  return {
    ...input,
    shelterName: normalizeShelterName(input.shelterName),
    region: normalizeStructuredRegion(input.region),
    animalType,
    breed: normalizeBreedLabel(input.breed, animalType),
    ageLabel: normalizeAdoptionAgeLabel(input.ageLabel),
    sizeLabel: normalizeStructuredTextValue(input.sizeLabel),
  };
}

export function normalizeVolunteerRecruitmentFields<
  T extends {
    shelterName?: string;
    region?: string;
    volunteerType?: string;
  },
>(input: T) {
  return {
    ...input,
    shelterName: normalizeShelterName(input.shelterName),
    region: normalizeStructuredRegion(input.region),
    volunteerType: normalizeVolunteerType(input.volunteerType),
  };
}

export function buildStructuredSearchVariants(query: string) {
  const normalized = normalizeStructuredTextValue(query);
  if (!normalized) {
    return [] as string[];
  }

  const variants = new Set<string>([normalized]);
  const canonicalAnimalType = normalizeAnimalType(normalized);
  const inferredAnimalType =
    canonicalAnimalType && canonicalAnimalType !== normalized ? canonicalAnimalType : undefined;

  for (const candidate of [
    normalizeHospitalName(normalized),
    normalizeShelterName(normalized),
    normalizeHospitalTreatmentType(normalized),
    normalizeStructuredRegion(normalized),
    inferredAnimalType,
    normalizeBreedLabel(normalized, inferredAnimalType),
    normalizeAdoptionAgeLabel(normalized),
    normalizeVolunteerType(normalized),
  ]) {
    if (candidate) {
      variants.add(candidate);
    }
  }

  return Array.from(variants);
}
