import { describe, expect, it } from "vitest";

import {
  buildStructuredSearchVariants,
  normalizeAdoptionAgeLabel,
  normalizeBreedLabel,
  normalizeHospitalName,
  normalizeHospitalTreatmentType,
  normalizeStructuredRegion,
  normalizeVolunteerType,
} from "@/lib/structured-field-normalization";

describe("structured field normalization", () => {
  it("normalizes hospital names and treatment aliases", () => {
    expect(normalizeHospitalName("서울 24 시간 동물 병원")).toBe("서울 24시 동물병원");
    expect(normalizeHospitalTreatmentType("중성화")).toBe("중성화 수술");
  });

  it("normalizes free-text region and age labels", () => {
    expect(normalizeStructuredRegion("서울 마포")).toBe("서울특별시 마포구");
    expect(normalizeAdoptionAgeLabel("2 세   추정")).toBe("2살 추정");
  });

  it("normalizes breed aliases and volunteer labels", () => {
    expect(normalizeBreedLabel("코기", "개")).toBe("웰시코기");
    expect(normalizeVolunteerType("사진촬영봉사")).toBe("사진 촬영");
  });

  it("builds canonical search variants for structured alias queries", () => {
    expect(buildStructuredSearchVariants("코숏")).toEqual(
      expect.arrayContaining(["코숏", "코리안 숏헤어"]),
    );
    expect(buildStructuredSearchVariants("서울 마포")).toEqual(
      expect.arrayContaining(["서울 마포", "서울특별시 마포구"]),
    );
  });
});
