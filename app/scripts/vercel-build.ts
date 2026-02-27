import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

type CommandResult = {
  code: number;
  output: string;
};

const PRISMA_DEPLOY_MAX_ATTEMPTS = 4;
const PRISMA_DEPLOY_RETRY_DELAY_MS = 4_000;
const NEIGHBORHOOD_SYNC_MAX_ATTEMPTS = 3;
const NEIGHBORHOOD_SYNC_RETRY_DELAY_MS = 3_000;

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

async function listMigrationNames() {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function baselineMigrations() {
  const migrations = await listMigrationNames();
  if (migrations.length === 0) {
    throw new Error("No Prisma migrations found in prisma/migrations.");
  }

  console.log("[build:vercel] P3005 detected. Running Prisma baseline resolve...");

  for (const migration of migrations) {
    const result = await runCommand("pnpm", [
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

async function runPrismaDeploy() {
  let baselineAttempted = false;

  for (let attempt = 1; attempt <= PRISMA_DEPLOY_MAX_ATTEMPTS; attempt += 1) {
    const deployResult = await runCommand("pnpm", ["prisma", "migrate", "deploy"]);
    if (deployResult.code === 0) {
      return;
    }

    if (isBaselineRequired(deployResult.output) && !baselineAttempted) {
      baselineAttempted = true;
      await baselineMigrations();
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

async function runNeighborhoodSync() {
  for (let attempt = 1; attempt <= NEIGHBORHOOD_SYNC_MAX_ATTEMPTS; attempt += 1) {
    const syncNeighborhoodResult = await runCommand("pnpm", ["db:sync:neighborhoods"]);
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

    throw new Error("[build:vercel] neighborhood sync failed.");
  }

  throw new Error("[build:vercel] neighborhood sync exhausted retry attempts.");
}

async function repairCommunityBoardSchema() {
  const repairResult = await runCommand("pnpm", [
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

async function main() {
  await runPrismaDeploy();
  await repairCommunityBoardSchema();

  await runNeighborhoodSync();

  const generateResult = await runCommand("pnpm", ["prisma", "generate"]);
  if (generateResult.code !== 0) {
    throw new Error("[build:vercel] prisma generate failed.");
  }

  const buildResult = await runCommand("pnpm", ["next", "build"]);
  if (buildResult.code !== 0) {
    throw new Error("[build:vercel] next build failed.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
