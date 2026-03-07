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
  preferredPetTypeLabels: string[];
  preferredInterestLabels: string[];
  recentEngagementLabels: string[];
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

function normalizePreferredPetTypeLabels(labels?: string[]) {
  if (!Array.isArray(labels)) {
    return [];
  }

  return Array.from(
    new Set(
      labels
        .map((label) => label.trim())
        .filter((label) => label.length > 0),
    ),
  ).slice(0, 3);
}

function normalizePreferredInterestLabels(labels?: string[]) {
  if (!Array.isArray(labels)) {
    return [];
  }

  return Array.from(
    new Set(
      labels
        .map((label) => label.trim())
        .filter((label) => label.length > 0),
    ),
  ).slice(0, 3);
}

function normalizeRecentEngagementLabels(labels?: string[]) {
  if (!Array.isArray(labels)) {
    return [];
  }

  return Array.from(
    new Set(
      labels
        .map((label) => label.trim())
        .filter((label) => label.length > 0),
    ),
  ).slice(0, 3);
}

function appendPreferredPetTypeHint(description: string, preferredPetTypeLabels: string[]) {
  if (preferredPetTypeLabels.length === 0) {
    return description;
  }

  return `${description} 선택한 커뮤니티 선호도 2차 신호로 함께 반영합니다.`;
}

function buildPreferredPetTypeEmphasis(preferredPetTypeLabels: string[]) {
  if (preferredPetTypeLabels.length === 0) {
    return null;
  }

  return `선호 커뮤니티 ${preferredPetTypeLabels.join(", ")}`;
}

function buildPreferredInterestEmphasis(preferredInterestLabels: string[]) {
  if (preferredInterestLabels.length === 0) {
    return null;
  }

  return `관심 태그 ${preferredInterestLabels.join(", ")}`;
}

function appendPreferredInterestHint(description: string, preferredInterestLabels: string[]) {
  if (preferredInterestLabels.length === 0) {
    return description;
  }

  return `${description} 관심 태그와 콘텐츠 카테고리 3차 신호도 함께 반영합니다.`;
}

function buildRecentEngagementEmphasis(recentEngagementLabels: string[]) {
  if (recentEngagementLabels.length === 0) {
    return null;
  }

  return `최근 반응 ${recentEngagementLabels.join(", ")}`;
}

function appendRecentEngagementHint(description: string, recentEngagementLabels: string[]) {
  if (recentEngagementLabels.length === 0) {
    return description;
  }

  return `${description} 최근 좋아요/싫어요 반응 4차 신호도 약하게 반영합니다.`;
}

export function resolveFeedAudienceContext({
  segment,
  fallbackPet,
  preferredPetTypeLabels,
  preferredInterestLabels,
  recentEngagementLabels,
}: {
  segment?: AudienceSegmentLike | null;
  fallbackPet?: PetLike | null;
  preferredPetTypeLabels?: string[];
  preferredInterestLabels?: string[];
  recentEngagementLabels?: string[];
}): FeedAudienceContext {
  const normalizedPreferredPetTypeLabels = normalizePreferredPetTypeLabels(
    preferredPetTypeLabels,
  );
  const normalizedPreferredInterestLabels = normalizePreferredInterestLabels(
    preferredInterestLabels,
  );
  const normalizedRecentEngagementLabels = normalizeRecentEngagementLabels(
    recentEngagementLabels,
  );

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
      preferredPetTypeLabels: normalizedPreferredPetTypeLabels,
      preferredInterestLabels: normalizedPreferredInterestLabels,
      recentEngagementLabels: normalizedRecentEngagementLabels,
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
      preferredPetTypeLabels: normalizedPreferredPetTypeLabels,
      preferredInterestLabels: normalizedPreferredInterestLabels,
      recentEngagementLabels: normalizedRecentEngagementLabels,
    };
  }

  return {
    source: "none",
    label: null,
    audienceKey: null,
    breedCode: null,
    personalizationMode: "none",
    confidenceScore: null,
    preferredPetTypeLabels: normalizedPreferredPetTypeLabels,
    preferredInterestLabels: normalizedPreferredInterestLabels,
    recentEngagementLabels: normalizedRecentEngagementLabels,
  };
}

