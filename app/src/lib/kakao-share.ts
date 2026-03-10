"use client";

const KAKAO_SDK_URL = "https://developers.kakao.com/sdk/js/kakao.js";
const KAKAO_SHARE_TEXT_SUFFIX = "TownPet에서 자세히 보기";
const KAKAO_SHARE_TEXT_LIMIT = 200;
const KAKAO_SHARE_GENERIC_ERROR =
  "카카오 공유를 열지 못했습니다. 링크 복사를 이용해 주세요.";
const KAKAO_SHARE_INVALID_KEY_ERROR =
  "카카오 공유 설정이 올바르지 않습니다. Kakao JavaScript 키와 도메인을 확인해 주세요. (4011)";

type KakaoSharePayload = {
  objectType: "text";
  text: string;
  link: {
    mobileWebUrl: string;
    webUrl: string;
  };
};

type KakaoSdk = {
  init(appKey: string): void;
  isInitialized(): boolean;
  Share: {
    sendDefault(payload: KakaoSharePayload): void;
  };
};

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

let kakaoSdkPromise: Promise<KakaoSdk> | null = null;

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

export function buildKakaoShareText(title: string) {
  const normalizedTitle = title.replace(/\s+/g, " ").trim();
  const safeTitle = normalizedTitle.length > 0 ? normalizedTitle : "TownPet 게시글";
  const headline = truncateText(safeTitle, 140);
  const combined = `${headline}\n${KAKAO_SHARE_TEXT_SUFFIX}`;
  return truncateText(combined, KAKAO_SHARE_TEXT_LIMIT);
}

export function buildKakaoSharePayload({
  title,
  url,
}: {
  title: string;
  url: string;
}): KakaoSharePayload {
  return {
    objectType: "text",
    text: buildKakaoShareText(title),
    link: {
      mobileWebUrl: url,
      webUrl: url,
    },
  };
}

function ensureKakaoSdk(appKey: string, kakao: KakaoSdk) {
  if (!kakao.isInitialized()) {
    kakao.init(appKey);
  }

  if (!kakao.Share || typeof kakao.Share.sendDefault !== "function") {
    throw new Error("KAKAO_SHARE_UNAVAILABLE");
  }

  return kakao;
}

function loadKakaoSdkScript() {
  if (typeof window === "undefined") {
    throw new Error("KAKAO_SDK_UNAVAILABLE");
  }

  if (window.Kakao) {
    return Promise.resolve(window.Kakao);
  }

  if (!kakaoSdkPromise) {
    kakaoSdkPromise = new Promise<KakaoSdk>((resolve, reject) => {
      const handleLoad = () => {
        if (!window.Kakao) {
          reject(new Error("KAKAO_SDK_NOT_AVAILABLE"));
          return;
        }

        resolve(window.Kakao);
      };

      const handleError = () => {
        reject(new Error("KAKAO_SDK_LOAD_FAILED"));
      };

      const existingScript = document.querySelector<HTMLScriptElement>(
        "script[data-kakao-sdk='townpet']",
      );
      if (existingScript) {
        existingScript.addEventListener("load", handleLoad, { once: true });
        existingScript.addEventListener("error", handleError, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = KAKAO_SDK_URL;
      script.async = true;
      script.dataset.kakaoSdk = "townpet";
      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });
      document.head.appendChild(script);
    }).catch((error) => {
      kakaoSdkPromise = null;
      throw error;
    });
  }

  return kakaoSdkPromise;
}

export async function loadKakaoSdk(appKey: string) {
  const normalizedKey = appKey.trim();
  if (normalizedKey.length === 0) {
    throw new Error("KAKAO_APP_KEY_MISSING");
  }

  const kakao = await loadKakaoSdkScript();
  return ensureKakaoSdk(normalizedKey, kakao);
}

function extractKakaoErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" || typeof code === "number") {
      return String(code);
    }
  }

  if (error instanceof Error) {
    const matched = error.message.match(/\b(\d{4})\b/);
    if (matched) {
      return matched[1];
    }
  }

  return null;
}

export function resolveKakaoShareErrorMessage(error: unknown) {
  const code = extractKakaoErrorCode(error);
  if (code === "4011") {
    return KAKAO_SHARE_INVALID_KEY_ERROR;
  }

  if (code) {
    return `카카오 공유 요청에 실패했습니다. 링크 복사를 이용해 주세요. (${code})`;
  }

  return KAKAO_SHARE_GENERIC_ERROR;
}
