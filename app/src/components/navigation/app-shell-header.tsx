"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AuthControls } from "@/components/auth/auth-controls";
import { FeedHoverMenu } from "@/components/navigation/feed-hover-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { emitViewerShellSync, subscribeViewerShellSync } from "@/lib/viewer-shell-sync";

type AppShellHeaderProps = {
  communities: Array<{
    id: string;
    slug: string;
    labelKo: string;
  }>;
};

type ViewerShellData = {
  isAuthenticated: boolean;
  canModerate: boolean;
  unreadNotificationCount: number;
  preferredPetTypeIds: string[];
};

const DEFAULT_VIEWER_SHELL: ViewerShellData = {
  isAuthenticated: false,
  canModerate: false,
  unreadNotificationCount: 0,
  preferredPetTypeIds: [],
};

export function AppShellHeader({ communities }: AppShellHeaderProps) {
  const [viewerShell, setViewerShell] = useState<ViewerShellData>(DEFAULT_VIEWER_SHELL);
  const authSnapshotRef = useRef(
    `${DEFAULT_VIEWER_SHELL.isAuthenticated}:${DEFAULT_VIEWER_SHELL.canModerate}`,
  );
  const pathname = usePathname();
  const navLinkClass =
    "inline-flex h-8 items-center rounded-sm px-1 text-[14px] leading-none text-[#315484] transition hover:bg-[#dcecff] hover:text-[#1f4f8f]";
  const allPetTypeIds = communities.map((item) => item.id);
  const preferredPetTypeIds =
    viewerShell.preferredPetTypeIds.length > 0 ? viewerShell.preferredPetTypeIds : allPetTypeIds;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadViewerShell = async () => {
      try {
        const response = await fetch("/api/viewer-shell", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as
          | { ok: true; data: ViewerShellData }
          | { ok: false };
        if (!response.ok || !payload.ok) {
          return;
        }

        if (!cancelled) {
          const nextAuthSnapshot = `${payload.data.isAuthenticated}:${payload.data.canModerate}`;
          if (authSnapshotRef.current !== nextAuthSnapshot) {
            authSnapshotRef.current = nextAuthSnapshot;
            emitViewerShellSync({
              reason: payload.data.isAuthenticated ? "auth-login" : "auth-logout",
            });
          }
          setViewerShell(payload.data);
        }
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") {
          return;
        }
        // Keep the default guest shell when viewer data cannot be loaded.
      }
    };

    void loadViewerShell();

    const unsubscribe = subscribeViewerShellSync(() => {
      void loadViewerShell();
    });
    const handleFocus = () => {
      void loadViewerShell();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      cancelled = true;
      controller.abort();
      window.removeEventListener("focus", handleFocus);
      unsubscribe();
    };
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-[#d8e4f6] bg-[#f4f8ffeb] backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-1.5 px-4 py-2 sm:gap-2 sm:px-6 sm:py-2.5 lg:px-10 lg:py-3 xl:flex-row xl:items-center xl:justify-between">
        <Link href="/" className="inline-flex items-center" aria-label="TownPet 홈으로 이동">
          <Image
            src="/townpet-logo.svg"
            alt="TownPet"
            width={274}
            height={72}
            priority
            className="h-[34px] w-auto sm:h-[40px]"
          />
        </Link>
        <nav className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[14px] font-medium text-[#315484] sm:gap-x-3 sm:gap-y-1.5 xl:gap-x-3.5">
          {pathname !== "/feed" ? (
            <Link href="/feed" className={`${navLinkClass} md:hidden`}>
              피드
            </Link>
          ) : null}
          <FeedHoverMenu
            key={`${viewerShell.isAuthenticated ? "auth" : "guest"}:${preferredPetTypeIds.join(",")}`}
            communities={communities}
            isAuthenticated={viewerShell.isAuthenticated}
            initialPreferredPetTypeIds={preferredPetTypeIds}
          />
          <span className="hidden px-0.5 text-[#9ab0cf] md:inline">|</span>
          <Link href="/profile" className={navLinkClass}>
            내 프로필
          </Link>
          {viewerShell.isAuthenticated ? (
            <>
              <span className="hidden px-0.5 text-[#9ab0cf] md:inline">|</span>
              <NotificationBell unreadCount={viewerShell.unreadNotificationCount} />
            </>
          ) : null}
          {viewerShell.canModerate ? (
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/admin/reports" className={navLinkClass}>
                신고 큐
              </Link>
              <Link href="/admin/auth-audits" className={navLinkClass}>
                인증 로그
              </Link>
              <Link href="/admin/policies" className={navLinkClass}>
                권한 정책
              </Link>
            </div>
          ) : null}
          {viewerShell.isAuthenticated ? (
            <>
              <span className="hidden px-0.5 text-[#9ab0cf] md:inline">|</span>
              <AuthControls label="로그아웃" />
            </>
          ) : (
            <Link
              href="/login"
              data-testid="header-login-link"
              className={`${navLinkClass} text-[#173963] hover:text-[#0f2f56]`}
            >
              로그인
            </Link>
          )}
          <form action="/feed" method="get" className="ml-auto hidden items-center gap-2 md:flex">
            <span className="px-0.5 text-[#9ab0cf]">|</span>
            <input
              name="q"
              type="search"
              placeholder="검색"
              className="tp-input-soft h-8 w-[150px] bg-white px-2.5 text-xs leading-none sm:w-[190px]"
            />
            <button
              type="submit"
              className="inline-flex h-8 items-center rounded-sm px-1 text-[13px] leading-none text-[#315484] transition hover:bg-[#dcecff] hover:text-[#1f4f8f]"
            >
              찾기
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
