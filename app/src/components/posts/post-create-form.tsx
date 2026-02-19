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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.3em] text-zinc-500">
          New Post
        </span>
        <h2 className="text-lg font-semibold">게시물 작성</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium">
          제목
          <input
            className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
            value={formState.title}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="예: 서초동 병원 후기"
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium">
          타입
          <select
            className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
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

        <label className="flex flex-col gap-2 text-sm font-medium">
          범위
          <select
            className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
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

        <label className="flex flex-col gap-2 text-sm font-medium">
          동네
          <select
            className={`rounded-lg border px-3 py-2 text-sm transition ${
              showNeighborhood
                ? "border-[#e3d6c4] bg-white"
                : "cursor-not-allowed border-[#e1e1e1] bg-[#f1f1f1] text-[#9a9a9a]"
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

      <label className="flex flex-col gap-2 text-sm font-medium">
        내용
        <textarea
          className="min-h-[120px] rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
          value={formState.content}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, content: event.target.value }))
          }
          placeholder="핵심 내용을 적어주세요."
          required
        />
      </label>

      {showHospitalReview ? (
        <div className="grid gap-4 rounded-xl border border-[#efe4d4] bg-[#fdf9f2] p-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium">
            병원명
            <input
            className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
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

          <label className="flex flex-col gap-2 text-sm font-medium">
            진료 항목
            <input
              className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
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

          <label className="flex flex-col gap-2 text-sm font-medium">
            비용(원)
            <input
              type="number"
              className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
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

          <label className="flex flex-col gap-2 text-sm font-medium">
            대기시간(분)
            <input
              type="number"
              className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
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

          <label className="flex flex-col gap-2 text-sm font-medium">
            만족도
            <select
              className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
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
        <div className="grid gap-4 rounded-xl border border-[#efe4d4] bg-[#fdf9f2] p-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium">
            장소명
            <input
              className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
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

          <label className="flex flex-col gap-2 text-sm font-medium">
            장소 유형
            <input
              className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
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

          <label className="flex flex-col gap-2 text-sm font-medium">
            주소
            <input
              className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
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

          <label className="flex flex-col gap-2 text-sm font-medium">
            동반 가능 여부
            <select
              className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
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

          <label className="flex flex-col gap-2 text-sm font-medium">
            만족도
            <select
              className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
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
        <div className="grid gap-4 rounded-xl border border-[#efe4d4] bg-[#fdf9f2] p-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium">
            코스 이름
            <input
              className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
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
              className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
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
              className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
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
              className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
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
              className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
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


          <div className="flex flex-col gap-2 text-sm font-medium">
            편의 시설
            <div className="flex flex-wrap gap-3 text-xs text-[#6f6046]">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-[#2a241c]"
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
                  className="accent-[#2a241c]"
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
                  className="accent-[#2a241c]"
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

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-400">
          Local 게시물은 동네 선택이 필요합니다.
        </p>
        <button
          type="submit"
          className="rounded-full bg-[#2a241c] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#3a3228] disabled:cursor-not-allowed disabled:bg-[#cbbba5]"
          disabled={isPending}
        >
          {isPending ? "저장 중..." : "게시하기"}
        </button>
      </div>
    </form>
  );
}