export function buildFeedPersonalizationSummary(context: FeedAudienceContext) {
  const preferredPetTypeEmphasis = buildPreferredPetTypeEmphasis(
    context.preferredPetTypeLabels,
  );
  const preferredInterestEmphasis = buildPreferredInterestEmphasis(
    context.preferredInterestLabels,
  );
  const recentEngagementEmphasis = buildRecentEngagementEmphasis(
    context.recentEngagementLabels,
  );

  if (context.label) {
    if (context.personalizationMode === "fallback") {
      return {
        title: `${context.label} 기준으로 기본 맞춤 추천 중`,
        description: appendRecentEngagementHint(
          appendPreferredInterestHint(
            appendPreferredPetTypeHint(
              "품종 정보가 구체적이지 않아 같은 종, 체급, 생애단계와 혼종 라벨 신호를 우선 반영합니다.",
              context.preferredPetTypeLabels,
            ),
            context.preferredInterestLabels,
          ),
          context.recentEngagementLabels,
        ),
        emphasis: [
          context.confidenceScore !== null
            ? `fallback 세그먼트 신뢰도 ${Math.round(context.confidenceScore * 100)}%`
            : "프로필 fallback 신호",
          preferredPetTypeEmphasis,
          preferredInterestEmphasis,
          recentEngagementEmphasis,
        ]
          .filter(Boolean)
          .join(" · "),
      };
    }

    return {
      title: `${context.label} 기준으로 맞춤 추천 중`,
      description: appendRecentEngagementHint(
        appendPreferredInterestHint(
          appendPreferredPetTypeHint(
            "품종/체급 신호가 맞는 글을 조금 더 앞쪽에 보여주되, 일반 탐색 글도 함께 섞어 편향을 낮춥니다.",
            context.preferredPetTypeLabels,
          ),
          context.preferredInterestLabels,
        ),
        context.recentEngagementLabels,
      ),
      emphasis: [
        context.confidenceScore !== null
          ? `세그먼트 신뢰도 ${Math.round(context.confidenceScore * 100)}%`
          : "프로필 기반 직접 신호",
        preferredPetTypeEmphasis,
        preferredInterestEmphasis,
        recentEngagementEmphasis,
      ]
        .filter(Boolean)
        .join(" · "),
    };
  }

  if (
    context.preferredPetTypeLabels.length > 0 ||
    context.preferredInterestLabels.length > 0 ||
    context.recentEngagementLabels.length > 0
  ) {
    const fallbackDescription =
      context.preferredPetTypeLabels.length > 0
        ? "반려동물 프로필 신호가 부족해 선택한 커뮤니티 선호를 우선 반영합니다. 프로필을 보강하면 품종/체급 기준 정확도가 더 올라갑니다."
        : context.preferredInterestLabels.length > 0
          ? "반려동물 프로필 신호가 부족해 관심 태그와 콘텐츠 카테고리를 우선 반영합니다. 프로필을 보강하면 품종/체급 기준 정확도가 더 올라갑니다."
          : "반려동물 프로필 신호가 부족해 최근 반응한 콘텐츠 주제를 우선 반영합니다. 프로필을 보강하면 품종/체급 기준 정확도가 더 올라갑니다.";
    return {
      title:
        context.preferredPetTypeLabels.length > 0
          ? "선호 커뮤니티 기준으로 기본 맞춤 추천 중"
          : context.preferredInterestLabels.length > 0
            ? "관심 태그 기준으로 기본 맞춤 추천 중"
            : "최근 반응 기준으로 기본 맞춤 추천 중",
      description: appendRecentEngagementHint(
        appendPreferredInterestHint(fallbackDescription, context.preferredInterestLabels),
        context.recentEngagementLabels,
      ),
      emphasis:
        [preferredPetTypeEmphasis, preferredInterestEmphasis, recentEngagementEmphasis]
          .filter(Boolean)
          .join(" · ") || "선호 커뮤니티 신호",
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
