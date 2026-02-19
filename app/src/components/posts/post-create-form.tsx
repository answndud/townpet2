"use client";

import { PostScope, PostType } from "@prisma/client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createPostAction } from "@/server/actions/post";

type NeighborhoodOption = {
  id: string;
  name: string;
  city: string;
  district: string;
};

type PostCreateFormProps = {
  neighborhoods: NeighborhoodOption[];
  defaultNeighborhoodId?: string;
};

type PostCreateFormState = {
  title: string;
  content: string;
  type: PostType;
  scope: PostScope;
  neighborhoodId: string;
  hospitalReview: {
    hospitalName: string;
    treatmentType: string;
    totalCost: string;
    waitTime: string;
    rating: string;
  };
  placeReview: {
    placeName: string;
    placeType: string;
    address: string;
    isPetAllowed: string;
    rating: string;
  };
  walkRoute: {
    routeName: string;
    distance: string;
    duration: string;
    difficulty: string;
    hasStreetLights: string;
    hasRestroom: string;
    hasParkingLot: string;
    safetyTags: string;
  };
};

const postTypeOptions = [
  { value: PostType.HOSPITAL_REVIEW, label: "병원 리뷰" },
  { value: PostType.PLACE_REVIEW, label: "장소 리뷰" },
  { value: PostType.WALK_ROUTE, label: "산책로" },
  { value: PostType.MEETUP, label: "번개" },
  { value: PostType.FREE_BOARD, label: "자유게시판" },
  { value: PostType.DAILY_SHARE, label: "일상공유" },
  { value: PostType.PRODUCT_REVIEW, label: "제품리뷰" },
  { value: PostType.PET_SHOWCASE, label: "내 반려동물 자랑" },
];

const scopeOptions = [
  { value: PostScope.LOCAL, label: "동네" },
  { value: PostScope.GLOBAL, label: "온동네" },
];

