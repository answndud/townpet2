# TownPet

Local-first pet community prototype. This repo contains the app scaffold, Prisma
schema, and product docs for TownPet.

## Stack
- Next.js (App Router)
- TypeScript
- Prisma + PostgreSQL
- Tailwind CSS

## Getting started
1) Install deps

```
pnpm install
```

2) Start local DB

```
docker compose up -d
```

3) Configure env

```
cp app/.env.local app/.env
```

4) Migrate + seed

```
cd app
pnpm db:migrate
pnpm db:seed
```

5) Run dev server

```
pnpm dev
```

## Scripts
- `pnpm dev` - start dev server
- `pnpm build` - build app
- `pnpm start` - start production server
- `pnpm lint` - run eslint
- `pnpm test` - run vitest
- `pnpm db:migrate` - prisma migrate dev
- `pnpm db:push` - prisma db push
- `pnpm db:studio` - prisma studio
- `pnpm db:seed` - seed local DB

## Structure
- `app/` - Next.js app
- `docs/` - product and policy docs
- `docker-compose.yml` - local Postgres

## Notes
- This repo is a blueprint and iterates quickly; see `docs/plan/phase_01.md`.
