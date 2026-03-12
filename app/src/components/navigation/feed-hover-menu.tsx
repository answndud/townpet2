"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PostType } from "@prisma/client";

import {
  APP_SHELL_DESKTOP_NAV_CLUSTER_CLASS_NAME,
  APP_SHELL_MOBILE_PANEL_CLASS_NAME,
  APP_SHELL_MOBILE_PANEL_PILL_CLASS_NAME,
  APP_SHELL_MOBILE_PANEL_SUMMARY_CLASS_NAME,
  APP_SHELL_NAV_LINK_CLASS_NAME,
} from "@/components/navigation/app-shell-header-class";
import {
  PET_TYPE_PREFERENCE_COOKIE,
  parsePetTypePreferenceCookie,
  serializePetTypePreferenceCookie,
} from "@/lib/pet-type-preference-cookie";
import { normalizeFeedPetTypeIds } from "@/lib/feed-pet-type-filter";
import { buildBoardListingHref, buildFeedHref } from "@/lib/community-board";
import { getPostTypeMeta } from "@/lib/post-presenter";
import { groupPetTypeCommunities } from "@/lib/pet-type-taxonomy";
import { PRIMARY_POST_TYPES } from "@/lib/post-type-groups";
import { emitViewerShellSync } from "@/lib/viewer-shell-sync";
import { updatePreferredPetTypesAction } from "@/server/actions/user";

type FeedHoverMenuProps = {
  communities: Array<{
    id: string;
    slug: string;
    labelKo: string;
  }>;
  isAuthenticated: boolean;
  initialPreferredPetTypeIds: string[];
};

function writePetTypePreferenceCookie(petTypeIds: string[]) {
  document.cookie = `${PET_TYPE_PREFERENCE_COOKIE}=${encodeURIComponent(serializePetTypePreferenceCookie(petTypeIds))}; path=/; max-age=31536000; samesite=lax`;
}

