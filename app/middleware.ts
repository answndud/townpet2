import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CORS_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const CORS_HEADERS = "Content-Type, Authorization, X-Requested-With, X-Request-Id";
const CSP_REPORT_ENDPOINT = "/api/security/csp-report";

function buildCspScriptSrc(nonce: string, isStrict: boolean) {
  const strictSources = [`'self'`, `'nonce-${nonce}'`, "https:"];
  if (isStrict) {
    return strictSources.join(" ");
  }

  return [...strictSources, `'unsafe-inline'`].join(" ");
}

function buildCspPolicy(params: {
  scriptSrc: string;
  connectSrc: string;
  includeUnsafeEval: boolean;
}) {
  const scriptSrc = params.includeUnsafeEval
    ? `${params.scriptSrc} 'unsafe-eval'`
    : params.scriptSrc;

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    `connect-src ${params.connectSrc}`,
    `report-uri ${CSP_REPORT_ENDPOINT}`,
  ].join("; ");
}

const PROD_CSP_RELAXED = (nonce: string) =>
  buildCspPolicy({
    scriptSrc: buildCspScriptSrc(nonce, false),
    connectSrc: "'self' https:",
    includeUnsafeEval: false,
  });

const PROD_CSP_STRICT = (nonce: string) =>
  buildCspPolicy({
    scriptSrc: buildCspScriptSrc(nonce, true),
    connectSrc: "'self' https:",
    includeUnsafeEval: false,
  });

const DEV_CSP = (nonce: string) =>
  buildCspPolicy({
    scriptSrc: `${buildCspScriptSrc(nonce, false)} http:`,
    connectSrc: "'self' https: http: ws: wss:",
    includeUnsafeEval: true,
  });

function isTruthy(value?: string) {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function resolveCspHeaders(env: {
  nodeEnv?: string;
  cspEnforceStrict?: string;
  nonce: string;
}) {
  const isProduction = env.nodeEnv === "production";
  if (!isProduction) {
    return {
      csp: DEV_CSP(env.nonce),
      cspReportOnly: null,
    };
  }

  const isStrictEnforced = isTruthy(env.cspEnforceStrict);
  if (isStrictEnforced) {
    return {
      csp: PROD_CSP_STRICT(env.nonce),
      cspReportOnly: null,
    };
  }

  return {
    csp: PROD_CSP_RELAXED(env.nonce),
    cspReportOnly: PROD_CSP_STRICT(env.nonce),
  };
}

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

function applySecurityHeaders(headers: Headers, nonce: string) {
  const cspHeaders = resolveCspHeaders({
    nodeEnv: process.env.NODE_ENV,
    cspEnforceStrict: process.env.CSP_ENFORCE_STRICT,
    nonce,
  });

  headers.set("x-frame-options", "DENY");
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("content-security-policy", cspHeaders.csp);

  if (cspHeaders.cspReportOnly) {
    headers.set("content-security-policy-report-only", cspHeaders.cspReportOnly);
    return;
  }

  headers.delete("content-security-policy-report-only");
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

function appendVary(headers: Headers, value: string) {
  const existing = headers.get("vary");
  if (!existing) {
    headers.set("vary", value);
    return;
  }

  const parts = existing.split(",").map((part) => part.trim().toLowerCase());
  if (parts.includes(value.toLowerCase())) {
    return;
  }

  headers.set("vary", `${existing}, ${value}`);
}

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const requestId = requestHeaders.get("x-request-id") ?? crypto.randomUUID();
  const cspNonce = crypto.randomUUID().replaceAll("-", "");
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-csp-nonce", cspNonce);

  const responseHeaders = new Headers();
  responseHeaders.set("x-request-id", requestId);
  applySecurityHeaders(responseHeaders, cspNonce);

  if (request.nextUrl.pathname.startsWith("/api")) {
    applyCorsHeaders(request, responseHeaders);

    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: responseHeaders });
    }
  }

  const isGuest =
    !request.cookies.get("townpet.session-token") &&
    !request.cookies.get("next-auth.session-token") &&
    !request.cookies.get("__Secure-next-auth.session-token");
  if (isGuest && request.method === "GET") {
    if (request.nextUrl.pathname === "/feed") {
      const scope = request.nextUrl.searchParams.get("scope");
      const personalized = request.nextUrl.searchParams.get("personalized");
      if (scope !== "LOCAL" && personalized !== "1") {
        responseHeaders.set(
          "cache-control",
          "public, s-maxage=60, stale-while-revalidate=300",
        );
        appendVary(responseHeaders, "Cookie");
      }
    }

    if (request.nextUrl.pathname.startsWith("/posts/")) {
      const segments = request.nextUrl.pathname.split("/").filter(Boolean);
      const isDetailPage = segments.length >= 2 && segments[0] === "posts";
      if (isDetailPage) {
        responseHeaders.set(
          "cache-control",
          "public, s-maxage=30, stale-while-revalidate=300",
        );
        appendVary(responseHeaders, "Cookie");
        if (segments.length === 2) {
          const rewrittenUrl = request.nextUrl.clone();
          rewrittenUrl.pathname = `/posts/${segments[1]}/guest`;
          return NextResponse.rewrite(rewrittenUrl, {
            request: { headers: requestHeaders },
            headers: responseHeaders,
          });
        }
      }
    }

    if (request.nextUrl.pathname === "/api/posts") {
      const scope = request.nextUrl.searchParams.get("scope") ?? "GLOBAL";
      const cursor = request.nextUrl.searchParams.get("cursor");
      const personalized = request.nextUrl.searchParams.get("personalized");
      if (scope !== "LOCAL" && !cursor && personalized !== "1") {
        responseHeaders.set(
          "cache-control",
          "public, s-maxage=30, stale-while-revalidate=300",
        );
      }
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
