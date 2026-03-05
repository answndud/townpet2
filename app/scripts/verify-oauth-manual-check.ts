import fs from "node:fs";
import path from "node:path";

type CliOptions = {
  reportPath: string;
  strict: boolean;
};

type ProviderRow = {
  provider: "Kakao" | "Naver";
  status: string;
  evidence: string;
};

const DEFAULT_REPORT_PATH = "../docs/ops/manual-checks/oauth-manual-check-2026-03-05.md";

function usage() {
  console.log(`Usage:
  pnpm -C app ops:oauth:verify-manual [options]

Options:
  --report <path>       Report markdown path (default: ${DEFAULT_REPORT_PATH})
  --strict <0|1>        Exit non-zero if closure criteria are not met (default: 0)
  --help                Show this help
`);
}

function parseBoolean(value: string, key: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }
  throw new Error(`Invalid ${key} value: ${value}`);
}

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const key = token.slice(2);
    if (key === "help") {
      usage();
      return null;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    args.set(key, value);
    index += 1;
  }

  return {
    reportPath: args.get("report") ?? DEFAULT_REPORT_PATH,
    strict: parseBoolean(args.get("strict") ?? "0", "--strict"),
  } satisfies CliOptions;
}

function parseProviderRows(markdown: string) {
  const rows = markdown
    .split("\n")
    .filter(
      (line) =>
        line.startsWith("| Kakao |") ||
        line.startsWith("| Naver |"),
    )
    .map((line) => {
      const columns = line
        .split("|")
        .map((column) => column.trim())
        .filter((column) => column.length > 0);

      const provider = columns[0];
      if (provider !== "Kakao" && provider !== "Naver") {
        return null;
      }

      return {
        provider,
        status: (columns[1] ?? "").toLowerCase(),
        evidence: columns[4] ?? "",
      } satisfies ProviderRow;
    })
    .filter((row): row is ProviderRow => row !== null);

  const kakao = rows.find((row) => row.provider === "Kakao");
  const naver = rows.find((row) => row.provider === "Naver");
  if (!kakao || !naver) {
    throw new Error("Provider table rows for Kakao/Naver were not found.");
  }

  return [kakao, naver] as const;
}

function hasRealEvidence(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed.toLowerCase() === "screenshot/video link") {
    return false;
  }
  if (trimmed.includes("<") || trimmed.includes(">")) {
    return false;
  }
  return true;
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (!options) {
      return;
    }

    const resolvedReportPath = path.resolve(process.cwd(), options.reportPath);
    if (!fs.existsSync(resolvedReportPath)) {
      throw new Error(`Report file not found: ${resolvedReportPath}`);
    }

    const markdown = fs.readFileSync(resolvedReportPath, "utf8");
    const [kakao, naver] = parseProviderRows(markdown);

    const providers = [kakao, naver].map((row) => {
      const statusPass = row.status === "pass";
      const evidenceReady = hasRealEvidence(row.evidence);
      return {
        ...row,
        statusPass,
        evidenceReady,
        ready: statusPass && evidenceReady,
      };
    });

    const readyToClose = providers.every((row) => row.ready);

    console.log(`OAuth manual check verification`);
    console.log(`- report: ${resolvedReportPath}`);
    for (const row of providers) {
      console.log(
        `- ${row.provider}: status=${row.status} evidence=${row.evidenceReady ? "ok" : "missing"} ready=${row.ready ? "yes" : "no"}`,
      );
    }
    console.log(`- readyToCloseCycle23: ${readyToClose ? "yes" : "no"}`);

    if (options.strict && !readyToClose) {
      process.exitCode = 1;
      console.error(
        "Cycle 23 closure criteria not met. Both providers must be pass with evidence links.",
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(message);
    usage();
    process.exitCode = 1;
  }
}

main();
