# Region Alignment & Connection Path Checklist

Goal: reduce tail latency (p95) by aligning Vercel and DB regions and verifying the runtime DB path.

## 1) Vercel runtime region
- Check Vercel project settings: Runtime Region (Production).
- Capture the region code reported in response headers:
  - `curl -I https://townpet2.vercel.app/feed`
  - Look for `x-vercel-id` or `x-vercel-cache` region suffix.

## 2) Database region and network path
- Identify DB provider and region (Neon/Supabase/RDS/etc.).
- Ensure DB region matches Vercel runtime region.
- If mismatch exists, document expected latency impact and options:
  - move DB region
  - move Vercel region
  - add read replicas (if supported)

## 3) Connection pooling strategy
- Confirm whether Prisma Accelerate or pooler is enabled.
- If not enabled, evaluate:
  - Prisma Accelerate (edge aware)
  - Provider pooler (pgBouncer) for serverless
- Record current connection URL(s):
  - `DATABASE_URL`
  - `DIRECT_URL` (for migrations)

## 4) Cache headers sanity check
- Verify guest `/feed` response:
  - `cache-control: public, s-maxage=60, stale-while-revalidate=300`
  - `vary: Cookie` exists to prevent auth leakage

## 5) Evidence to collect
- Vercel region setting screenshot or value.
- DB provider region setting.
- `curl -I` headers for `/feed` and `/api/posts?scope=GLOBAL`.
- Prisma pooling status (enabled/disabled).

## 6) Decision points
- If regions are mismatched, prioritize alignment before further code tuning.
- If regions are aligned but p95 remains high, proceed with:
  - Playwright round-trip measurements
  - query plan inspection for ranked search
