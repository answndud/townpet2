"use client";

import { PostScope } from "@prisma/client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ImageUploadField } from "@/components/ui/image-upload-field";
import {
  areSameStringArray,
  buildImageMarkdown,
  extractImageUrlsFromMarkup,
  removeImageTokensByUrls,
} from "@/lib/editor-image-markup";
import {
  markupToEditorHtml,
  serializeEditorHtml,
} from "@/lib/editor-content-serializer";
import { GUEST_MAX_IMAGE_COUNT } from "@/lib/guest-post-policy";
import { POST_CONTENT_MAX_LENGTH, POST_TITLE_MAX_LENGTH } from "@/lib/input-limits";
import { renderLiteMarkdown } from "@/lib/markdown-lite";
import { updatePostAction } from "@/server/actions/post";

type NeighborhoodOption = {
  id: string;
  name: string;
  city: string;
  district: string;
};

type PostDetailEditFormProps = {
  postId: string;
  title: string;
  content: string;
  scope: PostScope;
  neighborhoodId: string | null;
  imageUrls: string[];
  neighborhoods: NeighborhoodOption[];
  isAuthenticated: boolean;
  guestPassword?: string;
};

const GUEST_FP_STORAGE_KEY = "townpet:guest-fingerprint:v1";
type EditorTab = "write" | "preview";

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

