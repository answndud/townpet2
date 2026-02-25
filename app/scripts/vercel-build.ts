import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

type CommandResult = {
  code: number;
  output: string;
};

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
  const deployResult = await runCommand("pnpm", ["prisma", "migrate", "deploy"]);
  if (deployResult.code === 0) {
    return;
  }

  if (!isBaselineRequired(deployResult.output)) {
    throw new Error("[build:vercel] prisma migrate deploy failed.");
  }

  await baselineMigrations();

  const retryResult = await runCommand("pnpm", ["prisma", "migrate", "deploy"]);
  if (retryResult.code !== 0) {
    throw new Error("[build:vercel] prisma migrate deploy failed after baseline resolve.");
  }
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
