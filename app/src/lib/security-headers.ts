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

function isTruthy(value?: string) {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

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

  if (isTruthy(params.cspEnforceStrict)) {
    return {
      csp: buildCspPolicy({
        scriptSrc: buildNonceScriptSrc(nonce, true),
        connectSrc: "'self' https:",
        includeUnsafeEval: false,
      }),
      cspReportOnly: null,
    };
  }

  return {
    csp: buildCspPolicy({
      scriptSrc: buildNonceScriptSrc(nonce, false),
      connectSrc: "'self' https:",
      includeUnsafeEval: false,
    }),
    cspReportOnly: buildCspPolicy({
      scriptSrc: buildNonceScriptSrc(nonce, true),
      connectSrc: "'self' https:",
      includeUnsafeEval: false,
    }),
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
    { key: "Content-Security-Policy", value: csp },
  ];
}
