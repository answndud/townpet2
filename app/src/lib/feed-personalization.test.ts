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
      personalizationMode: "breed",
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
        sizeClass: "SMALL",
        lifeStage: "SENIOR",
      },
    });

    expect(context).toMatchObject({
      source: "pet",
      audienceKey: "CAT:SMALL:SENIOR",
      breedCode: "UNKNOWN",
      personalizationMode: "fallback",
      label: "고양이 · 품종 미상 · 소형 · 시니어",
    });
    expect(buildFeedAdConfig(context)).toBeNull();
    expect(buildFeedPersonalizationSummary(context)).toMatchObject({
      title: "고양이 · 품종 미상 · 소형 · 시니어 기준으로 기본 맞춤 추천 중",
      emphasis: "프로필 fallback 신호",
    });
  });

  it("builds fallback audience key for mixed audience segments without breed lounge", () => {
    const context = resolveFeedAudienceContext({
      segment: {
        label: "강아지 · 혼종 · 중형 · 성체",
        species: "DOG",
        breedCode: "MIXED",
        breedLabel: "말티푸",
        sizeClass: "MEDIUM",
        sizeLabel: "중형",
        lifeStage: "ADULT",
        lifeStageLabel: "성체",
        confidenceScore: 0.71,
      },
    });

    expect(context).toMatchObject({
      source: "segment",
      audienceKey: "DOG:MEDIUM:ADULT",
      breedCode: "MIXED",
      personalizationMode: "fallback",
      confidenceScore: 0.71,
    });
    expect(buildFeedAdConfig(context)).toBeNull();
    expect(buildFeedPersonalizationSummary(context)).toMatchObject({
      emphasis: "fallback 세그먼트 신뢰도 71%",
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
