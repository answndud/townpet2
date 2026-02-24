"use client";

import { PostScope, PostType } from "@prisma/client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ImageUploadField } from "@/components/ui/image-upload-field";
import {
  GUEST_BLOCKED_POST_TYPES,
  GUEST_MAX_IMAGE_COUNT,
} from "@/lib/guest-post-policy";
import { renderLiteMarkdown } from "@/lib/markdown-lite";
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
  isAuthenticated: boolean;
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
  imageUrls: string[];
  guestDisplayName: string;
  guestPassword: string;
};

const postTypeOptions = [
  { value: PostType.FREE_BOARD, label: "자유게시판" },
  { value: PostType.QA_QUESTION, label: "질문/답변" },
  { value: PostType.HOSPITAL_REVIEW, label: "병원후기" },
  { value: PostType.WALK_ROUTE, label: "산책코스" },
  { value: PostType.LOST_FOUND, label: "실종/목격 제보" },
  { value: PostType.MEETUP, label: "동네모임" },
  { value: PostType.MARKET_LISTING, label: "중고/공동구매" },
  { value: PostType.PLACE_REVIEW, label: "장소후기" },
  { value: PostType.PRODUCT_REVIEW, label: "용품리뷰" },
  { value: PostType.PET_SHOWCASE, label: "반려자랑" },
];

const scopeOptions = [
  { value: PostScope.LOCAL, label: "동네" },
  { value: PostScope.GLOBAL, label: "온동네" },
];

const DRAFT_STORAGE_KEY = "townpet:post-create-draft:v1";
const GUEST_FP_STORAGE_KEY = "townpet:guest-fingerprint:v1";

type EditorTab = "write" | "preview";

function isDraftFormState(value: unknown): value is PostCreateFormState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<PostCreateFormState>;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.content === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.scope === "string" &&
    typeof candidate.neighborhoodId === "string" &&
    Array.isArray(candidate.imageUrls) &&
    (typeof candidate.guestDisplayName === "string" || candidate.guestDisplayName === undefined) &&
    (typeof candidate.guestPassword === "string" || candidate.guestPassword === undefined) &&
    !!candidate.hospitalReview &&
    !!candidate.placeReview &&
    !!candidate.walkRoute
  );
}

function getGuestFingerprint() {
  if (typeof window === "undefined") {
    return "server";
  }

  const existing = window.localStorage.getItem(GUEST_FP_STORAGE_KEY);
  if (existing && existing.trim().length > 0) {
    return existing;
  }

  const created = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(GUEST_FP_STORAGE_KEY, created);
  return created;
}

function markupToEditorHtml(markup: string) {
  if (!markup.trim()) {
    return "";
  }
  return renderLiteMarkdown(markup);
}

function normalizeWhitespace(value: string) {
  return value.replace(/\u00a0/g, " ");
}

function serializeEditorNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return normalizeWhitespace(node.textContent ?? "");
  }

  if (!(node instanceof HTMLElement)) {
    return "";
  }

  const serializeChildren = () => Array.from(node.childNodes).map(serializeEditorNode).join("");

  if (node.tagName === "BR") {
    return "\n";
  }

  if (node.tagName === "H1") {
    return `# ${serializeChildren().trim()}\n\n`;
  }
  if (node.tagName === "H2") {
    return `## ${serializeChildren().trim()}\n\n`;
  }
  if (node.tagName === "H3") {
    return `### ${serializeChildren().trim()}\n\n`;
  }

  if (node.tagName === "UL") {
    const items = Array.from(node.children)
      .filter((child) => child.tagName === "LI")
      .map((child) => `- ${serializeEditorNode(child).trim()}`)
      .join("\n");
    return items ? `${items}\n\n` : "";
  }

  if (node.tagName === "OL") {
    const items = Array.from(node.children)
      .filter((child) => child.tagName === "LI")
      .map((child, index) => `${index + 1}. ${serializeEditorNode(child).trim()}`)
      .join("\n");
    return items ? `${items}\n\n` : "";
  }

  if (node.tagName === "LI") {
    return serializeChildren().replace(/\n+/g, " ").trim();
  }

  if (node.tagName === "BLOCKQUOTE") {
    const lines = serializeChildren()
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `> ${line}`)
      .join("\n");
    return lines ? `${lines}\n\n` : "";
  }

  if (node.tagName === "A") {
    const href = node.getAttribute("href")?.trim();
    const label = serializeChildren().trim();
    if (!href) {
      return label;
    }
    return `[${label.length > 0 ? label : href}](${href})`;
  }

  if (node.tagName === "STRONG" || node.tagName === "B") {
    return `**${serializeChildren()}**`;
  }
  if (node.tagName === "EM" || node.tagName === "I") {
    return `*${serializeChildren()}*`;
  }
  if (node.tagName === "U") {
    return `__${serializeChildren()}__`;
  }
  if (node.tagName === "S" || node.tagName === "DEL") {
    return `~~${serializeChildren()}~~`;
  }
  if (node.tagName === "CODE") {
    return `\`${serializeChildren()}\``;
  }
  if (node.tagName === "PRE") {
    return `\`${serializeChildren().trim()}\``;
  }

  if (node.tagName === "SPAN") {
    const className = node.className;
    const text = serializeChildren();
    const sizeToken = className.includes("text-xs")
      ? "small"
      : className.includes("text-lg")
        ? "large"
        : className.includes("text-xl")
          ? "xlarge"
          : className.includes("text-base")
            ? "normal"
            : null;
    const colorToken = className.includes("text-rose-600")
      ? "red"
      : className.includes("text-emerald-700")
        ? "green"
        : className.includes("text-slate-600")
          ? "gray"
          : className.includes("text-[#2f5da4]")
            ? "blue"
            : null;

    let output = text;
    if (sizeToken) {
      output = `[size=${sizeToken}]${output}[/size]`;
    }
    if (colorToken) {
      output = `[color=${colorToken}]${output}[/color]`;
    }
    return output;
  }

  if (node.tagName === "P" || node.tagName === "DIV") {
    const text = serializeChildren().trim();
    return text ? `${text}\n\n` : "\n";
  }

  return serializeChildren();
}

