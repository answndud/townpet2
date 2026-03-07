"use client";

import { getGuestFingerprint } from "@/lib/guest-client";

export const guestWriteScopeValues = [
  "post:create",
  "comment:create",
  "upload",
] as const;

export type GuestWriteScope = (typeof guestWriteScopeValues)[number];

type GuestStepUpResponse = {
  ok: true;
  data: {
    token: string;
    difficulty: number;
    expiresInSeconds: number;
  };
};

type GuestStepUpError = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

type CachedGuestStepUpEntry = {
  expiresAt: number;
  headers: Record<string, string>;
};

const guestStepUpCache = new Map<string, CachedGuestStepUpEntry>();

function getCacheKey(scope: GuestWriteScope, fingerprint: string) {
  return `${scope}:${fingerprint}`;
}

async function hashProofCandidate(value: string) {
  const digest = await window.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function solveGuestStepUpProof(token: string, difficulty: number) {
  const targetPrefix = "0".repeat(Math.max(1, difficulty));
  let nonce = 0;

  while (true) {
    const candidate = nonce.toString(36);
    const digest = await hashProofCandidate(`${token}.${candidate}`);
    if (digest.startsWith(targetPrefix)) {
      return candidate;
    }
    nonce += 1;
  }
}

export async function getGuestWriteHeaders(scope: GuestWriteScope) {
  const fingerprint = getGuestFingerprint();
  const cacheKey = getCacheKey(scope, fingerprint);
  const cached = guestStepUpCache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiresAt - now > 15_000) {
    return {
      ...cached.headers,
      "x-guest-fingerprint": fingerprint,
    };
  }

  const response = await fetch("/api/guest/step-up", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-guest-fingerprint": fingerprint,
    },
    body: JSON.stringify({ scope }),
  });
  const payload = (await response.json()) as GuestStepUpResponse | GuestStepUpError;

  if (!response.ok || !payload.ok) {
    throw new Error(payload.ok ? "비회원 추가 확인 준비에 실패했습니다." : payload.error.message);
  }

  const proof = await solveGuestStepUpProof(payload.data.token, payload.data.difficulty);
  const headers = {
    "x-guest-fingerprint": fingerprint,
    "x-guest-step-up-token": payload.data.token,
    "x-guest-step-up-proof": proof,
  };

  guestStepUpCache.set(cacheKey, {
    headers,
    expiresAt: now + payload.data.expiresInSeconds * 1000,
  });

  return headers;
}
