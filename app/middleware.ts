import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CORS_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const CORS_HEADERS =
  "Content-Type, Authorization, X-Requested-With, X-Request-Id, x-user-id";

function getAllowedCorsOrigins() {
  const fromCsv = (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const knownOrigins = [
    process.env.APP_BASE_URL,
    process.env.NEXTAUTH_URL,
    process.env.AUTH_URL,
  ]
    .map((value) => value?.trim() ?? "")
    .filter((value) => value.length > 0);

  return new Set([...fromCsv, ...knownOrigins]);
}

function applySecurityHeaders(headers: Headers) {
  const isProduction = process.env.NODE_ENV === "production";
  const csp = isProduction
    ? "default-src 'self'; img-src 'self' data: blob: https:; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline'; connect-src 'self' https:;"
    : "default-src 'self'; img-src 'self' data: blob: https: http:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http:; style-src 'self' 'unsafe-inline'; connect-src 'self' https: http: ws: wss:;";

  headers.set("x-frame-options", "DENY");
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("content-security-policy", csp);
}

function applyCorsHeaders(request: NextRequest, headers: Headers) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return;
  }

  const allowedOrigins = getAllowedCorsOrigins();
  if (!allowedOrigins.has(origin)) {
    return;
  }

  headers.set("access-control-allow-origin", origin);
  headers.set("access-control-allow-methods", CORS_METHODS);
  headers.set("access-control-allow-headers", CORS_HEADERS);
  headers.set("access-control-allow-credentials", "true");
  headers.set("vary", "Origin");
}

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const requestId = requestHeaders.get("x-request-id") ?? crypto.randomUUID();
  requestHeaders.set("x-request-id", requestId);

  const responseHeaders = new Headers();
  responseHeaders.set("x-request-id", requestId);
  applySecurityHeaders(responseHeaders);

  if (request.nextUrl.pathname.startsWith("/api")) {
    applyCorsHeaders(request, responseHeaders);

    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: responseHeaders });
    }
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  responseHeaders.forEach((value, key) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
