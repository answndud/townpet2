import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  PostEditorToolbarButton,
  PostEditorToolbarDivider,
  PostRichTextEditorShell,
} from "@/components/posts/post-rich-text-editor-shell";

describe("PostRichTextEditorShell", () => {
  it("renders shared header, toolbars, content, and footer areas", () => {
    const html = renderToStaticMarkup(
      <PostRichTextEditorShell
        title="본문"
        headerContent={<span className="ml-auto">10 / 100자</span>}
        mobileToolbar={<PostEditorToolbarButton>B</PostEditorToolbarButton>}
        toolbar={
          <>
            <PostEditorToolbarButton>I</PostEditorToolbarButton>
            <PostEditorToolbarDivider />
            <PostEditorToolbarButton tone="primary" scale="bar">
              작성
            </PostEditorToolbarButton>
          </>
        }
        footerContent={<span>임시저장 없음</span>}
      >
        <div>contenteditable area</div>
      </PostRichTextEditorShell>,
    );

    expect(html).toContain("본문");
    expect(html).toContain("10 / 100자");
    expect(html).toContain("contenteditable area");
    expect(html).toContain("임시저장 없음");
    expect(html).toContain("tp-editor-toolbar sm:hidden");
    expect(html).toContain("tp-btn-primary");
  });

  it("renders toolbar button scales and tones", () => {
    const html = renderToStaticMarkup(
      <>
        <PostEditorToolbarButton>기본</PostEditorToolbarButton>
        <PostEditorToolbarButton tone="primary" scale="bar">
          활성
        </PostEditorToolbarButton>
      </>,
    );

    expect(html).toContain("tp-btn-soft");
    expect(html).toContain("h-7 px-2.5");
    expect(html).toContain("tp-btn-primary");
    expect(html).toContain("tp-btn-sm px-3");
  });
});
