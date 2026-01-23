# AGENTS.md
# TownPet agent guide (for AI coding agents)

Purpose
- Provide build/lint/test commands and single-test recipes
- Capture code style, architecture, and domain rules from docs
- Reflect any Cursor/Copilot rules (none found in this repo)

Repo status
- This repo currently contains documentation only (no code, no package.json)
- Commands below are taken from `docs/SPEC.md` and represent intended scripts

Key documents to read first
- `docs/SPEC.md`
- `docs/business/overview_내부용.md`
- `docs/business/competitive_landscape.md`
- `docs/business/monetization_pricing.md`
- `docs/business/personas.md.md`

Cursor/Copilot rules
- No `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md` found

Build / lint / test commands
- Install deps: `pnpm install`
- Dev server: `pnpm dev`
- Build: `pnpm build`
- Start: `pnpm start`
- Lint: `pnpm lint`
- DB migrate: `pnpm prisma migrate dev` (alias in docs: `pnpm db:migrate`)
- DB push: `pnpm db:push`
- Prisma Studio: `pnpm db:studio`
- Seed: `pnpm db:seed`

Tests
- Unit/Integration (Vitest): `pnpm test`
- E2E (Playwright): `pnpm test:e2e`

Run a single test (Vitest)
- File: `pnpm test -- path/to/test.spec.ts`
- Test name: `pnpm test -- -t "partial test name"`
- Watch: `pnpm test -- --watch`

Run a single test (Playwright)
- File: `pnpm test:e2e -- path/to/test.spec.ts`
- Test name: `pnpm test:e2e -- -g "partial test name"`
- Project: `pnpm test:e2e -- --project=chromium`

Architecture essentials (Next.js App Router)
- Single language stack: TypeScript across frontend/backend
- App Router structure under `src/app/` (pages + API routes)
- API: Next.js Route Handlers in `src/app/api/**`
- Mutations: Server Actions in `src/server/actions/`
- Business logic: `src/server/services/` (centralized policies)
- Queries: `src/server/queries/` (reuse + optimization)
- Validation: Zod schemas in `src/lib/validations/`
- DB: Prisma in `prisma/schema.prisma`

Domain rules that must not be violated
- Local vs Global must stay separated (feeds/search/alerts/policy)
- High-risk features (Market/Care/Lost&Found) require policies first
- Reporting must allow auto-hide (HIDDEN) and admin audit
- Rate limit + new-user restrictions are mandatory for abuse-prone flows
- Template-based UGC is the default (structure before free text)

Code style guidelines

Language + types
- TypeScript strict mode is the baseline
- Prefer explicit types at module boundaries (actions/services/route handlers)
- Avoid `any`; use Zod inference or Prisma types
- Use `unknown` for untrusted input, validate with Zod

Imports
- Prefer type-only imports when possible (`import type { ... }`)
- Group imports: external libs, internal modules, then relative
- Keep path usage consistent; if aliases exist in tsconfig, use them
- Avoid deep relative paths when a shared module exists

Formatting
- Use project formatter/linter defaults (Next.js + ESLint)
- Keep line length reasonable; avoid long chained expressions
- Prefer early returns and small functions over nested branches

Naming conventions
- Files: kebab-case for routes/components, dot suffix for domain (`post.service.ts`)
- React components: PascalCase
- Hooks: `useXxx`
- Zod schemas: `xxxSchema` and inferred types `Xxx` or `XxxInput`
- Enums: PascalCase names, UPPER_SNAKE values (matches Prisma)

Error handling
- Do not throw raw errors from Route Handlers or Server Actions
- Normalize error responses (status + message + code)
- Log with context in server layer; avoid leaking PII in client errors
- For auth/permission failures, return 401/403 consistently

Validation + security
- All external inputs must be Zod-validated (API + actions + forms)
- Use Prisma parameter binding only; no raw SQL unless necessary
- Enforce rate limit on login/search/create/report endpoints
- High-risk content requires extra checks (attachments, links, contact info)

Data access rules
- Use `include`/`select` explicitly; avoid N+1 queries
- Use queries in `src/server/queries/` for shared fetch patterns
- Prefer cursor pagination, not offset
- Indexes should align with feed/query patterns

UI + UX rules
- Tailwind CSS + shadcn/ui for components
- Prefer server components for data fetching
- Client components only when interactivity is required
- Keep form validation in sync with Zod schemas

Operational policies (must bake into features)
- Auto-hide on report thresholds and log admin resolution
- New user restrictions for Market/Care/Lost&Found
- Link/contact sharing restrictions to limit spam
- Medical/health content must avoid diagnosis-style phrasing

Development workflow (from SPEC)
- PLAN -> SCHEMA -> GENERATE -> REVIEW -> TEST -> DEPLOY
- Order for new features: Prisma -> Zod -> Service -> Action/Route -> UI -> Tests

Notes on repo state
- There is no real codebase yet; treat this as a blueprint repo
- Update AGENTS.md when actual scripts or style rules are added
