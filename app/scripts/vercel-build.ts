import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

type CommandResult = {
  code: number;
  output: string;
};

type CommandRunner = (
  command: string,
  args: string[],
) => Promise<CommandResult>;

const PRISMA_DEPLOY_MAX_ATTEMPTS = 4;
const PRISMA_DEPLOY_RETRY_DELAY_MS = 4_000;
const NEIGHBORHOOD_SYNC_MAX_ATTEMPTS = 3;
const NEIGHBORHOOD_SYNC_RETRY_DELAY_MS = 3_000;
const NEIGHBORHOOD_SYNC_STRICT = process.env.NEIGHBORHOOD_SYNC_STRICT === "1";
const CURRENT_FILE_PATH = fileURLToPath(import.meta.url);

function runCommand(command: string, args: string[]) {
  return new Promise<CommandResult>((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      cwd: process.cwd(),
      stdio: ["inherit", "pipe", "pipe"],
    });

    let output = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      resolve({
        code: code ?? 1,
        output,
      });
    });
  });
}

function isBaselineRequired(output: string) {
  return output.includes("Error: P3005");
}

function isAlreadyAppliedError(output: string) {
  return output.includes("Error: P3008") || output.includes("already recorded as applied");
}

function isTransientPrismaDeployError(output: string) {
  return (
    output.includes("Error: P1001") ||
    output.includes("Error: P1002") ||
    output.includes("Can't reach database server") ||
    output.includes("Timed out") ||
    output.includes("ECONNRESET") ||
    output.includes("Connection terminated")
  );
}

