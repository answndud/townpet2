import { normalizeStructuredTextValue } from "@/lib/structured-field-normalization";
import { normalizeStoredText } from "@/lib/text-normalization";

type StructuredSearchTextInput = {
  animalTags?: string[] | null;
  hospitalReview?: {
    hospitalName?: string | null;
    treatmentType?: string | null;
  } | null;
  placeReview?: {
    placeName?: string | null;
    placeType?: string | null;
    address?: string | null;
  } | null;
  walkRoute?: {
    routeName?: string | null;
    safetyTags?: string[] | null;
  } | null;
  adoptionListing?: {
    shelterName?: string | null;
    region?: string | null;
    animalType?: string | null;
    breed?: string | null;
    ageLabel?: string | null;
    sizeLabel?: string | null;
  } | null;
  volunteerRecruitment?: {
    shelterName?: string | null;
    region?: string | null;
    volunteerType?: string | null;
  } | null;
};

function normalizeArray(values: Array<string | null | undefined> | null | undefined) {
  return (values ?? [])
    .map((value) => normalizeStructuredTextValue(value))
    .filter((value): value is string => Boolean(value));
}

export function buildPostStructuredSearchText(input: StructuredSearchTextInput) {
  const tokens = [
    ...normalizeArray(input.animalTags),
    ...normalizeArray([
      input.hospitalReview?.hospitalName,
      input.hospitalReview?.treatmentType,
      input.placeReview?.placeName,
      input.placeReview?.placeType,
      input.placeReview?.address,
      input.walkRoute?.routeName,
      ...(input.walkRoute?.safetyTags ?? []),
      input.adoptionListing?.shelterName,
      input.adoptionListing?.region,
      input.adoptionListing?.animalType,
      input.adoptionListing?.breed,
      input.adoptionListing?.ageLabel,
      input.adoptionListing?.sizeLabel,
      input.volunteerRecruitment?.shelterName,
      input.volunteerRecruitment?.region,
      input.volunteerRecruitment?.volunteerType,
    ]),
  ];

  if (tokens.length === 0) {
    return "";
  }

  return normalizeStoredText(tokens.join(" ")).replace(/\s+/g, " ").trim();
}
