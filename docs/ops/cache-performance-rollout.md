# Cache Performance Rollout (Feed/Search)

## 목적
피드/검색 응답 속도가 느린 문제를 해결하기 위해 Redis(Upstash) + CDN 캐시를 적용했고, 적용 이유/범위/데이터(측정값)를 함께 기록한다.

## 적용 배경 (데이터 기반)
운영 기준 측정값(2026-02-24, PROGRESS 로그)에서 SSR/API TTFB가 대략 0.59~0.67s 수준으로 확인됨.
- feed TTFB p50 586.7ms, p95 654.8ms
- post TTFB p50 588.8ms, p95 669.9ms
- /api/posts TTFB p50 591.0ms, p95 660.8ms
- 첫 호출 cold-ish 케이스: /api/posts TTFB 2.13s 1회 기록

출처: `PROGRESS.md` 2026-02-24 측정 로그.

## 왜 Redis + CDN 캐시를 선택했나
1) **반복 조회가 많음**: 비로그인 GLOBAL 피드/검색/자동완성은 동일 질의 재요청 빈도가 높다.
2) **서버리스 환경**: cold start + Prisma 초기 연결 비용이 반복 호출에서 체감된다.
3) **정합성 리스크**: 사용자별(Local/개인화/차단) 데이터는 캐시 오염 위험이 높으므로, 공용 경로부터 시작하는 것이 안전하다.

즉, **공용 읽기 경로는 캐시로 줄이고** 사용자별 경로는 단계적으로 확장하는 전략이 가장 안전하고 효과적이다.

## 적용 범위
### Redis (Query Cache)
공용/로그인/로컬까지 확장하되, **키를 사용자/동네/차단 목록까지 분리**해 정합성을 보장한다.
- 피드: `listPosts` (cursor 없음, page=1)
- 베스트: `listBestPosts`
- 검색: `listRankedSearchPosts`
- 자동완성: `listPostSearchSuggestions`
- 인기검색어: `getPopularSearchTerms`

캐시 TTL
- 피드/베스트: 30s
- 검색: 45s
- 자동완성: 60s
- 인기검색어: 300s

### CDN Cache Headers
API 응답에 `Cache-Control` 헤더를 추가해 Vercel CDN 캐시를 활용한다.
- `/api/posts`: `s-maxage=30`, `stale-while-revalidate=300`
- `/api/posts/suggestions`: `s-maxage=60`, `stale-while-revalidate=600`

## 캐시 정합성 전략
키 삭제 대신 **버전 키 증가**를 사용한다.
- 버전 키: `cache:version:{bucket}`
- 캐시 키는 `{bucket}` 버전을 포함
  - 예: `cache:feed:v{version}:{params}`

버전 증가 이벤트
- 게시글 작성/수정/삭제: feed/search/suggest
- 댓글 작성/삭제: feed
- 게시글 반응: feed
- 신고 자동 숨김/해제/일괄 처리: feed/search/suggest
- 검색어 로그 기록: popular

이 방식은 prefix delete/scan 대비 안정적이며, 즉시 무효화를 보장한다.

## 구현 변경점 (핵심 파일)
- 캐시 모듈: `app/src/server/cache/query-cache.ts`
- 피드/검색 쿼리: `app/src/server/queries/post.queries.ts`
- 인기 검색어: `app/src/server/queries/search.queries.ts`
- 캐시 무효화: `app/src/server/services/post.service.ts`, `app/src/server/services/comment.service.ts`
- CDN 헤더: `app/src/app/api/posts/route.ts`, `app/src/app/api/posts/suggestions/route.ts`
- 플래그: `app/src/lib/env.ts` (`QUERY_CACHE_ENABLED`, default true)

## 측정 계획 (배포 후 갱신 필요)
### 목표 지표
- feed TTFB p50 20%+ 개선
- /api/posts TTFB p50 20%+ 개선
- cold-ish tail 완화(2s+ 빈도 감소)

### 측정 방법
1) curl 15회 반복
- `time_starttransfer` / `time_total` 수집
- 대상: `/feed`, `/api/posts?scope=GLOBAL`, `/search?q=...`

2) Playwright 라운드트립
- feed -> post -> back 15회 반복

결과는 이 문서의 "측정 결과" 섹션에 업데이트한다.

## 측정 결과 (추가 예정)
### 2026-02-26 (curl 15회, 배포 전 baseline)
- 대상 URL
  - https://townpet2.vercel.app/feed
  - https://townpet2.vercel.app/api/posts?scope=GLOBAL
  - https://townpet2.vercel.app/search?q=%EC%82%B0%EC%B1%85%EC%BD%94%EC%8A%A4
- 결과(ms)
  - feed: TTFB p50 569.1, p95 1379.9 / total p50 683.9, p95 1767.9
  - api_posts: TTFB p50 514.0, p95 1035.2 / total p50 514.5, p95 1037.9
  - search: TTFB p50 502.1, p95 661.9 / total p50 534.1, p95 684.7

### 2026-02-26 (curl 15회, 캐시 배포 후)
- 대상 URL
  - https://townpet2.vercel.app/feed
  - https://townpet2.vercel.app/api/posts?scope=GLOBAL
  - https://townpet2.vercel.app/search?q=%EC%82%B0%EC%B1%85%EC%BD%94%EC%8A%A4
- 결과(ms)
  - feed: TTFB p50 523.3, p95 578.1 / total p50 675.3, p95 724.7
  - api_posts: TTFB p50 535.4, p95 672.1 / total p50 536.1, p95 674.2
  - search: TTFB p50 484.3, p95 710.0 / total p50 499.5, p95 716.5

### 전회 대비 변화(2026-02-24 baseline)
- feed TTFB p50: 586.7ms -> 523.3ms (약 -10.8%)
- api_posts TTFB p50: 591.0ms -> 535.4ms (약 -9.4%)
- search TTFB p50: (baseline 없음) -> 484.3ms

### 배포 전 대비 변화(2026-02-26 baseline)
- feed TTFB p50: 569.1ms -> 523.3ms (약 -8.1%)
- api_posts TTFB p50: 514.0ms -> 535.4ms (약 +4.2%)
- search TTFB p50: 502.1ms -> 484.3ms (약 -3.5%)

## 운영 주의사항
- 캐시는 사용자/동네/차단 목록을 키에 포함해 Local/로그인 경로도 안전하게 분리한다.
- Upstash 미설정 시 메모리 캐시로 fallback한다. (멀티 인스턴스에서는 효율이 떨어질 수 있음)
- 필요 시 `QUERY_CACHE_ENABLED=0`으로 즉시 비활성화 가능.
