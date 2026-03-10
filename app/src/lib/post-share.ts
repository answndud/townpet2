type ClipboardLike = {
  writeText(text: string): Promise<void>;
};

export type CopyPostShareResult = {
  ok: boolean;
  message: string;
};

const COPY_SUCCESS_MESSAGE = "링크를 복사했습니다.";
const COPY_FAILURE_MESSAGE = "링크 복사에 실패했습니다.";

export async function copyPostShareUrl(
  clipboard: ClipboardLike | null | undefined,
  url: string,
): Promise<CopyPostShareResult> {
  if (!clipboard || typeof clipboard.writeText !== "function") {
    return {
      ok: false,
      message: COPY_FAILURE_MESSAGE,
    };
  }

  try {
    await clipboard.writeText(url);
    return {
      ok: true,
      message: COPY_SUCCESS_MESSAGE,
    };
  } catch {
    return {
      ok: false,
      message: COPY_FAILURE_MESSAGE,
    };
  }
}