function serializeEditorHtml(html: string) {
  if (!html.trim()) {
    return "";
  }

  const container = document.createElement("div");
  container.innerHTML = html;
  return Array.from(container.childNodes)
    .map(serializeEditorNode)
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function PostCreateForm({
  neighborhoods,
  defaultNeighborhoodId = "",
  isAuthenticated,
}: PostCreateFormProps) {
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editorTab, setEditorTab] = useState<EditorTab>("write");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [editorHtml, setEditorHtml] = useState("");
  const [formState, setFormState] = useState<PostCreateFormState>({
    title: "",
    content: "",
    type: PostType.FREE_BOARD,
    scope: PostScope.GLOBAL,
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
    imageUrls: [],
    guestDisplayName: "",
    guestPassword: "",
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!stored) {
      setDraftLoaded(true);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as {
        savedAt?: string;
        form?: unknown;
      };
      if (isDraftFormState(parsed.form)) {
        const draftForm = parsed.form as Partial<PostCreateFormState>;
        setFormState((prev) => ({
          ...prev,
          ...draftForm,
          guestDisplayName: draftForm.guestDisplayName ?? "",
          guestPassword: "",
        }));
        setEditorHtml(markupToEditorHtml(draftForm.content ?? ""));
      }
      if (parsed.savedAt) {
        setDraftSavedAt(parsed.savedAt);
      }
      setDraftMessage("임시저장을 불러왔습니다.");
    } catch {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      setDraftMessage("임시저장을 읽을 수 없어 초기화했습니다.");
    } finally {
      setDraftLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (draftLoaded) {
      return;
    }
    setEditorHtml(markupToEditorHtml(formState.content));
  }, [draftLoaded, formState.content]);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) {
      return;
    }
    if (element.innerHTML !== editorHtml) {
      element.innerHTML = editorHtml;
    }
  }, [editorHtml, editorTab]);

  useEffect(() => {
    if (!draftLoaded || typeof window === "undefined") {
      return;
    }

    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      window.localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          savedAt,
          form: {
            ...formState,
            guestPassword: "",
          },
        }),
      );
      setDraftSavedAt(savedAt);
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [draftLoaded, formState]);

  const neighborhoodOptions = useMemo(
    () =>
      neighborhoods.map((neighborhood) => ({
        value: neighborhood.id,
        label: `${neighborhood.city} ${neighborhood.name}`,
      })),
    [neighborhoods],
  );

  const availablePostTypeOptions = useMemo(() => {
    if (isAuthenticated) {
      return postTypeOptions;
    }

    return postTypeOptions.filter(
      (option) => !GUEST_BLOCKED_POST_TYPES.includes(option.value),
    );
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      return;
    }

    if (formState.scope !== PostScope.GLOBAL) {
      setFormState((prev) => ({ ...prev, scope: PostScope.GLOBAL }));
    }

    if (GUEST_BLOCKED_POST_TYPES.includes(formState.type)) {
      setFormState((prev) => ({ ...prev, type: PostType.FREE_BOARD }));
    }
  }, [formState.scope, formState.type, isAuthenticated]);

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
  const previewHtml = useMemo(
    () => renderLiteMarkdown(formState.content),
    [formState.content],
  );

  const syncEditorToFormState = () => {
    const element = contentRef.current;
    if (!element) {
      return;
    }
    const html = element.innerHTML;
    const serialized = serializeEditorHtml(html);
    setFormState((prev) => (prev.content === serialized ? prev : { ...prev, content: serialized }));
  };

  const runEditorCommand = (command: string, value?: string) => {
    if (typeof document === "undefined") {
      return;
    }
    contentRef.current?.focus();
    document.execCommand(command, false, value);
    syncEditorToFormState();
  };

  const wrapSelectionWithSpan = (className: string) => {
    if (typeof window === "undefined") {
      return;
    }
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }
    const range = selection.getRangeAt(0);
    if (!contentRef.current?.contains(range.commonAncestorContainer)) {
      return;
    }

    const span = document.createElement("span");
    span.className = className;
    if (range.collapsed) {
      span.textContent = "텍스트";
      range.insertNode(span);
      const nextRange = document.createRange();
      nextRange.selectNodeContents(span);
      selection.removeAllRanges();
      selection.addRange(nextRange);
    } else {
      try {
        range.surroundContents(span);
      } catch {
        span.appendChild(range.extractContents());
        range.insertNode(span);
      }
    }
    syncEditorToFormState();
  };

  const applyLink = () => {
    if (typeof window === "undefined") {
      return;
    }
    const url = window.prompt("링크 주소를 입력해 주세요.", "https://");
    if (!url || !/^https?:\/\//i.test(url.trim())) {
      return;
    }
    runEditorCommand("createLink", url.trim());
  };

  const applyBlockHeading = (level: 1 | 2 | 3) => {
    runEditorCommand("formatBlock", level === 1 ? "h1" : level === 2 ? "h2" : "h3");
  };

  const applyStyledSelection = (
    kind: "size" | "color",
    value: "small" | "normal" | "large" | "xlarge" | "blue" | "red" | "green" | "gray",
  ) => {
    if (kind === "size") {
      const sizeClass =
        value === "small"
          ? "text-xs"
          : value === "large"
            ? "text-lg"
            : value === "xlarge"
              ? "text-xl font-semibold"
              : "text-base";
      wrapSelectionWithSpan(sizeClass);
      return;
    }

    const colorClass =
      value === "red"
        ? "text-rose-600"
        : value === "green"
          ? "text-emerald-700"
          : value === "gray"
            ? "text-slate-600"
            : "text-[#2f5da4]";
    wrapSelectionWithSpan(colorClass);
  };

  const clearDraft = () => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    setDraftSavedAt(null);
    setDraftMessage("임시저장을 삭제했습니다.");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const serializedContent = contentRef.current
      ? serializeEditorHtml(contentRef.current.innerHTML)
      : formState.content;
    if (!serializedContent.trim()) {
      setError("내용을 입력해 주세요.");
      return;
    }
    setFormState((prev) => ({ ...prev, content: serializedContent }));

    startTransition(async () => {
      const payload = {
        title: formState.title,
        content: serializedContent,
        type: formState.type,
        scope: isAuthenticated ? formState.scope : PostScope.GLOBAL,
        imageUrls: formState.imageUrls,
        neighborhoodId: showNeighborhood ? formState.neighborhoodId : undefined,
        guestDisplayName: isAuthenticated ? undefined : formState.guestDisplayName,
        guestPassword: isAuthenticated ? undefined : formState.guestPassword,
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
      };

      const result = isAuthenticated
        ? await createPostAction(payload)
        : await fetch("/api/posts", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-guest-fingerprint": getGuestFingerprint(),
              "x-guest-mode": "1",
            },
            body: JSON.stringify(payload),
          })
            .then(async (response) => {
              const payload = (await response.json()) as {
                ok: boolean;
                error?: { message?: string };
              };

              if (response.ok && payload.ok) {
                return { ok: true } as const;
              }

              return {
                ok: false,
                message: payload.error?.message ?? "비회원 글 등록에 실패했습니다.",
              } as const;
            })
            .catch(() => ({ ok: false, message: "네트워크 오류가 발생했습니다." } as const));

      if (!result.ok) {
        setError(result.message ?? "게시글 등록에 실패했습니다.");
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
      setDraftSavedAt(null);
      setDraftMessage("게시글을 등록해 임시저장을 비웠습니다.");
      router.push("/feed");
      router.refresh();
      setEditorHtml("");
      setFormState((prev) => ({
        ...prev,
        title: "",
        content: "",
        type: PostType.FREE_BOARD,
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
        imageUrls: [],
        guestDisplayName: "",
        guestPassword: "",
      }));
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <section className="border border-[#c8d7ef] bg-white">
        <div className="border-b border-[#dbe6f6] bg-[#f7fbff] px-4 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
            글 정보
          </p>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[#355988]">
            제목
            <input
              className="border border-[#bfd0ec] bg-[#fbfdff] px-3 py-2 text-sm text-[#1f3f71]"
              value={formState.title}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="제목을 입력해 주세요"
              required
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-[#355988]">
            분류
            <select
              className="border border-[#bfd0ec] bg-[#fbfdff] px-3 py-2 text-sm text-[#1f3f71]"
              value={formState.type}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  type: event.target.value as PostType,
                }))
              }
            >
              {availablePostTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-[#355988]">
            범위
            <select
              className="border border-[#bfd0ec] bg-[#fbfdff] px-3 py-2 text-sm text-[#1f3f71]"
              value={formState.scope}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  scope: event.target.value as PostScope,
                }))
              }
              disabled={!isAuthenticated}
            >
              {scopeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-[#355988]">
            동네
            <select
              className={`border px-3 py-2 text-sm text-[#1f3f71] transition ${
                showNeighborhood
                  ? "border-[#bfd0ec] bg-[#fbfdff]"
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
        {!isAuthenticated ? (
          <div className="grid gap-3 border-t border-[#dbe6f6] bg-[#f8fbff] p-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-[#355988]">
              비회원 닉네임
              <input
                className="border border-[#bfd0ec] bg-white px-3 py-2 text-sm text-[#1f3f71]"
                value={formState.guestDisplayName}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, guestDisplayName: event.target.value }))
                }
                placeholder="닉네임"
                minLength={2}
                maxLength={24}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-[#355988]">
              글 비밀번호
              <input
                type="password"
                className="border border-[#bfd0ec] bg-white px-3 py-2 text-sm text-[#1f3f71]"
                value={formState.guestPassword}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, guestPassword: event.target.value }))
                }
                placeholder="수정/삭제용 비밀번호"
                minLength={4}
                maxLength={32}
                required
              />
            </label>
          </div>
        ) : null}
      </section>

      <section className="border border-[#c8d7ef] bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#dbe6f6] bg-[#f8fbff] px-3 py-2 text-xs">
          <button
            type="button"
            onClick={applyLink}
            className="inline-flex h-8 items-center border border-[#bfd0ec] bg-white px-3 font-semibold text-[#2f548f] transition hover:bg-[#f3f7ff]"
          >
            링크
          </button>
          <div className="mx-1 h-5 w-px bg-[#d8e3f4]" />
          <button
            type="button"
            onClick={() => setEditorTab("write")}
            className={`inline-flex h-8 items-center border px-3 font-semibold transition ${
              editorTab === "write"
                ? "border-[#3567b5] bg-[#3567b5] text-white"
                : "border-[#bfd0ec] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
            }`}
          >
            작성
          </button>
          <button
            type="button"
            onClick={() => setEditorTab("preview")}
            className={`inline-flex h-8 items-center border px-3 font-semibold transition ${
              editorTab === "preview"
                ? "border-[#3567b5] bg-[#3567b5] text-white"
                : "border-[#bfd0ec] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
            }`}
          >
            미리보기
          </button>
          <span className="ml-auto text-[#5a7398]">{formState.content.length.toLocaleString("ko-KR")}자</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-b border-[#dbe6f6] bg-white px-3 py-2 text-xs">
          <button
            type="button"
            onClick={() => applyBlockHeading(1)}
            className="inline-flex h-7 items-center border border-[#bfd0ec] bg-white px-2.5 font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => applyBlockHeading(2)}
            className="inline-flex h-7 items-center border border-[#bfd0ec] bg-white px-2.5 font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => applyBlockHeading(3)}
            className="inline-flex h-7 items-center border border-[#bfd0ec] bg-white px-2.5 font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
          >
            H3
          </button>
          <div className="mx-1 h-5 w-px bg-[#d8e3f4]" />
          <button
            type="button"
            onClick={() => runEditorCommand("bold")}
            className="inline-flex h-7 items-center border border-[#bfd0ec] bg-white px-2.5 font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => runEditorCommand("italic")}
            className="inline-flex h-7 items-center border border-[#bfd0ec] bg-white px-2.5 font-semibold italic text-[#315484] transition hover:bg-[#f3f7ff]"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => runEditorCommand("formatBlock", "pre")}
            className="inline-flex h-7 items-center border border-[#bfd0ec] bg-white px-2.5 font-mono text-[#315484] transition hover:bg-[#f3f7ff]"
          >
            {'</>'}
          </button>
          <button
            type="button"
            onClick={() => runEditorCommand("insertUnorderedList")}
            className="inline-flex h-7 items-center border border-[#bfd0ec] bg-white px-2.5 font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
          >
            목록
          </button>
          <button
            type="button"
            onClick={() => runEditorCommand("insertOrderedList")}
            className="inline-flex h-7 items-center border border-[#bfd0ec] bg-white px-2.5 font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
          >
            번호목록
          </button>
          <button
            type="button"
            onClick={() => runEditorCommand("formatBlock", "blockquote")}
            className="inline-flex h-7 items-center border border-[#bfd0ec] bg-white px-2.5 font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
          >
            인용
          </button>
          <button
            type="button"
            onClick={() => runEditorCommand("strikeThrough")}
            className="inline-flex h-7 items-center border border-[#bfd0ec] bg-white px-2.5 font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
          >
            취소선
          </button>
          <button
            type="button"
            onClick={() => runEditorCommand("underline")}
            className="inline-flex h-7 items-center border border-[#bfd0ec] bg-white px-2.5 font-semibold underline text-[#315484] transition hover:bg-[#f3f7ff]"
          >
            밑줄
          </button>
          <div className="mx-1 h-5 w-px bg-[#d8e3f4]" />
          <button
            type="button"
            onClick={() => applyStyledSelection("size", "small")}
            className="inline-flex h-7 items-center border border-[#bfd0ec] bg-white px-2 text-[11px] text-[#315484] transition hover:bg-[#f3f7ff]"
          >
            작게
          </button>
          <button
            type="button"
            onClick={() => applyStyledSelection("size", "normal")}
            className="inline-flex h-7 items-center border border-[#bfd0ec] bg-white px-2 text-[12px] text-[#315484] transition hover:bg-[#f3f7ff]"
          >
            보통
          </button>
          <button
            type="button"
            onClick={() => applyStyledSelection("size", "large")}
            className="inline-flex h-7 items-center border border-[#bfd0ec] bg-white px-2 text-sm font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
          >
            크게
          </button>
          <button
            type="button"
            onClick={() => applyStyledSelection("size", "xlarge")}
            className="inline-flex h-7 items-center border border-[#bfd0ec] bg-white px-2 text-base font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
          >
            매우 크게
          </button>
          <div className="mx-1 h-5 w-px bg-[#d8e3f4]" />
          <button
            type="button"
            onClick={() => applyStyledSelection("color", "blue")}
            className="inline-flex h-7 items-center border border-[#bfd0ec] bg-white px-2.5 font-semibold text-[#2f5da4] transition hover:bg-[#f3f7ff]"
          >
            파랑
          </button>
          <button
            type="button"
            onClick={() => applyStyledSelection("color", "red")}
            className="inline-flex h-7 items-center border border-[#bfd0ec] bg-white px-2.5 font-semibold text-rose-600 transition hover:bg-[#f3f7ff]"
          >
            빨강
          </button>
          <button
            type="button"
            onClick={() => applyStyledSelection("color", "green")}
            className="inline-flex h-7 items-center border border-[#bfd0ec] bg-white px-2.5 font-semibold text-emerald-700 transition hover:bg-[#f3f7ff]"
          >
            초록
          </button>
          <button
            type="button"
            onClick={() => applyStyledSelection("color", "gray")}
            className="inline-flex h-7 items-center border border-[#bfd0ec] bg-white px-2.5 font-semibold text-slate-600 transition hover:bg-[#f3f7ff]"
          >
            회색
          </button>
        </div>

        {editorTab === "write" ? (
          <div
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            onInput={syncEditorToFormState}
            onBlur={syncEditorToFormState}
            className="min-h-[340px] w-full border-0 bg-[#fcfdff] px-4 py-3 text-sm leading-relaxed text-[#1f3f71] outline-none"
          />
        ) : (
          <div className="min-h-[340px] border-0 bg-[#fcfdff] px-4 py-3 text-sm text-[#1f3f71]">
            <div
              className="prose prose-sm max-w-none space-y-2 text-[#1f3f71]"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-[#dbe6f6] bg-[#f7fbff] px-3 py-2 text-xs">
          <button
            type="button"
            onClick={clearDraft}
            className="inline-flex h-7 items-center border border-[#bfd0ec] bg-white px-2.5 font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
          >
            임시저장 삭제
          </button>
          <span className="text-[#5a7398]">
            {draftSavedAt
              ? `임시저장: ${new Date(draftSavedAt).toLocaleString("ko-KR")}`
              : "임시저장 없음"}
          </span>
          {draftMessage ? <span className="text-[#3567b5]">{draftMessage}</span> : null}
        </div>
      </section>

      <div id="post-image-upload" className="border border-[#c8d7ef] bg-white p-4">
        <ImageUploadField
          value={formState.imageUrls}
          onChange={(nextUrls) =>
            setFormState((prev) => ({ ...prev, imageUrls: nextUrls }))
          }
          label="이미지 첨부"
          maxFiles={isAuthenticated ? 10 : GUEST_MAX_IMAGE_COUNT}
        />
        {!isAuthenticated ? (
          <p className="mt-2 text-xs text-[#5d789f]">비회원 이미지는 최대 1장, 파일당 2MB까지 업로드할 수 있습니다.</p>
        ) : null}
      </div>

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

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#dbe6f6] pt-3">
        <p className="text-xs text-[#5d769d]">
          {isAuthenticated
            ? "동네 글은 동네 범위를 선택하고 대표 동네를 지정해야 등록됩니다."
            : "비회원 글은 온동네로만 등록되며 외부 링크/연락처/고위험 카테고리는 제한됩니다."}
        </p>
        <div className="flex items-center gap-2">
          <Link
            href="/feed"
            className="inline-flex h-10 items-center border border-[#9aa9bf] bg-[#5c677a] px-5 text-sm font-semibold text-white transition hover:bg-[#4d5666]"
          >
            취소
          </Link>
          <button
            type="submit"
            className="inline-flex h-10 items-center border border-[#3567b5] bg-[#3567b5] px-6 text-sm font-semibold text-white transition hover:bg-[#2f5da4] disabled:cursor-not-allowed disabled:border-[#9fb9e0] disabled:bg-[#9fb9e0]"
            disabled={isPending}
          >
            {isPending ? "등록 중..." : "등록"}
          </button>
        </div>
      </div>
    </form>
  );
}