export function PostCreateForm({
  neighborhoods,
  defaultNeighborhoodId = "",
}: PostCreateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<PostCreateFormState>({
    title: "",
    content: "",
    type: PostType.HOSPITAL_REVIEW,
    scope: PostScope.LOCAL,
    neighborhoodId: defaultNeighborhoodId,
    hospitalReview: {
      hospitalName: "",
      treatmentType: "",
      totalCost: "",
      waitTime: "",
      rating: "",
    },
    placeReview: {
      placeName: "",
      placeType: "",
      address: "",
      isPetAllowed: "",
      rating: "",
    },
    walkRoute: {
      routeName: "",
      distance: "",
      duration: "",
      difficulty: "",
      hasStreetLights: "false",
      hasRestroom: "false",
      hasParkingLot: "false",
      safetyTags: "",
    },
  });

  const neighborhoodOptions = useMemo(
    () =>
      neighborhoods.map((neighborhood) => ({
        value: neighborhood.id,
        label: `${neighborhood.city} ${neighborhood.name}`,
      })),
    [neighborhoods],
  );

  const showNeighborhood = formState.scope === PostScope.LOCAL;
  const showHospitalReview = formState.type === PostType.HOSPITAL_REVIEW;
  const showPlaceReview = formState.type === PostType.PLACE_REVIEW;
  const showWalkRoute = formState.type === PostType.WALK_ROUTE;

  const hasHospitalReview =
    showHospitalReview &&
    (formState.hospitalReview.hospitalName.trim().length > 0 ||
      formState.hospitalReview.treatmentType.trim().length > 0 ||
      formState.hospitalReview.totalCost.trim().length > 0 ||
      formState.hospitalReview.waitTime.trim().length > 0 ||
      formState.hospitalReview.rating.trim().length > 0);

  const hasPlaceReview =
    showPlaceReview &&
    (formState.placeReview.placeName.trim().length > 0 ||
      formState.placeReview.placeType.trim().length > 0 ||
      formState.placeReview.address.trim().length > 0 ||
      formState.placeReview.isPetAllowed.trim().length > 0 ||
      formState.placeReview.rating.trim().length > 0);

  const hasWalkRoute =
    showWalkRoute &&
    (formState.walkRoute.routeName.trim().length > 0 ||
      formState.walkRoute.distance.trim().length > 0 ||
      formState.walkRoute.duration.trim().length > 0 ||
      formState.walkRoute.difficulty.trim().length > 0 ||
      formState.walkRoute.safetyTags.trim().length > 0 ||
      formState.walkRoute.hasStreetLights === "true" ||
      formState.walkRoute.hasRestroom === "true" ||
      formState.walkRoute.hasParkingLot === "true");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createPostAction({
        title: formState.title,
        content: formState.content,
        type: formState.type,
        scope: formState.scope,
        neighborhoodId: showNeighborhood ? formState.neighborhoodId : undefined,
        hospitalReview: hasHospitalReview
          ? {
              ...formState.hospitalReview,
              totalCost: formState.hospitalReview.totalCost || undefined,
              waitTime: formState.hospitalReview.waitTime || undefined,
            }
          : undefined,
        placeReview: hasPlaceReview
          ? {
              ...formState.placeReview,
              isPetAllowed: formState.placeReview.isPetAllowed || undefined,
            }
          : undefined,
        walkRoute: hasWalkRoute
          ? {
              ...formState.walkRoute,
              distance: formState.walkRoute.distance || undefined,
              duration: formState.walkRoute.duration || undefined,
              safetyTags: formState.walkRoute.safetyTags
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
            }
          : undefined,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      router.push("/");
      router.refresh();
      setFormState((prev) => ({
        ...prev,
        title: "",
        content: "",
        hospitalReview: {
          ...prev.hospitalReview,
          hospitalName: "",
          treatmentType: "",
          totalCost: "",
          waitTime: "",
          rating: "",
        },
        placeReview: {
          ...prev.placeReview,
          placeName: "",
          placeType: "",
          address: "",
          isPetAllowed: "",
          rating: "",
        },
        walkRoute: {
          ...prev.walkRoute,
          routeName: "",
          distance: "",
          duration: "",
          difficulty: "",
          safetyTags: "",
        },
      }));
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.24em] text-[#4f6f9f]">
          글 작성
        </span>
        <h2 className="text-lg font-semibold text-[#153a6a]">게시물 작성</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
          제목
          <input
            className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
            value={formState.title}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="예: 서초동 병원 후기"
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
          타입
          <select
            className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
            value={formState.type}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                type: event.target.value as PostType,
              }))
            }
          >
            {postTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
          범위
          <select
            className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
            value={formState.scope}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                scope: event.target.value as PostScope,
              }))
            }
          >
            {scopeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
          동네
          <select
            className={`border px-3 py-2 text-sm text-[#1f3f71] transition ${
              showNeighborhood
                ? "border-[#bfd0ec] bg-[#f8fbff]"
                : "cursor-not-allowed border-[#d6deea] bg-[#eef2f8] text-[#8ea1bd]"
            }`}
            value={formState.neighborhoodId}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                neighborhoodId: event.target.value,
              }))
            }
            disabled={!showNeighborhood}
            required={showNeighborhood}
          >
            <option value="">선택</option>
            {neighborhoodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
        내용
        <textarea
          className="min-h-[130px] border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
          value={formState.content}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, content: event.target.value }))
          }
          placeholder="핵심 내용을 적어주세요."
          required
        />
      </label>

      {showHospitalReview ? (
        <div className="grid gap-4 border border-[#d8e4f6] bg-[#f4f8ff] p-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
            병원명
            <input
            className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
            value={formState.hospitalReview.hospitalName}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  hospitalReview: {
                    ...prev.hospitalReview,
                    hospitalName: event.target.value,
                  },
                }))
              }
              placeholder="예: 서초동 24시 동물병원"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
            진료 항목
            <input
              className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
              value={formState.hospitalReview.treatmentType}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  hospitalReview: {
                    ...prev.hospitalReview,
                    treatmentType: event.target.value,
                  },
                }))
              }
              placeholder="예: 피부염 검사"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
            비용(원)
            <input
              type="number"
              className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
              value={formState.hospitalReview.totalCost}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  hospitalReview: {
                    ...prev.hospitalReview,
                    totalCost: event.target.value,
                  },
                }))
              }
              placeholder="예: 35000"
              min={0}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
            대기시간(분)
            <input
              type="number"
              className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
              value={formState.hospitalReview.waitTime}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  hospitalReview: {
                    ...prev.hospitalReview,
                    waitTime: event.target.value,
                  },
                }))
              }
              placeholder="예: 20"
              min={0}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
            만족도
            <select
              className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
              value={formState.hospitalReview.rating}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  hospitalReview: {
                    ...prev.hospitalReview,
                    rating: event.target.value,
                  },
                }))
              }
            >
              <option value="">선택 안함</option>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value}점
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {showPlaceReview ? (
        <div className="grid gap-4 border border-[#d8e4f6] bg-[#f4f8ff] p-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
            장소명
            <input
              className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
              value={formState.placeReview.placeName}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  placeReview: {
                    ...prev.placeReview,
                    placeName: event.target.value,
                  },
                }))
              }
              placeholder="예: 연남동 펫카페"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
            장소 유형
            <input
              className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
              value={formState.placeReview.placeType}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  placeReview: {
                    ...prev.placeReview,
                    placeType: event.target.value,
                  },
                }))
              }
              placeholder="예: 카페"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
            주소
            <input
              className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
              value={formState.placeReview.address}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  placeReview: {
                    ...prev.placeReview,
                    address: event.target.value,
                  },
                }))
              }
              placeholder="예: 마포구 연남동"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
            동반 가능 여부
            <select
              className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
              value={formState.placeReview.isPetAllowed}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  placeReview: {
                    ...prev.placeReview,
                    isPetAllowed: event.target.value,
                  },
                }))
              }
            >
              <option value="">선택 안함</option>
              <option value="true">가능</option>
              <option value="false">불가</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
            만족도
            <select
              className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
              value={formState.placeReview.rating}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  placeReview: {
                    ...prev.placeReview,
                    rating: event.target.value,
                  },
                }))
              }
            >
              <option value="">선택 안함</option>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value}점
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {showWalkRoute ? (
        <div className="grid gap-4 border border-[#d8e4f6] bg-[#f4f8ff] p-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
            코스 이름
            <input
              className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
              value={formState.walkRoute.routeName}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  walkRoute: {
                    ...prev.walkRoute,
                    routeName: event.target.value,
                  },
                }))
              }
              placeholder="예: 양재천 산책 코스"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            거리(km)
            <input
              type="number"
              step="0.1"
              className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
              value={formState.walkRoute.distance}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  walkRoute: {
                    ...prev.walkRoute,
                    distance: event.target.value,
                  },
                }))
              }
              placeholder="예: 2.5"
              min={0}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            소요시간(분)
            <input
              type="number"
              className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
              value={formState.walkRoute.duration}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  walkRoute: {
                    ...prev.walkRoute,
                    duration: event.target.value,
                  },
                }))
              }
              placeholder="예: 40"
              min={0}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            난이도
            <select
              className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
              value={formState.walkRoute.difficulty}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  walkRoute: {
                    ...prev.walkRoute,
                    difficulty: event.target.value,
                  },
                }))
              }
            >
              <option value="">선택 안함</option>
              <option value="EASY">쉬움</option>
              <option value="MODERATE">보통</option>
              <option value="HARD">어려움</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            안전 태그(콤마)
            <input
              className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
              value={formState.walkRoute.safetyTags}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  walkRoute: {
                    ...prev.walkRoute,
                    safetyTags: event.target.value,
                  },
                }))
              }
              placeholder="예: 차량주의, 야간조명"
            />
          </label>


          <div className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
            편의 시설
            <div className="flex flex-wrap gap-3 text-xs text-[#4f678d]">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-[#3567b5]"
                  checked={formState.walkRoute.hasStreetLights === "true"}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      walkRoute: {
                        ...prev.walkRoute,
                        hasStreetLights: event.target.checked ? "true" : "false",
                      },
                    }))
                  }
                />
                가로등
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-[#3567b5]"
                  checked={formState.walkRoute.hasRestroom === "true"}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      walkRoute: {
                        ...prev.walkRoute,
                        hasRestroom: event.target.checked ? "true" : "false",
                      },
                    }))
                  }
                />
                화장실
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-[#3567b5]"
                  checked={formState.walkRoute.hasParkingLot === "true"}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      walkRoute: {
                        ...prev.walkRoute,
                        hasParkingLot: event.target.checked ? "true" : "false",
                      },
                    }))
                  }
                />
                주차장
              </label>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="flex items-center justify-between">
        <p className="text-xs text-[#5d769d]">
          동네 범위 글은 대표 동네 선택이 필요합니다.
        </p>
        <button
          type="submit"
          className="border border-[#3567b5] bg-[#3567b5] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#2f5da4] disabled:cursor-not-allowed disabled:border-[#9fb9e0] disabled:bg-[#9fb9e0]"
          disabled={isPending}
        >
          {isPending ? "저장 중..." : "게시하기"}
        </button>
      </div>
    </form>
  );
}