export function PostDetailEditForm({
  postId,
  title,
  content,
  scope,
  neighborhoodId,
  imageUrls,
  neighborhoods,
  isAuthenticated,
  guestPassword = "",
}: PostDetailEditFormProps) {
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editorTab, setEditorTab] = useState<EditorTab>("write");
  const [editorHtml, setEditorHtml] = useState(() => markupToEditorHtml(content));
  const [formState, setFormState] = useState(() => {
    const contentImageUrls = extractImageUrlsFromMarkup(content);
    return {
      title,
      content,
      scope: isAuthenticated ? scope : PostScope.GLOBAL,
      neighborhoodId: neighborhoodId ?? "",
      imageUrls: contentImageUrls.length > 0 ? contentImageUrls : imageUrls,
      guestPassword,
    };
  });

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
    const editor = contentRef.current;
    if (!editor || editorTab !== "write") {
      return;
    }

    editor.style.position = "relative";
    const cornerSize = 16;
    let hoveredImage: HTMLImageElement | null = null;

    const handle = document.createElement("span");
    handle.setAttribute("aria-hidden", "true");
    handle.style.position = "absolute";
    handle.style.width = "12px";
    handle.style.height = "12px";
    handle.style.borderRadius = "2px";
    handle.style.border = "1px solid #8ea9cf";
    handle.style.background = "linear-gradient(135deg, #f7fbff 0%, #dbe8fa 100%)";
    handle.style.boxShadow = "0 1px 2px rgba(16, 40, 74, 0.18)";
    handle.style.pointerEvents = "none";
    handle.style.display = "none";
    editor.appendChild(handle);

    const isNearBottomRight = (event: PointerEvent, image: HTMLImageElement) => {
      const rect = image.getBoundingClientRect();
      return event.clientX >= rect.right - cornerSize && event.clientY >= rect.bottom - cornerSize;
    };

    const positionHandle = (image: HTMLImageElement) => {
      const editorRect = editor.getBoundingClientRect();
      const imageRect = image.getBoundingClientRect();
      handle.style.left = `${imageRect.right - editorRect.left - 10}px`;
      handle.style.top = `${imageRect.bottom - editorRect.top - 10}px`;
      handle.style.display = "block";
    };

    const clearHoverState = () => {
      if (hoveredImage) {
        hoveredImage.style.outline = "";
      }
      hoveredImage = null;
      handle.style.display = "none";
      editor.style.cursor = "text";
    };

    const handlePointerMove = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement) || !editor.contains(target)) {
        clearHoverState();
        return;
      }

      if (hoveredImage && hoveredImage !== target) {
        hoveredImage.style.outline = "";
      }
      hoveredImage = target;
      target.style.outline = "1px dashed #8ea9cf";
      positionHandle(target);

      if (isNearBottomRight(event, target)) {
        editor.style.cursor = "nwse-resize";
      } else {
        editor.style.cursor = "text";
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement) || !editor.contains(target)) {
        return;
      }
      if (!isNearBottomRight(event, target)) {
        return;
      }

      event.preventDefault();
      const startX = event.clientX;
      const startWidth = target.getBoundingClientRect().width;
      const maxWidth = Math.max(240, editor.getBoundingClientRect().width - 24);

      const handleMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const nextWidth = Math.min(maxWidth, Math.max(120, Math.round(startWidth + deltaX)));
        target.style.width = `${nextWidth}px`;
        target.style.height = "auto";
        positionHandle(target);
      };

      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        const serialized = serializeEditorHtml(editor.innerHTML);
        setFormState((prev) => (prev.content === serialized ? prev : { ...prev, content: serialized }));
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    };

    const handlePointerLeave = () => {
      clearHoverState();
    };

    const handleScroll = () => {
      if (hoveredImage) {
        positionHandle(hoveredImage);
      }
    };

    editor.addEventListener("pointermove", handlePointerMove);
    editor.addEventListener("pointerdown", handlePointerDown);
    editor.addEventListener("pointerleave", handlePointerLeave);
    editor.addEventListener("scroll", handleScroll);
    return () => {
      clearHoverState();
      editor.removeEventListener("pointermove", handlePointerMove);
      editor.removeEventListener("pointerdown", handlePointerDown);
      editor.removeEventListener("pointerleave", handlePointerLeave);
      editor.removeEventListener("scroll", handleScroll);
      handle.remove();
    };
  }, [editorTab]);

  const neighborhoodOptions = useMemo(
    () =>
      neighborhoods.map((neighborhood) => ({
        value: neighborhood.id,
        label: `${neighborhood.city} ${neighborhood.name}`,
      })),
    [neighborhoods],
  );

  const showNeighborhood = formState.scope === PostScope.LOCAL;

  const previewHtml = useMemo(() => renderLiteMarkdown(formState.content), [formState.content]);

  const syncEditorToFormState = () => {
    const element = contentRef.current;
    if (!element) {
      return;
    }
    const html = element.innerHTML;
    const serialized = serializeEditorHtml(html);
    const nextImageUrls = extractImageUrlsFromMarkup(serialized);
    setFormState((prev) =>
      prev.content === serialized && areSameStringArray(prev.imageUrls, nextImageUrls)
        ? prev
        : { ...prev, content: serialized, imageUrls: nextImageUrls },
    );
  };

  const preserveToolbarSelection = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const runEditorCommand = (command: string, value?: string) => {
    if (typeof document === "undefined") {
      return;
    }
    contentRef.current?.focus();
    if (command === "formatBlock" && value) {
      const normalized = value.trim().replace(/[<>]/g, "");
      const withTag = `<${normalized}>`;
      const ok = document.execCommand(command, false, withTag);
      if (!ok) {
        document.execCommand(command, false, normalized);
      }
    } else {
      document.execCommand(command, false, value);
    }
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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const serializedContent = contentRef.current
      ? serializeEditorHtml(contentRef.current.innerHTML)
      : formState.content;
    const serializedImageUrls = extractImageUrlsFromMarkup(serializedContent);

    if (!serializedContent.trim()) {
      setError("내용을 입력해 주세요.");
      return;
    }
    if (serializedContent.length > POST_CONTENT_MAX_LENGTH) {
      setError(`내용은 ${POST_CONTENT_MAX_LENGTH.toLocaleString("ko-KR")}자까지 입력할 수 있습니다.`);
      return;
    }

    setFormState((prev) => ({
      ...prev,
      content: serializedContent,
      imageUrls: serializedImageUrls,
    }));

    startTransition(async () => {
      const payload = {
        title: formState.title,
        content: serializedContent,
        scope: isAuthenticated ? formState.scope : PostScope.GLOBAL,
        imageUrls: serializedImageUrls,
        neighborhoodId: showNeighborhood ? formState.neighborhoodId : null,
        guestPassword: isAuthenticated ? undefined : formState.guestPassword,
      };

      const result = isAuthenticated
        ? await updatePostAction(postId, payload)
        : await fetch(`/api/posts/${postId}`, {
            method: "PATCH",
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
                message: payload.error?.message ?? "비회원 수정에 실패했습니다.",
              } as const;
            })
            .catch(() => ({ ok: false, message: "네트워크 오류가 발생했습니다." } as const));

      if (!result.ok) {
        setError(result.message ?? "수정에 실패했습니다.");
        return;
      }

      router.push(`/posts/${postId}`);
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="tp-card w-full p-5 sm:p-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="tp-text-page-title-sm tp-text-heading">게시물 수정</h2>
        <button
          type="submit"
          className="tp-btn-primary tp-btn-sm disabled:cursor-not-allowed disabled:border-[#9fb9e0] disabled:bg-[#9fb9e0]"
          disabled={isPending}
        >
          {isPending ? "저장 중..." : "수정 저장"}
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <label className="tp-form-label">
          제목
          <input
            className="tp-input-soft px-3 py-2 text-sm"
            value={formState.title}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, title: event.target.value }))
            }
            maxLength={POST_TITLE_MAX_LENGTH}
            required
          />
        </label>

        <label className="tp-form-label">
          범위
          <select
            className="tp-input-soft px-3 py-2 text-sm"
            value={formState.scope}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                scope: event.target.value as PostScope,
                neighborhoodId: event.target.value === PostScope.LOCAL
                  ? prev.neighborhoodId
                  : "",
              }))
            }
            disabled={!isAuthenticated}
          >
            <option value={PostScope.LOCAL}>동네</option>
            <option value={PostScope.GLOBAL}>전체</option>
          </select>
        </label>

        <label className="tp-form-label">
          동네
          <select
            className="tp-input-soft px-3 py-2 text-sm"
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
        <label className="tp-form-label mt-4">
          글 비밀번호
          <input
            type="password"
            className="tp-input-soft max-w-[260px] px-3 py-2 text-sm"
            value={formState.guestPassword}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, guestPassword: event.target.value }))
            }
            minLength={4}
            maxLength={32}
            required
          />
        </label>
      ) : null}

      <div className="tp-card mt-6">
        <div className="tp-editor-toolbar-soft">
          <span className="tp-form-section-title">본문</span>
          <button
            type="button"
            onClick={applyLink}
            onMouseDown={preserveToolbarSelection}
            className="tp-btn-soft tp-btn-sm inline-flex items-center px-3 font-semibold"
          >
            링크
          </button>
          <button
            type="button"
            onClick={() => setEditorTab("write")}
            className={`inline-flex items-center rounded-lg px-3 transition ${editorTab === "write" ? "tp-btn-primary" : "tp-btn-soft"} tp-btn-sm`}
          >
            작성
          </button>
          <button
            type="button"
            onClick={() => setEditorTab("preview")}
            className={`inline-flex items-center rounded-lg px-3 transition ${editorTab === "preview" ? "tp-btn-primary" : "tp-btn-soft"} tp-btn-sm`}
          >
            미리보기
          </button>
          <span
            className={`ml-auto ${
              formState.content.length > POST_CONTENT_MAX_LENGTH ? "text-rose-600" : "tp-text-subtle"
            }`}
          >
            {formState.content.length.toLocaleString("ko-KR")} / {POST_CONTENT_MAX_LENGTH.toLocaleString("ko-KR")}자
          </span>
        </div>

        <div className="tp-editor-toolbar">
          <button
            type="button"
            onClick={() => runEditorCommand("bold")}
            onMouseDown={preserveToolbarSelection}
            className="tp-btn-soft inline-flex h-7 items-center px-2.5 font-semibold"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => runEditorCommand("italic")}
            onMouseDown={preserveToolbarSelection}
            className="tp-btn-soft inline-flex h-7 items-center px-2.5 font-semibold italic"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => runEditorCommand("underline")}
            onMouseDown={preserveToolbarSelection}
            className="tp-btn-soft inline-flex h-7 items-center px-2.5 font-semibold underline"
          >
            밑줄
          </button>
          <button
            type="button"
            onClick={() => runEditorCommand("strikeThrough")}
            onMouseDown={preserveToolbarSelection}
            className="tp-btn-soft inline-flex h-7 items-center px-2.5 font-semibold"
          >
            취소선
          </button>
          <button
            type="button"
            onClick={() => runEditorCommand("formatBlock", "pre")}
            onMouseDown={preserveToolbarSelection}
            className="tp-btn-soft inline-flex h-7 items-center px-2.5 font-mono"
          >
            {'</>'}
          </button>
          <button
            type="button"
            onClick={() => runEditorCommand("insertUnorderedList")}
            onMouseDown={preserveToolbarSelection}
            className="tp-btn-soft inline-flex h-7 items-center px-2.5 font-semibold"
          >
            목록
          </button>
          <button
            type="button"
            onClick={() => runEditorCommand("insertOrderedList")}
            onMouseDown={preserveToolbarSelection}
            className="tp-btn-soft inline-flex h-7 items-center px-2.5 font-semibold"
          >
            번호목록
          </button>
          <button
            type="button"
            onClick={() => runEditorCommand("formatBlock", "blockquote")}
            onMouseDown={preserveToolbarSelection}
            className="tp-btn-soft inline-flex h-7 items-center px-2.5 font-semibold"
          >
            인용
          </button>
          <div className="tp-divider-soft mx-1" />
          <button
            type="button"
            onClick={() => applyStyledSelection("size", "small")}
            onMouseDown={preserveToolbarSelection}
            className="tp-btn-soft inline-flex h-7 items-center px-2 text-[11px]"
          >
            작게
          </button>
          <button
            type="button"
            onClick={() => applyStyledSelection("size", "normal")}
            onMouseDown={preserveToolbarSelection}
            className="tp-btn-soft inline-flex h-7 items-center px-2 text-[12px]"
          >
            보통
          </button>
          <button
            type="button"
            onClick={() => applyStyledSelection("size", "large")}
            onMouseDown={preserveToolbarSelection}
            className="tp-btn-soft inline-flex h-7 items-center px-2 text-sm font-semibold"
          >
            크게
          </button>
          <button
            type="button"
            onClick={() => applyStyledSelection("size", "xlarge")}
            onMouseDown={preserveToolbarSelection}
            className="tp-btn-soft inline-flex h-7 items-center px-2 text-base font-semibold"
          >
            매우 크게
          </button>
          <div className="tp-divider-soft mx-1" />
          <button
            type="button"
            onClick={() => applyStyledSelection("color", "blue")}
            onMouseDown={preserveToolbarSelection}
            className="tp-btn-soft inline-flex h-7 items-center px-2.5 font-semibold text-[#2f5da4]"
          >
            파랑
          </button>
          <button
            type="button"
            onClick={() => applyStyledSelection("color", "red")}
            onMouseDown={preserveToolbarSelection}
            className="tp-btn-soft inline-flex h-7 items-center px-2.5 font-semibold text-rose-600"
          >
            빨강
          </button>
          <button
            type="button"
            onClick={() => applyStyledSelection("color", "green")}
            onMouseDown={preserveToolbarSelection}
            className="tp-btn-soft inline-flex h-7 items-center px-2.5 font-semibold text-emerald-700"
          >
            초록
          </button>
          <button
            type="button"
            onClick={() => applyStyledSelection("color", "gray")}
            onMouseDown={preserveToolbarSelection}
            className="tp-btn-soft inline-flex h-7 items-center px-2.5 font-semibold text-slate-600"
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
            className="tp-editor-surface min-h-[260px] w-full border-0 px-4 py-3 text-sm leading-relaxed outline-none [&_img]:h-auto [&_img]:max-w-full"
          />
        ) : (
          <div className="tp-editor-surface min-h-[260px] px-4 py-3 text-sm">
            <div
              className="prose prose-sm max-w-none space-y-2 tp-text-primary"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        )}
      </div>

      <div className="mt-6">
        <ImageUploadField
          value={formState.imageUrls}
          onChange={(nextUrls) => {
            setFormState((prev) => {
              const addedUrls = nextUrls.filter((url) => !prev.imageUrls.includes(url));
              const removedUrls = prev.imageUrls.filter((url) => !nextUrls.includes(url));
              let nextContent = removedUrls.length > 0
                ? removeImageTokensByUrls(prev.content, removedUrls)
                : prev.content;

              if (addedUrls.length > 0) {
                const existingCount = extractImageUrlsFromMarkup(nextContent).length;
                const imageMarkdown = buildImageMarkdown(addedUrls, existingCount + 1);
                const separator = nextContent.trim().length > 0 ? "\n\n" : "";
                nextContent = `${nextContent}${separator}${imageMarkdown}`;
              }

              const finalImageUrls = extractImageUrlsFromMarkup(nextContent);
              const nextHtml = markupToEditorHtml(nextContent);
              if (contentRef.current) {
                contentRef.current.innerHTML = nextHtml;
              }
              setEditorHtml(nextHtml);

              return {
                ...prev,
                imageUrls: finalImageUrls,
                content: nextContent,
              };
            });
          }}
          label="게시글 이미지"
          maxFiles={isAuthenticated ? 10 : GUEST_MAX_IMAGE_COUNT}
          guestWriteScope={!isAuthenticated ? "upload" : undefined}
        />
      </div>

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </form>
  );
}
