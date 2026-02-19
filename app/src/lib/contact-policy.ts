import { UserRole } from "@prisma/client";

import { NEW_USER_RESTRICTION_HOURS } from "@/lib/post-write-policy";

export type ContactSignalType =
  | "email"
  | "phone"
  | "open_kakao"
  | "messenger_link"
  | "kakao_id";

const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const phonePattern = /\b(?:01[016789]|02|0[3-9][0-9])[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g;
const openKakaoPattern = /\bhttps?:\/\/open\.kakao\.com\/[^\s)]+/gi;
const messengerLinkPattern = /\bhttps?:\/\/(?:t\.me|wa\.me|line\.me)\/[^\s)]+/gi;
const kakaoIdPattern = /(카카오톡|카톡)\s*(아이디|id)?\s*[:：]?\s*([A-Za-z0-9._-]{3,20})/gi;

type ModerateContactContentParams = {
  text: string;
  role: UserRole;
  accountCreatedAt: Date;
  now?: Date;
  blockWindowHours?: number;
};

type ModerateContactContentResult = {
  blocked: boolean;
  signals: ContactSignalType[];
  sanitizedText: string;
  message: string | null;
};

function hasPattern(text: string, pattern: RegExp) {
  return pattern.test(text);
}

function maskEmailAddress(email: string) {
  const [localPart, domainPart] = email.split("@");
  if (!localPart || !domainPart) {
    return "[이메일 비공개]";
  }
  const prefix = localPart.slice(0, Math.min(2, localPart.length));
  return `${prefix}***@${domainPart}`;
}

function maskPhoneNumber(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9) {
    return "[연락처 비공개]";
  }

  if (digits.startsWith("02")) {
    const last = digits.slice(-4);
    return `02-***-${last}`;
  }

  const head = digits.slice(0, 3);
  const last = digits.slice(-4);
  return `${head}-****-${last}`;
}

function maskKakaoId(_match: string, channel: string, rawLabel: string, id: string) {
  const label = rawLabel && rawLabel.trim().length > 0 ? rawLabel : "아이디";
  const maskedId = `${id.slice(0, Math.min(2, id.length))}***`;
  return `${channel} ${label}: ${maskedId}`;
}

export function detectContactSignals(text: string) {
  const signals = new Set<ContactSignalType>();

  if (hasPattern(text, new RegExp(emailPattern.source, "g"))) {
    signals.add("email");
  }
  if (hasPattern(text, new RegExp(phonePattern.source, "g"))) {
    signals.add("phone");
  }
  if (hasPattern(text, new RegExp(openKakaoPattern.source, "gi"))) {
    signals.add("open_kakao");
  }
  if (hasPattern(text, new RegExp(messengerLinkPattern.source, "gi"))) {
    signals.add("messenger_link");
  }
  if (hasPattern(text, new RegExp(kakaoIdPattern.source, "gi"))) {
    signals.add("kakao_id");
  }

  return Array.from(signals);
}

export function maskContactSignals(text: string) {
  return text
    .replace(emailPattern, (email) => maskEmailAddress(email))
    .replace(phonePattern, (phone) => maskPhoneNumber(phone))
    .replace(openKakaoPattern, "[오픈채팅 링크 비공개]")
    .replace(messengerLinkPattern, "[메신저 링크 비공개]")
    .replace(kakaoIdPattern, (match, channel, rawLabel, id) =>
      maskKakaoId(match, channel, rawLabel, id),
    );
}

export function moderateContactContent({
  text,
  role,
  accountCreatedAt,
  now = new Date(),
  blockWindowHours = NEW_USER_RESTRICTION_HOURS,
}: ModerateContactContentParams): ModerateContactContentResult {
  const signals = detectContactSignals(text);
  if (signals.length === 0) {
    return {
      blocked: false,
      signals,
      sanitizedText: text,
      message: null,
    };
  }

  const ageMs = now.getTime() - accountCreatedAt.getTime();
  const blockWindowMs = blockWindowHours * 60 * 60 * 1000;
  const isWithinWindow = ageMs < blockWindowMs;
  const isBlocked = role === UserRole.USER && isWithinWindow;

  if (isBlocked) {
    return {
      blocked: true,
      signals,
      sanitizedText: text,
      message:
        "가입 후 24시간 이내에는 연락처/외부 연락 링크를 포함한 내용을 작성할 수 없습니다.",
    };
  }

  return {
    blocked: false,
    signals,
    sanitizedText: maskContactSignals(text),
    message: null,
  };
}