function isTransientNeighborhoodSyncError(output: string) {
  return (
    output.includes("Error: P1001") ||
    output.includes("Error: P1002") ||
    output.includes("Can't reach database server") ||
    output.includes("Timed out") ||
    output.includes("ETIMEDOUT") ||
    output.includes("ECONNRESET") ||
    output.includes("Connection terminated")
  );
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function hasTruthyFlag(value: string | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function shouldRunSecurityEnvPreflight(env: NodeJS.ProcessEnv = process.env) {
  if (hasTruthyFlag(env.DEPLOY_SECURITY_PREFLIGHT_SKIP)) {
    return false;
  }

  if (hasTruthyFlag(env.DEPLOY_SECURITY_PREFLIGHT_STRICT)) {
    return true;
  }

  const targetEnv = (env.VERCEL_TARGET_ENV ?? env.VERCEL_ENV ?? "").trim().toLowerCase();
  return targetEnv === "production";
}

export function shouldRunAuthEmailReadinessPreflight(env: NodeJS.ProcessEnv = process.env) {
  if (hasTruthyFlag(env.DEPLOY_AUTH_EMAIL_PREFLIGHT_SKIP)) {
    return false;
  }

  if (hasTruthyFlag(env.DEPLOY_AUTH_EMAIL_PREFLIGHT_STRICT)) {
    return true;
  }

  const targetEnv = (env.VERCEL_TARGET_ENV ?? env.VERCEL_ENV ?? "").trim().toLowerCase();
  return targetEnv === "production";
}

async function listMigrationNames() {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function baselineMigrations(commandRunner: CommandRunner = runCommand) {
  const migrations = await listMigrationNames();
  if (migrations.length === 0) {
    throw new Error("No Prisma migrations found in prisma/migrations.");
  }

  console.log("[build:vercel] P3005 detected. Running Prisma baseline resolve...");

  for (const migration of migrations) {
    const result = await commandRunner("pnpm", [
      "prisma",
      "migrate",
      "resolve",
      "--applied",
      migration,
    ]);

    if (result.code !== 0 && !isAlreadyAppliedError(result.output)) {
      throw new Error(`[build:vercel] Failed to resolve migration ${migration}`);
    }
  }
}

export async function runSecurityEnvPreflight(commandRunner: CommandRunner = runCommand) {
  if (!shouldRunSecurityEnvPreflight()) {
    console.log(
      "[build:vercel] skipping strict security env preflight (non-production target or opt-out).",
    );
    return;
  }

  const result = await commandRunner("pnpm", ["ops:check:security-env:strict"]);
  if (result.code !== 0) {
    throw new Error("[build:vercel] security env preflight failed.");
  }
}

export async function runAuthEmailReadinessPreflight(
  commandRunner: CommandRunner = runCommand,
) {
  if (!shouldRunAuthEmailReadinessPreflight()) {
    console.log(
      "[build:vercel] skipping auth email readiness preflight (non-production target or opt-out).",
    );
    return;
  }

  const result = await commandRunner("pnpm", ["ops:check:auth-email-readiness"]);
  if (result.code !== 0) {
    throw new Error("[build:vercel] auth email readiness preflight failed.");
  }
}

async function runPrismaDeploy(commandRunner: CommandRunner = runCommand) {
  let baselineAttempted = false;

  for (let attempt = 1; attempt <= PRISMA_DEPLOY_MAX_ATTEMPTS; attempt += 1) {
    const deployResult = await commandRunner("pnpm", ["prisma", "migrate", "deploy"]);
    if (deployResult.code === 0) {
      return;
    }

    if (isBaselineRequired(deployResult.output) && !baselineAttempted) {
      baselineAttempted = true;
      await baselineMigrations(commandRunner);
      continue;
    }

    if (isTransientPrismaDeployError(deployResult.output) && attempt < PRISMA_DEPLOY_MAX_ATTEMPTS) {
      console.log(
        `[build:vercel] prisma migrate deploy transient failure (attempt ${attempt}/${PRISMA_DEPLOY_MAX_ATTEMPTS}). Retrying...`,
      );
      await sleep(PRISMA_DEPLOY_RETRY_DELAY_MS * attempt);
      continue;
    }

    throw new Error("[build:vercel] prisma migrate deploy failed.");
  }

  throw new Error("[build:vercel] prisma migrate deploy exhausted retry attempts.");
}

async function runNeighborhoodSync(commandRunner: CommandRunner = runCommand) {
  let lastOutput = "";

  for (let attempt = 1; attempt <= NEIGHBORHOOD_SYNC_MAX_ATTEMPTS; attempt += 1) {
    const syncNeighborhoodResult = await commandRunner("pnpm", ["db:sync:neighborhoods"]);
    lastOutput = syncNeighborhoodResult.output;

    if (syncNeighborhoodResult.code === 0) {
      return;
    }

    if (
      isTransientNeighborhoodSyncError(syncNeighborhoodResult.output) &&
      attempt < NEIGHBORHOOD_SYNC_MAX_ATTEMPTS
    ) {
      console.log(
        `[build:vercel] neighborhood sync transient failure (attempt ${attempt}/${NEIGHBORHOOD_SYNC_MAX_ATTEMPTS}). Retrying...`,
      );
      await sleep(NEIGHBORHOOD_SYNC_RETRY_DELAY_MS * attempt);
      continue;
    }

    if (NEIGHBORHOOD_SYNC_STRICT) {
      throw new Error("[build:vercel] neighborhood sync failed.");
    }

    console.warn(
      "[build:vercel] neighborhood sync failed. Continuing build because NEIGHBORHOOD_SYNC_STRICT is not enabled.",
    );
    return;
  }

  if (NEIGHBORHOOD_SYNC_STRICT) {
    throw new Error("[build:vercel] neighborhood sync exhausted retry attempts.");
  }

  console.warn(
    `[build:vercel] neighborhood sync exhausted retry attempts. Continuing build because NEIGHBORHOOD_SYNC_STRICT is not enabled.`,
  );
  if (lastOutput.trim().length > 0) {
    console.warn(lastOutput);
  }
}

async function repairCommunityBoardSchema(commandRunner: CommandRunner = runCommand) {
  const repairResult = await commandRunner("pnpm", [
    "prisma",
    "db",
    "execute",
    "--schema",
    "prisma/schema.prisma",
    "--file",
    "scripts/sql/community-board-repair.sql",
  ]);

  if (repairResult.code !== 0) {
    throw new Error("[build:vercel] community-board schema repair failed.");
  }
}

async function repairNotificationArchiveSchema(commandRunner: CommandRunner = runCommand) {
  const repairResult = await commandRunner("pnpm", [
    "prisma",
    "db",
    "execute",
    "--schema",
    "prisma/schema.prisma",
    "--file",
    "scripts/sql/notification-archive-repair.sql",
  ]);

  if (repairResult.code !== 0) {
    throw new Error("[build:vercel] notification archive schema repair failed.");
  }
}

async function runPrismaGenerate(commandRunner: CommandRunner = runCommand) {
  const generateResult = await commandRunner("pnpm", ["prisma", "generate"]);
  if (generateResult.code !== 0) {
    throw new Error("[build:vercel] prisma generate failed.");
  }
}

export async function runBuildVercel(commandRunner: CommandRunner = runCommand) {
  await runSecurityEnvPreflight(commandRunner);
  await runAuthEmailReadinessPreflight(commandRunner);
  await runPrismaDeploy(commandRunner);
  await repairCommunityBoardSchema(commandRunner);
  await repairNotificationArchiveSchema(commandRunner);

  // Vercel dependency cache can keep an outdated Prisma Client.
  // Generate before running any TS script that instantiates PrismaClient.
  await runPrismaGenerate(commandRunner);
  await runNeighborhoodSync(commandRunner);

  const buildResult = await commandRunner("pnpm", ["next", "build"]);
  if (buildResult.code !== 0) {
    throw new Error("[build:vercel] next build failed.");
  }
}

export async function main() {
  await runBuildVercel();
}

if (process.argv[1] && path.resolve(process.argv[1]) === CURRENT_FILE_PATH) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
