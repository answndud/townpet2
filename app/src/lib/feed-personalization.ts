import {
  getPetBreedDisplayLabel,
  getPetLifeStageLabel,
  getPetSizeClassLabel,
  getPetSpeciesLabel,
  hasBreedLoungeRoute,
  normalizePetBreedCode,
} from "@/lib/pet-profile";

type AudienceSegmentLike = {
  label: string;
  species: string | null;
  breedCode: string | null;
  breedLabel?: string | null;
  sizeClass?: string | null;
  sizeLabel?: string | null;
  lifeStage?: string | null;
  lifeStageLabel?: string | null;
  confidenceScore: number;
};

type PetLike = {
  species: string;
  breedCode: string | null;
  breedLabel: string | null;
  sizeClass?: string | null;
  lifeStage?: string | null;
};

export type FeedAudienceContext = {
  source: "segment" | "pet" | "none";
  label: string | null;
  audienceKey: string | null;
  breedCode: string | null;
  personalizationMode: "breed" | "fallback" | "none";
  confidenceScore: number | null;
};

function buildFallbackAudienceKey(input: {
  species: string | null | undefined;
  sizeClass?: string | null;
  lifeStage?: string | null;
}) {
  if (!input.species) {
    return null;
  }

  const parts = [String(input.species)];
  if (input.sizeClass && input.sizeClass !== "UNKNOWN") {
    parts.push(String(input.sizeClass));
  }
  if (input.lifeStage && input.lifeStage !== "UNKNOWN") {
    parts.push(String(input.lifeStage));
  }
  return parts.join(":");
}

export function resolveFeedAudienceContext({
  segment,
  fallbackPet,
}: {
  segment?: AudienceSegmentLike | null;
  fallbackPet?: PetLike | null;
}): FeedAudienceContext {
  if (segment) {
    const breedCode = normalizePetBreedCode(segment.breedCode);
    const hasSpecificBreed = hasBreedLoungeRoute(breedCode);
    const audienceKey = hasSpecificBreed
      ? breedCode
      : buildFallbackAudienceKey({
          species: segment.species,
          sizeClass: segment.sizeClass,
          lifeStage: segment.lifeStage,
        });
    return {
      source: "segment",
      label: segment.label,
      audienceKey,
      breedCode,
      personalizationMode: hasSpecificBreed ? "breed" : "fallback",
      confidenceScore: segment.confidenceScore,
    };
  }

  if (fallbackPet) {
    const breedCode = normalizePetBreedCode(fallbackPet.breedCode);
    const hasSpecificBreed = hasBreedLoungeRoute(breedCode);
    const audienceKey = hasSpecificBreed
      ? breedCode
      : buildFallbackAudienceKey({
          species: fallbackPet.species,
          sizeClass: fallbackPet.sizeClass,
          lifeStage: fallbackPet.lifeStage,
        });
    const label = [
      getPetSpeciesLabel(fallbackPet.species),
      getPetBreedDisplayLabel({
        breedCode,
        breedLabel: fallbackPet.breedLabel,
      }),
      getPetSizeClassLabel(fallbackPet.sizeClass),
      getPetLifeStageLabel(fallbackPet.lifeStage),
    ]
      .filter(Boolean)
      .join(" · ");

    return {
      source: "pet",
      label: label.length > 0 ? label : null,
      audienceKey,
      breedCode,
      personalizationMode: hasSpecificBreed ? "breed" : "fallback",
      confidenceScore: null,
    };
  }

  return {
    source: "none",
    label: null,
    audienceKey: null,
    breedCode: null,
    personalizationMode: "none",
    confidenceScore: null,
  };
}

export function buildFeedPersonalizationSummary(context: FeedAudienceContext) {
  if (context.label) {
    if (context.personalizationMode === "fallback") {
      return {
        title: `${context.label} 기준으로 기본 맞춤 추천 중`,
        description:
          "품종 정보가 구체적이지 않아 같은 종, 체급, 생애단계와 혼종 라벨 신호를 우선 반영합니다.",
        emphasis:
          context.confidenceScore !== null
            ? `fallback 세그먼트 신뢰도 ${Math.round(context.confidenceScore * 100)}%`
            : "프로필 fallback 신호",
      };
    }

    return {
      title: `${context.label} 기준으로 맞춤 추천 중`,
      description:
        "품종/체급 신호가 맞는 글을 조금 더 앞쪽에 보여주되, 일반 탐색 글도 함께 섞어 편향을 낮춥니다.",
      emphasis:
        context.confidenceScore !== null
          ? `세그먼트 신뢰도 ${Math.round(context.confidenceScore * 100)}%`
          : "프로필 기반 직접 신호",
    };
  }

  return {
    title: "맞춤 추천을 준비 중입니다",
    description:
      "반려동물 프로필에 품종, 체급, 생애단계를 입력하면 더 정확한 맞춤 추천과 품종 라운지 연결이 활성화됩니다.",
    emphasis: "프로필 보강 필요",
  };
}

export function buildFeedAdConfig(context: FeedAudienceContext) {
  if (
    !context.label ||
    context.personalizationMode !== "breed" ||
    !hasBreedLoungeRoute(context.breedCode)
  ) {
    return null;
  }

  const audienceKey = context.audienceKey ?? context.breedCode;
  if (!audienceKey || !context.breedCode) {
    return null;
  }

  return {
    audienceKey,
    headline: `${context.label} 보호자를 위한 맞춤 공동구매`,
    description:
      "품종/체급에 맞춘 사료·간식·위생용품 공동구매 모집 글을 확인해 보세요. 광고는 세션/일 빈도 캡 정책으로 제한됩니다.",
    ctaLabel: "맞춤 공동구매 보기",
    ctaHref: `/lounges/breeds/${context.breedCode}`,
    sessionCap: 3,
    dailyCap: 8,
  };
}
