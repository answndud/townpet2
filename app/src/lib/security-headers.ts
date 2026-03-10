type CspPolicyParams = {
  scriptSrc: string;
  connectSrc: string;
  includeUnsafeEval: boolean;
};

type ResolveCspHeadersParams = {
  nodeEnv?: string;
  cspEnforceStrict?: string;
  nonce?: string;
};

type StaticSecurityHeadersParams = Omit<ResolveCspHeadersParams, "nonce">;

const PERMISSIONS_POLICY = "camera=(), geolocation=(), microphone=()";
const HSTS_HEADER_VALUE = "max-age=31536000";

function buildCspPolicy(params: CspPolicyParams) {
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
    "report-uri /api/security/csp-report",
  ].join("; ");
}

function buildNonceScriptSrc(nonce: string, isStrict: boolean) {
  const strictSources = [`'self'`, `'nonce-${nonce}'`];
  if (isStrict) {
    return strictSources.join(" ");
  }

  return [...strictSources, `'unsafe-inline'`].join(" ");
}

function buildStrictNonceReportOnlyPolicy(nonce: string) {
  return buildCspPolicy({
    scriptSrc: buildNonceScriptSrc(nonce, true),
    connectSrc: "'self' https:",
    includeUnsafeEval: false,
  });
}

function buildStaticScriptSrc(isDevelopment: boolean) {
  if (isDevelopment) {
    return `'self' 'unsafe-inline' http: https:`;
  }

  // Fallback for middleware incidents: weaker than nonce CSP, but safer than no CSP.
  return `'self' 'unsafe-inline'`;
}

export function resolveCspHeaders(params: ResolveCspHeadersParams) {
  const isProduction = params.nodeEnv === "production";
  const nonce = params.nonce?.trim();

  if (!nonce) {
    return {
      csp: buildStaticSecurityHeaders(params).find(
        (header) => header.key === "Content-Security-Policy",
      )?.value ?? "",
      cspReportOnly: null,
    };
  }

  if (!isProduction) {
    return {
      csp: buildCspPolicy({
        scriptSrc: `${buildNonceScriptSrc(nonce, false)} http: https:`,
        connectSrc: "'self' https: http: ws: wss:",
        includeUnsafeEval: true,
      }),
      cspReportOnly: null,
    };
  }

  // Next.js app router still emits framework inline bootstrap scripts without nonce
  // on this stack. Browsers ignore 'unsafe-inline' whenever nonce/hash sources are
  // present, so enforcing a nonce-based script-src breaks hydration and yields a
  // blank shell. Keep the enforced CSP on the static fallback and use the strict
  // nonce policy in report-only until nonce propagation is end-to-end.
  const staticProductionCsp = buildStaticSecurityHeaders({
    nodeEnv: params.nodeEnv,
    cspEnforceStrict: params.cspEnforceStrict,
  }).find((header) => header.key === "Content-Security-Policy")?.value ?? "";
  const strictReportOnlyCsp = buildStrictNonceReportOnlyPolicy(nonce);

  return {
    csp: staticProductionCsp,
    cspReportOnly: strictReportOnlyCsp,
  };
}

export function buildStaticSecurityHeaders(params: StaticSecurityHeadersParams) {
  const isDevelopment = params.nodeEnv !== "production";
  const csp = buildCspPolicy({
    scriptSrc: buildStaticScriptSrc(isDevelopment),
    connectSrc: isDevelopment ? "'self' https: http: ws: wss:" : "'self' https:",
    includeUnsafeEval: isDevelopment,
  });

  return [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
    ...(isDevelopment
      ? []
      : [{ key: "Strict-Transport-Security", value: HSTS_HEADER_VALUE }]),
    { key: "Content-Security-Policy", value: csp },
  ];
}
