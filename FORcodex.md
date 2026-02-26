# FORcodex.md

This is the "plain language map" of TownPet, written for future-you.
Think of it as the teammate who remembers why things were built, not just what exists.

## 1. What this project is trying to become

TownPet is not just a posting app. It is trying to become a trust-based local pet community:
- people discover nearby, relevant pet content
- people come back because interaction feels alive
- abuse gets blocked early so good users do not leave

A good mental model:
- Feed is the street
- Comments are conversations on the street
- Moderation is traffic law
- Rate limits and restrictions are speed bumps

Without the speed bumps, the street gets unusable fast.

## 2. Architecture in one pass

The codebase uses a Next.js App Router stack with Prisma/Postgres.
Everything important follows a layered path:

1. UI (`src/app`, `src/components`)
2. API route handlers and server actions
3. Service layer (`src/server/services`) for policy/business rules
4. Query layer (`src/server/queries`) for data fetch patterns
5. Prisma models and DB indexes

Why this matters:
- UI stays dumb enough to iterate quickly.
- Services become the policy gate.
- Queries are reusable and testable.
- DB schema stays the single source of truth.

## 3. Local vs global is a product rule, not just a filter

This project has a non-negotiable domain split:
- LOCAL content is neighborhood-scoped
- GLOBAL content is open-scoped

That affects feed logic, search, moderation, and notification strategy.
If this boundary leaks, user trust drops and moderation cost goes up.

## 4. Major technical decisions and why they were made

### TypeScript strict + Prisma + Zod
- Goal: catch invalid shapes early.
- Tradeoff: more typing work up front.
- Payoff: fewer runtime surprises in API boundaries.

### Services first for risky actions
- Post creation, report handling, auth-sensitive flows use service-level checks.
- This avoids "policy drift" across multiple routes/actions.

### Cursor pagination direction
- Better scaling profile than offset pagination for active feeds.
- Less jitter in high-write timelines.

### Rate limiting as core, not optional
- Auth, post creation, and report flows already use limits.
- Recent upgrade added Redis-ready behavior with a memory fallback.
- Reason: anti-abuse cannot depend on a single process memory map.

## 5. Bugs we hit and what they taught

### Bug: Prisma schema/client mismatch ("Unknown field reactions")
- Symptom: runtime crashes on queries with `include.reactions`.
- Root cause: schema changed but generated client was stale.
- Fix:
  - regenerate Prisma client in dev flow
  - add temporary fallback behavior in queries
- Lesson: schema migration and client generation are one atomic unit in practice.

### Bug: undefined counts causing `toLocaleString` crashes
- Symptom: feed/detail UI crashes on undefined counter values.
- Root cause: defensive defaults missing in presenter/UI.
- Fix: nullable-safe formatting and optional chaining.
- Lesson: UI should treat counters as untrusted data at render boundaries.

### Bug: client-side Prisma enum runtime usage
- Symptom: `PostReactionType` runtime reference error in client component.
- Root cause: server-only enum expectations leaked into client bundle.
- Fix: switch to string-literal types on client boundaries.
- Lesson: shared types are not always shared runtime objects.

### Bug: password reset route duplicate variable issue
- Symptom: reset confirm route instability.
- Fix: route cleanup + regression checks.
- Lesson: auth flows deserve small, explicit handlers and repeated tests.

## 6. What changed recently (Cycle 21 foundation)

The latest infrastructure pass added:
- runtime env validation utility
- structured JSON logger
- request context helpers (`x-request-id`, client IP extraction)
- optional Sentry transport utility
- Redis-capable rate limiting with memory fallback
- security headers + CORS + request-id middleware
- health endpoint (`/api/health`)

This is important because it turns the app from "works locally" into
"has the minimum observable shape of a production service."

## 7. Pitfalls to avoid next

### Pitfall 1: shipping growth features before safety rails
Do not prioritize rich editor, dark mode, or visual polish over abuse controls.
Without trust controls, growth features increase moderation pain.

### Pitfall 2: adding many post types too early
Too many categories fragment early community energy.
Keep type taxonomy tight and use tags for soft variation.

### Pitfall 3: assuming "tests passed" means "production-ready"
You still need:
- failure-mode drills
- backup/restore rehearsal
- real telemetry thresholds
- runbooks that humans can execute under stress

### Pitfall 4: implementing view counts naively
Blind increment on every fetch gets gamed quickly.
Use dedupe keys with TTL (session/IP/device strategy).

## 8. How good engineers should approach this codebase

Use this order for new features:
1. Prisma/schema intent
2. Zod validation contract
3. Service rule
4. Route/action glue
5. UI
6. Tests
7. Docs update

This order prevents most rework loops.
If you invert it (UI first, policy later), bugs and edge cases multiply.

## 9. Practical best practices for TownPet

- Keep policy checks in services, not components.
- Validate all external input at boundaries.
- Avoid leaking PII into logs and error payloads.
- Prefer explicit `select/include` in queries.
- Add tests for abuse and moderation behavior, not just happy paths.
- Treat docs as operational assets, not write-only artifacts.

## 10. What "done" should mean for each cycle

Not just "feature appears in UI."
A cycle is done when:
- it passes lint/type/tests
- it has at least one failure-path test
- it has monitoring hooks
- it has rollback notes
- it is reflected in `PLAN.md`

If one of those is missing, it is work-in-progress.

## 11. Final note

TownPet already moved beyond a simple personal prototype.
The next leap is operational discipline: observability, safety, and repeatable release quality.
If those are kept ahead of feature rush, this can become a real community product.
