import { NextResponse } from "next/server";

type ErrorPayload = {
  code: string;
  message: string;
};

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function jsonError(status: number, payload: ErrorPayload) {
  return NextResponse.json({ ok: false, error: payload }, { status });
}
