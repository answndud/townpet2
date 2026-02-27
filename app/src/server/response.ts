import { NextResponse } from "next/server";

type ErrorPayload = {
  code: string;
  message: string;
};

export function jsonOk<T>(data: T, init?: ResponseInit) {
  const response = NextResponse.json({ ok: true, data }, init);
  if (init?.headers) {
    const headers = new Headers(init.headers);
    headers.forEach((value, key) => {
      response.headers.set(key, value);
    });
  }
  return response;
}

export function jsonError(status: number, payload: ErrorPayload) {
  return NextResponse.json({ ok: false, error: payload }, { status });
}