export function FeedHoverMenu({
  communities,
  isAuthenticated,
  initialPreferredPetTypeIds,
}: FeedHoverMenuProps) {
  const groupedCommunities = groupPetTypeCommunities(communities);
  const selectableCommunities = groupedCommunities.flatMap((group) => group.items);
  const allPetTypeIds = selectableCommunities.map((item) => item.id);
  const boardPostTypes = [
    ...PRIMARY_POST_TYPES.filter(
      (value) => value !== PostType.PLACE_REVIEW && value !== PostType.WALK_ROUTE,
    ),
    PostType.PRODUCT_REVIEW,
    PostType.PET_SHOWCASE,
  ];
  const [openMenu, setOpenMenu] = useState<"board" | "pet" | null>(null);
  const [selectedPetTypeIds, setSelectedPetTypeIds] = useState<string[]>(() => {
    if (typeof document === "undefined" || isAuthenticated) {
      return initialPreferredPetTypeIds;
    }

    const cookieValue = document.cookie
      .split("; ")
      .find((value) => value.startsWith(`${PET_TYPE_PREFERENCE_COOKIE}=`))
      ?.split("=")[1];
    const parsedCookieIds = parsePetTypePreferenceCookie(
      cookieValue ? decodeURIComponent(cookieValue) : undefined,
    );
    return parsedCookieIds.length > 0 ? parsedCookieIds : initialPreferredPetTypeIds;
  });
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = () => {
    if (!closeTimerRef.current) {
      return;
    }
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };

  const openMenuNow = (menu: "board" | "pet") => {
    clearCloseTimer();
    setOpenMenu(menu);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpenMenu(null);
      closeTimerRef.current = null;
    }, 140);
  };

  const togglePetType = (petTypeId: string) => {
    setSelectedPetTypeIds((prev) =>
      prev.includes(petTypeId)
        ? prev.filter((id) => id !== petTypeId)
        : [...prev, petTypeId].slice(0, 50),
    );
  };

  const savePetTypes = () => {
    if (selectedPetTypeIds.length === 0) {
      setMessage("최소 1개 이상 선택해 주세요.");
      return;
    }

    const normalizedSelectedPetTypeIds = normalizeFeedPetTypeIds(
      selectedPetTypeIds,
      allPetTypeIds,
    );

    if (!isAuthenticated) {
      writePetTypePreferenceCookie(normalizedSelectedPetTypeIds);
      setMessage("관심 동물 설정을 저장했습니다.");
      if (pathname?.startsWith("/feed")) {
        const params = new URLSearchParams(
          typeof window === "undefined" ? "" : window.location.search,
        );
        params.delete("petType");
        params.delete("page");
        for (const petTypeId of normalizedSelectedPetTypeIds) {
          params.append("petType", petTypeId);
        }
        const nextPath = params.toString() ? `/feed?${params.toString()}` : "/feed";
        router.push(nextPath);
      }
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const result = await updatePreferredPetTypesAction({
        petTypeIds: normalizedSelectedPetTypeIds,
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setMessage("관심 동물 설정을 저장했습니다.");
      emitViewerShellSync({ reason: "preferred-pet-types-updated" });
      if (pathname?.startsWith("/feed")) {
        router.refresh();
      }
    });
  };

  return (
    <>
      <div className="w-full space-y-1.5 md:hidden">
        <details className={APP_SHELL_MOBILE_PANEL_CLASS_NAME}>
          <summary className={APP_SHELL_MOBILE_PANEL_SUMMARY_CLASS_NAME}>
            <div>
              <p className="text-[11px] font-semibold text-[#204477]">게시판 빠른 이동</p>
              <p className="mt-0.5 text-[10px] text-[#6a84ab]">자주 가는 보드를 바로 엽니다.</p>
            </div>
            <span className="tp-chip-base tp-chip-muted">열기</span>
          </summary>
          <div className="flex flex-wrap gap-1.5 border-t border-[#dbe6f6] bg-white p-2.5">
            <Link
              href={buildFeedHref({ page: "1" })}
              className={APP_SHELL_MOBILE_PANEL_PILL_CLASS_NAME}
            >
              전체
            </Link>
            {boardPostTypes.map((value) => (
              <Link
                key={`mobile-nav-type-${value}`}
                href={buildBoardListingHref(value)}
                className={APP_SHELL_MOBILE_PANEL_PILL_CLASS_NAME}
              >
                {getPostTypeMeta(value).label}
              </Link>
            ))}
          </div>
        </details>

        <details className={APP_SHELL_MOBILE_PANEL_CLASS_NAME}>
          <summary className={APP_SHELL_MOBILE_PANEL_SUMMARY_CLASS_NAME}>
            <div>
              <p className="text-[11px] font-semibold text-[#204477]">관심 동물 설정</p>
              <p className="mt-0.5 text-[10px] text-[#6a84ab]">피드에 보고 싶은 동물을 고릅니다.</p>
            </div>
            {isAuthenticated ? (
              <span className="tp-chip-base border-[#c9daf4] bg-[#eef5ff] text-[#1f4f8f]">
                {selectedPetTypeIds.length}개
              </span>
            ) : (
              <span className="tp-chip-base tp-chip-muted">열기</span>
            )}
          </summary>
          <div className="border-t border-[#dbe6f6] bg-white p-2.5">
            <p className="px-1 pb-1 text-[11px] text-[#5a7398]">보고 싶은 동물을 체크하고 저장하세요.</p>
            <div className="max-h-[44vh] space-y-0.5 overflow-y-auto pr-1">
              {groupedCommunities.map((group) => (
                <div key={`mobile-pet-group-${group.key}`} className="py-0.5">
                  <p className="px-2 pb-0.5 text-[10px] font-semibold text-[#6a86ad]">{group.label}</p>
                  {group.items.map((community) => {
                    const checked = selectedPetTypeIds.includes(community.id);
                    return (
                      <label
                        key={`mobile-nav-community-${community.id}`}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[#315b9a] transition hover:bg-[#f5f9ff]"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePetType(community.id)}
                          className="h-3.5 w-3.5 border-[#bcd0ed]"
                        />
                        <span>{community.labelKo}</span>
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#e3ebf8] pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="text-[11px] font-semibold text-[#5173a3] hover:text-[#204f8a]"
                  onClick={() => setSelectedPetTypeIds(selectableCommunities.map((item) => item.id))}
                  disabled={isPending}
                >
                  전체 선택
                </button>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-[#5173a3] hover:text-[#204f8a]"
                  onClick={() => setSelectedPetTypeIds([])}
                  disabled={isPending}
                >
                  전체 해제
                </button>
              </div>
              <button
                type="button"
                className="tp-btn-soft px-2.5 py-1 text-[11px] font-semibold text-[#204f8a] disabled:opacity-60"
                onClick={savePetTypes}
                disabled={isPending}
              >
                {isPending ? "저장 중..." : "저장"}
              </button>
            </div>
            {message ? <p className="mt-1 text-[11px] text-[#4f678d]">{message}</p> : null}
          </div>
        </details>
      </div>

      <div className={`hidden md:flex ${APP_SHELL_DESKTOP_NAV_CLUSTER_CLASS_NAME}`} onMouseLeave={scheduleClose}>
        <div className="relative" onMouseEnter={() => openMenuNow("board")} onMouseLeave={scheduleClose}>
          <button
            type="button"
            className={`${APP_SHELL_NAV_LINK_CLASS_NAME} appearance-none`}
            onFocus={() => openMenuNow("board")}
            onBlur={scheduleClose}
            onClick={() => setOpenMenu((prev) => (prev === "board" ? null : "board"))}
            aria-expanded={openMenu === "board"}
          >
            게시판
          </button>
          <div
            className={`absolute left-0 top-full z-50 min-w-[220px] transition duration-150 ${
              openMenu === "board" ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <div className="rounded-xl border border-[#dbe6f6] bg-white py-1.5 shadow-[0_12px_24px_rgba(16,40,74,0.10)]">
              <Link
                href={buildFeedHref({ page: "1" })}
                className="block px-3 py-1.5 text-xs text-[#315b9a] transition hover:bg-[#f5f9ff]"
                onClick={() => setOpenMenu(null)}
              >
                전체
              </Link>
              {boardPostTypes.map((value) => (
                <Link
                  key={`nav-type-${value}`}
                  href={buildBoardListingHref(value)}
                  className="block px-3 py-1.5 text-xs text-[#315b9a] transition hover:bg-[#f5f9ff]"
                  onClick={() => setOpenMenu(null)}
                >
                  {getPostTypeMeta(value).label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="relative" onMouseEnter={() => openMenuNow("pet")} onMouseLeave={scheduleClose}>
          <button
            type="button"
            className={`${APP_SHELL_NAV_LINK_CLASS_NAME} appearance-none`}
            onFocus={() => openMenuNow("pet")}
            onBlur={scheduleClose}
            onClick={() => setOpenMenu((prev) => (prev === "pet" ? null : "pet"))}
            aria-expanded={openMenu === "pet"}
          >
            관심 동물
            {isAuthenticated ? (
              <span className="ml-1 inline-flex min-w-4 items-center justify-center rounded-full bg-[#dcecff] px-1.5 text-[10px] font-semibold text-[#1f4f8f]">
                {selectedPetTypeIds.length}
              </span>
            ) : null}
          </button>
          <div
            className={`absolute left-0 top-full z-50 min-w-[240px] transition duration-150 ${
              openMenu === "pet" ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <div className="rounded-xl border border-[#dbe6f6] bg-white p-2 shadow-[0_12px_24px_rgba(16,40,74,0.10)]">
              <p className="px-1 pb-1 text-[11px] text-[#5a7398]">보고 싶은 동물을 체크하고 저장하세요.</p>
              <div className="space-y-0.5">
                {groupedCommunities.map((group) => (
                  <div key={`pet-group-${group.key}`} className="py-0.5">
                    <p className="px-2 pb-0.5 text-[10px] font-semibold text-[#6a86ad]">{group.label}</p>
                    {group.items.map((community) => {
                      const checked = selectedPetTypeIds.includes(community.id);
                      return (
                        <label
                          key={`nav-community-${community.id}`}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[#315b9a] transition hover:bg-[#f5f9ff]"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePetType(community.id)}
                            className="h-3.5 w-3.5 border-[#bcd0ed]"
                          />
                          <span>{community.labelKo}</span>
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 border-t border-[#e3ebf8] pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-[#5173a3] hover:text-[#204f8a]"
                    onClick={() => setSelectedPetTypeIds(selectableCommunities.map((item) => item.id))}
                    disabled={isPending}
                  >
                    전체 선택
                  </button>
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-[#5173a3] hover:text-[#204f8a]"
                    onClick={() => setSelectedPetTypeIds([])}
                    disabled={isPending}
                  >
                    전체 해제
                  </button>
                </div>
                <button
                  type="button"
                  className="tp-btn-soft px-2 py-1 text-[11px] font-semibold text-[#204f8a] disabled:opacity-60"
                  onClick={savePetTypes}
                  disabled={isPending}
                >
                  {isPending ? "저장 중..." : "저장"}
                </button>
              </div>
              {message ? <p className="mt-1 text-[11px] text-[#4f678d]">{message}</p> : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
