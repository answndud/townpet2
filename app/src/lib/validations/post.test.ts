import { PostScope, PostType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  adoptionListingSchema,
  hospitalReviewSchema,
  placeReviewSchema,
  postCreateSchema,
  postListSchema,
  toPostListInput,
  volunteerRecruitmentSchema,
  walkRouteSchema,
} from "@/lib/validations/post";

describe("post validations", () => {
  it("accepts a valid post create payload", () => {
    const result = postCreateSchema.safeParse({
      title: "테스트",
      content: "내용",
      type: PostType.FREE_BOARD,
      scope: PostScope.LOCAL,
      neighborhoodId: "ckc7k5qsj0000u0t8qv6d1d7k",
      petTypeId: "ckc7k5qsj0000u0t8qv6d1d7k",
      imageUrls: ["/uploads/test.png"],
    });

    expect(result.success).toBe(true);
  });

  it("rejects whitespace-only title and content", () => {
    const result = postCreateSchema.safeParse({
      title: "   ",
      content: "\n \t ",
      type: PostType.FREE_BOARD,
      scope: PostScope.GLOBAL,
    });

    expect(result.success).toBe(false);
  });

  it("normalizes composed unicode title and content", () => {
    const result = postCreateSchema.safeParse({
      title: "테스트",
      content: "내용",
      type: PostType.FREE_BOARD,
      scope: PostScope.GLOBAL,
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.title).toBe("테스트");
    expect(result.data.content).toBe("내용");
  });

  it("rejects invalid hospital review rating", () => {
    const result = hospitalReviewSchema.safeParse({
      hospitalName: "동물병원",
      treatmentType: "검진",
      rating: 6,
    });

    expect(result.success).toBe(false);
  });

  it("canonicalizes hospital review and adoption structured text fields", () => {
    const hospital = hospitalReviewSchema.safeParse({
      hospitalName: "서울 24 시간 동물 병원",
      treatmentType: "중성화",
    });
    const adoption = adoptionListingSchema.safeParse({
      shelterName: "서울시 동물 보호 센터",
      region: "서울 마포",
      animalType: "개",
      breed: "코숏",
      ageLabel: "2 세 추정",
      sizeLabel: " 중형 ",
    });

    expect(hospital.success).toBe(true);
    expect(adoption.success).toBe(true);
    expect(hospital.data).toMatchObject({
      hospitalName: "서울 24시 동물병원",
      treatmentType: "중성화 수술",
    });
    expect(adoption.data).toMatchObject({
      shelterName: "서울시 동물보호센터",
      region: "서울특별시 마포구",
      animalType: "강아지",
      breed: "코숏",
      ageLabel: "2살 추정",
      sizeLabel: "중형",
    });
  });

  it("accepts place review defaults", () => {
    const result = placeReviewSchema.safeParse({
      placeName: "펫카페",
      placeType: "카페",
      rating: 5,
    });

    expect(result.success).toBe(true);
    expect(result.data?.isPetAllowed).toBeUndefined();
  });

  it("parses walk route defaults", () => {
    const result = walkRouteSchema.safeParse({
      routeName: "산책로",
    });

    expect(result.success).toBe(true);
    expect(result.data?.difficulty).toBeUndefined();
  });

  it("parses adoption listing enums and false booleans correctly", () => {
    const result = adoptionListingSchema.safeParse({
      shelterName: "강동 보호소",
      sex: "FEMALE",
      isNeutered: "false",
      isVaccinated: "true",
      status: "OPEN",
    });

    expect(result.success).toBe(true);
    expect(result.data?.sex).toBe("FEMALE");
    expect(result.data?.isNeutered).toBe(false);
    expect(result.data?.isVaccinated).toBe(true);
    expect(result.data?.status).toBe("OPEN");
  });

  it("parses volunteer recruitment date and capacity", () => {
    const result = volunteerRecruitmentSchema.safeParse({
      shelterName: "송파 보호소",
      volunteerDate: "2026-03-20T09:00",
      capacity: "12",
      status: "FULL",
    });

    expect(result.success).toBe(true);
    expect(result.data?.volunteerDate).toBeInstanceOf(Date);
    expect(result.data?.capacity).toBe(12);
    expect(result.data?.status).toBe("FULL");
  });

  it("canonicalizes volunteer structured text fields", () => {
    const result = volunteerRecruitmentSchema.safeParse({
      shelterName: "마포 유기 동물 보호 센터",
      region: "서울 마포",
      volunteerType: "사진촬영봉사",
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      shelterName: "마포 유기동물보호센터",
      region: "서울특별시 마포구",
      volunteerType: "사진 촬영",
    });
  });

  it("accepts petType in list filters", () => {
    const result = postListSchema.safeParse({
      type: PostType.PET_SHOWCASE,
      scope: PostScope.GLOBAL,
      petType: "ckc7k5qsj0000u0t8qv6d1d7k",
    });

    expect(result.success).toBe(true);
  });

  it("keeps petType value on parsed list filters", () => {
    const result = postListSchema.safeParse({
      petType: "ckc7k5qsj0000u0t8qv6d1d7k",
    });

    expect(result.success).toBe(true);
    expect(result.data?.petType).toBe("ckc7k5qsj0000u0t8qv6d1d7k");
  });

  it("rejects invalid petType in list filters", () => {
    const result = postListSchema.safeParse({
      petType: "not-cuid",
    });

    expect(result.success).toBe(false);
  });

  it("maps parsed list filters to petTypeId shape", () => {
    const result = postListSchema.safeParse({
      petType: "ckc7k5qsj0000u0t8qv6d1d7k",
      scope: PostScope.GLOBAL,
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    const mapped = toPostListInput(result.data);
    expect(mapped.petTypeId).toBe("ckc7k5qsj0000u0t8qv6d1d7k");
    expect((mapped as { petType?: string }).petType).toBeUndefined();
  });

  it("accepts free-board posts without petTypeId", () => {
    const result = postCreateSchema.safeParse({
      title: "테스트",
      content: "내용",
      type: PostType.FREE_BOARD,
      scope: PostScope.GLOBAL,
    });

    expect(result.success).toBe(true);
  });

  it("rejects non-free community posts without petTypeId", () => {
    const result = postCreateSchema.safeParse({
      title: "테스트",
      content: "내용",
      type: PostType.QA_QUESTION,
      scope: PostScope.GLOBAL,
    });

    expect(result.success).toBe(false);
  });

  it("rejects common-board posts with petTypeId", () => {
    const result = postCreateSchema.safeParse({
      title: "병원후기",
      content: "내용",
      type: PostType.HOSPITAL_REVIEW,
      scope: PostScope.GLOBAL,
      petTypeId: "ckc7k5qsj0000u0t8qv6d1d7k",
      animalTags: ["강아지"],
    });

    expect(result.success).toBe(false);
  });

  it("requires animal tags for hospital-review common-board posts", () => {
    const result = postCreateSchema.safeParse({
      title: "병원후기",
      content: "내용",
      type: PostType.HOSPITAL_REVIEW,
      scope: PostScope.GLOBAL,
      animalTags: ["강아지"],
    });

    expect(result.success).toBe(true);
  });

  it("allows market-listing posts without animal tags", () => {
    const result = postCreateSchema.safeParse({
      title: "공동구매",
      content: "내용",
      type: PostType.MARKET_LISTING,
      scope: PostScope.GLOBAL,
    });

    expect(result.success).toBe(true);
  });

  it("allows adoption-listing posts without animal tags", () => {
    const result = postCreateSchema.safeParse({
      title: "입양 공고",
      content: "내용",
      type: PostType.ADOPTION_LISTING,
      scope: PostScope.GLOBAL,
    });

    expect(result.success).toBe(true);
  });

  it("allows shelter-volunteer posts without animal tags", () => {
    const result = postCreateSchema.safeParse({
      title: "봉사 모집",
      content: "내용",
      type: PostType.SHELTER_VOLUNTEER,
      scope: PostScope.GLOBAL,
    });

    expect(result.success).toBe(true);
  });

  it("allows lost-found posts without animal tags", () => {
    const result = postCreateSchema.safeParse({
      title: "실종 제보",
      content: "내용",
      type: PostType.LOST_FOUND,
      scope: PostScope.GLOBAL,
    });

    expect(result.success).toBe(true);
  });

  it("rejects external image urls in post payload", () => {
    const result = postCreateSchema.safeParse({
      title: "테스트",
      content: "내용",
      type: PostType.FREE_BOARD,
      scope: PostScope.GLOBAL,
      imageUrls: ["https://example.com/pixel.png"],
    });

    expect(result.success).toBe(false);
  });

});
