import { describe, expect, it } from "vitest";

import {
  buildFeedAdConfig,
  buildFeedPersonalizationSummary,
  resolveFeedAudienceContext,
} from "@/lib/feed-personalization";

describe("feed personalization helpers", () => {
  it("prefers audience segment data when available", () => {
    const context = resolveFeedAudienceContext({
      segment: {
        label: "강아지 · 말티즈 · 소형 · 성체",
        species: "DOG",
        breedCode: "maltese",
        breedLabel: "말티즈",
        sizeLabel: "소형",
        lifeStageLabel: "성체",
        confidenceScore: 0.88,
      },
      fallbackPet: {
        species: "DOG",
        breedCode: "MIXED",
        breedLabel: null,
        sizeClass: "SMALL",
        lifeStage: "ADULT",
      },
    });

    expect(context).toMatchObject({
      source: "segment",
      label: "강아지 · 말티즈 · 소형 · 성체",
      audienceKey: "MALTESE",
      breedCode: "MALTESE",
      confidenceScore: 0.88,
    });
    expect(buildFeedAdConfig(context)).toMatchObject({
      audienceKey: "MALTESE",
      ctaHref: "/lounges/breeds/MALTESE",
    });
  });

  it("falls back to pet profile and hides breed ad when breed lounge is unavailable", () => {
    const context = resolveFeedAudienceContext({
      fallbackPet: {
        species: "CAT",
        breedCode: "UNKNOWN",
        breedLabel: null,
        sizeClass: "UNKNOWN",
        lifeStage: "SENIOR",
      },
    });

    expect(context).toMatchObject({
      source: "pet",
      audienceKey: "CAT",
      breedCode: "UNKNOWN",
      label: "고양이 · 품종 미상 · 시니어",
    });
    expect(buildFeedAdConfig(context)).toBeNull();
    expect(buildFeedPersonalizationSummary(context)).toMatchObject({
      title: "고양이 · 품종 미상 · 시니어 기준으로 맞춤 추천 중",
      emphasis: "프로필 기반 직접 신호",
    });
  });

  it("returns onboarding-oriented summary when no personalization context exists", () => {
    const context = resolveFeedAudienceContext({});

    expect(buildFeedPersonalizationSummary(context)).toMatchObject({
      title: "맞춤 추천을 준비 중입니다",
      emphasis: "프로필 보강 필요",
    });
  });
});
