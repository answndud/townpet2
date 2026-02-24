import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const args = new Set(process.argv.slice(2));
const checkMode = args.has("--check");

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const docsDir = join(repoRoot, "docs");
const appDir = join(repoRoot, "app");
const reportPath = join(docsDir, "ops", "docs-sync-report.md");

function walk(dir, predicate) {
  const results = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(fullPath, predicate));
      continue;
    }
    if (predicate(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

function toRel(path) {
  return relative(repoRoot, path).replaceAll("\\", "/");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const docsFiles = walk(docsDir, (p) => p.endsWith(".md"))
  .map(toRel)
  .sort((a, b) => a.localeCompare(b));

const packageJson = readJson(join(appDir, "package.json"));
const scripts = Object.keys(packageJson.scripts ?? {}).sort((a, b) =>
  a.localeCompare(b),
);

const migrationDirs = readdirSync(join(appDir, "prisma", "migrations"), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b));

const apiRoutes = walk(join(appDir, "src", "app", "api"),
  (p) => p.endsWith("/route.ts") || p.endsWith("/route.tsx"),
)
  .map(toRel)
  .sort((a, b) => a.localeCompare(b));

const lines = [
  "# Docs Sync Report",
  "",
  "This file is auto-generated. Do not edit manually.",
  "",
  "## Docs files",
  `- Total markdown files: ${docsFiles.length}`,
  ...docsFiles.map((file) => `- ${file}`),
  "",
  "## App scripts",
  `- Total scripts: ${scripts.length}`,
  ...scripts.map((name) => `- ${name}`),
  "",
  "## Prisma migrations",
  `- Total migrations: ${migrationDirs.length}`,
  ...migrationDirs.map((name) => `- ${name}`),
  "",
  "## API route handlers",
  `- Total route handlers: ${apiRoutes.length}`,
  ...apiRoutes.map((file) => `- ${file}`),
  "",
  "## Usage",
  "- Refresh report: `cd app && pnpm docs:refresh`",
  "- Check staleness: `cd app && pnpm docs:refresh:check`",
  "",
];

const nextContent = `${lines.join("\n")}`;
const prevContent = existsSync(reportPath)
  ? readFileSync(reportPath, "utf8")
  : null;

if (checkMode) {
  if (prevContent !== nextContent) {
    console.error("docs-sync-report.md is stale. Run: cd app && pnpm docs:refresh");
    process.exit(1);
  }
  console.log("docs-sync-report.md is up to date.");
  process.exit(0);
}

writeFileSync(reportPath, nextContent, "utf8");
console.log(`Updated ${toRel(reportPath)}`);
