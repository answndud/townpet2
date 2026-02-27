# PROGRESS.md

기준일: 2026-02-26

## 진행 현황 요약
- Cycle 1~20: 완료
- Cycle 21~24: 핵심 구현 + 100+ 스크롤 성능 검증까지 완료
- Cycle 25: 검색 대표 케이스 수동 판정 + 검색 로그 저장 구조 전환 완료
- Cycle 26: 알림 UX + 댓글 정렬/접기/반응 고도화 완료
- Cycle 27: 신규 계정 제한 + 연락처/금칙어 정책 + 단계적 제재 완료
- Cycle 28: OG/JSON-LD/사이트맵/공유 기능 완료
- Cycle 29: 공개 프로필 + 반려동물 CRUD + 글쓰기 미리보기/임시저장 완료
- Cycle 30: 품질게이트 + 런북/SLO 문서화 완료
- Cycle 31: 알림 센터 커서/필터/E2E + 공개 프로필 활동 탭 커서 페이지네이션 완료
- Cycle 32: 검색 로그 구형 fallback 제거 + 전환 가이드 문서화 완료
- Cycle 33: 신규 계정 안전 정책 관리자 설정화 + DB/UI E2E 플로우 완료
- Cycle 22 잔여: 업로드 재시도 UX + 업로드 E2E + 느린 네트워크 skeleton 확인까지 완료

## 실행 로그
### 2026-02-27: stats 캐시 TTL 상향
- 완료 내용
- stats API에 cache-control을 적용하고 query cache TTL을 60초로 상향.
- 변경 파일(핵심)
- `app/src/app/api/posts/[id]/stats/route.ts`
- `app/src/server/queries/post.queries.ts`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: 상세 stats 분리
- 완료 내용
- 상세 응답에서 카운트 필드를 제거하고 별도 stats API로 로드.
- 변경 파일(핵심)
- `app/src/app/api/posts/[id]/detail/route.ts`
- `app/src/app/api/posts/[id]/stats/route.ts`
- `app/src/components/posts/post-detail-client.tsx`
- `app/src/server/queries/post.queries.ts`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: 게스트 상세 reactions 타입 보정
- 완료 내용
- 게스트 상세에서 reactions 참조 제거로 빌드 오류 해소.
- 변경 파일(핵심)
- `app/src/app/posts/[id]/guest/page.tsx`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: 상세 reactions 분리
- 완료 내용
- 상세 조회에서 reactions를 제거하고 별도 API로 현재 반응을 로드.
- 변경 파일(핵심)
- `app/src/server/queries/post.queries.ts`
- `app/src/components/posts/post-detail-client.tsx`
- `app/src/components/posts/post-reaction-controls.tsx`
- `app/src/app/api/posts/[id]/reaction/route.ts`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: 상세 neighborhood payload 축소
- 완료 내용
- 상세 조회에서 neighborhood.district를 제거해 payload 크기를 축소.
- 변경 파일(핵심)
- `app/src/server/queries/post.queries.ts`
- `app/src/components/posts/post-detail-client.tsx`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: 댓글 lazy-load
- 완료 내용
- 댓글 섹션이 보일 때만 API를 호출하도록 지연 로딩 적용.
- 변경 파일(핵심)
- `app/src/components/posts/post-comment-section-client.tsx`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: 상세 author 이미지 제거
- 완료 내용
- 상세 조회에서 author.image를 제거해 payload 크기를 축소.
- 변경 파일(핵심)
- `app/src/server/queries/post.queries.ts`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: 상세 이미지 정렬 클라이언트 이관
- 완료 내용
- 상세 조회에서 image orderBy를 제거하고 클라이언트에서 정렬하도록 변경.
- 변경 파일(핵심)
- `app/src/server/queries/post.queries.ts`
- `app/src/components/posts/post-detail-client.tsx`
- `app/src/app/posts/[id]/guest/page.tsx`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: 상세 이미지 payload 축소
- 완료 내용
- 상세 응답 이미지에서 id를 제거해 payload 크기를 축소.
- 변경 파일(핵심)
- `app/src/server/queries/post.queries.ts`
- `app/src/components/posts/post-detail-client.tsx`
- `app/src/app/posts/[id]/guest/page.tsx`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: 상세 타입 정합
- 완료 내용
- 상세 조회 결과 타입에 hospital/place/walk 필드를 포함하도록 타입을 보강해 빌드 오류를 해소.
- 변경 파일(핵심)
- `app/src/server/queries/post.queries.ts`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: 상세 payload 관계 축소
- 완료 내용
- 상세 조회에서 hospital/place/walk 관계를 타입별로 선택 로드하도록 변경해 불필요한 조인 비용을 제거.
- 변경 파일(핵심)
- `app/src/server/queries/post.queries.ts`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: API 캐시 헤더 강제화
- 완료 내용
- Next config headers로 `/api/posts` 및 `/api/posts/:id/detail` 캐시 헤더 강제 적용.
- 변경 파일(핵심)
- `app/next.config.ts`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: 상세 진입 프리페치(로그인)
- 완료 내용
- 로그인 사용자 피드 상단 2개 상세 페이지를 사전 prefetch해 진입 지연을 완화.
- 변경 파일(핵심)
- `app/src/components/posts/feed-infinite-list.tsx`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: API Cache-Control 헤더 보강
- 완료 내용
- jsonOk 응답에서 전달된 헤더를 명시 적용해 cache-control 누락을 방지.
- 변경 파일(핵심)
- `app/src/server/response.ts`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: 상세 API 마크다운 선계산 + 캐시 헤더
- 완료 내용
- 상세 API에서 markdown HTML/텍스트를 선계산해 클라이언트 렌더 비용을 절감.
- 비로그인 상세 API 응답에 캐시 헤더 적용.
- 변경 파일(핵심)
- `app/src/app/api/posts/[id]/detail/route.ts`
- `app/src/components/posts/post-detail-client.tsx`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: 상세 클라이언트 훅 오류 수정
- 완료 내용
- PostDetailClient에서 조건부 hook(useMemo) 제거.
- 변경 파일(핵심)
- `app/src/components/posts/post-detail-client.tsx`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: 상세 API 실패 시 guest fallback
- 완료 내용
- 상세 API가 401/403/404이면 guest 상세로 자동 이동.
- 변경 파일(핵심)
- `app/src/components/posts/post-detail-client.tsx`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: 게스트 판별 쿠키 보강
- 완료 내용
- 미들웨어에서 NextAuth 쿠키명까지 게스트 판별에 포함.
- 변경 파일(핵심)
- `app/middleware.ts`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: 게스트 상세 리다이렉트
- 완료 내용
- /posts/[id]는 비로그인 시 /posts/[id]/guest로 리다이렉트.
- 상세 API 실패 시 게스트 페이지로 이동 옵션 제공.
- 변경 파일(핵심)
- `app/src/app/posts/[id]/page.tsx`
- `app/src/components/posts/post-detail-client.tsx`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: 상세 API 로딩 안정화
- 완료 내용
- 상세 API 로딩 실패 시 재시도/비JSON 응답 처리.
- 403 보안 챌린지 메시지 개선.
- 변경 파일(핵심)
- `app/src/components/posts/post-detail-client.tsx`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: neighborhood sync 안정화
- 완료 내용
- 시드가 이미 존재하면 스킵.
- chunk insert 재시도/백오프 추가.
- 변경 파일(핵심)
- `app/scripts/sync-neighborhoods.ts`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: 상세 페이지 API 전환
- 완료 내용
- 상세 페이지 본문을 API/클라이언트 로딩으로 전환해 SSR 병목 제거.
- 변경 파일(핵심)
- `app/src/app/api/posts/[id]/detail/route.ts`
- `app/src/components/posts/post-detail-client.tsx`
- `app/src/app/posts/[id]/page.tsx`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: 게스트 상세 프리페치
- 완료 내용
- 게스트 피드 상위 3개 상세 페이지를 프리페치해 최초 클릭 지연 완화.
- 변경 파일(핵심)
- `app/src/components/posts/feed-infinite-list.tsx`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: guest 상세 캐시 헤더 강제 설정
- 완료 내용
- Next config headers에서 /posts/:id/guest 캐시 헤더 강제.
- 변경 파일(핵심)
- `app/next.config.ts`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: guest 상세 캐시 강제화
- 완료 내용
- guest 상세 페이지에 `fetchCache = "force-cache"` 적용.
- 변경 파일(핵심)
- `app/src/app/posts/[id]/guest/page.tsx`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: guest 상세 캐시 헤더 강화
- 완료 내용
- guest 상세 페이지에서 CDN 캐시 헤더 강제 적용.
- guest 댓글 API 캐시 TTL 상향(30s -> 60s).
- guest 상세 링크 prefetch 활성화.
- 변경 파일(핵심)
- `app/middleware.ts`
- `app/src/app/api/posts/[id]/comments/route.ts`
- `app/src/components/posts/feed-infinite-list.tsx`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: 게스트 상세 경로 전환
- 완료 내용
- 게스트는 feed/search에서 `/posts/[id]/guest`로 이동하도록 변경.
- 변경 파일(핵심)
- `app/src/components/posts/feed-infinite-list.tsx`
- `app/src/app/feed/page.tsx`
- `app/src/app/search/page.tsx`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: guest 상세 페이지 정적 분리
- 완료 내용
- 비로그인 상세 요청은 정적 guest 페이지로 rewrite.
- 댓글은 API 로딩, 조회수는 클라이언트 트래킹으로 처리.
- 변경 파일(핵심)
- `app/middleware.ts`
- `app/src/app/posts/[id]/guest/page.tsx`
- `app/src/app/api/posts/[id]/view/route.ts`
- `app/src/components/posts/post-view-tracker.tsx`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: 상세 댓글 클라이언트 로딩 전환
- 완료 내용
- 상세 페이지 댓글을 클라이언트에서 API로 로딩하도록 변경해 SSR 경로 경량화.
- 변경 파일(핵심)
- `app/src/app/posts/[id]/page.tsx`
- `app/src/app/api/posts/[id]/comments/route.ts`
- `app/src/components/posts/post-comment-section-client.tsx`
- `app/src/components/posts/post-comment-thread.tsx`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: guest 상세/댓글 쿼리 경량화
- 완료 내용
- guest 상세/댓글에서 reactions 조인 제거.
- 변경 파일(핵심)
- `app/src/server/queries/post.queries.ts`
- `app/src/server/queries/comment.queries.ts`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: 게시글 상세 날짜 파싱 오류 수정
- 완료 내용
- 상세/댓글의 createdAt이 문자열이어도 안전하게 파싱하도록 보정.
- 변경 파일(핵심)
- `app/src/app/posts/[id]/page.tsx`
- `app/src/components/posts/post-comment-thread.tsx`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: 상세 관계 조회 오류 fallback
- 완료 내용
- 사용자 관계 조회 실패 시 기본 상태로 fallback.
- 변경 파일(핵심)
- `app/src/app/posts/[id]/page.tsx`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: 상세 페이지 guest 캐시 헤더/오류 방지
- 완료 내용
- 게스트 /posts/[id]와 /api/posts에 CDN 캐시 헤더 부여.
- 게시글 로딩 실패 시 상세 페이지 오류 대신 안내 메시지 표시.
- 변경 파일(핵심)
- `app/middleware.ts`
- `app/src/app/posts/[id]/page.tsx`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: 상세 페이지 오류 완화
- 완료 내용
- 댓글 로딩 오류는 상세 페이지 전체 오류로 확산되지 않도록 fallback 처리.
- 사용자/게스트 정책 조회에 DB 초기화 오류 fallback 추가.
- 변경 파일(핵심)
- `app/src/app/posts/[id]/page.tsx`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-27: 게시글 상세 댓글 스트리밍 분리
- 완료 내용
- 상세 페이지 댓글 로딩을 Suspense로 분리해 초기 렌더를 빠르게 표시.
- 변경 파일(핵심)
- `app/src/app/posts/[id]/page.tsx`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-26: 게시글 상세 guest 캐시 적용
- 완료 내용
- 게시글 상세/메타/댓글을 guest 경로에서 캐시(30s)로 전환.
- 댓글/게시글/신고 변경 시 detail/comments 캐시 버전 갱신.
- 변경 파일(핵심)
- `app/src/server/queries/post.queries.ts`
- `app/src/server/queries/comment.queries.ts`
- `app/src/server/cache/query-cache.ts`
- `app/src/server/services/post.service.ts`
- `app/src/server/services/comment.service.ts`
- `app/src/server/services/report.service.ts`
- `app/src/app/posts/[id]/page.tsx`
- `docs/ops/cache-performance-rollout.md`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-26: Playwright feed scroll 성능 체크
- 완료 내용
- `e2e/feed-scroll-performance.spec.ts` 실행, PASS.
- 보고서 생성: `docs/plan/feed-scroll-performance-report.md`
- 변경 파일(핵심)
- `docs/plan/feed-scroll-performance-report.md`
- `docs/ops/cache-performance-rollout.md`
- 검증 결과
- Playwright 단일 테스트 PASS.
- 이슈/블로커
- 없음.

### 2026-02-26: 리전 정합/연결 경로 점검 체크리스트 작성
- 완료 내용
- Vercel/DB 리전 정합 및 DB 연결 경로 점검 체크리스트 문서화.
- 변경 파일(핵심)
- `docs/ops/region-latency-checklist.md`
- 검증 결과
- 문서 작성만 수행.
- 이슈/블로커
- 없음.

### 2026-02-26: guest /feed CDN 캐시 배포 후 재측정
- 완료 내용
- `/feed`, `/api/posts?scope=GLOBAL`, `/search?q=산책코스` curl 30회 재측정.
- feed TTFB p50 472.1ms, p95 584.7ms.
- api_posts TTFB p50 238.6ms, p95 289.3ms.
- search TTFB p50 459.9ms, p95 594.0ms.
- 결과 상세는 `docs/ops/cache-performance-rollout.md`에 업데이트.
- 변경 파일(핵심)
- `docs/ops/cache-performance-rollout.md`
- 검증 결과
- 배포 측정만 수행 (테스트 미실행).
- 이슈/블로커
- 없음.

### 2026-02-26: 비로그인 피드 CDN 캐시 적용
- 완료 내용
- 미들웨어에서 비로그인 `/feed`에 CDN 캐시 헤더 추가(LOCAL/개인화 제외).
- 변경 파일(핵심)
- `app/middleware.ts`
- `docs/ops/cache-performance-rollout.md`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-26: read rate-limit/guest SSR 캐시 배포 후 재측정
- 완료 내용
- `/feed`, `/api/posts?scope=GLOBAL`, `/search?q=산책코스` curl 30회 재측정.
- feed TTFB p50 451.1ms, p95 707.6ms.
- api_posts TTFB p50 237.9ms, p95 360.7ms.
- search TTFB p50 447.4ms, p95 581.6ms.
- 결과 상세는 `docs/ops/cache-performance-rollout.md`에 업데이트.
- 변경 파일(핵심)
- `docs/ops/cache-performance-rollout.md`
- 검증 결과
- 배포 측정만 수행 (테스트 미실행).
- 이슈/블로커
- 없음.

### 2026-02-26: 꼬리 지연 완화 2차 개선
- 완료 내용
- 비로그인 feed/search 컨텍스트 `unstable_cache` 적용.
- read rate-limit에 1초 캐시(`cacheMs`) 추가.
- 검색 후보군 상한을 쿼리 길이에 따라 축소.
- 변경 파일(핵심)
- `app/src/app/feed/page.tsx`
- `app/src/app/search/page.tsx`
- `app/src/server/rate-limit.ts`
- `app/src/server/queries/post.queries.ts`
- `app/src/app/api/posts/route.ts`
- `app/src/app/api/posts/suggestions/route.ts`
- `docs/ops/cache-performance-rollout.md`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-26: 꼬리 지연 완화 배포 후 재측정
- 완료 내용
- `/feed`, `/api/posts?scope=GLOBAL`, `/search?q=산책코스` curl 30회 재측정.
- feed TTFB p50 525.5ms, p95 749.0ms.
- api_posts TTFB p50 284.8ms, p95 363.5ms.
- search TTFB p50 496.5ms, p95 619.2ms.
- 결과 상세는 `docs/ops/cache-performance-rollout.md`에 업데이트.
- 변경 파일(핵심)
- `docs/ops/cache-performance-rollout.md`
- 검증 결과
- 배포 측정만 수행 (테스트 미실행).
- 이슈/블로커
- 없음.

### 2026-02-26: 꼬리 지연 완화 1차 개선
- 완료 내용
- feed/search SSR에서 독립 호출 병렬화.
- 커뮤니티 목록/게스트 읽기 정책 조회 캐시 적용.
- 검색 후보군 상한 축소(4x -> 3x, max 200 -> 120).
- 자동완성 요청의 클라이언트 `no-store` 제거.
- 변경 파일(핵심)
- `app/src/app/feed/page.tsx`
- `app/src/app/search/page.tsx`
- `app/src/server/queries/policy.queries.ts`
- `app/src/server/queries/community.queries.ts`
- `app/src/server/queries/post.queries.ts`
- `app/src/components/posts/feed-search-form.tsx`
- `docs/ops/cache-performance-rollout.md`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-26: 배포 통과 후 성능 재측정
- 완료 내용
- GitHub Actions/Vercel 배포 통과 후 `/feed`, `/api/posts?scope=GLOBAL`, `/search?q=산책코스` curl 15회 재측정.
- feed TTFB p50 549.0ms, api_posts TTFB p50 284.6ms, search TTFB p50 511.4ms 기록.
- 결과 상세는 `docs/ops/cache-performance-rollout.md`에 업데이트.
- 변경 파일(핵심)
- `docs/ops/cache-performance-rollout.md`
- 검증 결과
- 배포 측정만 수행 (테스트 미실행).
- 이슈/블로커
- 없음.

### 2026-02-26: 캐시 배포 후 성능 재측정
- 완료 내용
- Vercel 배포 후 `/feed`, `/api/posts?scope=GLOBAL`, `/search?q=산책코스` curl 15회 재측정.
- feed TTFB p50 523.3ms, api_posts TTFB p50 535.4ms, search TTFB p50 484.3ms 기록.
- 결과 상세는 `docs/ops/cache-performance-rollout.md`에 업데이트.
- 변경 파일(핵심)
- `docs/ops/cache-performance-rollout.md`
- 검증 결과
- 배포 측정만 수행 (테스트 미실행).
- 이슈/블로커
- 없음.

### 2026-02-26: 캐시 범위 확장 + 무효화 이벤트 보강
- 완료 내용
- 로그인/LOCAL 경로도 캐시 키 분리로 안전하게 캐싱하도록 확장.
- 게시글 수정/삭제, 댓글 삭제, 신고 숨김/해제 시 캐시 버전 갱신 추가.
- 문서(`docs/ops/cache-performance-rollout.md`)에 범위/무효화 업데이트 반영.
- 변경 파일(핵심)
- `app/src/server/queries/post.queries.ts`
- `app/src/server/services/post.service.ts`
- `app/src/server/services/comment.service.ts`
- `app/src/server/services/report.service.ts`
- `docs/ops/cache-performance-rollout.md`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-26: 피드/검색 공용 캐시 레이어 적용
- 완료 내용
- 비로그인 GLOBAL 피드/베스트/검색/자동완성/인기검색어에 TTL 캐시 적용.
- `Cache-Control`(`s-maxage`/`stale-while-revalidate`) 헤더로 CDN 캐시 유도.
- 게시글/댓글/반응/검색 로그 갱신 시 캐시 버전 증가로 무효화.
- 변경 파일(핵심)
- `app/src/server/cache/query-cache.ts`
- `app/src/server/queries/post.queries.ts`
- `app/src/server/queries/search.queries.ts`
- `app/src/server/services/post.service.ts`
- `app/src/server/services/comment.service.ts`
- `app/src/app/api/posts/route.ts`
- `app/src/app/api/posts/suggestions/route.ts`
- `app/src/lib/env.ts`
- `PLAN.md`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-26: Cycle 68 코드 점검 후속조치 적용
- 완료 내용
- 게시글 상세 공개 조회에 `ACTIVE` 상태 강제 + LOCAL 동네 검증 추가.
- 공용 목록/공통 게시판에서 `HIDDEN` 제외.
- 비회원 댓글/게시글 수정·삭제에 다중 윈도우 rate limit 추가.
- 업로드 파일 시그니처(magic bytes) 검증 추가.
- 공개 프로필 활동 탭에서 GLOBAL 범위만 노출하도록 필터 추가.
- guestAuthor 생성 서비스 이관 및 댓글 수정/삭제 라우트 dead 분기 제거.
- error/CSP 로그에서 IP 마스킹, CSP URL query/hash 제거.
- Prisma 내부 메타 의존 제거, non-null assertion 제거.
- FORcodex 경로 정합.
- 변경 파일(핵심)
- `app/src/app/api/posts/[id]/route.ts`
- `app/src/server/queries/post.queries.ts`
- `app/src/server/queries/community.queries.ts`
- `app/src/app/api/comments/[id]/route.ts`
- `app/src/server/upload.ts`
- `app/src/server/queries/user.queries.ts`
- `app/src/app/api/posts/[id]/comments/route.ts`
- `app/src/server/services/guest-author.service.ts`
- `app/src/server/error-monitor.ts`
- `app/src/app/api/security/csp-report/route.ts`
- `app/src/server/queries/report.queries.ts`
- `FORcodex.md`
- `PLAN.md`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-26: 코드 점검 후속조치 계획 수립
- 완료 내용
- 코드베이스 정적 점검 결과를 기반으로 접근제어/안전/정합 이슈를 Cycle 68로 분류해 작업 계획 수립.
- 변경 파일(핵심)
- `PLAN.md`
- 검증 결과
- 계획 수립 작업으로 코드 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-26: SPEC-Lite 신설 + AGENTS 참조 경량화
- 완료 내용
- `docs/SPEC.md`의 장문/구형 정보 의존을 줄이기 위해 일상 개발용 압축 문서 `docs/SPEC-Lite.md`를 신설.
- `AGENTS.md`의 우선 읽기 경로를 `docs/SPEC-Lite.md` 중심으로 갱신하고, `docs/SPEC.md`는 reference로 하향 조정.
- 변경 파일(핵심)
- `docs/SPEC-Lite.md`
- `AGENTS.md`
- `PLAN.md`
- `PROGRESS.md`
- 검증 결과
- 문서 작업으로 코드 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-26: AGENTS/PLAN 운영 규칙 압축 + PLAN 최신 정합 반영
- 완료 내용
- `AGENTS.md`의 PLAN/PROGRESS 운영 규칙을 짧은 실행 규칙 중심으로 정리.
- `PLAN.md` 기준일을 최신화하고, 완료된 사이클 제목에 `(완료)`를 일괄 반영해 미완료 사이클 우선 탐색이 가능하도록 정리.
- `PLAN.md` 내 `business/*` 의존 경로를 현재 구조인 `docs/business/*` 기준으로 주요 항목 정합화.
- 변경 파일(핵심)
- `AGENTS.md`
- `PLAN.md`
- `PROGRESS.md`
- 검증 결과
- 문서 정합 작업으로 코드 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 과거 실행 로그 본문에는 시점 기준으로 `business/*` 경로가 남아 있을 수 있음(히스토리 보존 목적).

### 2026-02-26: SEC-006 비회원 식별 해시 HMAC(pepper) 전환 + legacy 호환
- 완료 내용
- 비회원 식별 해시를 pepper 기반 HMAC-SHA256 우선 경로로 강화.
- 조회/매칭은 peppered hash와 legacy SHA-256 후보를 함께 고려하도록 확장해 기존 데이터와의 호환성을 유지.
- 적용 범위:
  - guest ban/violation 조회
  - 비회원 게시글/댓글 소유권 검증
- 신규 guest-safety 단위 테스트와 기존 guest management 회귀 테스트를 통과.
- 변경 파일(핵심)
- `app/src/server/services/guest-safety.service.ts`
- `app/src/server/services/guest-safety.service.test.ts`
- `app/src/server/services/post.service.ts`
- `app/src/server/services/comment.service.ts`
- `docs/security/SECURITY_PLAN.md`
- `docs/security/SECURITY_PROGRESS.md`
- `docs/security/SECURITY_RISK_REGISTER.md`
- `docs/security/SECURITY_DECISIONS.md`
- `PLAN.md`
- 검증 결과
- `cd app && pnpm lint "src/server/services/guest-safety.service.ts" "src/server/services/guest-safety.service.test.ts" "src/server/services/post.service.ts" "src/server/services/comment.service.ts"` 통과
- `cd app && pnpm test -- "src/server/services/guest-safety.service.test.ts" "src/server/services/guest-post-management.service.test.ts" "src/server/services/guest-comment-management.service.test.ts"` 통과 (3 files, 12 tests)
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- 운영 시크릿에 `GUEST_HASH_PEPPER` 미설정 시 legacy SHA-256 경로로만 동작하므로 배포 환경 시크릿 적용 필요.

### 2026-02-26: SEC-007 회원가입 중복 응답 enumeration 완화
- 완료 내용
- `/api/auth/register`에서 `EMAIL_TAKEN`/`NICKNAME_TAKEN`을 외부로 그대로 노출하지 않도록 공용 응답으로 정규화.
- 공개 응답 계약:
  - duplicate email / duplicate nickname -> `400 REGISTER_REJECTED`
  - message -> `회원가입 정보를 확인해 주세요.`
- 회귀 테스트 추가로 두 중복 케이스가 동일 계약을 반환함을 고정.
- 변경 파일(핵심)
- `app/src/app/api/auth/register/route.ts`
- `app/src/app/api/auth/register/route.test.ts`
- `docs/security/SECURITY_PLAN.md`
- `docs/security/SECURITY_PROGRESS.md`
- `docs/security/SECURITY_RISK_REGISTER.md`
- `docs/security/SECURITY_DECISIONS.md`
- `PLAN.md`
- 검증 결과
- `cd app && pnpm lint "src/app/api/auth/register/route.ts" "src/app/api/auth/register/route.test.ts"` 통과
- `cd app && pnpm test -- "src/app/api/auth/register/route.test.ts"` 통과 (1 file, 5 tests)
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- 프론트 UX에서 중복 원인을 세부 안내하지 않으므로, 필요 시 클라이언트 측 문구/가이드 개선 검토.

### 2026-02-26: SEC-003 비밀번호 정책 강화 + 유출 비밀번호 차단
- 완료 내용
- 비밀번호 검증 정책을 경계별로 분리:
  - 로그인(`loginSchema`): 기존 계정 호환을 위해 기본 포맷만 검증
  - 회원가입/비밀번호 설정/리셋: 강한 정책(10자+, 대/소문자/숫자/특수문자, 반복문자 차단, deny-list) 적용
- 로컬 deny-list 기반 취약 비밀번호 차단 규칙을 추가.
- 신규 validation 테스트와 회원가입 route 테스트를 새 정책에 맞게 보강/갱신.
- 변경 파일(핵심)
- `app/src/lib/validations/auth.ts`
- `app/src/lib/validations/auth.test.ts`
- `app/src/app/api/auth/register/route.test.ts`
- `docs/security/SECURITY_PLAN.md`
- `docs/security/SECURITY_PROGRESS.md`
- `docs/security/SECURITY_RISK_REGISTER.md`
- `docs/security/SECURITY_DECISIONS.md`
- `PLAN.md`
- 검증 결과
- `cd app && pnpm lint "src/lib/validations/auth.ts" "src/lib/validations/auth.test.ts" "src/app/api/auth/register/route.test.ts"` 통과
- `cd app && pnpm test -- "src/lib/validations/auth.test.ts" "src/app/api/auth/register/route.test.ts"` 통과 (2 files, 8 tests)
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- 외부 breach 데이터(HIBP) 연동은 아직 미적용이며, 현재는 로컬 deny-list 기반으로 운영.

### 2026-02-26: SEC-004 로그인 락아웃 에스컬레이션(account + IP)
- 완료 내용
- Credentials 로그인 경로를 단일 IP 제한에서 다중 윈도우 제한으로 강화.
- 적용 규칙:
  - `auth:login:ip:<ip>` 10회/1분
  - `auth:login:account-ip:<emailHash>:<ip>` 5회/15분
  - `auth:login:account:<emailHash>` 30회/24시간
- 이메일은 정규화(trim/lowercase) 후 SHA-256 해시 키로 변환해 rate-limit key에 직접 원문을 남기지 않도록 처리.
- 정책 생성 로직을 `auth-login-rate-limit` 모듈로 분리하고 단위 테스트를 추가.
- 변경 파일(핵심)
- `app/src/lib/auth.ts`
- `app/src/server/auth-login-rate-limit.ts`
- `app/src/server/auth-login-rate-limit.test.ts`
- `docs/security/SECURITY_PLAN.md`
- `docs/security/SECURITY_PROGRESS.md`
- `docs/security/SECURITY_RISK_REGISTER.md`
- `docs/security/SECURITY_DECISIONS.md`
- `PLAN.md`
- 검증 결과
- `cd app && pnpm lint "src/lib/auth.ts" "src/server/auth-login-rate-limit.ts" "src/server/auth-login-rate-limit.test.ts"` 통과
- `cd app && pnpm test -- "src/server/auth-login-rate-limit.test.ts"` 통과 (1 file, 2 tests)
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- 로그인 UX 관점에서 실제 사용자 오탐 차단률을 운영 로그로 관찰해 threshold 조정 필요.

### 2026-02-25: SEC-002 CSP 하드닝 1차(report-only strict + enforce flag)
- 완료 내용
- `middleware` 보안 헤더 로직을 단계형 CSP 전략으로 전환.
- production 기본 동작:
  - `content-security-policy`: 기존 완화 정책(호환성 유지)
  - `content-security-policy-report-only`: strict 정책 동시 송출
- 운영 플래그 추가:
  - `CSP_ENFORCE_STRICT=1` 설정 시 strict CSP를 enforce로 즉시 전환
- 정책 분기 함수(`resolveCspHeaders`)를 분리하고 계약 테스트 3개를 추가.
- 변경 파일(핵심)
- `app/middleware.ts`
- `app/src/middleware.test.ts`
- `docs/security/SECURITY_PLAN.md`
- `docs/security/SECURITY_PROGRESS.md`
- `docs/security/SECURITY_DECISIONS.md`
- 검증 결과
- `cd app && pnpm lint "middleware.ts" "src/middleware.test.ts"` 통과
- `cd app && pnpm test -- "src/middleware.test.ts"` 통과 (1 file, 3 tests)
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- strict CSP full enforce 전환 전, report-only 위반 로그 기반으로 nonce/hash 적용 대상 정리가 필요.

### 2026-02-25: SEC-005 신뢰 프록시 기준 client IP 파싱 강화
- 완료 내용
- `getClientIp`에서 단순 `x-forwarded-for` 첫 값 신뢰를 제거하고 trusted proxy hops 기반 파싱으로 전환.
- 운영 기본 정책:
  - production: `TRUSTED_PROXY_HOPS` 미설정 시 `1`을 기본 적용
  - development/test: `TRUSTED_PROXY_HOPS` 미설정 시 `0`
  - 필요 시 `TRUSTED_PROXY_HOPS`(0~5)로 명시 오버라이드 가능
- `x-forwarded-for`가 없거나 비정상인 경우 `x-real-ip`/`anonymous` fallback을 유지.
- 회귀 테스트 5개를 추가해 dev/prod/override 동작을 고정.
- 변경 파일(핵심)
- `app/src/server/request-context.ts`
- `app/src/server/request-context.test.ts`
- `docs/security/SECURITY_PLAN.md`
- `docs/security/SECURITY_PROGRESS.md`
- `docs/security/SECURITY_RISK_REGISTER.md`
- `docs/security/SECURITY_DECISIONS.md`
- `PLAN.md`
- 검증 결과
- `cd app && pnpm lint "src/server/request-context.ts" "src/server/request-context.test.ts"` 통과
- `cd app && pnpm test -- "src/server/request-context.test.ts"` 통과 (1 file, 5 tests)
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- 실제 배포 인프라 프록시 hop 수가 다르면 `TRUSTED_PROXY_HOPS` 값을 환경에 맞게 조정 필요.

### 2026-02-25: SEC-001 `/api/health` 공개 응답 민감정보 최소화
- 완료 내용
- `/api/health` 응답을 공개용/내부진단용으로 분리:
  - 공개 요청: `env.missing`, DB 오류 상세, rate-limit `detail` 비노출
  - 내부 요청: `HEALTH_INTERNAL_TOKEN` 일치 시 상세 진단 노출
- 내부 진단 토큰 전달 채널:
  - `x-health-token`
  - `Authorization: Bearer <token>`
- 회귀 방지 계약 테스트(`route.test.ts`)를 추가해 공개/내부 응답 차이를 고정.
- 변경 파일(핵심)
- `app/src/app/api/health/route.ts`
- `app/src/app/api/health/route.test.ts`
- `app/src/lib/env.ts`
- `docs/security/SECURITY_PLAN.md`
- `docs/security/SECURITY_PROGRESS.md`
- `docs/security/SECURITY_DECISIONS.md`
- `PLAN.md`
- 검증 결과
- `cd app && pnpm lint "src/app/api/health/route.ts" "src/app/api/health/route.test.ts" "src/lib/env.ts"` 통과
- `cd app && pnpm test -- "src/app/api/health/route.test.ts"` 통과 (1 file, 2 tests)
- 이슈/블로커
- 내부 모니터링에서 상세 진단이 필요하면 `HEALTH_INTERNAL_TOKEN`을 시크릿에 설정하고 헤더 전달 규칙을 점검해야 함.

### 2026-02-25: 보안 후속조치 트랙 분리 운영 시작
- 완료 내용
- 보안 관련 후속 작업을 일반 기능 진행과 분리하기 위해 전용 추적 파일 4종을 신규 생성.
- 생성 파일:
  - `docs/security/SECURITY_PLAN.md`
  - `docs/security/SECURITY_PROGRESS.md`
  - `docs/security/SECURITY_RISK_REGISTER.md`
  - `docs/security/SECURITY_DECISIONS.md`
- `AGENTS.md`에 보안 트랙 운영 규칙을 반영: 보안 상세는 `docs/security/*`에서 관리하고, 루트 `PLAN/PROGRESS`에는 링크/요약 상태를 동기화하도록 고정.
- `PLAN.md`에 Cycle 67(보안 하드닝 트랙 운영)을 추가해 단일 활성 작업으로 추적 시작.
- 검증 결과
- 문서/운영 규칙 업데이트 작업으로 코드/테스트 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-25: Resend 도메인 인증 + Vercel 연동 운영 가이드 작성
- 완료 내용
- 사용자 요청에 따라 도메인 미보유 상태를 전제로 `도메인 구매 -> DNS 제어 확인 -> Resend 도메인 인증(SPF/DKIM/MX) -> API Key 발급 -> Vercel env 반영 -> 회원가입 인증 실검증` 순서 가이드를 작성.
- Resend 과금 체계(Free/Pro/Scale/Enterprise), 초과 단가, Dedicated IP add-on 요약과 운영 보안/점검 체크리스트를 포함.
- TownPet 코드 기준 필수 환경값(`RESEND_API_KEY`, `APP_BASE_URL`) 및 실패 시 증상/원인/조치 표를 정리.
- 후속으로 DNS 공급자별 입력 가이드(Cloudflare/Route53/가비아), 입력 워크시트, `nslookup` 검증 명령어 섹션을 추가해 "바로 입력 가능한 실행형 문서"로 확장.
- 변경 파일(핵심)
- `docs/ops/resend-vercel-email-setup-guide.md`
- `docs/ops/vercel-oauth-bootstrap-guide.md`
- `PLAN.md`
- 검증 결과
- 문서 작업으로 코드/테스트 실행 없음.
- 이슈/블로커
- Resend/Vercel 가격 및 정책은 수시 변경 가능하므로 배포 직전 공식 페이지 재확인 필요.

### 2026-02-25: DB 용량 예측/초과 대응/과금 비교 문서화
- 완료 내용
- 사용자 요청에 맞춰 Neon 5GB 한도 리스크를 TownPet 데이터 모델 기준으로 시나리오(A~D)별로 수치 예측해 문서화.
- Free/유료(usage-based) 구간에서 "초과"가 의미하는 운영 영향(쓰기 실패 vs 비용 증가)을 구분해 정리.
- 5GB 근접/초과 시 즉시 대응(24h) + 구조 조치(72h) + 월간 반복 기준(60/75/85%) 런북을 추가.
- 경쟁 플랫폼 과금 정책 비교표(Neon/Supabase/Railway/Render)와 참고 링크를 포함.
- 변경 파일(핵심)
- `docs/ops/db-capacity-pricing-playbook.md`
- `docs/ops/vercel-oauth-bootstrap-guide.md`
- `docs/GUIDE.md`
- `PLAN.md`
- 검증 결과
- 문서 작업으로 코드/테스트 실행 없음.
- 이슈/블로커
- 가격/정책은 공급사 업데이트에 따라 변경 가능하므로 월 1회 링크 재검증 필요.

### 2026-02-25: 반려동물 프로필 개편(종류 확장 + 입력필드 재정의 + 이미지 업로드)
- 완료 내용
- 반려동물 종류를 커뮤니티 카테고리 기준으로 확장: `강아지/고양이/조류/파충류/소동물/어류·수조/양서류/절지류·곤충/특수동물·기타` 선택 가능.
- Pet 스키마를 확장해 `weightKg`, `birthYear` 컬럼을 추가하고, `PetSpecies` enum에 신규 종류 값을 추가하는 마이그레이션을 반영.
- 반려동물 입력 계약을 개편: `breedCode/sizeClass/lifeStage/age` 입력 경로를 제거하고 `weightKg/birthYear` 중심으로 저장.
- 반려동물 프로필 UI에서 이미지 URL 입력을 제거하고 `ImageUploadField`(업로드 기반, maxFiles=1)로 전환.
- 공개 프로필(`/users/[id]`)의 반려동물 표시도 새 포맷(종류/품종·세부종/몸무게/태어난 연도)으로 정렬.
- 변경 파일(핵심)
- `app/prisma/schema.prisma`
- `app/prisma/migrations/20260225195000_expand_pet_profile_species_and_fields/migration.sql`
- `app/src/lib/validations/pet.ts`
- `app/src/server/services/pet.service.ts`
- `app/src/server/services/pet.service.test.ts`
- `app/src/server/queries/user.queries.ts`
- `app/src/components/profile/pet-profile-manager.tsx`
- `app/src/app/users/[id]/page.tsx`
- 검증 결과
- `cd app && pnpm prisma generate` 통과
- `cd app && pnpm lint "src/components/profile/pet-profile-manager.tsx" "src/app/users/[id]/page.tsx" "src/server/services/pet.service.ts" "src/server/services/pet.service.test.ts" "src/server/queries/user.queries.ts" "src/lib/validations/pet.ts"` 통과
- `cd app && pnpm typecheck` 통과
- `cd app && pnpm test -- "src/server/services/pet.service.test.ts"` 통과 (1 file, 6 tests)

### 2026-02-25: Vercel 배포 실패(`P1002`) 대응 - migrate deploy 재시도 로직 추가
- 완료 내용
- 사용자 제공 로그(`P1002`, `prisma migrate deploy failed`) 기준으로, `build:vercel`의 마이그레이션 단계가 일시적 DB 연결/타임아웃 오류에도 즉시 실패하던 문제를 확인.
- `scripts/vercel-build.ts`에 transient 오류(`P1001/P1002`, timeout/connection reset 계열) 감지 + 재시도(최대 4회, 점증 대기) 로직을 추가.
- 기존 `P3005` baseline 자동 복구 흐름은 유지하면서, baseline 후에도 transient 오류가 나면 동일 재시도 정책을 적용하도록 통합.
- 변경 파일(핵심)
- `app/scripts/vercel-build.ts`
- `PLAN.md`
- 검증 결과
- `cd app && pnpm lint "scripts/vercel-build.ts"` 통과
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- 실제 Vercel 재배포 1회에서 `migrate deploy` 재시도 로그/성공 여부 확인 필요.

### 2026-02-25: Global-first 온보딩/동네 설정 전환 + 전국 동네 데이터 동기화
- 완료 내용
- 회원가입 계약을 확장해 닉네임을 필수 입력으로 전환하고, 서비스 레이어에서 닉네임/이메일 중복을 각각 `NICKNAME_TAKEN`, `EMAIL_TAKEN`으로 명시 매핑.
- 로그인 기본 콜백을 `/feed`로 조정하고, 게시글/검색 API의 기본 scope를 `GLOBAL`로 고정해 동네 미설정 계정도 즉시 온동네 읽기/쓰기 경로를 사용할 수 있도록 변경.
- 온보딩 UI를 `내 동네 선택` 흐름으로 변경: 대한민국 지역에서 최대 3개 선택 + 기준 동네 1개 지정, 나중에 설정하기 CTA 제공.
- 프로필 페이지의 동네 미설정 게이트를 제거하고, 프로필 내 동네 설정 폼(최대 3개 + 기준 1개)에서 직접 수정 가능하도록 확장.
- 전국 동네 옵션 비어있음 이슈 대응: 법정동 코드 기반 `korean-neighborhoods.json`(20,278건) 생성, `db:sync:neighborhoods` 스크립트 추가, `build:vercel`에서 자동 동기화 실행.
- 변경 파일(핵심)
- `app/src/lib/validations/auth.ts`
- `app/src/components/auth/register-form.tsx`
- `app/src/server/services/auth.service.ts`
- `app/src/lib/validations/user.ts`
- `app/src/server/services/user.service.ts`
- `app/src/components/onboarding/onboarding-form.tsx`
- `app/src/components/profile/neighborhood-preference-form.tsx`
- `app/src/app/profile/page.tsx`
- `app/src/app/posts/new/page.tsx`
- `app/src/app/api/posts/route.ts`
- `app/src/app/api/posts/suggestions/route.ts`
- `app/src/app/search/page.tsx`
- `app/scripts/data/korean-neighborhoods.json`
- `app/scripts/sync-neighborhoods.ts`
- `app/scripts/vercel-build.ts`
- `app/package.json`
- `PLAN.md`
- `PROGRESS.md`
- 검증 결과
- `cd app && pnpm lint "src/lib/validations/auth.ts" "src/components/auth/register-form.tsx" "src/server/services/auth.service.ts" "src/app/api/auth/register/route.test.ts" "src/components/auth/login-form.tsx" "src/lib/validations/user.ts" "src/lib/validations/user.test.ts" "src/server/services/user.service.ts" "src/server/actions/user.test.ts" "src/app/onboarding/page.tsx" "src/components/onboarding/onboarding-form.tsx" "src/components/profile/neighborhood-preference-form.tsx" "src/app/profile/page.tsx" "src/app/posts/new/page.tsx" "src/components/posts/post-create-form.tsx" "src/app/api/posts/route.ts" "src/app/api/posts/suggestions/route.ts" "src/app/search/page.tsx" "src/app/my-posts/page.tsx" "src/app/posts/[id]/edit/page.tsx" "e2e/social-onboarding-flow.spec.ts" "scripts/sync-neighborhoods.ts" "scripts/vercel-build.ts"` 통과
- `cd app && pnpm typecheck` 통과
- `cd app && pnpm test -- "src/lib/validations/user.test.ts" "src/app/api/auth/register/route.test.ts" "src/server/actions/user.test.ts" "src/app/api/posts/route.test.ts"` 통과 (4 files, 20 tests)
- `cd app && pnpm db:sync:neighborhoods` 통과 (`[sync-neighborhoods] processed 20278 rows`)
- 이슈/블로커
- 전국 동네 데이터(20k+)를 온보딩/프로필 클라이언트로 직렬화하므로 초기 렌더 payload 최적화(서버 검색 API 분리)는 후속 개선 과제로 남음.

### 2026-02-25: 후속 최적화 - 동네 검색 API 전환 + e2e 회귀 추가
- 완료 내용
- 온보딩/프로필 동네 선택 UI를 클라이언트 대량 직렬화 방식에서 서버 검색 API 방식으로 전환.
- `/api/neighborhoods` 추가: 시/도 목록, 시/군/구 목록, 동네 검색 결과를 필터(`city`, `district`, `q`, `limit`)로 제공.
- 온보딩/프로필 페이지에서 전체 동네 목록 preload를 제거하고, 기존 선택 동네(최대 3개)만 초기 전달하도록 축소.
- Global-first 사용자 플로우 회귀 검증 e2e 추가: 동네 미설정 상태에서 온동네 글쓰기 진입 가능 -> 프로필 동네 설정 후 LOCAL 범위 활성화 확인.
- 변경 파일(핵심)
- `app/src/server/queries/neighborhood.queries.ts`
- `app/src/app/api/neighborhoods/route.ts`
- `app/src/app/api/neighborhoods/route.test.ts`
- `app/src/components/onboarding/onboarding-form.tsx`
- `app/src/components/profile/neighborhood-preference-form.tsx`
- `app/src/app/onboarding/page.tsx`
- `app/src/app/profile/page.tsx`
- `app/e2e/global-first-neighborhood-flow.spec.ts`
- 검증 결과
- `cd app && pnpm lint "src/app/api/neighborhoods/route.ts" "src/app/api/neighborhoods/route.test.ts" "src/server/queries/neighborhood.queries.ts" "src/components/onboarding/onboarding-form.tsx" "src/components/profile/neighborhood-preference-form.tsx" "src/app/onboarding/page.tsx" "src/app/profile/page.tsx" "e2e/global-first-neighborhood-flow.spec.ts"` 통과
- `cd app && pnpm typecheck` 통과
- `cd app && pnpm test -- "src/app/api/neighborhoods/route.test.ts" "src/lib/validations/user.test.ts" "src/app/api/auth/register/route.test.ts" "src/server/actions/user.test.ts" "src/app/api/posts/route.test.ts"` 통과 (5 files, 23 tests)
- `cd app && pnpm test:e2e -- e2e/global-first-neighborhood-flow.spec.ts --project=chromium` 통과 (1 test)

### 2026-02-25: 동네 단위 조정(동 -> 시/군/구) + 선택 목록 가시성 개선
- 완료 내용
- 동네 선택 로직을 동(읍면동) 단위에서 시/군/구 단위로 전환: `/api/neighborhoods`가 `city+district` 그룹을 기준으로 반환하도록 변경.
- 사용자 입력 payload를 시/군/구 키(`city::district`)도 허용하도록 확장하고, 저장 시 서비스 레이어에서 대표 시/군/구 레코드를 안전하게 resolve/upsert 하도록 보강.
- 온보딩/프로필 동네 선택 UI에 `현재 선택한 동네` 리스트를 추가하고 각 항목에 `x` 제거 버튼을 제공해 필터 변경 시에도 선택 상태를 즉시 확인/삭제 가능하게 개선.
- 용어 변경 반영: `기준 동네` -> `대표 동네`.
- 전국 동네 seed 데이터를 시/군/구 기준으로 재생성(286건).
- 변경 파일(핵심)
- `app/src/server/queries/neighborhood.queries.ts`
- `app/src/app/api/neighborhoods/route.ts`
- `app/src/server/services/user.service.ts`
- `app/src/lib/validations/user.ts`
- `app/src/components/onboarding/onboarding-form.tsx`
- `app/src/components/profile/neighborhood-preference-form.tsx`
- `app/scripts/data/korean-neighborhoods.json`
- `app/e2e/global-first-neighborhood-flow.spec.ts`
- 검증 결과
- `cd app && pnpm lint "src/server/queries/neighborhood.queries.ts" "src/app/api/neighborhoods/route.ts" "src/app/api/neighborhoods/route.test.ts" "src/lib/validations/user.ts" "src/lib/validations/user.test.ts" "src/server/services/user.service.ts" "src/components/onboarding/onboarding-form.tsx" "src/components/profile/neighborhood-preference-form.tsx"` 통과
- `cd app && pnpm typecheck` 통과
- `cd app && pnpm test -- "src/app/api/neighborhoods/route.test.ts" "src/lib/validations/user.test.ts" "src/server/actions/user.test.ts"` 통과 (3 files, 14 tests)
- `cd app && pnpm test:e2e -- e2e/global-first-neighborhood-flow.spec.ts --project=chromium` 통과 (1 test)
- `cd app && pnpm db:sync:neighborhoods` 통과 (`[sync-neighborhoods] processed 286 rows`)

### 2026-02-25: 커뮤니티 목록 정상화(배포 DB schema+taxonomy 자동 복구)
- 완료 내용
- 사용자 이슈("로컬은 커뮤니티 목록이 보이는데 배포는 전체만 노출")에 대해 원인을 배포 DB의 community-board migration 미적용 + taxonomy 미시드로 확정.
- Vercel build 파이프라인에 idempotent SQL repair 단계를 추가해, `P3005` baseline 상태에서도 실제 DB 구조가 보정되도록 처리.
- repair SQL에서 다음을 자동 보정:
- `BoardScope`/`CommonBoardType` enum
- `CommunityCategory`/`Community` 테이블 + 인덱스 + FK
- `Post.boardScope/communityId/commonBoardType/animalTags` 컬럼 + 인덱스 + 체크/FK
- 기존 common-board 타입 post backfill
- 커뮤니티 taxonomy(카테고리 9개 + 커뮤니티 12개) upsert
- 변경 파일(핵심)
- `app/scripts/sql/community-board-repair.sql`
- `app/scripts/vercel-build.ts`
- `PLAN.md`
- `PROGRESS.md`
- 검증 결과
- `cd app && pnpm lint "scripts/vercel-build.ts" "src/server/queries/post.queries.ts" "src/server/queries/community.queries.ts"` 통과
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- 없음. (다음 배포 1회에서 repair 실행 로그 및 커뮤니티 목록 노출 확인 필요)

### 2026-02-25: 피드 추가 장애 복구 (`P2021/P2022` community-board 스키마 누락)
- 완료 내용
- 배포 로그 기준으로 `public.Community` 미존재(`P2021`)와 `Post.boardScope` 미존재(`P2022`)가 동시에 발생하는 케이스를 확인.
- `post` 조회 경로(`listPosts`, `listBestPosts`, `countPosts`, `countBestPosts`)에 스키마 누락 감지 fallback을 추가해, community-board 컬럼/테이블이 없을 때 `communityId` 필터를 제거한 legacy where/select로 자동 재시도하도록 보강.
- `listCommonBoardPosts`도 동일하게 board 컬럼 누락 시 빈 목록으로 degrade되도록 안전 처리.
- 변경 파일(핵심)
- `app/src/server/queries/post.queries.ts`
- `app/src/server/queries/community.queries.ts`
- `PLAN.md`
- `PROGRESS.md`
- 검증 결과
- `cd app && pnpm lint "src/server/queries/post.queries.ts" "src/server/queries/community.queries.ts"` 통과
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- 근본 해결은 운영 DB에 `20260225183000_add_community_boards` 마이그레이션 적용 필요.

### 2026-02-25: 피드 진입 장애 복구 (`P2021` Community 테이블 누락 fallback)
- 완료 내용
- 사용자 제보 에러(`Invalid prisma.community.findMany()`, `P2021`, `public.Community does not exist`)를 기준으로 read path 장애를 재현 경로로 확인.
- `listCommunities`에 Prisma known error fallback을 추가해, `Community`/`CommunityCategory` 테이블 미존재 시 빈 목록(`[]`)을 반환하도록 처리.
- 이로써 배포 DB가 community migration 이전 상태여도 `/feed` 진입 시 500 대신 안전 degrade 동작을 보장.
- 변경 파일(핵심)
- `app/src/server/queries/community.queries.ts`
- `PLAN.md`
- `PROGRESS.md`
- 검증 결과
- `cd app && pnpm lint "src/server/queries/community.queries.ts"` 통과
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- 없음. (단, 근본 해결은 운영 DB에 community migration 정상 반영)

### 2026-02-25: Vercel 배포 오류 복구 (`P3005` baseline 자동화)
- 완료 내용
- 사용자 제공 Vercel 로그 기준으로 배포 실패 원인을 `prisma migrate deploy`의 `P3005`(non-empty DB baseline 누락) + fallback `prisma db push` data-loss 차단으로 확정.
- `build:vercel`을 단일 스크립트(`tsx scripts/vercel-build.ts`)로 교체해 `db push` fallback을 제거하고, `P3005`일 때만 `prisma migrate resolve --applied <migration>` baseline 루프를 실행한 뒤 `migrate deploy`를 재시도하도록 적용.
- baseline 이후 빌드 파이프라인은 `prisma generate -> next build` 순서로 고정해 기존 동작을 유지.
- 변경 파일(핵심)
- `app/scripts/vercel-build.ts`
- `app/package.json`
- `PLAN.md`
- `PROGRESS.md`
- 검증 결과
- `cd app && pnpm lint scripts/vercel-build.ts` 통과
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- 실제 운영 DB baseline/재배포 결과는 Vercel에서 다음 배포 1회 확인 필요.

### 2026-02-25: Agent-only 운영 전환 (commands 제거 + 에이전트 구체화)
- 완료 내용
- 사용자 요구에 맞춰 커스텀 command 레이어를 제거하고 `@agent` 직접 호출 체계로 전환.
- `.opencode/commands/*.md` 18개를 전량 삭제해 `/session-*`, `/fix-local-error` 의존을 제거.
- `plan-coordinator`를 제외한 핵심 에이전트 5개를 구체 실행 계약 중심으로 재작성:
  - `orchestrator`: lane 분류와 dispatch contract 명시
  - `delivery-engineer`: Feature/Bugfix/Performance/Maintenance 모드 분리
  - `safety-verifier`: QA/정책/릴리스 체크리스트와 PASS 포맷 고정
  - `growth-operator`: Naver/Kakao/Instagram 기본 채널, 7/14/30 실행 보드 규격화
  - `local-error-fixer`: parse/repro/minimal-patch/verify 절차 고정
- 운영 문서를 command 중심에서 agent-only 템플릿 중심으로 전면 교체.
- 변경 파일(핵심)
- `.opencode/agents/orchestrator.md`
- `.opencode/agents/delivery-engineer.md`
- `.opencode/agents/safety-verifier.md`
- `.opencode/agents/growth-operator.md`
- `.opencode/agents/local-error-fixer.md`
- `.opencode/commands/*.md` (18 files deleted)
- `docs/ops/agent-guide-ko.md`
- `PLAN.md`
- `PROGRESS.md`
- 검증 결과
- 구성/문서 변경 작업으로 앱 코드 lint/test/typecheck 실행은 생략.
- `.opencode/commands` 디렉터리가 비어 command 미사용 상태로 전환됨을 확인.
- 이슈/블로커
- 없음.

### 2026-02-25: 피드 카드 카테고리 아이콘 문자 제거 + `전체` 라벨 숨김
- 완료 내용
- 사용자 요청에 따라 피드 카드 카테고리 칩의 문자 접두(`B`, `P` 등)를 제거하고 텍스트 라벨만 노출되도록 수정.
- `neighborhood`가 없는 게시글에서 메타 칩의 `전체` 라벨을 숨겨 불필요한 UI 노이즈를 제거.
- 변경 파일(핵심)
- `app/src/components/posts/feed-infinite-list.tsx`
- `PLAN.md`
- `PROGRESS.md`
- 검증 결과
- `cd app && pnpm lint "src/components/posts/feed-infinite-list.tsx"` 통과
- 이슈/블로커
- 없음.

### 2026-02-25: 피드 카드 커뮤니티 라벨 노출 개선
- 완료 내용
- 사용자 제보("파충류-뱀 글인지 피드에서 식별 불가") 기준으로 피드 목록 카드 메타에 커뮤니티 배지를 추가.
- 게시글 목록 쿼리 include에 `community(labelKo + category.labelKo)`를 포함하고, 피드 초기 payload에 매핑해 `카테고리 · 커뮤니티` 형식으로 표시.
- 기존 공용 보드/커뮤니티 미지정 글은 기존처럼 배지를 숨겨 회귀를 피함.
- 변경 파일(핵심)
- `app/src/server/queries/post.queries.ts`
- `app/src/app/feed/page.tsx`
- `app/src/components/posts/feed-infinite-list.tsx`
- `PLAN.md`
- `PROGRESS.md`
- 검증 결과
- `cd app && pnpm typecheck` 통과
- `cd app && pnpm lint "src/app/feed/page.tsx" "src/components/posts/feed-infinite-list.tsx" "src/server/queries/post.queries.ts"` 통과
- 이슈/블로커
- 없음.

### 2026-02-25: Day3 실행팩(반응률 개선) 작성
- 완료 내용
- 사용자 지시("계속 진행")에 맞춰 Day3 전용 실행 문서를 작성.
- 문서에는 5블록 타임라인(총 5h 이내), 블로그 #3 원고(24h 댓글률 개선 목적), 오픈채팅 오전/점심/야간 후속 스크립트, 카페 미응답 후속 템플릿, EOD Keep/Fix/Kill 판정표를 포함.
- 변경 파일(핵심)
- `business/Day3_실행팩_반응률개선.md`
- `PLAN.md`
- `PROGRESS.md`
- 검증 결과
- 문서 작업으로 코드/테스트 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-25: Community board UX 업데이트(커뮤니티 라벨 정리 + 피드 커뮤니티 필터)
- 완료 내용
- `/posts/new` 커뮤니티 select 라벨 포맷을 정리해 `강아지(강아지)` 같은 중복 표기를 제거하고, 동일 카테고리/커뮤니티명은 단일 라벨로 표시하도록 수정.
- `/feed`에 `communityId` 기반 커뮤니티 필터를 추가해 SSR 초기 목록/URL 상태/검색폼 hidden 파라미터/무한스크롤 API 호출이 동일 필터를 공유하도록 연결.
- common-board 타입(`병원후기/실종·목격/중고·공동구매`)에서는 커뮤니티 필터를 적용하지 않도록 가드해 기존 공용 보드 동작을 유지.
- 백엔드 목록 경로 확장: `postListSchema`에 `communityId(cuid)` 검증 추가, `GET /api/posts` 쿼리 파싱/전달, `listPosts/listBestPosts/countBestPosts` where 조건에 `communityId` 반영.
- 회귀 방지 테스트 추가: validation(`communityId`), API route(contract 전달), query(where 필터).
- 변경 파일(핵심)
- `app/src/components/posts/post-create-form.tsx`
- `app/src/app/feed/page.tsx`
- `app/src/components/posts/feed-search-form.tsx`
- `app/src/components/posts/feed-infinite-list.tsx`
- `app/src/lib/validations/post.ts`
- `app/src/app/api/posts/route.ts`
- `app/src/server/queries/post.queries.ts`
- `app/src/lib/validations/post.test.ts`
- `app/src/app/api/posts/route.test.ts`
- `app/src/server/queries/post.queries.test.ts`
- `PLAN.md`
- `PROGRESS.md`
- 검증 결과
- `cd app && pnpm lint "src/app/feed/page.tsx" "src/components/posts/post-create-form.tsx" "src/components/posts/feed-infinite-list.tsx" "src/components/posts/feed-search-form.tsx" "src/app/api/posts/route.ts" "src/lib/validations/post.ts" "src/server/queries/post.queries.ts" "src/lib/validations/post.test.ts" "src/app/api/posts/route.test.ts" "src/server/queries/post.queries.test.ts"` 통과
- `cd app && pnpm test -- src/lib/validations/post.test.ts src/app/api/posts/route.test.ts src/server/queries/post.queries.test.ts` 통과 (3 files, 32 tests)
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- 없음.

### 2026-02-25: Day2 실행팩 + Day3 Fix 카피 작성
- 완료 내용
- 사용자 지시("진행하세요", "작성해요")에 맞춰 Day2 운영을 바로 실행할 수 있는 문서와 Day3 Fix 시나리오 카피를 작성.
- 문서에는 5시간 제한 타임라인, 블로그 #2 원고, 카페 답변 템플릿 4개, 오픈채팅 30분 스크립트, KPI 마감 기준, Keep/Fix/Kill 게이트를 포함.
- 변경 파일(핵심)
- `business/Day2_실행팩_및_Day3_Fix_카피.md`
- `PLAN.md`
- `PROGRESS.md`
- 검증 결과
- 문서 작업으로 코드/테스트 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-25: 다중 탭 에이전트 확인용 `/agent-status` 커맨드 추가
- 완료 내용
- 사용자 요청("여러 탭에서 어떤 에이전트가 사용 중인지 바로 확인")에 맞춰 `/agent-status` 커맨드를 추가.
- 최근 세션 목록을 조회하고 각 세션 export에서 마지막 사용 agent를 파싱해 표 형태로 출력하도록 구성.
- 운영 가이드에 `agent-status` 사용법을 반영.
- 변경 파일(핵심)
- `.opencode/commands/agent-status.md`
- `docs/ops/agent-guide-ko.md`
- `PLAN.md`
- 검증 결과
- 커맨드/문서 작업으로 코드 테스트 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-25: Community-board migration 로컬 적용 완료
- 완료 내용
- pending 상태였던 `20260225183000_add_community_boards` migration을 로컬 DB에 적용해 backfill/check constraint SQL 실행 경로를 실제로 검증.
- 적용 후 community-board 타깃 검증(`post validation`, `post-create-policy`, `typecheck`)을 재실행해 회귀 없음 확인.
- 변경 파일(핵심)
- `PROGRESS.md`
- 검증 결과
- `cd app && pnpm prisma migrate deploy` 통과 (`20260225183000_add_community_boards` 적용)
- `cd app && pnpm prisma validate` 통과
- `cd app && pnpm test -- src/lib/validations/post.test.ts src/server/services/post-create-policy.test.ts` 통과 (2 files, 16 tests)
- `cd app && pnpm lint prisma/seed.ts "src/app/api/lounges/breeds/[breedCode]/groupbuys/route.ts" "src/app/posts/new/page.tsx" src/components/posts/post-create-form.tsx src/lib/validations/post.test.ts src/lib/validations/post.ts src/server/services/post-create-policy.test.ts src/server/services/post.service.ts src/lib/community-board.ts src/server/queries/community.queries.ts "src/app/api/boards/[board]/posts/route.ts" src/app/api/communities/route.ts` 통과
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- 없음.

### 2026-02-25: Community-board safety-verifier blocker 보정
- 완료 내용
- safety-verifier blocker 기준으로 community-board migration을 최소 범위로 보강: 기존 데이터 backfill + boardScope/communityId/commonBoardType 정합 check constraint 추가.
- 기존 common-board 대상 타입(`HOSPITAL_REVIEW`, `LOST_FOUND`, `MARKET_LISTING`) 게시글이 migration 적용 시 자동으로 `boardScope=COMMON`, `commonBoardType` 매핑값으로 전환되도록 백필 SQL을 반영.
- `post-create-policy`/`post validation` 회귀를 재검증해, non-common 타입의 `communityId` 요구 정책과 common-board 예외 규칙이 테스트에서 유지됨을 확인.
- 변경 파일(핵심)
- `app/prisma/migrations/20260225183000_add_community_boards/migration.sql`
- `PLAN.md`
- `PROGRESS.md`
- 검증 결과
- `cd app && pnpm prisma validate` 통과
- `cd app && pnpm prisma generate` 통과
- `cd app && pnpm lint src/lib/community-board.ts src/lib/validations/post.ts src/server/services/post.service.ts src/server/services/post-create-policy.test.ts` 통과
- `cd app && pnpm test -- src/lib/validations/post.test.ts src/server/services/post-create-policy.test.ts` 통과 (2 files, 16 tests)
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- 없음.

### 2026-02-25: 로컬 에러 즉시 수정 서브에이전트 추가
- 완료 내용
- 사용자 요청("Next.js 에러 코드를 붙여넣으면 바로 수정")에 맞춰 `local-error-fixer`를 신규 추가.
- parse -> repro -> minimal patch -> verify 루프를 강제하는 지침을 설정하고, 즉시 호출용 `/fix-local-error` 커맨드를 추가.
- orchestrator 라우팅 규칙과 `opencode.json` task allowlist에 `local-error-fixer`를 연결해 자동 분기에서도 호출 가능하게 반영.
- 운영 가이드 문서의 커스텀 에이전트 목록과 명령어 목록을 업데이트.
- 변경 파일(핵심)
- `.opencode/agents/local-error-fixer.md`
- `.opencode/commands/fix-local-error.md`
- `.opencode/agents/orchestrator.md`
- `opencode.json`
- `docs/ops/opencode-agent-automation-guide-ko.md`
- `PLAN.md`
- 검증 결과
- 설정/문서 작업으로 코드/테스트 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-25: Growth-Marketing 세션 종료 + 핸드오프
- 완료 내용
- growth-operator 산출물 기준으로 세션 목표를 종료 처리: `business 문서 근거 기반 피드백`, `7/14/30 실행계획 + copy pack`, `go/stop 임계값 + keep/fix/kill 매트릭스`.
- `PLAN.md` Cycle 60의 킥오프 작업을 `done`으로 갱신하고, 다음 단일 실행 작업을 `in_progress`로 전환.
- 변경 파일(핵심)
- `PLAN.md`
- `PROGRESS.md`
- 검증 결과
- 문서 계획/로그 업데이트 작업으로 코드/테스트 실행 없음.
- 이슈/블로커
- 없음.
- 핸드오프 메모(솔로 창업자 즉시 실행)
- Day1에 `Naver Blog`, `Kakao Open Chat`, `Instagram` 각 1개씩 게시하고 동일 UTM 규칙으로 유입을 기록.
- 24시간 후 `go/stop` 임계값으로 1차 판정하고, keep/fix/kill 매트릭스에 채널별 1줄 결론만 먼저 남김.
- 다음 단일 활성 작업
- `솔로 창업자 즉시 실행 Day1 핸드오프(채널 3개 게시 + 지표 기록 시작)` (`in_progress`)

### 2026-02-25: Cycle 61 완료 (community board MVP 구현)
- 완료 내용
- 문서(`community-taxonomy-v1`, `community-board-implementation-v1`) 기준으로 Prisma schema를 확장해 `BoardScope`, `CommonBoardType`, `CommunityCategory`, `Community`, `Post.boardScope/communityId/commonBoardType/animalTags`를 반영하고 migration SQL을 추가.
- seed에 L1/L2 고정 커뮤니티(카테고리 9, 커뮤니티 12) upsert를 추가하고 기본 샘플 글에 `COMMUNITY/COMMON` 보드 필드가 채워지도록 정합화.
- `postCreateSchema`에 `communityId/animalTags`를 추가하고 타입별 규칙(공용 3종=커뮤니티 금지+태그 필수, 그 외=커뮤니티 필수)을 검증하도록 확장.
- `createPost` 서비스에서 `type -> boardScope/commonBoardType` 강제 매핑, 공용 보드 태그 정규화, 커뮤니티 존재/활성 검증을 추가.
- 읽기 경로로 `GET /api/communities`, `GET /api/boards/:board/posts`를 추가하고 query 레이어(`community.queries`)로 분리.
- 글쓰기 UI에서 타입별로 커뮤니티 선택(community-board)과 동물 태그 입력(common-board)을 분기해 payload에 반영.
- 변경 파일(핵심)
- `app/prisma/schema.prisma`
- `app/prisma/migrations/20260225183000_add_community_boards/migration.sql`
- `app/prisma/seed.ts`
- `app/src/lib/community-board.ts`
- `app/src/lib/validations/post.ts`
- `app/src/server/services/post.service.ts`
- `app/src/server/queries/community.queries.ts`
- `app/src/app/api/communities/route.ts`
- `app/src/app/api/boards/[board]/posts/route.ts`
- `app/src/app/posts/new/page.tsx`
- `app/src/components/posts/post-create-form.tsx`
- `app/src/lib/validations/post.test.ts`
- `app/src/server/services/post-create-policy.test.ts`
- `app/src/app/api/lounges/breeds/[breedCode]/groupbuys/route.ts`
- `PLAN.md`
- 검증 결과
- `cd app && pnpm prisma generate` 통과
- `cd app && pnpm lint "src/lib/community-board.ts" "src/lib/validations/post.ts" "src/lib/validations/post.test.ts" "src/server/services/post.service.ts" "src/server/services/post-create-policy.test.ts" "src/server/queries/community.queries.ts" "src/app/api/communities/route.ts" "src/app/api/boards/[board]/posts/route.ts" "src/app/posts/new/page.tsx" "src/components/posts/post-create-form.tsx" "src/app/api/lounges/breeds/[breedCode]/groupbuys/route.ts"` 통과
- `cd app && pnpm lint "src/server/services/post-create-policy.test.ts"` 통과
- `cd app && pnpm typecheck` 통과
- `cd app && pnpm test -- src/lib/validations/post.test.ts src/server/services/post-create-policy.test.ts` 통과 (2 files, 16 tests)
- 재검증 메모: 초회 타깃 테스트에서 `communityId` 샘플값이 CUID 형식이 아니어서 `INVALID_INPUT` 실패가 있었고, 테스트 데이터를 CUID로 교정해 재실행 PASS를 확인.
- 이슈/블로커
- 없음.

### 2026-02-25: Cycle 61 후속 완료 (safety-verifier blocker: read API rate limit + 계약 테스트)
- 완료 내용
- 신규 read API 2개에 IP 기반 레이트리밋을 추가.
- 대상: `GET /api/communities`, `GET /api/boards/[board]/posts`.
- 적용 방식: `getClientIp(request)` + `enforceRateLimit({ key, limit: 60, windowMs: 60_000 })`.
- 신규 계약 테스트 2개를 추가해 최소 실패/성공/예외 모니터링 경로를 고정.
- `route.test.ts` 커버리지: invalid params -> 400, success -> 200, unexpected error -> 500 + `monitorUnhandledError` 호출.
- 변경 파일(핵심)
- `app/src/app/api/communities/route.ts`
- `app/src/app/api/boards/[board]/posts/route.ts`
- `app/src/app/api/communities/route.test.ts`
- `app/src/app/api/boards/[board]/posts/route.test.ts`
- `PLAN.md`
- `PROGRESS.md`
- 검증 결과
- `cd app && pnpm lint "src/app/api/communities/route.ts" "src/app/api/communities/route.test.ts" "src/app/api/boards/[board]/posts/route.ts" "src/app/api/boards/[board]/posts/route.test.ts"` 통과
- `cd app && pnpm typecheck` 통과
- `cd app && pnpm test -- src/lib/validations/post.test.ts src/server/services/post-create-policy.test.ts src/app/api/communities/route.test.ts "src/app/api/boards/[board]/posts/route.test.ts"` 통과 (4 files, 22 tests)
- 이슈/블로커
- 없음.

### 2026-02-25: Cycle 61 완료 (community-board schema/migration 검증 + 타입 안정화)
- 완료 내용
- `CommunityCategory`, `Community`, `Post(boardScope/communityId/commonBoardType/animalTags)` 추가 변경이 Prisma schema와 migration SQL에서 동일 의미로 반영되는지 점검.
- 배열 컬럼 정합성 보강: `Community.defaultPostTypes`, `Community.tags`, `Post.animalTags`를 schema에서 `@default([])`로 명시하고 migration SQL도 `NOT NULL DEFAULT ARRAY[]`로 맞춰 null 드리프트 가능성을 제거.
- 타입체크 실패 원인(`PostType` union 인덱싱 미좁힘)을 `isCommonBoardPostType` 타입 가드로 수정해 `resolveBoardByPostType` 인덱싱을 안전화.
- 변경 파일(핵심)
- `app/prisma/schema.prisma`
- `app/prisma/migrations/20260225183000_add_community_boards/migration.sql`
- `app/src/lib/community-board.ts`
- `PLAN.md`
- `PROGRESS.md`
- 검증 결과
- `cd app && pnpm prisma validate` 통과
- `cd app && pnpm prisma generate` 통과
- `cd app && pnpm lint src/lib/validations/post.ts src/lib/community-board.ts` 통과
- `cd app && pnpm typecheck` 최초 실패(`src/lib/community-board.ts` TS7053) -> 수정 후 재실행 통과
- `cd app && pnpm prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script` 실패(로컬 shadow DB URL 미지정)
- 이슈/블로커
- `migrate diff`는 `--shadow-database-url` 없이는 실행 불가해, migration-directory 전체와 schema 자동 diff 증빙은 로컬에서 완료하지 못함.

### 2026-02-25: Growth-Marketing 세션 킥오프 등록
- 완료 내용
- 목표를 `이 프로젝트를 초기에 홍보하기 위한 전략 수립 + business 파일 기반 개선 피드백 우선`으로 고정하고, PLAN에 Cycle 60 킥오프를 추가.
- 분류를 `growth-marketing`으로 명시하고 범위 경계(1인 창업자/near-zero budget/no-team)를 고정.
- 즉시 실행 순서를 `evidence collection -> 7/14/30 execution plan -> go/stop thresholds -> handoff`로 고정.
- 담당 태그를 `growth-operator`, `plan-coordinator`로 지정하고 단일 활성 작업을 `in_progress`로 설정.
- 변경 파일(핵심)
- `PLAN.md`
- `PROGRESS.md`
- 검증 결과
- 문서 계획/로그 업데이트 작업으로 코드/테스트 실행 없음.
- 이슈/블로커
- 없음.
- 핸드오프 메모
- 다음 작업자는 `business/*` 근거 수집 결과를 동일 워크플로우 순서로 이어서 기록.

### 2026-02-25: 에이전트 5개 체계로 통합 단순화
- 완료 내용
- 사용자 요청("에이전트가 너무 많아 관리가 어렵다")에 맞춰 프로젝트 커스텀 에이전트를 5개 체계로 통합.
- 유지 에이전트: `orchestrator`, `plan-coordinator`, `delivery-engineer`, `safety-verifier`, `growth-operator`.
- 제거 에이전트: `feature-builder`, `bugfix-responder`, `qa-verifier`, `policy-guardian`, `release-manager`, `community-operator`, `perf-profiler`, `perf-patcher`, `channel-researcher`, `experiment-analyst`.
- 세션 커맨드(`session-community/performance/growth`)와 검증 커맨드(`run-gates`, `policy-check`, `release-readiness`, `triage-bug`)를 통합 에이전트로 라우팅 수정.
- `opencode.json`의 task allowlist 및 `agent.orchestrator.permission.task`를 5개 체계로 축소.
- 변경 파일(핵심)
- `.opencode/agents/delivery-engineer.md`
- `.opencode/agents/safety-verifier.md`
- `.opencode/agents/orchestrator.md`
- `.opencode/agents/growth-operator.md`
- `.opencode/commands/session-community.md`
- `.opencode/commands/session-performance.md`
- `.opencode/commands/session-growth.md`
- `.opencode/commands/policy-check.md`
- `.opencode/commands/run-gates.md`
- `.opencode/commands/release-readiness.md`
- `.opencode/commands/triage-bug.md`
- `opencode.json`
- `docs/ops/opencode-agent-automation-guide-ko.md`
- `PLAN.md`
- 검증 결과
- `.opencode/agents/*.md` 기준 커스텀 에이전트 5개만 남는 것을 확인.
- 코드/테스트 대상 변경 없음.
- 이슈/블로커
- 없음.

### 2026-02-25: OpenCode 에이전트 사용법 상세 운영문서 작성 + 권한 설정 보강
- 완료 내용
- 사용자 요청("아무것도 모르는 상태에서 처음부터 끝까지")에 맞춰 OpenCode 에이전트 운영을 단계별로 설명한 상세 매뉴얼을 신규 작성.
- 문서에 개념(Primary/Subagent/Command), 초기 설정 절차, 세션별 실행 예시, 권한 설계 원칙, `opencode serve/run` 자동화, 트러블슈팅을 포함.
- frontmatter 해석 차이 대비를 위해 `opencode.json`에 전역 `permission.task` allowlist와 `agent.orchestrator.permission.task` 제한 규칙을 추가.
- 변경 파일(핵심)
- `docs/ops/opencode-agent-automation-guide-ko.md`
- `opencode.json`
- `PLAN.md`
- 검증 결과
- 문서/설정 작업으로 코드/테스트 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-25: OpenCode 멀티 세션 자동 라우팅 에이전트/커맨드 설계
- 완료 내용
- 사용자 요청(운영/개발성능/홍보마케팅 세션 자동 분리)에 맞춰 OpenCode 공식 문서(Agents/Commands/Permissions) 구조 기반으로 오케스트레이터 체계를 설계.
- 신규 에이전트 추가: `orchestrator`, `community-operator`, `perf-profiler`, `perf-patcher`, `channel-researcher`, `growth-operator`, `experiment-analyst`.
- 신규 커맨드 추가: `/session-community`, `/session-performance`, `/session-growth`, `/session-auto`.
- `orchestrator`에 `permission.task` allowlist를 적용해 승인된 서브에이전트만 호출하도록 제한.
- 변경 파일(핵심)
- `.opencode/agents/orchestrator.md`
- `.opencode/agents/community-operator.md`
- `.opencode/agents/perf-profiler.md`
- `.opencode/agents/perf-patcher.md`
- `.opencode/agents/channel-researcher.md`
- `.opencode/agents/growth-operator.md`
- `.opencode/agents/experiment-analyst.md`
- `.opencode/commands/session-community.md`
- `.opencode/commands/session-performance.md`
- `.opencode/commands/session-growth.md`
- `.opencode/commands/session-auto.md`
- `PLAN.md`
- 검증 결과
- 설정/문서 산출물 작업으로 코드/테스트 실행 없음.
- 이슈/블로커
- OpenCode 런타임에서 markdown frontmatter `permission.task` 해석은 버전별 차이가 있을 수 있으므로, 필요 시 `opencode.json`의 `agent.orchestrator.permission.task`로 동일 규칙을 중복 선언 권장.

### 2026-02-25: 커뮤니티/공용보드 구현 설계 상세화
- 완료 내용
- 사용자 요청(병원/실종/거래 공용 참여)에 맞춰, 커뮤니티 전용 보드 + 공용 보드 이원 구조의 구현 문서를 추가.
- Prisma 스키마 확장 초안(`BoardScope`, `CommonBoardType`, `Community`, `CommunityCategory`, `Post` 확장), API 계약, Zod 검증 규칙, UI 분기, 마이그레이션 순서, 테스트 체크리스트를 포함.
- 기존 분류 문서에도 전체 `PostType` 매핑표를 보강해 공용/전용 경계를 명확화.
- 변경 파일(핵심)
- `docs/product/커뮤니티_보드_구현_v1.md`
- `docs/product/커뮤니티_택소노미_v1.md`
- `PLAN.md`
- 검증 결과
- 문서 산출물 작업으로 코드/테스트 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-25: 공용 보드 매핑 정책 확정 (병원/실종/거래)
- 완료 내용
- 사용자 요청에 따라 `병원후기`, `실종/목격 제보`, `중고/공동구매`를 커뮤니티별 분리 대신 전 커뮤니티 공용 참여 보드로 확정.
- `COMMUNITY`/`COMMON` 이원 구조, 카테고리-보드 매핑 규칙, `boardScope/communityId/commonBoardType/animalTags` 데이터 모델 초안을 문서에 추가.
- 출시 체크리스트에 공용 보드 라우트 추가 항목을 반영.
- 변경 파일(핵심)
- `docs/product/커뮤니티_택소노미_v1.md`
- `PLAN.md`
- 검증 결과
- 문서 산출물 작업으로 코드/테스트 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-25: 멀티종 커뮤니티 고정 분류안(v1) 문서화
- 완료 내용
- 사용자 요청(강아지/고양이 중심에서 조류/파충류 등 확장)에 맞춰, 멤버십 없는 한국형 커뮤니티 구조를 기준으로 초기 고정 커뮤니티 분류안을 작성.
- 대분류(L1), 초기 커뮤니티 12개(L2), 대표 태그, 커뮤니티별 기본 글타입 우선순위, 후속 분화/통합 기준을 한 문서로 고정.
- 변경 파일(핵심)
- `docs/product/커뮤니티_택소노미_v1.md`
- `PLAN.md`
- 검증 결과
- 문서 산출물 작업으로 코드/테스트 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-25: Day1 업로드 문안 10개 작성 + business 폴더 읽기순서 정리
- 완료 내용
- 사용자 요청에 따라 계정 개설 직후 바로 게시 가능한 Day1 문안 10개(네이버 4, 카카오 3, 인스타 3)를 신규 작성.
- 문서가 많아진 business 폴더를 즉시 실행 관점으로 재정렬해, 초기 실행 우선순위를 로컬 기준으로 정리.
- 변경 파일(핵심)
- `business/Day1_업로드_문안_10개.md`
- `PLAN.md`
- 검증 결과
- 문서 산출물 작업으로 코드/테스트 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-25: 필수 3채널 계정개설 체크리스트 작성
- 완료 내용
- 사용자 요청에 맞춰 네이버 블로그/카카오 오픈채팅/인스타그램 계정 개설을 바로 실행할 수 있는 체크리스트 문서를 신규 작성.
- 채널별 계정명, 소개문구, 고정 공지, 첫 콘텐츠 수량, UTM 규칙, 7일 점검 지표를 한 문서에 통합.
- 변경 파일(핵심)
- `business/필수3채널_계정개설_체크리스트.md`
- `PLAN.md`
- 검증 결과
- 문서 산출물 작업으로 코드/테스트 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-25: 한국 생태계 실사 기반 전략 문서 재작성 + 초기 기능축소안 반영
- 완료 내용
- 기존 `business` 전략 문서가 추상적이라는 피드백에 따라, 한국 커뮤니티/SNS 채널별 생태계와 실행 방식을 수치/출처 중심으로 재작성.
- 채널 3개(네이버 검색/블로그, 카카오 오픈채팅, 인스타 릴스) 고정으로 30일 실행 플레이북을 신규 작성.
- 병원/개인 비방형 후기 리스크를 줄이기 위해 초기 30일 기능축소/운영조치/재오픈 조건 문서를 별도로 작성.
- 기존 온동네 14일 문서는 방향 문서로 유지하고, 실행 문서 링크를 명시하도록 정리.
- 변경 파일(핵심)
- `business/KR_커뮤니티_SNS_생태계_조사_초기유저획득.md`
- `business/온동네_초기유저_30일_실행플레이북.md`
- `business/초기_기능축소_및_법적리스크_회피안.md`
- `business/익명성_우선_온동네_초기유저_성장_14일_플랜.md`
- `PLAN.md`
- 검증 결과
- 문서 산출물 작업으로 코드/테스트 실행 없음.
- 이슈/블로커
- 카카오/네이버 일부 1차 원문 링크는 수집 경로에 따라 접근 제약이 있어, 실행 지표는 공개 접근 가능한 출처 중심으로 우선 고정.

### 2026-02-25: 익명성 우선 온동네 14일 플랜으로 재정렬
- 완료 내용
- 기존 문서의 지역 예시(성동구) 중심 표현을 제거하고, TownPet 초기 방향에 맞춰 온동네 우선 퍼널 전략으로 전면 수정.
- 읽기->참여->재방문 KPI, 동네 확장 트리거(조건 충족 시 2단계 오픈), 익명성/안전장치 원칙을 명시.
- 기존 파일명을 온동네 우선 전략이 드러나도록 변경.
- 변경 파일(핵심)
- `business/익명성_우선_온동네_초기유저_성장_14일_플랜.md`
- `PLAN.md`
- 검증 결과
- 문서 산출물 작업으로 코드/테스트 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-25: 익명성 우선 초기유저 성장 14일 플랜 초안 작성
- 완료 내용
- 친구 초대 기능 없이도 초기 유저를 확보할 수 있도록, 익명성 우선 원칙 기반 14일 실행 계획을 문서화.
- 문제해결/긴급정보/재방문 루프, KPI 기준, 채널 우선순위, 운영 템플릿(첫 댓글/외부 공유/정책 안내), Go/Stop 판단 기준까지 포함.
- 변경 파일(핵심)
- `business/익명성_우선_온동네_초기유저_성장_14일_플랜.md` (후속 리네임/개정)
- `PLAN.md`
- 검증 결과
- 문서 산출물 작업으로 코드/테스트 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-25: 성동구 실전 30개 1차 아웃바운드 초안 작성
- 완료 내용
- 스폰서 카드 영업을 바로 시작할 수 있도록 성동구 기준 30개 후보군(병원/돌봄 중심)을 우선순위와 발송 일정으로 정리.
- Day1 발송 10건, 팔로업/미팅/파일럿 목표와 제안금액을 함께 고정해 실행 즉시 사용 가능한 형태로 문서화.
- 변경 파일(핵심)
- `business/파트너_리스트_실전30_1차초안_성동구.md`
- `PLAN.md`
- 검증 결과
- 문서 산출물 작업으로 코드/테스트 실행 없음.
- 이슈/블로커
- 본 문서는 초안이므로 실제 상호/연락처는 발송 전 검증 필요.

### 2026-02-25: 파트너 리스트 샘플 10개 작성(성동구 예시)
- 완료 내용
- 30개 템플릿을 바로 채울 수 있도록 성동구 기준 샘플 입력 10개를 작성.
- 상태 코드, 점수, 접촉/팔로업/미팅 일정, 제안금액, 전환 결과까지 포함한 실무 입력 예시를 제공.
- 변경 파일(핵심)
- `business/파트너_리스트_샘플10_성동구.md`
- `PLAN.md`
- 검증 결과
- 문서 산출물 작업으로 코드/테스트 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-25: 파트너 리스트 템플릿(30개) 작성
- 완료 내용
- 스폰서 카드 파일럿 제휴 영업을 바로 실행할 수 있도록 30개 파트너 관리 템플릿을 작성.
- 상태 코드, 우선순위 점수(적합도/응답가능성/신뢰리스크), 접촉/팔로업/미팅 일정, 주간 요약, 전환률 계산 가이드를 포함.
- 변경 파일(핵심)
- `business/파트너_리스트_템플릿_30개.md`
- `PLAN.md`
- 검증 결과
- 문서 산출물 작업으로 코드/테스트 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-25: 스폰서 카드 실험 실전 패키지 작성
- 완료 내용
- 실험 1(지역 파트너 스폰서 카드)을 바로 실행할 수 있도록 가격표, 판매 문구, 제휴 영업 메시지 3종, 운영 체크리스트, KPI 대시보드, 7일 실행 순서를 문서화.
- 변경 파일(핵심)
- `business/실험1_스폰서카드_판매운영_패키지.md`
- `PLAN.md`
- 검증 결과
- 문서 산출물 작업으로 코드/테스트 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-25: 거부감 낮은 첫 유료실험 3가지 설계
- 완료 내용
- 커뮤니티 기본 기능 무료 유지 원칙을 전제로, 1인 운영에서 바로 테스트 가능한 유료실험 3개(스폰서 카드, 성과형 리드 과금, 검증 배지)를 설계.
- 각 실험별로 가격, 운영조건, KPI, Go/Stop 기준과 6주 실행 순서를 포함해 즉시 실행 가능한 형태로 문서화.
- 변경 파일(핵심)
- `business/거부감_낮은_첫_유료실험_3가지.md`
- `PLAN.md`
- 검증 결과
- 문서 산출물 작업으로 코드/테스트 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-25: 지원사업 제출용 1페이지 문서 작성
- 완료 내용
- 기존 사업화 문서(한 페이지, KPI, 비용 팩트체크, 벤치마크)를 제출 관점으로 압축한 1페이지 템플릿을 신규 작성.
- 문제-해결-차별화-시장성-수익화-요청항목-12주 KPI를 한 문서에서 바로 복사해 제출할 수 있도록 정리.
- 변경 파일(핵심)
- `business/지원사업_제출용_1페이지.md`
- `PLAN.md`
- 검증 결과
- 문서 산출물 작업으로 코드/테스트 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-25: 반려 커뮤니티/플랫폼 벤치마크 문서화
- 완료 내용
- 유사 주제의 실제 운영 서비스(Rover, Pawshake, PetBacker, 포인핸드, 펫프렌즈/핏펫)를 문제/기능/수익/신뢰장치 관점으로 비교 정리.
- TownPet에 바로 적용 가능한 포지셔닝 시사점, 8주 실행 우선순위, 초기 KPI 권장값, 리스크 대응안을 표 중심으로 정리.
- 변경 파일(핵심)
- `business/반려_플랫폼_벤치마크_표.md`
- `PLAN.md`
- 검증 결과
- 문서 산출물 작업으로 코드/테스트 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-24: Cycle 46 착수 (보안/운영 안정화 하드닝)
- 완료 내용
- 코드베이스 감사 결과를 기준으로 Cycle 46 실행 항목을 `PLAN.md`에 구체화하고 우선순위를 고정.
- 우선순위 순서: `DEMO_USER_EMAIL` 프로덕션 우회 차단 -> 소셜 위험 링크 옵션 비활성화 -> API 에러 모니터링 누락 보강 -> API 계약 테스트 확장 -> 개인화/에디터/운영 정합 리팩터.
- 1차 착수 항목을 `DEMO_USER_EMAIL` 프로덕션 우회 차단 + 회귀 테스트로 지정하고 구현을 시작.
- 변경 파일(핵심)
- `PLAN.md`
- 이슈/블로커
- 없음.

### 2026-02-24: Cycle 46 1차 완료 (`DEMO_USER_EMAIL` 프로덕션 우회 차단)
- 완료 내용
- `getCurrentUser`의 데모 계정 fallback을 `NODE_ENV !== "production"` 조건에서만 허용하도록 제한해, 프로덕션에서 세션 없는 우회 로그인 경로를 차단.
- `auth` 유닛 테스트에 프로덕션 환경에서 fallback이 동작하지 않는 회귀 케이스를 추가.
- 변경 파일(핵심)
- `app/src/server/auth.ts`
- `app/src/server/auth.test.ts`
- `PLAN.md`
- 검증 결과
- `cd app && pnpm test -- src/server/auth.test.ts` 통과 (7 tests)
- 이슈/블로커
- 없음.

### 2026-02-24: Cycle 46 2차 완료 (소셜 위험 링크 옵션 비활성화)
- 완료 내용
- 카카오/네이버 NextAuth provider 설정에서 `allowDangerousEmailAccountLinking`을 `false`로 전환해 이메일 기반 자동 계정 링크 위험도를 낮춤.
- `auth` 테스트 및 타입체크를 재실행해 인증 헬퍼 회귀가 없음을 확인.
- 변경 파일(핵심)
- `app/src/lib/auth.ts`
- `app/src/server/auth.test.ts`
- `PLAN.md`
- 검증 결과
- `cd app && pnpm test -- src/server/auth.test.ts` 통과 (7 tests)
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- 소셜 계정 병합 UX(명시적 계정연결 동선)는 후속 과제.

### 2026-02-24: Cycle 46 3차 완료 (API 에러 모니터링 누락 라우트 보강)
- 완료 내용
- `/api/posts/[id]`의 `GET/PATCH/DELETE` unhandled error 경로에 `monitorUnhandledError`를 추가해 상세 API 장애 추적을 활성화.
- `/api/reports/[id]`, `/api/reports/bulk`에 동일한 모니터링 경로를 추가해 신고 운영 API 장애 로깅/Sentry 전송을 통일.
- `/api/admin/auth-audits`, `/api/admin/auth-audits/export`를 `try/catch` 구조로 정리하고, 예외 발생 시 공통 모니터링 + 500 응답으로 일관화.
- 변경 파일(핵심)
- `app/src/app/api/posts/[id]/route.ts`
- `app/src/app/api/reports/[id]/route.ts`
- `app/src/app/api/reports/bulk/route.ts`
- `app/src/app/api/admin/auth-audits/route.ts`
- `app/src/app/api/admin/auth-audits/export/route.ts`
- `PLAN.md`
- 검증 결과
- `cd app && pnpm lint "src/app/api/posts/[id]/route.ts" "src/app/api/reports/[id]/route.ts" src/app/api/reports/bulk/route.ts src/app/api/admin/auth-audits/route.ts src/app/api/admin/auth-audits/export/route.ts src/lib/auth.ts src/server/auth.ts src/server/auth.test.ts` 통과
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- API 계약 테스트가 아직 없어 에러코드/상태코드 회귀를 자동 검증하는 단계가 필요(다음 작업으로 진행).

### 2026-02-24: Cycle 46 4차 완료 (API 계약 테스트 1차)
- 완료 내용
- 고위험 API 엔드포인트 계약 테스트를 추가해 상태코드/에러코드 회귀를 자동 검증하도록 보강.
- 대상: `/api/posts`, `/api/posts/[id]`, `/api/reports`, `/api/auth/register`.
- 테스트 케이스 범위: 잘못된 쿼리/입력(400), 인증 요구(401), 도메인 충돌(409), 서비스 오류 매핑(429/409), 예상치 못한 예외(500 + 모니터링 호출), 정상 생성(201).
- 변경 파일(핵심)
- `app/src/app/api/posts/route.test.ts`
- `app/src/app/api/posts/[id]/route.test.ts`
- `app/src/app/api/reports/route.test.ts`
- `app/src/app/api/auth/register/route.test.ts`
- `PLAN.md`
- 검증 결과
- `cd app && pnpm test -- src/app/api/posts/route.test.ts "src/app/api/posts/[id]/route.test.ts" src/app/api/reports/route.test.ts src/app/api/auth/register/route.test.ts` 통과 (4 files, 14 tests)
- `cd app && pnpm lint src/app/api/posts/route.test.ts "src/app/api/posts/[id]/route.test.ts" src/app/api/reports/route.test.ts src/app/api/auth/register/route.test.ts` 통과
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- 없음.

### 2026-02-24: Cycle 46 5차 진행 (GuestAuthor 분리 설계 초안)
- 완료 내용
- 비회원 작성자 분리 목표/스키마 초안/서비스 변경 방향/백필 전략을 문서화해 마이그레이션 실행 단위를 고정.
- `GuestAuthor` 모델 도입, `Post/Comment.guestAuthorId` 확장, dual-write -> backfill -> read switch -> cleanup 단계로 분리한 실행 계획을 정의.
- 변경 파일(핵심)
- `docs/ops/guest-author-migration-plan.md`
- 이슈/블로커
- 백필 시 `GuestAuthor` 중복 병합 정책(게시물 단위 vs 식별자 단위) 의사결정 필요.

### 2026-02-24: Cycle 46 5차 완료 (GuestAuthor schema expand + dual-write 1차)
- 완료 내용
- Prisma schema에 `GuestAuthor` 모델을 추가하고 `Post.guestAuthorId`, `Comment.guestAuthorId` 관계를 확장.
- 마이그레이션 SQL을 추가해 테이블/인덱스/외래키를 생성하도록 반영.
- 비회원 게시글/댓글 작성 경로를 `guest system user + GuestAuthor` 구조로 전환해 비회원 작성마다 `User`를 생성하던 오염 경로를 제거.
- 게시글/댓글의 기존 guest 메타 컬럼(`guestDisplayName`, `guestPasswordHash`, `guestIpHash` 등)은 dual-write로 유지해 하위 호환성을 보장.
- 변경 파일(핵심)
- `app/prisma/schema.prisma`
- `app/prisma/migrations/20260224235000_add_guest_author_model/migration.sql`
- `app/src/server/services/guest-author.service.ts`
- `app/src/server/services/post.service.ts`
- `app/src/app/api/posts/[id]/comments/route.ts`
- `app/src/server/services/comment.service.ts`
- `PLAN.md`
- 검증 결과
- `cd app && pnpm prisma generate` 통과
- `cd app && pnpm lint "src/app/api/posts/[id]/comments/route.ts" src/server/services/post.service.ts src/server/services/comment.service.ts src/server/services/guest-author.service.ts` 통과
- `cd app && pnpm typecheck` 통과
- `cd app && pnpm test -- src/app/api/posts/route.test.ts "src/app/api/posts/[id]/route.test.ts" src/app/api/reports/route.test.ts src/app/api/auth/register/route.test.ts src/server/auth.test.ts` 통과 (5 files, 21 tests)
- 이슈/블로커
- 기존 guest post/comment 데이터 백필 스크립트는 아직 미구현(다음 단계에서 처리).

### 2026-02-24: Cycle 46 6차 진행 (피드 개인화 쿼리 예산 절감 1차)
- 완료 내용
- 피드 페이지에서 사용자 반려동물 조회를 항상 수행하던 경로를 제거하고, 광고 슬롯이 실제 필요한 조건(`인증 사용자 + ALL 모드 + GLOBAL`)에서만 조회하도록 조건화.
- `listPetsByUserId`에 `limit` 옵션을 추가해 광고 타겟팅에 필요한 최소 데이터(1건)만 조회하도록 최적화.
- 변경 파일(핵심)
- `app/src/app/feed/page.tsx`
- `app/src/server/queries/user.queries.ts`
- 검증 결과
- `cd app && pnpm lint src/app/feed/page.tsx src/server/queries/user.queries.ts "src/app/api/posts/[id]/comments/route.ts" src/server/services/post.service.ts src/server/services/comment.service.ts src/server/services/guest-author.service.ts` 통과
- `cd app && pnpm typecheck` 통과
- `cd app && pnpm test -- src/server/services/comment.service.test.ts src/server/services/post.service.test.ts` 통과 (2 files, 11 tests)
- 이슈/블로커
- 쿼리 캐시 계층(예: 세션/짧은 TTL) 추가는 후속 최적화로 남음.

### 2026-02-24: Cycle 46 6차 완료 (피드 개인화 쿼리 예산 절감)
- 완료 내용
- `listPetsByUserId`에 `limit`/`cacheTtlMs` 옵션을 도입하고, short-lived 메모리 캐시를 추가해 동일 사용자 반복 조회 비용을 절감.
- 피드 광고 타겟팅에 필요한 반려동물 조회를 `limit: 1`, `cacheTtlMs: 60_000`으로 제한해 비개인화 시 불필요 쿼리를 회피.
- 변경 파일(핵심)
- `app/src/server/queries/user.queries.ts`
- `app/src/app/feed/page.tsx`
- `PLAN.md`
- 검증 결과
- `cd app && pnpm lint src/app/feed/page.tsx src/server/queries/user.queries.ts` 통과
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- 인메모리 캐시는 인스턴스 단위이므로 멀티 인스턴스 캐시 일관성은 보장하지 않음(현 단계 허용).

### 2026-02-24: Cycle 46 7차 완료 (작성/수정 에디터 직렬화 공통화)
- 완료 내용
- 작성폼/수정폼에 중복되어 있던 에디터 HTML -> 마크업 직렬화 로직을 `editor-content-serializer` 모듈로 통합.
- 공통 모듈에 헤더/리스트/인라인 스타일/링크/이미지 직렬화 규칙을 일원화해 향후 에디터 규칙 변경 시 단일 파일만 수정하도록 구조 개선.
- 변경 파일(핵심)
- `app/src/lib/editor-content-serializer.ts`
- `app/src/components/posts/post-create-form.tsx`
- `app/src/components/posts/post-detail-edit-form.tsx`
- `PLAN.md`
- 검증 결과
- `cd app && pnpm lint src/lib/editor-content-serializer.ts src/components/posts/post-create-form.tsx src/components/posts/post-detail-edit-form.tsx` 통과
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- 직렬화 규칙 회귀를 위한 DOM 기반 단위테스트(jsdom 환경) 추가는 후속 과제.

### 2026-02-24: Cycle 46 8차 완료 (감사로그 export limit 정합화)
- 완료 내용
- `auth-audit` 쿼리의 최대 한도를 상수(`AUTH_AUDIT_LOG_LIMIT_MAX`)로 정의하고 목록/CSV export 라우트가 동일 상수를 사용하도록 통일.
- export 라우트의 `limit` 검증 최대값과 기본값을 쿼리 clamp와 동일하게 맞춰 운영자 기대치와 실제 반환 건수 불일치를 해소.
- 변경 파일(핵심)
- `app/src/server/queries/auth-audit.queries.ts`
- `app/src/app/api/admin/auth-audits/route.ts`
- `app/src/app/api/admin/auth-audits/export/route.ts`
- `PLAN.md`
- 검증 결과
- `cd app && pnpm lint src/app/api/admin/auth-audits/route.ts src/app/api/admin/auth-audits/export/route.ts src/server/queries/auth-audit.queries.ts` 통과
- `cd app && pnpm typecheck` 통과
- `cd app && pnpm test -- src/app/api/posts/route.test.ts "src/app/api/posts/[id]/route.test.ts" src/app/api/reports/route.test.ts src/app/api/auth/register/route.test.ts` 통과 (4 files, 14 tests)
- 이슈/블로커
- 없음.

### 2026-02-24: Cycle 47 1차 완료 (GuestAuthor 백필 스크립트)
- 완료 내용
- 기존 guest post/comment에서 `guestAuthorId`가 비어있는 데이터를 대상으로 `GuestAuthor`를 생성하고 연결하는 백필 스크립트를 추가.
- 실행 편의를 위해 package script `db:backfill:guest-authors`를 등록.
- 변경 파일(핵심)
- `app/scripts/backfill-guest-authors.ts`
- `app/package.json`
- `PLAN.md`
- 검증 결과
- `cd app && pnpm lint scripts/backfill-guest-authors.ts src/server/services/guest-author.service.ts` 통과
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- 대량 데이터 환경에서는 배치 크기/트랜잭션 처리량 튜닝이 필요할 수 있음.

### 2026-02-24: Cycle 47 2차 완료 (누락 migration 추적 복원)
- 완료 내용
- `*.sql` ignore 규칙 영향으로 로컬에만 존재하던 guest 정책 관련 Prisma migration 3개를 저장소 추적 대상으로 복원.
- 대상 migration: guest post policy, guest comment policy, guest ip display fields.
- 변경 파일(핵심)
- `app/prisma/migrations/20260224153000_add_guest_post_policy/migration.sql`
- `app/prisma/migrations/20260224173000_add_guest_comment_policy/migration.sql`
- `app/prisma/migrations/20260224181500_add_guest_ip_display_fields/migration.sql`
- `PLAN.md`
- 이슈/블로커
- 없음.

### 2026-02-24: Cycle 48 1차 완료 (GuestAuthor 운영 고도화)
- 완료 내용
- quality gate workflow에 GuestAuthor backfill 안전 게이트를 추가해 `db:push` 이후 `db:backfill:guest-authors` dry-run, `db:verify:guest-authors`를 자동 실행하도록 보강.
- 게시글/댓글 조회 쿼리에 `guestAuthor` relation을 포함하고, 상세/피드/검색/품종라운지 표시에서 `guestAuthor.displayName` fallback을 우선 적용해 read 경로를 GuestAuthor 중심으로 전환.
- 비회원 댓글 route 계약 테스트를 신설해 guest flow에서 `guestAuthorId`가 createComment로 전달되는지와 에러 핸들링을 검증.
- 변경 파일(핵심)
- `.github/workflows/quality-gate.yml`
- `app/src/server/queries/post.queries.ts`
- `app/src/server/queries/comment.queries.ts`
- `app/src/app/posts/[id]/page.tsx`
- `app/src/app/feed/page.tsx`
- `app/src/app/search/page.tsx`
- `app/src/app/lounges/breeds/[breedCode]/page.tsx`
- `app/src/components/posts/post-comment-thread.tsx`
- `app/src/app/api/posts/[id]/comments/route.test.ts`
- `PLAN.md`
- 검증 결과
- `cd app && pnpm lint src/server/queries/post.queries.ts src/server/queries/comment.queries.ts "src/app/posts/[id]/page.tsx" src/app/feed/page.tsx "src/app/lounges/breeds/[breedCode]/page.tsx" src/app/search/page.tsx src/components/posts/post-comment-thread.tsx "src/app/api/posts/[id]/comments/route.test.ts` 통과
- `cd app && pnpm typecheck` 통과
- `cd app && pnpm test -- "src/app/api/posts/[id]/comments/route.test.ts" src/app/api/posts/route.test.ts "src/app/api/posts/[id]/route.test.ts" src/app/api/reports/route.test.ts src/app/api/auth/register/route.test.ts` 통과 (5 files, 17 tests)
- 이슈/블로커
- 없음.

### 2026-02-25: Cycle 52 완료 (Guest legacy cleanup 롤백 리허설 CI 게이트화)
- 완료 내용
- quality gate에 `db:rehearse:guest-legacy-cleanup` 단계를 추가해, GuestAuthor backfill 검증 이후 legacy guest 컬럼 cleanup 롤백 리허설을 자동 실행하도록 확장.
- 로컬에서 동일 리허설 명령을 실행해 `rollback=true` 성공 결과를 확인.
- 변경 파일(핵심)
- `.github/workflows/quality-gate.yml`
- `PLAN.md`
- 검증 결과
- `cd app && pnpm db:rehearse:guest-legacy-cleanup` 통과 (`{"ok":true,"rehearsal":"drop-legacy-guest-columns","rollback":true}`)
- 이슈/블로커
- 없음.

### 2026-02-25: Cycle 53 완료 (Guest 권한 경로 GuestAuthor 우선 통합)
- 완료 내용
- `post.service`의 `updateGuestPost`/`deleteGuestPost`에서 guest 권한 검증 시 `guestAuthor` credential(`passwordHash/ipHash/fingerprintHash`)을 우선 사용하고 legacy 컬럼 fallback을 유지하도록 통합.
- `comment.service`의 `updateGuestComment`/`deleteGuestComment`도 동일하게 GuestAuthor 우선 credential 해석을 도입해 cleanup 이후에도 권한검증이 안정적으로 동작하도록 정리.
- 댓글 스레드 클라이언트 타입에서 `guestPasswordHash` 의존을 제거해 read 경로의 legacy 노출을 축소.
- `guest-post-management.service.test`에 GuestAuthor-only(legacy hash null) 수정/삭제 회귀 케이스를 추가.
- 변경 파일(핵심)
- `app/src/server/services/post.service.ts`
- `app/src/server/services/comment.service.ts`
- `app/src/server/services/guest-post-management.service.test.ts`
- `app/src/components/posts/post-comment-thread.tsx`
- `PLAN.md`
- 검증 결과
- `cd app && pnpm lint src/server/services/post.service.ts src/server/services/comment.service.ts src/server/services/guest-post-management.service.test.ts src/components/posts/post-comment-thread.tsx` 통과
- `cd app && pnpm test -- src/server/services/post-create-policy.test.ts src/server/services/guest-post-management.service.test.ts "src/app/api/posts/[id]/route.test.ts" "src/app/api/posts/[id]/comments/route.test.ts"` 통과 (4 files, 21 tests)
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- 댓글 전용 guest management 서비스 테스트(`updateGuestComment`/`deleteGuestComment`)는 후속 사이클에서 별도 추가 예정.

### 2026-02-19: Cycle 25 잔여 + Cycle 26 착수
- 완료 내용
- `docs/plan/todo.md` 삭제 및 운영 문서를 `PLAN.md`/`PROGRESS.md` 중심으로 전환.
- `/search` 검색을 `tsvector + pg_trgm` 기반 DB 랭킹 검색으로 전환하고, 실패 시 기존 `contains` 검색으로 자동 fallback 처리.
- 검색 인덱스 마이그레이션 추가 (`pg_trgm`, title/content trigram, Post/User tsvector 인덱스).
- 검색 수동 점검 체크리스트 문서화(22개 대표 케이스 + 회귀 체크).
- Notification 스키마/마이그레이션 추가 및 알림 쿼리/서비스/액션 구현.
- 헤더 알림 벨(미확인 배지), `/notifications` 목록/읽음 처리 페이지 구현.
- 댓글/좋아요 이벤트에서 알림 생성 트리거 연동(자기 자신 알림 제외).
- 알림 링크에서 댓글로 이동할 수 있도록 댓글 DOM 앵커(`comment-{id}`) 추가.
- 변경 파일(핵심)
- `app/prisma/schema.prisma`
- `app/prisma/migrations/20260219173000_add_search_indexes/migration.sql`
- `app/prisma/migrations/20260219174500_add_notifications/migration.sql`
- `app/src/server/queries/post.queries.ts`
- `app/src/app/search/page.tsx`
- `docs/plan/search-manual-checklist.md`
- `app/src/server/queries/notification.queries.ts`
- `app/src/server/services/notification.service.ts`
- `app/src/server/actions/notification.ts`
- `app/src/app/notifications/page.tsx`
- `app/src/components/notifications/notification-bell.tsx`
- `app/src/app/layout.tsx`
- `app/src/server/services/comment.service.ts`
- `app/src/server/services/post.service.ts`
- `app/src/components/posts/post-comment-thread.tsx`
- 검증 결과
- `cd app && ./node_modules/.bin/prisma generate` 통과
- `cd app && ./node_modules/.bin/prisma db push` 통과
- `cd app && ./node_modules/.bin/eslint ...` (변경 파일 대상) 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && ./node_modules/.bin/vitest run src/server/queries/post.queries.test.ts src/server/queries/search.queries.test.ts src/server/services/post.service.test.ts` 통과 (19 tests)
- 이슈/블로커
- 알림 E2E 시나리오 미구현.
- 알림 클릭 시 자동 읽음(낙관적 UI) 미구현.
- 검색 수동 점검 체크리스트는 작성 완료, 실제 PASS/WARN/FAIL 기록은 진행 중.
- 결정 기록
- 검색은 DB 랭킹(`ts_rank_cd + similarity`) 우선, 장애 시 폴백으로 가용성 확보.
- Notification 테이블 미동기화 환경을 고려해 쿼리 레이어에 안전 폴백을 추가.

### 2026-02-24: Cycle 44 완료 (모바일 밀도/위계 리파인)
- 완료 내용
- 피드 모바일 헤더 타이포를 추가로 축소하고, 필터 과노출을 줄인 상태를 유지해 목록 진입 전 높이를 낮춤.
- 게시글 상세 모바일 제목을 추가 축소하고 메타/액션 밀도를 더 압축해 화면 길이를 단축.
- 댓글 액션은 모바일에서 `관리`, `반응` 접기 중심 구조를 유지하고 기본 액션만 남겨 정보 과밀을 줄임.
- 글쓰기 화면은 모바일에서 상단 정보/카드 패딩을 축소하고 툴바를 핵심/고급으로 분리해 시야 점유를 완화.
- 변경 파일(핵심)
- `app/src/app/feed/page.tsx`
- `app/src/app/posts/[id]/page.tsx`
- `app/src/app/posts/new/page.tsx`
- `app/src/components/posts/post-create-form.tsx`
- 검증 결과
- `cd app && pnpm lint` 통과
- `cd app && pnpm build` 통과
- 이슈/블로커
- 없음.

### 2026-02-19: 알림 읽음 UX 개선 + 검색 점검 자동 리포트
- 완료 내용
- `/notifications`를 클라이언트 인터랙션 기반으로 전환해 `이동` 클릭 시 자동 읽음 처리 + 낙관적 UI 반영을 적용.
- `모두 읽음 처리`도 낙관적 반영 후 서버 동기화/롤백 처리되도록 개선.
- 검색 대표 케이스 실행 스크립트(`search:check:cases`) 추가 및 결과 리포트 자동 생성(`docs/plan/search-manual-check-results.md`).
- `pg_trgm` 미설치 환경 감지 로직을 검색 쿼리에 추가해, `similarity()` 호출 실패 없이 tsvector 기반으로 안전 동작하도록 보완.
- 변경 파일(핵심)
- `app/src/components/notifications/notification-center.tsx`
- `app/src/app/notifications/page.tsx`
- `app/src/server/actions/notification.ts`
- `app/scripts/check-search-cases.ts`
- `app/src/server/queries/post.queries.ts`
- `app/package.json`
- `docs/plan/search-manual-check-results.md`
- 검증 결과
- `cd app && ./node_modules/.bin/eslint src/app/notifications/page.tsx src/components/notifications/notification-center.tsx src/server/actions/notification.ts src/server/queries/post.queries.ts scripts/check-search-cases.ts` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && ./node_modules/.bin/vitest run src/server/queries/post.queries.test.ts src/server/services/post.service.test.ts` 통과 (16 tests)
- `cd app && ./node_modules/.bin/tsx scripts/check-search-cases.ts` 실행 완료(결과 리포트 생성)
- 이슈/블로커
- 현재 데이터셋 기준으로 자동 리포트 `top5 결과`가 대부분 비어 있어, 시드 데이터 보강 후 PASS/WARN/FAIL 수동 판정 필요.
- 로컬 DB는 `pg_trgm` 확장이 아직 미설치 상태이며 현재는 자동 감지 후 trigram 비활성 모드로 동작.
- 결정 기록
- 알림 UX는 페이지 reload보다 사용자 체감이 좋은 optimistic 업데이트를 우선 채택하고, 서버 액션 실패 시 최소 롤백으로 안정성 확보.
- 검색 점검은 수동 체크리스트만 유지하지 않고 실행 결과를 자동 수집해 회귀 비교 가능한 형태로 저장.

### 2026-02-24: Vercel 이미지 업로드 장애 수정 (로컬 파일 -> Vercel Blob)
- 완료 내용
- 업로드 저장 경로를 환경별로 분리해, 프로덕션(`NODE_ENV=production`)에서는 Vercel Blob으로 저장되도록 변경.
- `BLOB_READ_WRITE_TOKEN` 미설정 상태에서 프로덕션 업로드 요청 시 명확한 서비스 오류(`UPLOAD_STORAGE_NOT_CONFIGURED`)를 반환하도록 보강.
- `next/image` 원격 이미지 허용 목록에 Vercel Blob 도메인(`**.public.blob.vercel-storage.com`)을 추가.
- 운영 가이드에 Blob 환경변수 요구사항/동작 설명을 반영.
- 변경 파일(핵심)
- `app/src/server/upload.ts`
- `app/src/lib/env.ts`
- `app/next.config.ts`
- `app/package.json`
- `docs/GUIDE.md`
- 검증 결과
- 코드 수정 단계 완료(의존성 설치/배포 환경 실검증은 사용자 환경에서 진행 필요).
- 이슈/블로커
- Vercel 프로젝트에 `BLOB_READ_WRITE_TOKEN`이 누락되면 업로드는 계속 실패하므로 환경변수 설정 후 재배포가 필수.
- 결정 기록
- 로컬 개발 편의성을 위해 개발 환경은 기존 `public/uploads` 저장을 유지하고, 프로덕션만 Blob 저장으로 강제.

### 2026-02-24: 글쓰기 본문 내 이미지 즉시 반영 UX 개선
- 완료 내용
- 이미지 첨부 성공 시 본문 에디터에 이미지 마크다운 토큰(`![첨부 이미지](url)`)을 자동 삽입하도록 개선.
- 에디터 직렬화 로직에 `IMG` 태그 처리 경로를 추가해, 본문 내 이미지가 저장 시 누락되지 않도록 보강.
- 경량 마크다운 렌더러에 이미지 토큰 렌더링(`img`)을 추가해 작성/미리보기/상세 화면에서 일관된 본문 이미지 노출이 가능해짐.
- 변경 파일(핵심)
- `app/src/components/posts/post-create-form.tsx`
- `app/src/lib/markdown-lite.ts`
- `app/src/lib/markdown-lite.test.ts`
- 검증 결과
- `cd app && pnpm lint src/components/posts/post-create-form.tsx src/lib/markdown-lite.ts src/lib/markdown-lite.test.ts` 통과
- `cd app && pnpm test -- src/lib/markdown-lite.test.ts` 통과 (4 tests)
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- 첨부 목록에서 이미지를 제거해도 본문에 삽입된 이미지 토큰은 자동 삭제되지 않음(후속 UX 정합 개선 여지).
- 결정 기록
- 기존 첨부 UX를 유지하면서 디시형 작성 경험을 빠르게 반영하기 위해, 본문 자동 삽입 방식을 우선 채택.

### 2026-02-24: 게시글 상세 첨부 표시를 파일명 리스트로 전환
- 완료 내용
- 게시글 본문 하단의 썸네일 이미지 그리드를 제거하고, 첨부 파일명 링크 목록(`첨부파일`)으로 표시 방식을 변경.
- URL 기반 첨부 파일명 추출 유틸을 추가해 Blob/로컬 업로드 URL 모두에서 파일명 표시를 지원.
- 변경 파일(핵심)
- `app/src/app/posts/[id]/page.tsx`
- 검증 결과
- `cd app && pnpm lint "src/app/posts/[id]/page.tsx"` 통과
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- 없음.

### 2026-02-24: 글쓰기/수정 편집 툴바 동작 안정화
- 완료 내용
- 글쓰기 에디터 툴바 클릭 시 선택 영역이 풀리던 문제를 막기 위해 `onMouseDown preventDefault`를 적용해 포맷 명령 적용 안정성을 개선.
- `formatBlock` 실행 시 브라우저 호환 차이를 고려해 `<tag>`/`tag` 순서 fallback을 적용해 목록/인용/코드블록 계열 동작을 보강.
- 요청에 맞춰 글쓰기에서 `H1/H2/H3` 버튼을 제거하고, 크기 조절(`작게~매우 크게`) 중심으로 정리.
- 게시글 수정 화면을 단순 textarea에서 툴바 + 작성/미리보기 구조로 확장해, 수정 시에도 목록/번호목록/인용/색상/밑줄 등 텍스트 메뉴를 동일하게 사용할 수 있도록 반영.
- 변경 파일(핵심)
- `app/src/components/posts/post-create-form.tsx`
- `app/src/components/posts/post-detail-edit-form.tsx`
- 검증 결과
- `cd app && pnpm lint src/components/posts/post-create-form.tsx src/components/posts/post-detail-edit-form.tsx` 통과
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- 없음.

### 2026-02-24: 수정 화면 마크다운 토큰 노출 제거
- 완료 내용
- 게시글 수정 화면을 textarea 기반 마크다운 편집에서 contentEditable 기반 WYSIWYG 편집으로 전환해, 강조/기울임 적용 시 `**`, `*` 같은 토큰이 입력창에 보이지 않도록 개선.
- 수정 툴바도 글쓰기와 동일하게 선택 영역 기준 스타일 적용(굵게/기울임/목록/인용/크기/색상)으로 동작하도록 정합화.
- 변경 파일(핵심)
- `app/src/components/posts/post-detail-edit-form.tsx`
- 검증 결과
- `cd app && pnpm lint src/components/posts/post-detail-edit-form.tsx` 통과
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- 없음.

### 2026-02-24: 에디터 이미지 드래그 리사이즈 추가
- 완료 내용
- 글쓰기/수정 에디터에서 본문 이미지에 커서를 올린 뒤 드래그해 너비를 조절할 수 있도록 포인터 리사이즈 인터랙션을 추가.
- 이미지 너비를 마크다운 확장 토큰(`{width=320}`)으로 직렬화/역직렬화해 저장 후에도 크기 설정이 유지되도록 보강.
- 마크다운 렌더러에 이미지 너비 토큰 파싱을 추가해 상세/미리보기에서 리사이즈 결과를 재현.
- 변경 파일(핵심)
- `app/src/components/posts/post-create-form.tsx`
- `app/src/components/posts/post-detail-edit-form.tsx`
- `app/src/lib/markdown-lite.ts`
- `app/src/lib/markdown-lite.test.ts`
- 검증 결과
- `cd app && pnpm lint src/components/posts/post-create-form.tsx src/components/posts/post-detail-edit-form.tsx src/lib/markdown-lite.ts src/lib/markdown-lite.test.ts` 통과
- `cd app && pnpm test -- src/lib/markdown-lite.test.ts` 통과 (5 tests)
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- 현재는 가로 드래그 기반 너비 조절이며, 높이는 비율 유지(`auto`)로 자동 계산됨.

### 2026-02-24: 이미지 리사이즈 핸들 UX 개선
- 완료 내용
- 이미지 전체 드래그 리사이즈를 중단하고, 우하단 모서리 영역에서만 리사이즈가 시작되도록 변경.
- 이미지 hover 시 우하단 리사이즈 핸들(작은 사각형)과 점선 아웃라인을 표시해 조절 포인트를 명확히 노출.
- 글쓰기/수정 에디터 모두 동일한 모서리 리사이즈 UX로 정합화.
- 변경 파일(핵심)
- `app/src/components/posts/post-create-form.tsx`
- `app/src/components/posts/post-detail-edit-form.tsx`
- 검증 결과
- `cd app && pnpm lint src/components/posts/post-create-form.tsx src/components/posts/post-detail-edit-form.tsx` 통과
- `cd app && pnpm typecheck` 통과

### 2026-02-24: 작성/수정/보기 이미지 동기화 보강
- 완료 내용
- 작성 화면: 업로드 박스와 본문 이미지 토큰을 양방향 동기화하도록 개선(업로드 추가 시 본문 삽입, 업로드 제거 시 본문 토큰 제거).
- 수정 화면: 작성 화면과 동일하게 업로드 즉시 본문 자동 삽입 + 제거 동기화를 반영.
- 작성/수정 공통: 에디터 입력(sync) 시 본문에서 실제 이미지 토큰 URL을 추출해 `imageUrls`를 재동기화하여 첨부파일 목록/본문 불일치 방지.
- 제출 시 `imageUrls`는 에디터 직렬화 결과에서 다시 추출한 값으로 전송해 서버 저장 정합성 확보.
- 공통 유틸(`editor-image-markup`)을 추가해 URL 추출/토큰 생성/삭제/배열 비교 로직을 재사용 구조로 정리.
- 변경 파일(핵심)
- `app/src/components/posts/post-create-form.tsx`
- `app/src/components/posts/post-detail-edit-form.tsx`
- `app/src/lib/editor-image-markup.ts`
- `app/src/lib/editor-image-markup.test.ts`
- 검증 결과
- `cd app && pnpm lint src/components/posts/post-create-form.tsx src/components/posts/post-detail-edit-form.tsx src/lib/editor-image-markup.ts src/lib/editor-image-markup.test.ts` 통과
- `cd app && pnpm test -- src/lib/editor-image-markup.test.ts src/lib/markdown-lite.test.ts` 통과 (9 tests)
- `cd app && pnpm typecheck` 통과

### 2026-02-24: 업로드 체감 속도 개선 1차
- 완료 내용
- 브라우저->서버->Blob 경유 업로드 대신, 기본 경로를 브라우저 직접 Blob 업로드(`@vercel/blob/client upload`)로 전환하고 서버는 토큰 발급 라우트(`POST /api/upload/client`)만 수행하도록 추가.
- 업로드 전 클라이언트에서 이미지 리사이즈/압축(최대 1920px, webp 품질 0.82) 경로를 추가해 전송 바이트를 축소.
- 다중 업로드/전체 재시도를 제한 병렬(동시 3개)로 튜닝해 총 소요시간을 단축.
- 레거시 `/api/upload` 경로는 fallback으로 유지하고, JPEG EXIF 제거는 1MB 이상 파일에서만 수행하도록 최적화.
- 변경 파일(핵심)
- `app/src/components/ui/image-upload-field.tsx`
- `app/src/app/api/upload/client/route.ts`
- `app/src/server/upload.ts`
- 검증 결과
- `cd app && pnpm lint src/components/ui/image-upload-field.tsx src/app/api/upload/client/route.ts src/server/upload.ts` 통과
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- Vercel 지역/네트워크 구간 지연은 인프라 설정 영향이 있어 코드 개선과 별도로 관찰 필요.

### 2026-02-24: 업로더 연속 파일 선택 안정화
- 완료 내용
- 배포 환경에서 두 번째 파일 선택부터 반응이 둔감해지는 케이스를 줄이기 위해 파일 input 클릭 시 `value`를 즉시 초기화해 동일/연속 선택에도 `change` 이벤트가 안정적으로 발생하도록 보강.
- 업로드 콜백에서 stale props 참조를 피하기 위해 최신 첨부 상태를 ref로 관리해 연속 업로드 시 누락 가능성을 완화.
- 변경 파일(핵심)
- `app/src/components/ui/image-upload-field.tsx`
- 검증 결과
- `cd app && pnpm lint src/components/ui/image-upload-field.tsx` 통과
- `cd app && pnpm typecheck` 통과

### 2026-02-24: 비회원 이미지 URL 링크 오탐 차단
- 완료 내용
- 비회원 링크/연락처 차단 정책 검사에서 이미지 마크다운 토큰(`![...](url)`)을 사전 제거한 텍스트 기준으로 검증하도록 변경해 이미지 첨부가 `외부 링크`로 오탐되는 문제를 수정.
- 업로드 input은 첨부 한도 초과 시에도 선택 UI가 무반응처럼 보이지 않도록 비활성 조건을 `isBusy` 중심으로 조정하고 안내 문구를 명확화.
- 변경 파일(핵심)
- `app/src/server/services/post.service.ts`
- `app/src/components/ui/image-upload-field.tsx`
- 검증 결과
- `cd app && pnpm lint src/components/ui/image-upload-field.tsx src/server/services/post.service.ts` 통과
- `cd app && pnpm typecheck` 통과

### 2026-02-24: PLAN/PROGRESS 동기화 정리
- 완료 내용
- 업로드 성능/정합 핫픽스(직업로드, 압축/병렬 튜닝, 연속 선택 안정화, 비회원 링크 오탐 수정)를 `PLAN.md` Cycle 45와 `PROGRESS.md` 실행 로그에 반영.
- 변경 파일(핵심)
- `PLAN.md`
- `PROGRESS.md`

### 2026-02-19: 알림/댓글 플로우 자동 검증 강화
- 완료 내용
- `comment.service`에 대해 댓글 생성/답글 생성 시 알림 트리거가 기대대로 호출되는 통합 테스트를 추가.
- `post.service`에 대해 좋아요 반응 시 알림 트리거 호출 여부를 검증하도록 테스트를 보강.
- 기존 알림 서비스 단위 테스트와 합쳐 `댓글/반응 -> 알림 생성` 플로우를 자동 검증 체계로 정리.
- 변경 파일(핵심)
- `app/src/server/services/comment.service.test.ts`
- `app/src/server/services/post.service.test.ts`
- 검증 결과
- `cd app && ./node_modules/.bin/eslint src/server/services/comment.service.test.ts src/server/services/post.service.test.ts` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && ./node_modules/.bin/vitest run src/server/services/comment.service.test.ts src/server/services/post.service.test.ts src/server/services/notification.service.test.ts` 통과 (12 tests)
- 이슈/블로커
- 브라우저 레벨 E2E(Playwright) 시나리오는 저장소에 실행 환경/의존성이 아직 없어 미착수.
- 결정 기록
- Playwright 도입 전에도 핵심 서버 플로우를 먼저 고정해 회귀 위험을 줄이는 전략을 채택.

### 2026-02-19: DB 기반 알림/댓글 E2E 플로우 러너 추가
- 완료 내용
- 실DB를 대상으로 `글 생성 -> 댓글 생성 -> 알림 생성 -> 읽음 처리 -> 데이터 정리`를 한 번에 검증하는 실행 스크립트 추가.
- 스크립트를 `package.json`에 등록해 반복 실행 가능한 회귀 점검 커맨드 확보.
- 변경 파일(핵심)
- `app/scripts/e2e-notification-comment-flow.ts`
- `app/package.json`
- 검증 결과
- `cd app && ./node_modules/.bin/tsx scripts/e2e-notification-comment-flow.ts` 실행 성공
- 실행 로그:
  - recipient=`power.reviewer@townpet.dev`
  - actor=`mod.trust@townpet.dev`
  - notification 생성/읽음/정리 완료
- 이슈/블로커
- 브라우저 레벨 E2E는 여전히 미구현(Playwright 환경 필요).
- 결정 기록
- 외부 E2E 툴 의존 전에 DB 실플로우 러너를 먼저 고정해 핵심 동작 회귀를 즉시 감지할 수 있도록 함.

### 2026-02-19: Cycle 25 마무리 (검색 로그 구조 전환 + 수동 판정 완료)
- 완료 내용
- 검색 인기어 집계를 `SiteSetting(JSON)`에서 `SearchTermStat` 전용 테이블로 전환.
- `recordSearchTerm`을 원자적 upsert increment 방식으로 변경해 고트래픽 경쟁 상태에서 누락 위험을 줄임.
- 미동기화 환경을 위해 `SearchTermStat` 미존재 시 `SiteSetting` fallback 경로를 유지.
- 검색 대표 케이스 시드 스크립트(`seed-search-cases.ts`)를 추가해 22개 대표 질의를 실제 데이터로 재현.
- `산책코스`처럼 공백 변형 질의 누락 문제를 해결하기 위해 제목 공백 제거 매칭(`REPLACE(title, ' ', '')`)을 검색 SQL에 추가.
- 수동 판정 결과 기록 완료: `PASS 20 / WARN 2 / FAIL 0`.
- `check-search-cases.ts`를 보강해 재실행 시 기존 상태/메모를 유지하고 요약 카운트를 자동 계산.
- 변경 파일(핵심)
- `app/prisma/schema.prisma`
- `app/prisma/migrations/20260219184000_add_search_term_stats/migration.sql`
- `app/src/server/queries/search.queries.ts`
- `app/src/server/queries/search.queries.test.ts`
- `app/src/server/queries/post.queries.ts`
- `app/scripts/seed-search-cases.ts`
- `app/scripts/check-search-cases.ts`
- `docs/plan/search-manual-check-results.md`
- 검증 결과
- `cd app && ./node_modules/.bin/prisma generate` 통과
- `cd app && ./node_modules/.bin/prisma db push` 통과
- `cd app && ./node_modules/.bin/eslint src/server/queries/post.queries.ts src/server/queries/search.queries.ts src/server/queries/search.queries.test.ts scripts/seed-search-cases.ts scripts/check-search-cases.ts` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && ./node_modules/.bin/vitest run src/server/queries/post.queries.test.ts src/server/queries/search.queries.test.ts` 통과 (15 tests)
- `cd app && ./node_modules/.bin/tsx scripts/seed-search-cases.ts` 실행 성공 (created=22)
- `cd app && ./node_modules/.bin/tsx scripts/check-search-cases.ts` 실행 성공 (리포트 생성)
- 이슈/블로커
- 로컬 DB에는 `pg_trgm` 확장을 적용했으며, 동일 설정을 운영 DB에도 반영해야 함.
- 결정 기록
- 점진 전환을 위해 신규 테이블을 기본 경로로 두고, 런타임 호환성 확보를 위해 구형 저장소 fallback을 일정 기간 유지.
- 수동 판정 결과 덮어쓰기를 방지하기 위해 리포트 생성 스크립트에 상태 보존 로직을 추가.

### 2026-02-19: Cycle 24 잔여 완료 (100+ 무한 스크롤 성능 실측)
- 완료 내용
- 피드 무한 스크롤 성능 실측용 Playwright 시나리오를 추가하고, 실행 결과를 문서 리포트로 자동 기록하도록 구성.
- 테스트 안정화를 위해 피드 리스트/아이템/센티넬에 `data-testid`를 부여.
- 성능 측정 시나리오에서 140개 샘플 게시글을 시드한 뒤 `/feed?scope=GLOBAL&mode=ALL&limit=20&sort=LATEST` 기준으로 연속 스크롤, 프레임 샘플, jank 비율, heap 사용량을 수집.
- 성능 리포트 생성: `docs/plan/feed-scroll-performance-report.md`.
- 변경 파일(핵심)
- `app/src/components/posts/feed-infinite-list.tsx`
- `app/e2e/feed-scroll-performance.spec.ts`
- `app/package.json`
- `docs/GUIDE.md`
- `docs/plan/feed-scroll-performance-report.md`
- 검증 결과
- `cd app && ./node_modules/.bin/eslint src/components/posts/feed-infinite-list.tsx e2e/feed-scroll-performance.spec.ts` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && pnpm perf:feed:scroll` 통과 (Playwright 1 test)
- 측정 요약
  - 로드 게시글 수: 159
  - 평균 프레임 간격: 19.25ms
  - p95 프레임 간격: 33.3ms
  - jank(>50ms): 3.21%
  - 판정: PASS
- 이슈/블로커
- 성능 측정은 로컬 개발 환경(headless Chromium) 기준이므로, 운영 배포 전 staging 환경에서도 동일 시나리오 재측정 필요.
- 결정 기록
- Cycle 24 DoD(100+ 로딩 + 프레임/jank 기록 + 병목 기록)를 자동화 스크립트와 리포트 산출물로 고정.

### 2026-02-19: Cycle 26 1차 착수 (댓글 정렬/답글 접기 UI)
- 완료 내용
- 댓글 스레드에 `오래된순/최신순` 정렬 토글을 추가해 읽기 흐름을 사용자 선택으로 전환.
- 루트 댓글 단위로 `답글 N개 접기/펼치기` 토글을 추가해 긴 스레드 가독성을 개선.
- 기존 답글/수정/삭제/신고 동선과 충돌 없이 동작하도록 상태를 분리(`sortOrder`, `collapsedReplies`).
- 변경 파일(핵심)
- `app/src/components/posts/post-comment-thread.tsx`
- 검증 결과
- `cd app && ./node_modules/.bin/eslint src/components/posts/post-comment-thread.tsx` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- 이슈/블로커
- Cycle 26 최종 DoD(댓글 반응 포함) 기준으로는 아직 미완료이며, 댓글 반응 모델/액션 설계가 다음 단계.
- 결정 기록
- 사용성 체감이 큰 정렬/접기를 먼저 적용하고, 데이터 모델 변경이 필요한 반응 기능은 2차로 분리해 리스크를 낮춤.

### 2026-02-19: Cycle 26 완료 (댓글 반응 + 읽은 글 시각 처리)
- 완료 내용
- 댓글 반응(`추천/비추천`)을 DB 모델/서비스/서버액션/UI까지 전면 연결.
- `CommentReaction` 모델 및 `Comment.likeCount/dislikeCount` 집계를 추가해 댓글별 반응 상태를 안정적으로 유지.
- 상세 페이지 댓글 조회 시 현재 사용자 반응(`reactions`)을 함께 로드해 버튼 상태를 정확히 표시.
- 피드에서 읽은 게시글은 제목/요약을 흐린 색으로 표시하도록 클라이언트 읽음 상태(localStorage) 도입.
- 변경 파일(핵심)
- `app/prisma/schema.prisma`
- `app/prisma/migrations/20260219193000_add_comment_reactions/migration.sql`
- `app/src/server/services/comment.service.ts`
- `app/src/server/actions/comment.ts`
- `app/src/server/queries/comment.queries.ts`
- `app/src/components/posts/comment-reaction-controls.tsx`
- `app/src/components/posts/post-comment-thread.tsx`
- `app/src/components/posts/feed-infinite-list.tsx`
- `app/src/app/posts/[id]/page.tsx`
- `app/src/server/services/comment.service.test.ts`
- 검증 결과
- `cd app && ./node_modules/.bin/prisma generate` 통과
- `cd app && ./node_modules/.bin/prisma db push` 통과
- `cd app && ./node_modules/.bin/eslint src/components/posts/feed-infinite-list.tsx src/components/posts/post-comment-thread.tsx src/components/posts/comment-reaction-controls.tsx src/server/actions/comment.ts src/server/services/comment.service.ts src/server/services/comment.service.test.ts src/server/queries/comment.queries.ts src/app/posts/[id]/page.tsx` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && ./node_modules/.bin/vitest run src/server/services/comment.service.test.ts` 통과 (5 tests)
- 이슈/블로커
- 읽은 글 상태는 브라우저 localStorage 기준이라 기기/브라우저 간 동기화는 되지 않음.
- 결정 기록
- 댓글 반응은 우선 Post 반응과 동일한 UX를 맞추기 위해 `추천/비추천` 2버튼 낙관적 업데이트 패턴을 재사용.
- 읽은 글 표시는 서버 저장보다 UX 반응성이 높은 클라이언트 저장소 방식으로 1차 적용.

### 2026-02-19: Cycle 22 잔여 2차 완료 (업로드 재시도 UX + 업로드 E2E)
- 완료 내용
- `ImageUploadField`에 실패 파일 큐를 도입해 업로드 실패 시 개별 재시도/전체 재시도/실패 항목 제거를 지원.
- 파일별 실패 사유를 표시하고, 한도 초과/재시도 실패 메시지를 행동 가능한 문구로 정리.
- 업로드 플로우 브라우저 E2E를 추가해 `로그인 -> 게시글 이미지 업로드 -> 상세 첨부 이미지 확인 -> 글 삭제`까지 자동 검증.
- 읽은 글 가독성 요청 반영: 피드에서 읽은 글 제목/요약 색을 더 옅게 조정.
- 변경 파일(핵심)
- `app/src/components/ui/image-upload-field.tsx`
- `app/e2e/image-upload-flow.spec.ts`
- `app/src/components/posts/feed-infinite-list.tsx`
- `app/package.json`
- 검증 결과
- `cd app && ./node_modules/.bin/eslint src/components/ui/image-upload-field.tsx e2e/image-upload-flow.spec.ts src/components/posts/feed-infinite-list.tsx` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && pnpm test:e2e:upload` 통과 (Playwright 1 test)
- 이슈/블로커
- 없음.
- 결정 기록
- 업로드 E2E는 피드 목록 검색 의존도를 제거하기 위해 생성 게시글 ID를 DB에서 조회해 상세 검증으로 바로 연결.
- Playwright 로그인 쿠키 호스트 불일치 이슈를 피하기 위해 업로드 E2E 스크립트는 `PLAYWRIGHT_BASE_URL=http://localhost:3000`으로 고정.

### 2026-02-19: Cycle 22 완료 (느린 네트워크 skeleton 검증)
- 완료 내용
- 피드 로딩 스켈레톤에 테스트 식별자(`feed-loading-skeleton`)를 추가.
- 개발/테스트 전용으로 `debugDelayMs` 지연 파라미터를 피드 페이지에 도입(프로덕션에서는 무시).
- Playwright 시나리오를 추가해 느린 응답 상황에서 스켈레톤 표시 후 피드 본문 렌더링까지 자동 검증.
- 변경 파일(핵심)
- `app/src/app/feed/loading.tsx`
- `app/src/app/feed/page.tsx`
- `app/e2e/feed-loading-skeleton.spec.ts`
- `app/package.json`
- 검증 결과
- `cd app && ./node_modules/.bin/eslint src/app/feed/page.tsx src/app/feed/loading.tsx e2e/feed-loading-skeleton.spec.ts` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && pnpm test:e2e:feed-loading` 통과 (Playwright 1 test)
- 이슈/블로커
- 없음.
- 결정 기록
- 링크 prefetch로 인해 skeleton 노출 타이밍 검증이 불안정해서, `debugDelayMs` 기반 결정적 테스트 방식으로 전환.
- 지연 파라미터는 `NODE_ENV=production`에서 무시되도록 제한해 운영 영향 차단.

### 2026-02-19: Cycle 23 부분 완료 (카카오 진입 E2E + OAuth 운영 문서화)
- 완료 내용
- 카카오 OAuth 운영 절차(콘솔 설정/리다이렉트 URI/키 로테이션/스모크 실행법)를 `GUIDE`에 문서화.
- 카카오 로그인 진입 Playwright 시나리오 추가:
  - 로그인 페이지에서 카카오 버튼 노출 확인
  - 카카오 로그인 진입 요청(`/api/auth/signin/kakao`) 시작 확인
  - 회원가입 페이지 카카오 가입 버튼 노출 확인
- 개발/테스트 환경에서만 `devShowKakao=1` 플래그로 카카오 버튼/진입 동선을 강제 노출하도록 보강(프로덕션 영향 없음).
- 변경 파일(핵심)
- `docs/GUIDE.md`
- `app/e2e/kakao-login-entry.spec.ts`
- `app/src/app/login/page.tsx`
- `app/src/app/register/page.tsx`
- `app/src/components/auth/login-form.tsx`
- `app/src/components/auth/register-form.tsx`
- `app/src/components/auth/kakao-signin-button.tsx`
- `app/package.json`
- 검증 결과
- `cd app && ./node_modules/.bin/eslint src/components/auth/kakao-signin-button.tsx src/components/auth/login-form.tsx src/components/auth/register-form.tsx src/app/login/page.tsx src/app/register/page.tsx e2e/kakao-login-entry.spec.ts` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && pnpm test:e2e:kakao-entry` 통과 (Playwright 2 tests)
- 이슈/블로커
- 실제 `카카오 계정 로그인 -> 온보딩 -> 피드 진입` 전체 E2E는 카카오 테스트 앱 계정/권한이 필요.
- 결정 기록
- 로컬 dev 서버 락/외부 OAuth 의존성으로 인해 전체 플로우 대신, 회귀에 유의미한 `진입 스모크`를 먼저 자동화하고 전체 플로우는 환경 의존 작업으로 분리.

### 2026-02-19: Cycle 23 확장 (네이버 로그인 추가)
- 완료 내용
- NextAuth에 `Naver Provider`를 추가하고, 카카오와 동일하게 계정 링크/이메일 미동의 예외 처리를 적용.
- 로그인/회원가입 화면에 네이버 소셜 버튼을 추가하고, 개발 환경에서 `devShowNaver=1`로 진입 동선 강제 노출 가능하도록 보강.
- 네이버 로그인 진입 스모크 E2E를 추가해 버튼 노출/`/api/auth/signin/naver` 요청 시작을 자동 검증.
- 운영 가이드에 네이버 OAuth 설정/키 로테이션 절차를 문서화.
- 변경 파일(핵심)
- `app/src/lib/auth.ts`
- `app/src/lib/env.ts`
- `app/src/components/auth/naver-signin-button.tsx`
- `app/src/components/auth/login-form.tsx`
- `app/src/components/auth/register-form.tsx`
- `app/src/app/login/page.tsx`
- `app/src/app/register/page.tsx`
- `app/e2e/naver-login-entry.spec.ts`
- `app/package.json`
- `docs/GUIDE.md`
- `PLAN.md`
- 검증 결과
- `cd app && ./node_modules/.bin/eslint src/lib/auth.ts src/lib/env.ts src/components/auth/naver-signin-button.tsx src/components/auth/login-form.tsx src/components/auth/register-form.tsx src/app/login/page.tsx src/app/register/page.tsx e2e/naver-login-entry.spec.ts` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && pnpm test:e2e:naver-entry` 통과 (Playwright 2 tests)
- 이슈/블로커
- 실제 `네이버 계정 로그인 -> 온보딩 -> 피드 진입` 전체 E2E는 네이버 테스트 앱 계정/권한이 필요.
- 결정 기록
- 카카오와 동일한 운영 패턴을 유지하기 위해 네이버도 `진입 스모크 자동화 + 실계정 전체 플로우는 환경 의존 분리` 전략을 채택.

### 2026-02-19: Cycle 27 착수 (신규 계정 24시간 고위험 작성 제한)
- 완료 내용
- 신규 계정(가입 후 24시간) 고위험 카테고리 작성 제한 정책을 서버단에서 강제 적용.
- 제한 대상 카테고리: `MARKET_LISTING`, `LOST_FOUND`, `MEETUP`.
- 일반 사용자(`USER`)만 제한하고 `ADMIN`/`MODERATOR`는 제한에서 제외.
- 제한 위반 시 `NEW_USER_RESTRICTED_TYPE(403)`으로 명확한 안내 메시지 반환.
- 변경 파일(핵심)
- `app/src/lib/post-write-policy.ts`
- `app/src/server/services/post.service.ts`
- `app/src/lib/post-write-policy.test.ts`
- `app/src/server/services/post-create-policy.test.ts`
- `PLAN.md`
- 검증 결과
- `cd app && ./node_modules/.bin/eslint src/lib/post-write-policy.ts src/lib/post-write-policy.test.ts src/server/services/post.service.ts src/server/services/post-create-policy.test.ts` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && ./node_modules/.bin/vitest run src/lib/post-write-policy.test.ts src/server/services/post-create-policy.test.ts src/server/services/post.service.test.ts` 통과 (13 tests)
- 이슈/블로커
- 현재는 고정 정책(24시간/3개 카테고리)이며 관리자 UI 기반 동적 정책 변경은 미구현.
- 결정 기록
- API/서버액션 양쪽에서 일관되게 동작하도록 `createPost` 서비스 계층에서 정책을 강제.
- 운영 중 회귀를 막기 위해 정책 유닛 테스트 + 서비스 레벨 테스트를 함께 추가.

### 2026-02-19: Cycle 27 진행 (링크/연락처 탐지 + 마스킹/차단)
- 완료 내용
- 게시글/댓글 작성·수정 시 연락처 신호 탐지 정책을 공통 유틸로 추가.
- 탐지 대상: 전화번호, 이메일, 카카오 오픈채팅 링크, 메신저 링크(`t.me`, `wa.me`, `line.me`), 카카오톡 ID 문구.
- 신규 계정(`USER`, 가입 후 24시간 이내)은 연락처 포함 콘텐츠를 `CONTACT_RESTRICTED_FOR_NEW_USER(403)`로 차단.
- 제한 기간이 지난 사용자와 관리자/모더레이터는 저장 시 자동 마스킹 적용.
- 게시글과 댓글 서비스 양쪽에 정책을 연결해 API/서버액션 경로 모두 동일하게 보호.
- 변경 파일(핵심)
- `app/src/lib/contact-policy.ts`
- `app/src/lib/contact-policy.test.ts`
- `app/src/server/services/post.service.ts`
- `app/src/server/services/comment.service.ts`
- `app/src/server/services/post-create-policy.test.ts`
- `app/src/server/services/comment.service.test.ts`
- 검증 결과
- `cd app && ./node_modules/.bin/eslint src/lib/contact-policy.ts src/lib/contact-policy.test.ts src/server/services/post.service.ts src/server/services/comment.service.ts src/server/services/post-create-policy.test.ts src/server/services/comment.service.test.ts` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && ./node_modules/.bin/vitest run src/lib/contact-policy.test.ts src/lib/post-write-policy.test.ts src/server/services/post-create-policy.test.ts src/server/services/comment.service.test.ts src/server/services/post.service.test.ts` 통과 (24 tests)
- 이슈/블로커
- 관리자 UI에서 탐지 패턴/차단 기간을 동적으로 조정하는 기능은 아직 미구현.
- 결정 기록
- 즉시 운영 안정성을 위해 서비스 레이어에서 먼저 강제하고, 프론트 경고 UI는 후속 개선으로 분리.

### 2026-02-19: Cycle 27 완료 (금칙어 정책 + 단계적 제재)
- 완료 내용
- 관리자 정책 화면에 금칙어 정책 편집(라인/쉼표 입력, 저장, 즉시 반영)을 추가.
- 게시글 작성/수정(제목+본문), 댓글 작성/수정(본문)에 금칙어 검사를 적용하고 매칭 시 저장 차단.
- 신고 생성 시 대상 작성자(`targetUserId`)를 서버에서 자동 해석해 저장하도록 보강.
- 신고 승인 처리(`RESOLVED`) 시 운영자가 선택한 경우 단계적 제재를 자동 적용:
  경고 -> 7일 정지 -> 30일 정지 -> 영구 정지.
- `UserSanction` 모델/마이그레이션을 추가하고, 관리자 신고 큐에 최근 제재 이력 패널을 제공해 흐름을 추적 가능하게 개선.
- `requireCurrentUser` 단계에서 활성 정지/영구정지 사용자 기능 사용을 차단하도록 권한 체크를 추가.
- 변경 파일(핵심)
- `app/prisma/schema.prisma`
- `app/prisma/migrations/20260219204000_add_user_sanctions/migration.sql`
- `app/src/lib/forbidden-keyword-policy.ts`
- `app/src/server/queries/policy.queries.ts`
- `app/src/server/services/post.service.ts`
- `app/src/server/services/comment.service.ts`
- `app/src/server/services/report.service.ts`
- `app/src/server/services/sanction.service.ts`
- `app/src/server/queries/sanction.queries.ts`
- `app/src/server/auth.ts`
- `app/src/app/admin/policies/page.tsx`
- `app/src/components/admin/forbidden-keyword-policy-form.tsx`
- `app/src/components/admin/report-actions.tsx`
- `app/src/app/admin/reports/page.tsx`
- 검증 결과
- `cd app && ./node_modules/.bin/prisma generate` 통과
- `cd app && ./node_modules/.bin/prisma db push` 통과
- `cd app && ./node_modules/.bin/eslint src/app/admin/policies/page.tsx src/app/admin/reports/page.tsx src/components/admin/report-actions.tsx src/components/admin/forbidden-keyword-policy-form.tsx src/lib/forbidden-keyword-policy.ts src/lib/forbidden-keyword-policy.test.ts src/lib/validations/policy.ts src/lib/validations/report-update.ts src/server/actions/policy.ts src/server/auth.ts src/server/auth.test.ts src/server/queries/policy.queries.ts src/server/queries/sanction.queries.ts src/server/services/comment.service.ts src/server/services/policy.service.ts src/server/services/post.service.ts src/server/services/report.service.ts src/server/services/sanction.service.ts src/server/services/sanction.service.test.ts src/server/services/post-create-policy.test.ts src/server/services/comment.service.test.ts` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && ./node_modules/.bin/vitest run src/lib/forbidden-keyword-policy.test.ts src/server/services/sanction.service.test.ts src/server/auth.test.ts src/server/services/post-create-policy.test.ts src/server/services/comment.service.test.ts src/server/services/report.service.test.ts` 통과 (24 tests)
- 이슈/블로커
- 운영 배포 환경에서 `UserSanction` 테이블 마이그레이션 적용 전에는 제재 기능이 자동 fallback으로 비활성화됨(코드는 안전 처리됨).
- 결정 기록
- 기존 신고 처리 UX를 유지하기 위해 신고 승인 버튼에 `단계적 제재 적용` 체크박스를 추가하고 기본값을 활성화해 운영 실수를 줄임.
- 신규 모델 도입 구간의 런타임 오류를 피하기 위해 제재 조회/저장 로직에 `delegate/table missing` fallback 경로를 함께 구현.

### 2026-02-19: Cycle 27 완료 (유저 차단/뮤트)
- 완료 내용
- `UserBlock`, `UserMute` 모델/마이그레이션을 추가하고 사용자 관계 관리 기반을 구축.
- 피드/검색/게시글 상세/댓글 조회에서 차단·뮤트 대상 작성자의 콘텐츠를 자동 제외하도록 쿼리 레이어를 확장.
- 게시글/댓글 반응, 댓글 작성, 신고 접수 시 차단 관계를 검사해 상호작용을 차단.
- 게시글 상세 작성자 영역과 댓글 목록에서 바로 `차단/뮤트` 제어할 수 있는 UI를 추가.
- 내 프로필에 차단/뮤트 목록 관리 섹션을 추가해 해제 동선을 제공.
- 변경 파일(핵심)
- `app/prisma/schema.prisma`
- `app/prisma/migrations/20260219213000_add_user_block_and_mute/migration.sql`
- `app/src/server/queries/user-relation.queries.ts`
- `app/src/server/services/user-relation.service.ts`
- `app/src/server/actions/user-relation.ts`
- `app/src/components/user/user-relation-controls.tsx`
- `app/src/server/queries/post.queries.ts`
- `app/src/server/queries/comment.queries.ts`
- `app/src/server/services/post.service.ts`
- `app/src/server/services/comment.service.ts`
- `app/src/server/services/report.service.ts`
- `app/src/app/posts/[id]/page.tsx`
- `app/src/components/posts/post-comment-thread.tsx`
- `app/src/app/profile/page.tsx`
- 검증 결과
- `cd app && ./node_modules/.bin/prisma generate` 통과
- `cd app && ./node_modules/.bin/prisma db push` 통과
- `cd app && ./node_modules/.bin/eslint 'src/app/posts/[id]/page.tsx' src/app/profile/page.tsx src/app/api/posts/suggestions/route.ts src/components/posts/post-comment-thread.tsx src/components/user/user-relation-controls.tsx src/lib/validations/user-relation.ts src/server/actions/user-relation.ts src/server/queries/post.queries.ts src/server/queries/comment.queries.ts src/server/queries/user-relation.queries.ts src/server/services/post.service.ts src/server/services/comment.service.ts src/server/services/report.service.ts src/server/services/user-relation.service.ts src/server/services/user-relation.service.test.ts` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && ./node_modules/.bin/vitest run src/server/queries/post.queries.test.ts src/server/services/comment.service.test.ts src/server/services/post.service.test.ts src/server/services/report.service.test.ts src/server/services/user-relation.service.test.ts` 통과 (28 tests)
- 이슈/블로커
- `UserBlock/UserMute`가 적용된 환경에서는 피드에서 대상 글이 숨겨지므로, 해제는 `/profile`의 관계 관리 섹션에서 수행해야 함.
- 결정 기록
- 차단은 양방향 상호작용 차단(댓글/반응/신고), 뮤트는 단방향 콘텐츠 숨김 중심으로 구분해 운영 복잡도를 낮춤.
- 모델 미반영 환경에서도 런타임 오류가 나지 않도록 쿼리 레이어에 delegate/table fallback을 유지.

### 2026-02-19: Cycle 28 완료 (OG/JSON-LD/사이트맵/공유 기능)
- 완료 내용
- 사이트 URL 유틸(`getSiteOrigin`, `toAbsoluteUrl`)을 추가해 메타/공유 URL을 일관되게 절대 경로로 생성.
- 루트 레이아웃 메타를 `metadataBase + Open Graph + Twitter + canonical` 형태로 확장.
- 피드/검색 페이지 메타를 명시하고, 게시글 상세에 `generateMetadata`를 추가해 동적 OG/Twitter/robots(index/follow) 제어 적용.
- 게시글 상세 페이지에 JSON-LD(`SocialMediaPosting`) 구조화 데이터를 삽입.
- 게시글 상세에 공유 버튼(카카오/X/링크복사) UI를 추가.
- `sitemap.ts`/`robots.ts`를 추가해 인덱싱 기본 경로를 구성.
- 변경 파일(핵심)
- `app/src/lib/site-url.ts`
- `app/src/app/layout.tsx`
- `app/src/app/feed/page.tsx`
- `app/src/app/search/page.tsx`
- `app/src/app/posts/[id]/page.tsx`
- `app/src/components/posts/post-share-controls.tsx`
- `app/src/app/sitemap.ts`
- `app/src/app/robots.ts`
- 검증 결과
- `cd app && ./node_modules/.bin/eslint src/app/layout.tsx src/app/feed/page.tsx src/app/search/page.tsx src/app/sitemap.ts src/app/robots.ts 'src/app/posts/[id]/page.tsx' src/components/posts/post-share-controls.tsx src/lib/site-url.ts src/server/queries/post.queries.ts src/app/api/posts/suggestions/route.ts` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && ./node_modules/.bin/vitest run src/server/queries/post.queries.test.ts` 통과 (11 tests)
- 이슈/블로커
- 카카오 공유는 웹 공유 URL 방식이며, 카카오 JS SDK 템플릿 공유(친구 지정/커스텀 카드)는 후속 확장 필요.
- 결정 기록
- 민감/비공개 가능성이 있는 게시글(Local/로그인 필수 타입/HIDDEN)은 `generateMetadata`에서 `robots noindex,nofollow`로 처리해 크롤링 노출 위험을 낮춤.
- 사이트맵은 우선 `GLOBAL + ACTIVE + 비회원 열람 가능 타입`만 포함하는 보수적 정책으로 시작.

### 2026-02-19: Cycle 29 진행 (공개 프로필 + 프로필 소개 강화)
- 완료 내용
- `User.bio` 필드를 스키마에 추가하고, 온보딩/프로필 저장에서 닉네임과 소개를 함께 관리하도록 확장.
- 공개 프로필 페이지 `/users/[id]`를 추가하고 활동 탭(게시글/댓글/반응)을 구현.
- 공개 프로필 페이지에 동적 메타데이터/JSON-LD를 추가해 검색/공유 품질을 보강.
- 피드/검색/게시글 상세/댓글 작성자 이름을 공개 프로필 링크로 연결.
- 내 프로필 페이지에 소개 표시/수정 폼을 추가하고 공개 프로필 바로가기 동선을 제공.
- 변경 파일(핵심)
- `app/prisma/schema.prisma`
- `app/prisma/migrations/20260219233000_add_user_bio/migration.sql`
- `app/src/lib/validations/user.ts`
- `app/src/lib/validations/user.test.ts`
- `app/src/server/services/user.service.ts`
- `app/src/server/queries/user.queries.ts`
- `app/src/app/users/[id]/page.tsx`
- `app/src/components/profile/profile-info-form.tsx`
- `app/src/app/profile/page.tsx`
- `app/src/components/onboarding/onboarding-form.tsx`
- `app/src/app/onboarding/page.tsx`
- `app/src/components/posts/feed-infinite-list.tsx`
- `app/src/app/feed/page.tsx`
- `app/src/app/search/page.tsx`
- `app/src/components/posts/post-comment-thread.tsx`
- `app/src/app/posts/[id]/page.tsx`
- 검증 결과
- `cd app && ./node_modules/.bin/prisma generate` 통과
- `cd app && ./node_modules/.bin/prisma db push` 통과
- `cd app && ./node_modules/.bin/eslint src/lib/validations/user.ts src/lib/validations/user.test.ts src/server/services/user.service.ts src/server/queries/user.queries.ts src/components/profile/profile-info-form.tsx src/app/profile/page.tsx 'src/app/users/[id]/page.tsx' src/components/posts/feed-infinite-list.tsx src/app/feed/page.tsx src/app/search/page.tsx 'src/app/posts/[id]/page.tsx' src/components/posts/post-comment-thread.tsx src/components/onboarding/onboarding-form.tsx src/app/onboarding/page.tsx src/server/auth.test.ts` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && ./node_modules/.bin/vitest run src/lib/validations/user.test.ts src/server/actions/user.test.ts src/server/auth.test.ts src/server/services/user-relation.service.test.ts src/server/queries/post.queries.test.ts` 통과 (28 tests)
- 이슈/블로커
- 공개 프로필 활동 탭은 현재 최근 20개 고정이며 커서 기반 페이지네이션은 후속 개선 항목.
- 결정 기록
- 공개 프로필은 로그인 없이 열람 가능하게 두고, 관계 제어(차단/뮤트)는 로그인 사용자에게만 노출하는 방식으로 접근성을 유지.
- 프로필 편집은 기존 `updateProfileAction`을 확장해 닉네임/소개 저장 로직을 단일 경로로 통합.

### 2026-02-19: Cycle 29 완료 (반려동물 프로필 CRUD)
- 완료 내용
- `Pet` 모델/마이그레이션/검증 스키마를 추가하고 반려동물 등록/수정/삭제 서버 액션을 연결.
- 내 프로필(`/profile`)에 반려동물 관리 UI를 연결해 CRUD를 한 화면에서 수행 가능하게 구성.
- 공개 프로필(`/users/[id]`)에 반려동물 프로필 섹션을 추가해 이름/종/나이/소개를 공개 노출.
- 반려동물 저장 후 `router.refresh()` + 경로 revalidate를 적용해 즉시 목록 갱신되도록 보강.
- `pet.service` 단위 테스트를 추가해 입력 정규화/한도/권한/삭제 동작을 자동 검증.
- 변경 파일(핵심)
- `app/prisma/schema.prisma`
- `app/prisma/migrations/20260220000500_add_pet_profiles/migration.sql`
- `app/src/lib/validations/pet.ts`
- `app/src/server/services/pet.service.ts`
- `app/src/server/services/pet.service.test.ts`
- `app/src/server/actions/pet.ts`
- `app/src/server/queries/user.queries.ts`
- `app/src/components/profile/pet-profile-manager.tsx`
- `app/src/app/profile/page.tsx`
- `app/src/app/users/[id]/page.tsx`
- `PLAN.md`
- 검증 결과
- `cd app && ./node_modules/.bin/prisma generate` 통과
- `cd app && ./node_modules/.bin/prisma db push` 통과
- `cd app && ./node_modules/.bin/eslint src/app/profile/page.tsx 'src/app/users/[id]/page.tsx' src/components/profile/pet-profile-manager.tsx src/server/actions/pet.ts src/server/services/pet.service.test.ts` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && ./node_modules/.bin/vitest run src/server/services/pet.service.test.ts src/server/actions/user.test.ts src/lib/validations/user.test.ts` 통과 (13 tests)
- 이슈/블로커
- 반려동물 이미지는 현재 URL 입력 방식이며, 업로드 UI와의 직접 연동은 후속 개선 대상.
- 결정 기록
- 공개 프로필 썸네일은 외부 이미지 도메인 설정 의존을 줄이기 위해 `<img>` 기반 lazy-loading으로 우선 적용.
- 반려동물 변경 직후 사용자 체감을 위해 서버 revalidate 외에 클라이언트 `router.refresh()`를 병행 적용.

### 2026-02-19: Cycle 29 완료 (글쓰기 품질 고도화)
- 완료 내용
- 게시글 작성 폼에 `작성/미리보기` 탭을 추가하고, 미리보기는 XSS 방어가 가능한 경량 마크다운 렌더러(`renderLiteMarkdown`)로 구현.
- 포맷 툴바(굵게/기울임/코드/링크/목록/인용)와 선택영역 래핑 로직을 추가해 작성 속도를 개선.
- 작성 중 내용은 `localStorage`에 자동 임시저장(디바운스 500ms)되며, 진입 시 자동 복원/수동 삭제를 지원.
- 게시글 등록 성공 시 임시저장을 자동 정리해 stale draft가 남지 않도록 처리.
- 경량 마크다운 렌더러 단위 테스트를 추가해 링크 변환/HTML 이스케이프 회귀를 방지.
- 변경 파일(핵심)
- `app/src/components/posts/post-create-form.tsx`
- `app/src/lib/markdown-lite.ts`
- `app/src/lib/markdown-lite.test.ts`
- `PLAN.md`
- 검증 결과
- `cd app && ./node_modules/.bin/eslint src/components/posts/post-create-form.tsx src/lib/markdown-lite.ts src/lib/markdown-lite.test.ts` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && ./node_modules/.bin/vitest run src/lib/markdown-lite.test.ts src/server/services/pet.service.test.ts` 통과 (9 tests)
- 이슈/블로커
- 현재 에디터는 Tiptap 같은 완전한 WYSIWYG이 아닌 markdown-lite 기반으로, 표/이미지 캡션 같은 고급 서식은 미지원.
- 결정 기록
- 외부 에디터 의존성을 즉시 늘리기보다 기존 폼 구조와 충돌이 적은 경량 편집기부터 도입해 회귀 리스크를 낮춤.
- 미리보기 렌더링은 `dangerouslySetInnerHTML`를 사용하되, 선행 escape + URL protocol 제한으로 스크립트 주입을 차단.

### 2026-02-19: Cycle 30 1차 완료 (CI 품질게이트 고정)
- 완료 내용
- `app/package.json`에 품질게이트 스크립트를 추가:
  - `typecheck`, `test:unit`, `test:e2e:smoke`, `quality:check`, `quality:gate`
- Playwright 설정을 확장:
  - `PLAYWRIGHT_SKIP_WEBSERVER=1`로 외부 서버 재사용 가능
  - `PLAYWRIGHT_WEB_SERVER_COMMAND`로 webServer 실행 커맨드 override 가능
- GitHub Actions 워크플로우 추가:
  - `.github/workflows/quality-gate.yml`
  - PR/Push(main) 기준 `lint + typecheck + vitest + e2e smoke` 자동 실행
  - Postgres service + `pnpm db:push` 포함으로 테스트 전 DB 스키마 동기화
- 변경 파일(핵심)
- `.github/workflows/quality-gate.yml`
- `app/package.json`
- `app/playwright.config.ts`
- 검증 결과
- `cd app && pnpm quality:check` 통과
  - lint/typecheck/vitest(24 files, 98 tests) 통과
- 로컬 제약으로 E2E 브라우저 실검증은 미완료
  - macOS sandbox 권한 문제로 Chromium 런치가 `Permission denied (1100)`로 실패
- 이슈/블로커
- 현재 로컬 환경은 Playwright 브라우저 런치 권한이 막혀 `test:e2e:smoke` 실검증 불가.
- `next build`는 Google Fonts 원격 fetch 제한 환경에서 실패 가능(로컬 네트워크 제약).
- 결정 기록
- 빌드 환경 네트워크 변동에 덜 민감하도록 CI E2E는 `next dev` 기반 스모크로 유지하고, webServer 커맨드는 환경변수로 override 가능하게 설계.
- 로컬 개발 서버 충돌을 피하기 위해 Playwright webServer skip 옵션을 공식화.

### 2026-02-19: Cycle 30 2차 완료 (런북/SLO 문서 고정)
- 완료 내용
- 장애 대응 표준 절차를 `docs/ops/incident-runbook.md`로 신설:
  - 장애 등급(SEV), 즉시 대응 체크리스트, 진단 절차, 백업/복구, 종료 기준, 사후 회고 템플릿
- 운영 목표 지표를 `docs/ops/slo-alerts.md`로 신설:
  - SLI/SLO/에러버짓/알람 임계치/대시보드 최소 구성/운영 루프
- `docs/GUIDE.md`에 운영 문서 링크와 최소 점검 루프를 추가해 실행 경로를 연결.
- 변경 파일(핵심)
- `docs/ops/incident-runbook.md`
- `docs/ops/slo-alerts.md`
- `docs/GUIDE.md`
- `PLAN.md`
- 검증 결과
- 문서성 변경으로 별도 런타임 테스트는 없음.
- `cd app && pnpm quality:check` 재실행 통과(코드 영역 회귀 없음 확인)
- 이슈/블로커
- SLO/알람은 기준만 고정한 상태이며, 실제 모니터링 백엔드(Sentry/알람 채널) 연동은 환경 의존 블로커로 남음.
- 결정 기록
- 구현 의존성이 큰 관측 스택 연동 전에 운영 기준 문서를 먼저 고정해 팀 내 의사결정 기준을 통일.
- 런북은 “즉시 대응 15분 체크리스트”를 최상단에 두어 온콜 핸드오프 속도를 우선.

### 2026-02-20: Cycle 34 완료 (rate limit 스푸핑/윈도우 정책 하드닝)
- 완료 내용
- `GET /api/posts`에서 `x-user-id` 헤더를 rate-limit key로 신뢰하던 경로를 제거하고, 인증 사용자는 세션 user id/비로그인은 client IP만 사용하도록 정리.
- Upstash rate-limit 알고리즘을 `INCR + PEXPIRE(매요청)`에서 `SET NX PX + INCR` 고정 윈도우 방식으로 변경.
- TTL이 없는 레거시 키(`PTTL < 0`)를 감지하면 `PEXPIRE`로 TTL을 복구하도록 보강.
- CORS 허용 헤더에서 `x-user-id`를 제거해 클라이언트 임의 헤더 의존 경로를 축소.
- Upstash 경로 단위 테스트(고정 윈도우/TTL 복구)를 추가해 회귀를 방지.
- 변경 파일(핵심)
- `app/src/app/api/posts/route.ts`
- `app/src/server/rate-limit.ts`
- `app/src/server/rate-limit.test.ts`
- `app/middleware.ts`
- `PLAN.md`
- 검증 결과
- `cd app && ./node_modules/.bin/eslint src/app/api/posts/route.ts src/server/rate-limit.ts src/server/rate-limit.test.ts ../app/middleware.ts` 통과
- `cd app && ./node_modules/.bin/vitest run src/server/rate-limit.test.ts` 통과 (4 tests)
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- 이슈/블로커
- Upstash 실서버 대상으로의 통합 검증은 로컬 시크릿/네트워크 제약으로 미실시(단위 테스트로 대체).
- 결정 기록
- 피드 조회 rate-limit key는 서버가 검증한 정체성(세션)과 네트워크 정보(IP)만 사용하고, 클라이언트 제출 헤더는 신뢰하지 않음.

### 2026-02-20: Cycle 23 후속 (실OAuth 리다이렉트 스모크 환경 정비)
- 완료 내용
- 실OAuth(카카오/네이버) 리다이렉트 스모크 E2E를 추가해, 테스트 앱 시크릿이 있을 때 공급자 호스트 이동까지 자동 검증 가능하도록 구성.
- 수동 실행용 GitHub Actions 워크플로우(`oauth-real-e2e`)를 추가해 기본 품질게이트와 분리 운영.
- 운영 가이드에 로컬/CI 실행 방법과 필요 시크릿 목록을 문서화.
- 변경 파일(핵심)
- `app/e2e/social-real-oauth-redirect.spec.ts`
- `app/package.json`
- `.github/workflows/oauth-real-e2e.yml`
- `docs/GUIDE.md`
- `PLAN.md`
- 검증 결과
- `cd app && ./node_modules/.bin/eslint e2e/social-real-oauth-redirect.spec.ts` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && E2E_REAL_SOCIAL_OAUTH=1 ./node_modules/.bin/playwright test e2e/social-real-oauth-redirect.spec.ts --project=chromium --list` 통과 (2 tests 목록 확인)
- `gh workflow run oauth-real-e2e.yml --repo answndud/townpet2` 실행
- 실행 결과: `https://github.com/answndud/townpet2/actions/runs/22211885335` 실패 (시크릿 미설정)
- 이슈/블로커
- 실제 공급자 인증(카카오/네이버 계정 로그인 입력 단계)은 외부 콘솔/계정 상태에 의존하므로 기본 CI에서는 실행하지 않음.
- 저장소 시크릿(`AUTH_SECRET or NEXTAUTH_SECRET`, `KAKAO_*`, `NAVER_*`) 미설정 시 `oauth-real-e2e`는 의도적으로 즉시 실패.
- 결정 기록
- 기본 품질게이트는 `social-dev` 경로로 유지하고, 실OAuth는 수동 워크플로우로 분리해 안정성과 운영 점검 요구를 동시에 만족.
- 워크플로우 시크릿 검증을 보강해 `AUTH_SECRET/NEXTAUTH_SECRET` 중 하나만 있어도 통과하고, 누락 항목을 한 번에 모두 출력하도록 개선.

### 2026-02-20: Cycle 32 후속 완료 (구형 SiteSetting 검색 키 정리 자동화)
- 완료 내용
- 구형 검색 통계 키(`popular_search_terms_v1`) 정리 전용 스크립트를 추가해 드라이런/실행 모드를 분리.
- npm script(`db:cleanup:legacy-search-setting`)를 추가해 운영 절차를 SQL 수동 실행에서 명령형 실행으로 전환.
- 운영/개발 가이드에 정리 명령(드라이런/실행)과 체크리스트를 반영.
- 변경 파일(핵심)
- `app/scripts/cleanup-legacy-site-setting.ts`
- `app/package.json`
- `docs/ops/search-termstat-migration.md`
- `docs/GUIDE.md`
- `PLAN.md`
- 검증 결과
- `cd app && ./node_modules/.bin/eslint scripts/cleanup-legacy-site-setting.ts` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && ./node_modules/.bin/tsx scripts/cleanup-legacy-site-setting.ts` 통과 (`No legacy SiteSetting keys found.`)
- `cd app && ./node_modules/.bin/tsx scripts/cleanup-legacy-site-setting.ts --apply` 통과 (`No legacy SiteSetting keys found.`)
- 이슈/블로커
- 로컬 DB 기준 삭제 대상 키가 없어 실제 삭제 카운트 검증은 불가(운영 반영 시 실제 count 확인 필요).
- 결정 기록
- 운영 반영의 재현성과 안전성을 위해 기본은 dry-run, 삭제는 `--apply` 명시 실행으로 강제.

### 2026-02-20: Cycle 23 보강 (소셜 온보딩 전체 플로우 E2E 개발 경로)
- 완료 내용
- 비프로덕션 + `ENABLE_SOCIAL_DEV_LOGIN=1` 조건에서만 활성화되는 테스트 전용 credentials provider(`social-dev`)를 추가.
- 카카오/네이버 버튼의 `devMode`에서 `social-dev` 경로를 사용할 수 있도록 연결해, 외부 OAuth 콘솔 의존 없이 전체 플로우를 자동화 가능하게 구성.
- 온보딩 폼에 E2E 안정화를 위한 `data-testid`를 추가.
- Playwright 시나리오 `social-onboarding-flow.spec.ts`를 추가:
  - 카카오/네이버 각각 `로그인 -> 온보딩(닉네임/동네) -> /feed` 완료 검증
- 실행 스크립트 `test:e2e:social-onboarding` 추가.
- 변경 파일(핵심)
- `app/src/lib/auth.ts`
- `app/src/components/auth/kakao-signin-button.tsx`
- `app/src/components/auth/naver-signin-button.tsx`
- `app/src/components/auth/login-form.tsx`
- `app/src/components/auth/register-form.tsx`
- `app/src/app/login/page.tsx`
- `app/src/app/register/page.tsx`
- `app/src/components/onboarding/onboarding-form.tsx`
- `app/e2e/social-onboarding-flow.spec.ts`
- `app/package.json`
- `docs/GUIDE.md`
- `PLAN.md`
- 검증 결과
- `cd app && ./node_modules/.bin/eslint src/lib/auth.ts src/app/login/page.tsx src/app/register/page.tsx src/components/auth/login-form.tsx src/components/auth/register-form.tsx src/components/auth/kakao-signin-button.tsx src/components/auth/naver-signin-button.tsx src/components/onboarding/onboarding-form.tsx e2e/social-onboarding-flow.spec.ts` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && ./node_modules/.bin/vitest run src/server/auth.test.ts` 통과 (6 tests)
- `cd app && ./node_modules/.bin/playwright test e2e/social-onboarding-flow.spec.ts --list` 통과 (2 tests 인식)
- 이슈/블로커
- 현재 로컬 환경은 Playwright Chromium 런치 권한 제약(`Permission denied (1100)`)으로 브라우저 실실행 검증은 미완료.
- 실계정 OAuth 전체 E2E는 카카오/네이버 테스트 앱 계정/시크릿/콜백 설정이 필요해 여전히 환경 의존.
- 결정 기록
- 실계정 의존 시나리오와 개발 자동화 시나리오를 분리해 회귀 탐지 속도를 높임.
- 테스트 전용 provider는 프로덕션에서 절대 활성화되지 않도록 `NODE_ENV !== "production"` + 환경변수 이중 조건으로 제한.

### 2026-02-20: Cycle 31 완료 (알림 센터 커서 로딩 연결)
- 완료 내용
- 알림 목록 커서 페이지네이션을 실제 동작으로 연결하기 위해 `GET /api/notifications` API를 추가.
- 알림 센터에서 `nextCursor`를 사용해 추가 페이지를 자동 로딩(IntersectionObserver)하고, 수동 `알림 더 보기` 버튼을 fallback으로 제공.
- 추가 로딩 실패 시 사용자 메시지를 노출하고, 마지막 페이지 도달 시 완료 메시지를 노출하도록 상태 처리를 보강.
- 기존 placeholder 문구(후속 예정)를 제거해 실제 UX로 대체.
- 변경 파일(핵심)
- `app/src/app/api/notifications/route.ts`
- `app/src/components/notifications/notification-center.tsx`
- `PLAN.md`
- 검증 결과
- `cd app && ./node_modules/.bin/eslint src/app/api/notifications/route.ts src/components/notifications/notification-center.tsx` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- 이슈/블로커
- 알림 센터의 "유형별 필터/탭(댓글/반응/시스템)"은 아직 미구현.
- 결정 기록
- 알림 로딩은 서버 액션 대신 API 라우트로 분리해 커서 기반 무한 로딩을 단순화하고 클라이언트 상태 관리 복잡도를 낮춤.
- 자동 로딩과 수동 버튼을 동시에 제공해 뷰포트/브라우저별 observer 오차에도 대응 가능한 UX로 설계.

### 2026-02-20: Cycle 31 후속 완료 (공개 프로필 활동 탭 페이지네이션)
- 완료 내용
- 공개 프로필 활동 탭(`posts/comments/reactions`) 조회를 커서 기반 페이지네이션으로 전환.
- `/users/[id]` 페이지에서 탭별 `활동 더 보기` 링크를 추가해 20개 이후 목록을 연속 탐색 가능하게 개선.
- 잘못되거나 만료된 커서 입력 시 쿼리 레이어에서 자동 1페이지 fallback을 적용해 런타임 오류를 방지.
- 변경 파일(핵심)
- `app/src/server/queries/user.queries.ts`
- `app/src/app/users/[id]/page.tsx`
- `PLAN.md`
- 검증 결과
- `cd app && ./node_modules/.bin/eslint 'src/app/users/[id]/page.tsx' src/server/queries/user.queries.ts src/components/notifications/notification-center.tsx src/app/api/notifications/route.ts` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- 이슈/블로커
- 현재는 링크 기반 페이지네이션이며, 스크롤 위치 유지형 무한 로딩 UX는 후속 개선 대상.
- 결정 기록
- 공개 프로필은 SEO/공유 링크 안정성이 중요하므로, 클라이언트 전용 무한 스크롤보다 URL 기반 커서 링크를 우선 적용.
- 커서 오류를 상위 페이지에서 처리하지 않고 쿼리 계층에서 복구해 모든 호출 경로에서 동일한 안전 동작을 보장.

### 2026-02-20: Cycle 31 후속 완료 (알림 센터 필터/읽지 않음 보기)
- 완료 내용
- 알림 센터에 유형 탭(`전체`, `댓글/답글`, `반응`, `시스템`)과 `읽지 않음만` 토글을 추가.
- 필터 상태를 API 쿼리(`kind`, `unreadOnly`)와 URL(`/notifications?...`)에 동기화해 새로고침/공유 시 동일 상태를 재현 가능하게 구성.
- 필터 상태에서도 커서 기반 추가 로딩이 동일하게 동작하도록 API/클라이언트 양쪽에 필터 파라미터를 연결.
- `읽지 않음만` 모드에서 읽음 처리 시 항목이 즉시 목록에서 제거되도록 UX를 보강.
- 필터 파서/URL 생성 유틸 단위 테스트를 추가해 회귀 방지.
- 변경 파일(핵심)
- `app/src/lib/notification-filter.ts`
- `app/src/lib/notification-filter.test.ts`
- `app/src/server/queries/notification.queries.ts`
- `app/src/app/api/notifications/route.ts`
- `app/src/app/notifications/page.tsx`
- `app/src/components/notifications/notification-center.tsx`
- `PLAN.md`
- 검증 결과
- `cd app && ./node_modules/.bin/eslint src/lib/notification-filter.ts src/lib/notification-filter.test.ts src/app/api/notifications/route.ts src/app/notifications/page.tsx src/components/notifications/notification-center.tsx src/server/queries/notification.queries.ts` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && ./node_modules/.bin/vitest run src/lib/notification-filter.test.ts` 통과 (3 tests)
- `curl 'http://127.0.0.1:3000/api/notifications?kind=COMMENT'` -> `200`
- `curl 'http://127.0.0.1:3000/api/notifications?kind=ALL&unreadOnly=1'` -> `200`
- `curl 'http://127.0.0.1:3000/api/notifications?kind=UNKNOWN'` -> `400 INVALID_QUERY`
- 이슈/블로커
- 알림 필터 UI의 브라우저 E2E 회귀 테스트는 아직 미구현.
- 결정 기록
- 필터 상태는 서버 컴포넌트와 클라이언트 상호작용이 함께 존재하므로, URL을 단일 진실원천(source of truth)으로 유지하는 전략을 채택.
- 필터 변경 시 전체 페이지 리프레시 대신 API 재조회 + URL 교체를 사용해 체감 응답성을 우선 확보.

### 2026-02-20: Cycle 31 후속 완료 (알림 필터 E2E 시나리오 고정)
- 완료 내용
- Playwright 시나리오 `notification-filter-controls.spec.ts`를 추가해 알림 탭/읽지 않음 토글/URL 동기화 흐름을 자동 검증하도록 구성.
- 테스트 실행 전 DB에 `COMMENT`, `REACTION(읽음/미확인)`, `SYSTEM` 알림을 시드하고 테스트 종료 후 정리하도록 설계.
- `package.json`에 `test:e2e:notification-filters` 실행 스크립트를 추가.
- 변경 파일(핵심)
- `app/e2e/notification-filter-controls.spec.ts`
- `app/package.json`
- `PLAN.md`
- 검증 결과
- `cd app && ./node_modules/.bin/eslint ... e2e/notification-filter-controls.spec.ts` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && ./node_modules/.bin/playwright test e2e/notification-filter-controls.spec.ts --list` 통과 (1 test 인식)
- 이슈/블로커
- 현재 로컬 환경의 Chromium 권한 제약으로 브라우저 실실행 검증은 여전히 제한적이며, CI/staging에서 실런이 필요.
- 결정 기록
- 필터 회귀는 UI 상태 + URL + API 조건이 함께 얽혀 있어, 단위 테스트만으로는 부족하므로 DB 시드 기반 브라우저 시나리오를 별도로 고정.

### 2026-02-20: Cycle 32 완료 (검색 로그 구형 fallback 제거)
- 완료 내용
- 검색 통계 쿼리에서 `SiteSetting(popular_search_terms_v1)` fallback 경로를 제거하고 `SearchTermStat` 단일 저장소로 정리.
- `SearchTermStat` 미동기화 환경에서는 읽기 `[]`, 쓰기 `SCHEMA_SYNC_REQUIRED`를 반환하도록 동작을 명확화.
- `search.queries` 테스트를 갱신해 구형 fallback 기대치를 제거하고 새 동작(`SCHEMA_SYNC_REQUIRED`)을 검증하도록 변경.
- 운영 전환/정리 절차 문서를 `docs/ops/search-termstat-migration.md`로 추가.
- `docs/GUIDE.md`에 SearchTermStat 단일 경로 전환 안내를 반영.
- 변경 파일(핵심)
- `app/src/server/queries/search.queries.ts`
- `app/src/server/queries/search.queries.test.ts`
- `docs/ops/search-termstat-migration.md`
- `docs/GUIDE.md`
- `PLAN.md`
- 검증 결과
- `cd app && ./node_modules/.bin/eslint src/server/queries/search.queries.ts src/server/queries/search.queries.test.ts` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && ./node_modules/.bin/vitest run src/server/queries/search.queries.test.ts` 통과
- 이슈/블로커
- 운영 DB의 구형 `SiteSetting` 키 삭제는 배포 권한이 필요한 후속 작업.
- 결정 기록
- 이중 저장소를 유지하면 운영 복잡도와 데이터 일관성 리스크가 커지므로, 스키마 동기화를 전제로 단일 저장소 경로로 고정.

### 2026-02-20: Cycle 33 완료 (신규 계정 안전 정책 관리자 설정화)
- 완료 내용
- 신규 계정 정책 기본값/정규화 유틸(`new-user-safety-policy`)을 추가하고, `SiteSetting(new_user_safety_policy_v1)` 기반 조회/저장 경로를 구현.
- 관리자 정책 화면(`/admin/policies`)에 신규 계정 안전 정책 섹션을 추가:
  - 고위험 카테고리 작성 제한 시간
  - 연락처 포함 콘텐츠 차단 시간
  - 제한 대상 카테고리 선택
- 정책 저장 Server Action/Service/Validation을 확장해 관리자 입력을 서버에서 검증 후 반영하도록 연결.
- 게시글/댓글 서비스에서 하드코딩 24시간 정책 대신 저장된 정책값을 조회해 차단/마스킹 로직에 적용.
- 연락처 차단 메시지를 고정 24시간 문구에서 설정된 시간 기반 동적 문구로 변경.
- 변경 파일(핵심)
- `app/src/lib/new-user-safety-policy.ts`
- `app/src/lib/new-user-safety-policy.test.ts`
- `app/src/lib/post-write-policy.ts`
- `app/src/lib/contact-policy.ts`
- `app/src/lib/validations/policy.ts`
- `app/src/server/queries/policy.queries.ts`
- `app/src/server/services/policy.service.ts`
- `app/src/server/actions/policy.ts`
- `app/src/components/admin/new-user-safety-policy-form.tsx`
- `app/src/app/admin/policies/page.tsx`
- `app/src/server/services/post.service.ts`
- `app/src/server/services/comment.service.ts`
- `PLAN.md`
- 검증 결과
- `cd app && ./node_modules/.bin/eslint ...` (정책/서비스/관리자 화면 변경 파일) 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && ./node_modules/.bin/vitest run src/lib/new-user-safety-policy.test.ts src/lib/contact-policy.test.ts src/lib/post-write-policy.test.ts src/server/services/post-create-policy.test.ts src/server/services/comment.service.test.ts` 통과 (21 tests)
- 이슈/블로커
- 관리자 정책 변경 UI에 대한 브라우저 E2E 시나리오는 아직 미구현.
- 결정 기록
- 운영자가 정책을 즉시 조정할 수 있어야 스팸/어뷰즈 대응 속도가 빨라지므로 하드코딩 상수 대신 SiteSetting 정책 주입 구조로 전환.
- 서비스 레이어에서 정책을 읽도록 고정해 API/서버액션 경로 모두 동일하게 정책이 적용되도록 유지.

### 2026-02-20: Cycle 33 후속 완료 (신규 계정 안전 정책 DB E2E)
- 완료 내용
- DB 기반 E2E 스크립트 `e2e-new-user-safety-policy-flow.ts`를 추가해 정책 변경 -> 차단/허용 -> 정책 복구 플로우를 자동 검증.
- 검증 항목:
  - 신규 유저의 제한 카테고리 작성 차단(`NEW_USER_RESTRICTED_TYPE`)
  - 신규 유저의 연락처 포함 댓글 차단(`CONTACT_RESTRICTED_FOR_NEW_USER`)
  - 기존 유저의 연락처 포함 댓글 마스킹 저장
  - 테스트 종료 후 정책/생성 데이터 정리
- `package.json`에 `test:flow:new-user-policy` 실행 스크립트를 추가.
- `docs/GUIDE.md`에 실행 가이드를 추가.
- 변경 파일(핵심)
- `app/scripts/e2e-new-user-safety-policy-flow.ts`
- `app/package.json`
- `docs/GUIDE.md`
- `PLAN.md`
- 검증 결과
- `cd app && ./node_modules/.bin/eslint ... scripts/e2e-new-user-safety-policy-flow.ts` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && ./node_modules/.bin/vitest run src/lib/new-user-safety-policy.test.ts src/lib/contact-policy.test.ts src/lib/post-write-policy.test.ts src/server/services/post-create-policy.test.ts src/server/services/comment.service.test.ts` 통과 (21 tests)
- `cd app && ./node_modules/.bin/tsx scripts/e2e-new-user-safety-policy-flow.ts` 실행 성공
- 이슈/블로커
- 브라우저 UI에서 관리자 정책 변경 후 즉시 반영되는 흐름의 Playwright 시나리오는 아직 미구현.
- 결정 기록
- OAuth/브라우저 제약과 무관하게 정책 회귀를 잡기 위해 우선 DB 플로우 E2E를 고정하고, UI E2E는 후속 단계로 분리.

### 2026-02-20: Cycle 33 후속 완료 (관리자 정책 변경 UI Playwright E2E)
- 완료 내용
- Playwright 시나리오 `admin-new-user-policy.spec.ts`를 추가해 관리자 정책 화면의 신규 계정 안전 정책 변경 흐름을 자동 검증.
- 신규 계정 안전 정책 폼에 `data-testid`를 추가해 입력/체크박스/저장 버튼/성공 메시지 식별자를 고정.
- 테스트 전 관리자 계정(`admin.platform@townpet.dev`)을 강제 준비하고 baseline 정책을 세팅해 시나리오 안정성을 확보.
- 테스트 후 원래 정책을 복구하도록 구성.
- 실행 스크립트 `test:e2e:admin-policies`를 추가하고 GUIDE에 실행법을 문서화.
- 변경 파일(핵심)
- `app/e2e/admin-new-user-policy.spec.ts`
- `app/src/components/admin/new-user-safety-policy-form.tsx`
- `app/package.json`
- `docs/GUIDE.md`
- `PLAN.md`
- 검증 결과
- `cd app && ./node_modules/.bin/eslint src/components/admin/new-user-safety-policy-form.tsx e2e/admin-new-user-policy.spec.ts` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && ./node_modules/.bin/playwright test e2e/admin-new-user-policy.spec.ts --list` 통과 (1 test 인식)
- 이슈/블로커
- 로컬 Chromium 권한 제약으로 브라우저 실실행은 CI/staging에서 검증 필요.
- 결정 기록
- 관리자 정책은 운영 품질에 직결되므로 DB 플로우 테스트에 더해 UI 저장 경로까지 별도 E2E로 고정해 회귀 감지 범위를 확장.

### 2026-02-21: 배포/OAuth 운영 반영 + 가이드 최종 정리
- 완료 내용
- Vercel 배포 오류(Prisma generate 누락, 필수 env 누락, RESEND_API_KEY 누락, SiteSetting 테이블 미존재) 대응을 통해 운영 배포를 안정화.
- OAuth/GitHub Secrets를 반영하고 실워크플로우 재실행으로 외부 의존 항목을 재검증.
- `docs/GUIDE.md`에 Vercel/Kakao/Naver/GitHub Secrets 설정 절차와 "데이터를 어디에서 보고 관리하는지" 운영 가이드를 통합 문서화.
- 실행 결과
- `oauth-real-e2e` 성공: `https://github.com/answndud/townpet2/actions/runs/22251215409`
- `ops-smoke-checks` 성공(health): `https://github.com/answndud/townpet2/actions/runs/22251318982`
- `ops-smoke-checks` Sentry 검증 시도 실패(시크릿 미설정): `https://github.com/answndud/townpet2/actions/runs/22251292806`
- 현재 상태
- 배포 health/OAuth 리다이렉트 검증은 PASS.
- Sentry 실수신 검증은 운영 선택에 따라 보류(시크릿 미설정 상태).

### 2026-02-21: Vercel/OAuth 외부 연동 상세 가이드 문서화
- 완료 내용
- Vercel 계정 생성부터 배포 URL 확정, 카카오/네이버 OAuth 앱 생성/콜백 등록, GitHub Actions 시크릿 구성, 워크플로우 실행 순서를 한 문서로 통합.
- `oauth-real-e2e`, `ops-smoke-checks` 실패 패턴별 즉시 진단표와 최종 체크리스트를 추가.
- 변경 파일(핵심)
- `docs/ops/vercel-oauth-bootstrap-guide.md`
- `docs/GUIDE.md`
- 이슈/블로커
- 외부 콘솔 계정/권한 및 실제 운영 도메인 확정은 문서화 범위를 넘어 운영 입력값이 필요.

### 2026-02-21: 환경 의존 항목 실행 시도 (실패 원인 확정)
- 완료 내용
- `oauth-real-e2e` 워크플로우를 재실행해 현재 실패 원인을 재확인.
- `ops-smoke-checks` 워크플로우를 `target_base_url=https://townpet2.vercel.app`, `verify_sentry=false`로 실행해 배포 URL 유효성 점검.
- 실행 결과
- `oauth-real-e2e`: `https://github.com/answndud/townpet2/actions/runs/22250009041` 실패
  - 누락 시크릿: `AUTH_SECRET or NEXTAUTH_SECRET`, `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`
- `ops-smoke-checks`: `https://github.com/answndud/townpet2/actions/runs/22250010405` 실패
  - 원인: 입력한 URL(`https://townpet2.vercel.app`)이 Vercel 기준 `deployment not found`(HTTP 404)
- 이슈/블로커
- 실배포 URL 미확정
- repository secrets 미설정
- 결정 기록
- 환경 의존 블로커는 코드 변경보다 운영 입력값(배포 URL, GitHub Secrets) 확정이 선행되어야 해소 가능.

### 2026-02-21: Cycle 35 완료 (배포 health + Sentry 실수신 스모크 자동화)
- 완료 내용
- 배포 URL만 주입하면 `/api/health` 응답(HTTP 200 + `status: ok`)을 검증하는 스크립트(`ops:check:health`)를 추가.
- Sentry 테스트 이벤트를 전송하고 Sentry REST API에서 같은 `eventId` 조회 성공까지 확인하는 스크립트(`ops:check:sentry`)를 추가.
- GitHub Actions 수동 워크플로우(`ops-smoke-checks`)를 추가해 배포 헬스체크와 Sentry 실수신 검증을 one-shot으로 실행 가능하게 구성.
- 운영 가이드(`docs/GUIDE.md`)에 로컬 실행법/워크플로우 입력값/필요 시크릿을 문서화.
- 변경 파일(핵심)
- `app/scripts/check-health-endpoint.ts`
- `app/scripts/check-sentry-ingestion.ts`
- `app/package.json`
- `.github/workflows/ops-smoke-checks.yml`
- `docs/GUIDE.md`
- `PLAN.md`
- 검증 결과
- `cd app && pnpm lint scripts/check-health-endpoint.ts scripts/check-sentry-ingestion.ts` 통과
- `cd app && pnpm typecheck` 통과
- 이슈/블로커
- 실배포 URL/Sentry 시크릿이 없는 로컬 환경에서는 실수신 PASS를 확정할 수 없으므로, `ops-smoke-checks`를 repository secrets와 함께 1회 실행해 최종 PASS 기록이 필요.
- 결정 기록
- 환경 의존(배포 URL, Sentry 권한 토큰) 항목은 수동 절차보다 재실행 가능한 스크립트/워크플로우로 고정해 운영 점검 누락 가능성을 낮춤.

### 2026-02-23: 품종 기반 개인화/광고/커뮤니티 PRD 초안 작성
- 완료 내용
- 반려동물 품종(견종/묘종) 기반 개인화 아이디어를 실행 가능한 PRD 형태로 구체화.
- MVP 범위(프로필 확장, 피드 가중치, 품종 라운지, 광고 타겟팅, 정책 가드레일)와 비목표를 명시.
- 수용 기준(Acceptance Criteria), Prisma 스키마 초안, 추천 알고리즘 의사코드, 단계별 출시 계획(Phase A/B/C)을 정리.
- 변경 파일(핵심)
- `docs/product/품종_개인화_PRD.md`
- `PLAN.md`
- 검증 결과
- 문서 산출물 중심 작업으로 코드/테스트 실행 없음.
- 이슈/블로커
- 품종 사전 운영 방식(고정 내장 vs 관리자 관리) 결정 필요.
- 공동구매 거래 보호(분쟁/정산) 범위는 별도 정책 문서가 필요.
- 결정 기록
- 추천은 초기에는 설명 가능한 규칙 기반 가중치로 시작하고, 충분한 로그 확보 후 모델 기반으로 확장하기로 함.

### 2026-02-23: 품종 기반 개인화 MVP 구현 (스키마 + 피드 + 프로필)
- 완료 내용
- `Pet` 모델을 품종 개인화 기준에 맞게 확장(`species enum`, `breedCode`, `breedLabel`, `sizeClass`, `lifeStage`)하고 `BreedCatalog`, `UserAudienceSegment` 모델을 추가.
- 반려동물 입력 검증/서비스/UI를 확장해 프로필에서 품종/체급/생애단계를 등록/수정/노출 가능하게 개선.
- 피드에 `personalized=1` 모드를 추가해 품종/체급/종 일치 가중치 기반 재정렬과 65:35 다양성 인터리브를 적용.
- 피드 화면에서 `일반 피드`/`품종 맞춤` 토글을 제공하고, 무한스크롤/API 요청 파라미터까지 동기화.
- 변경 파일(핵심)
- `app/prisma/schema.prisma`
- `app/prisma/migrations/20260223120000_add_pet_breed_personalization/migration.sql`
- `app/src/lib/validations/pet.ts`
- `app/src/server/services/pet.service.ts`
- `app/src/components/profile/pet-profile-manager.tsx`
- `app/src/server/queries/post.queries.ts`
- `app/src/app/feed/page.tsx`
- `app/src/components/posts/feed-infinite-list.tsx`
- `app/src/app/api/posts/route.ts`
- 검증 결과
- `cd app && pnpm prisma generate` 통과
- `cd app && ./node_modules/.bin/eslint ...` (변경 파일 대상) 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && ./node_modules/.bin/vitest run src/server/services/pet.service.test.ts src/server/queries/post.queries.test.ts` 통과 (18 tests)
- 이슈/블로커
- `BreedCatalog` 운영 데이터(초기 품종 코드/별칭) 시드 전략은 후속 작업 필요.
- 추천 점수 분해 로그/대시보드 계측은 아직 미적용.
- 결정 기록
- 페이지네이션 안정성을 위해 개인화 재정렬은 현재 페이지 윈도우 내에서만 적용하고, 다음 커서는 DB 기본 정렬 기준으로 유지.

### 2026-02-24: docs 동기화 커맨드 추가 + 문서 최신화 반영
- 완료 내용
- 코드베이스 기준으로 `docs` 하위 파일 최신 상태를 재점검하고, 구현/스키마/운영 절차와 불일치한 항목을 정정.
- 문서 동기화 자동 리포트 생성 스크립트(`scripts/refresh-docs-index.mjs`)를 추가.
- 앱 스크립트에 `docs:refresh`, `docs:refresh:check`를 추가해 문서 인덱스 갱신/검증 명령을 고정.
- 운영 가이드(`docs/GUIDE.md`)에 문서 동기화 커맨드 사용법과 출력 파일 위치를 기록.
- 변경 파일(핵심)
- `scripts/refresh-docs-index.mjs`
- `app/package.json`
- `docs/ops/docs-sync-report.md`
- `docs/GUIDE.md`
- `docs/policy_ops/*.md`, `docs/product/*.md`, `docs/security/security_basics.md`, `docs/ops/*.md`
- 검증 결과
- `cd app && pnpm docs:refresh` 통과
- `cd app && pnpm docs:refresh:check` 통과

### 2026-02-24: 카테고리 체계 정리(주요/추가 게시판) + 중고/공동구매 활성화
- 완료 내용
- 피드 카테고리 필터를 `주요 게시판`/`추가 게시판` 구조로 정리하고, 주요 게시판에 `중고/공동구매`를 포함해 빠른 접근 동선을 고정.
- 피드 보조 카테고리를 명시 배열로 전환해 레거시 중복 타입(`FREE_POST`, `DAILY_SHARE`, `QA_ANSWER`)이 필터에 중복 노출되지 않도록 정리.
- 카테고리 라벨을 전역적으로 통일(`병원후기`, `장소후기`, `산책코스`, `동네모임`, `중고/공동구매`, `실종/목격 제보`, `질문/답변`, `자유게시판`, `용품리뷰`, `반려자랑`).
- 상세 페이지의 섹션 타이틀(병원/장소/산책 상세)과 신규유저 제한 메시지 라벨도 동일 용어로 동기화.
- 검증 결과
- `cd app && pnpm -s eslint src/app/feed/page.tsx src/app/my-posts/page.tsx src/app/posts/[id]/page.tsx src/components/posts/post-create-form.tsx src/lib/post-presenter.ts src/lib/post-write-policy.ts src/lib/post-write-policy.test.ts` 통과
- `cd app && pnpm -s tsc --noEmit` 통과
- `cd app && pnpm -s vitest run src/lib/post-write-policy.test.ts` 통과 (5 tests)

### 2026-02-24: Vercel 빌드 명령에 Prisma 마이그레이션 고정
- 완료 내용
- 비회원 글쓰기 시 `guestDisplayName` 컬럼 누락으로 발생한 `POST /api/posts` 500 대응을 위해 Vercel 빌드 전용 스크립트 `build:vercel`을 추가.
- `build:vercel`은 `prisma migrate deploy -> prisma generate -> next build` 순서로 실행되도록 구성.
- 운영 가이드(`docs/GUIDE.md`)의 Vercel `Build Command` 권장값을 `pnpm build:vercel`로 갱신하고, 운영에서 `db push`를 기본 경로로 쓰지 않도록 안내를 보강.
- 변경 파일(핵심)
- `app/package.json`
- `docs/GUIDE.md`
- 검증 결과
- 코드 변경 성격상 로컬 빌드/테스트는 미실행(스크립트/문서 갱신).

### 2026-02-24: 운영 배포 P3005 baseline 복구 절차 문서화
- 완료 내용
- 운영 배포에서 `prisma migrate deploy` 실행 시 `P3005 The database schema is not empty`가 재발할 수 있는 원인을 `_prisma_migrations` baseline 누락으로 확정.
- 운영 가이드에 임시 복구(`db push`) -> baseline(`migrate resolve --applied`) -> 정식 복귀(`migrate deploy`)의 3단계 절차를 추가.
- baseline 명령 템플릿과 검증 순서(`migrate status`, `migrate deploy`) 및 주의사항(운영 DB 백업, 1회 수행)을 함께 기록.
- 변경 파일(핵심)
- `docs/GUIDE.md`
- 검증 결과
- 문서 작업으로 코드 빌드/테스트 실행 없음.

### 2026-02-24: 상세/댓글 UX 폴리싱 + 반응 로그인 유도 개선
- 완료 내용
- 게시글 상세 페이지를 1컬럼으로 단순화하고, 우측 `게시글 정보` 박스를 제거해 메타(작성일/범위/위치)를 본문 카드 상단에 통합.
- 댓글 섹션에서 답글 취소 동선을 추가하고, 답글 폼에서도 비회원 닉네임/비밀번호 입력이 가능하도록 보완.
- 댓글 액션 버튼을 아이콘+텍스트 패턴으로 통일하고, 댓글 반응 영역 밀도를 완화(기본 톤 다운 + hover 강조).
- 비회원 게시글 반응(좋아요/싫어요) 로그인 유도 문구를 상시 노출에서 클릭 시 버튼별 툴팁 노출 방식으로 변경.
- 모바일에서 툴팁이 화면 밖으로 나가지 않도록 좌/우 clamp 정렬 로직을 적용.
- Hydration 경고 완화를 위해 댓글 날짜 표시 영역에 `suppressHydrationWarning`를 적용.
- 검증 결과
- `cd app && pnpm lint --max-warnings=0` 통과
- `cd app && pnpm build` 통과

### 2026-02-24: 비회원 글쓰기/댓글 로그인 강제 해소
- 완료 내용
- 피드의 글쓰기 CTA를 로그인 유도 링크에서 `/posts/new` 직접 이동으로 변경해 비회원도 즉시 글쓰기 진입 가능하도록 수정.
- 게시글 상세 댓글 영역에서 비회원에게도 댓글/답글 작성 폼을 노출하도록 전환하고, 비회원 댓글 등록 API(`POST /api/posts/[id]/comments`)를 추가.
- 비회원 댓글에 디시 방식 비밀번호 보호를 적용: 댓글 생성 시 닉네임+비밀번호를 저장하고, 수정/삭제 시 비밀번호+식별값(IP/디바이스 해시) 검증을 강제.
- 디시 스타일 표시를 위해 비회원 게시글/댓글 작성자명 옆에 마스킹 IP(`a.b`/`xxxx:yyyy`)와 라벨(`통피`/`아이피`)을 전체 사용자에게 공개하도록 적용.
- 게시글/댓글 스키마에 `guestIpDisplay`, `guestIpLabel` 필드를 추가하고, 작성 시점 User-Agent 기반 라벨링 + IP 마스킹 값을 저장.
- 회귀 수정: 비회원 댓글 작성 시 닉네임/비밀번호 입력 검증을 UI에서 선제 처리하고, 비밀번호 도입 이전의 레거시 비회원 댓글은 작성 후 24시간 내 비밀번호 등록(클레임) 방식으로 수정/삭제 가능하도록 보완.
- 비회원 댓글 수정/삭제 API(`PATCH/DELETE /api/comments/[id]`)를 추가하고, 댓글 스레드 UI에서 비회원 본인 댓글을 비밀번호로 수정/삭제 가능하게 반영.
- 댓글 스키마에 `guestDisplayName/guestPasswordHash/guestIpHash/guestFingerprintHash`를 추가하고 마이그레이션 반영.
- 비회원 댓글 등록 시 IP+디바이스 기준 레이트리밋을 적용하고, 필요 시 게스트 사용자 레코드를 생성해 기존 댓글 서비스 정책(금칙어/연락처 제한)을 재사용.
- 검증 결과
- `cd app && pnpm prisma generate` 통과
- `cd app && pnpm prisma migrate deploy` 통과 (`20260224173000_add_guest_comment_policy`, `20260224181500_add_guest_ip_display_fields` 반영)
- `cd app && pnpm lint --max-warnings=0` 통과
- `cd app && pnpm build` 통과

### 2026-02-24: Cycle 39 완료 (비회원 즉시 공개 작성 + 스팸/위반 방지)
- 완료 내용
- 비회원 글쓰기 허용을 위해 `/posts/new` 로그인 강제를 제거하고, 비회원 모드에서 닉네임/글 비밀번호 입력을 받도록 작성 UI를 확장.
- 디시 방식 운영을 위해 비회원 글 비밀번호 기반 수정/삭제 흐름을 추가하고, 상세 페이지에서 비회원 관리 액션(수정/삭제)을 제공.
- 비회원은 `온동네(GLOBAL)`만 작성 가능하도록 고정하고, 고위험 카테고리(`HOSPITAL_REVIEW`, `MEETUP`, `MARKET_LISTING`, `LOST_FOUND`) 작성을 서버에서 차단.
- 비회원 작성 본문에서 외부 링크/연락처를 차단하고 위반 시 누적 제재 카운트를 쌓아 임시 차단(IP+디바이스 해시 기반)이 가능하도록 `GuestViolation`, `GuestBan` 모델을 추가.
- 비회원 정책 운영을 위해 관리자 정책 화면에 `비회원 작성 정책` 섹션(차단 카테고리/이미지 개수/링크·연락처/글로벌 범위)을 추가하고 서버 액션으로 저장 가능하게 확장.
- 비회원 정책 섹션을 확장해 레이트리밋(10분/1시간/24시간), 업로드 제한(10분), 제재 임계치(24h/7d), 제재 시간(1/2/3차)을 숫자 정책으로 조정 가능하게 개선.
- `/api/posts`, `/api/upload`, `guest-safety` 서비스가 관리자 비회원 정책 값을 실시간 반영하도록 연결(하드코딩 제한값 제거).
- 비회원 관리 회귀 검증을 위해 단위 테스트(`guest-post-management.service.test.ts`)를 추가하고, Playwright 시나리오(`e2e/guest-post-management.spec.ts`, `e2e/admin-guest-post-policy.spec.ts`)를 추가.
- 비대화형 환경 제약으로 `prisma migrate dev` 대신 `pnpm prisma migrate deploy`를 실행해 로컬 DB에 신규 마이그레이션을 반영.
- 게시글 작성 API(`/api/posts`)를 로그인/비로그인 모두 처리하도록 변경하고, 비회원에는 10분/1시간/24시간 다중 윈도우 레이트리밋을 적용.
- 이미지 업로드 API(`/api/upload`)도 비회원 허용으로 전환하되 비회원은 10분 2회, 파일당 2MB 제한을 적용.
- 변경 파일(핵심)
- `app/prisma/schema.prisma`
- `app/prisma/migrations/20260224153000_add_guest_post_policy/migration.sql`
- `app/src/server/services/post.service.ts`
- `app/src/server/services/guest-safety.service.ts`
- `app/src/app/api/posts/route.ts`
- `app/src/app/api/upload/route.ts`
- `app/src/lib/guest-post-policy.ts`
- `app/src/components/posts/post-create-form.tsx`
- `app/src/app/posts/new/page.tsx`
- `app/src/components/ui/image-upload-field.tsx`
- `app/src/server/services/post-create-policy.test.ts`
- 검증 결과
- `cd app && pnpm prisma generate` 통과
- `cd app && pnpm prisma migrate deploy` 통과 (`20260224153000_add_guest_post_policy` 반영)
- `cd app && pnpm test -- src/server/services/guest-post-management.service.test.ts src/server/services/post-create-policy.test.ts` 통과 (10 tests)
- `cd app && pnpm test -- src/server/services/post-create-policy.test.ts` 통과 (6 tests)
- `cd app && pnpm lint --max-warnings=0` 통과
- `cd app && pnpm build` 통과
- `cd app && pnpm test:e2e -- e2e/guest-post-management.spec.ts` 실패 (현재 E2E 환경에서 `/posts/new` 비회원 등록 단계 `서버 오류` 재현, 추가 진단 필요)
- 이슈/블로커
- `e2e/guest-post-management.spec.ts`는 로컬 환경 재현 케이스가 남아 있어 브라우저 E2E 안정화가 추가로 필요.

### 2026-02-24: Cycle 38 완료 (인증/피드/알림/상세 UX 정리 + 계획 문서 위치 정합화)
- 완료 내용
- 로그인/회원가입 화면을 공통 레이아웃으로 통일하고, 카피/버튼 라벨/폼 접근성(포커스/에러/caps lock/비밀번호 보기)을 정리.
- 비프로덕션 환경에서 로그인/회원가입 소셜 버튼(카카오/네이버)을 항상 노출해 로컬 UI와 배포 UI의 시각 차이를 축소.
- 헤더 알림을 즉시 페이지 이동 방식에서 팝오버 미리보기 방식으로 변경하고, `알림 페이지로 이동` CTA/개별 읽음/모두 읽음/`전체-안읽음` 필터를 추가.
- 피드에서 카드 반응 버튼 노출을 제거(상세에서만 반응)하고, 필터/카드 밀도를 정리.
- 모바일 피드에서 첫 화면 점유를 줄이기 위해 헤더/필터를 압축하고, `빠른 필터`/`상세 필터` 접힘 기본 + `목록 바로가기` 동선을 추가.
- 게시글 상세에서 액션 위계를 재배치(반응/공유/관리 분리), 공유를 단일 드롭다운으로 통합, 댓글 액션 과밀을 `더보기` 기반으로 완화.
- 루트 기준 계획 문서 정합화를 위해 `app/PLAN.md`, `app/PROGRESS.md` 내용을 루트 문서 포맷으로 반영하고 하위 파일 제거.
- 변경 파일(핵심)
- `app/src/app/login/page.tsx`
- `app/src/app/register/page.tsx`
- `app/src/components/auth/auth-page-layout.tsx`
- `app/src/components/auth/login-form.tsx`
- `app/src/components/auth/register-form.tsx`
- `app/src/components/notifications/notification-bell.tsx`
- `app/src/app/feed/page.tsx`
- `app/src/components/posts/feed-search-form.tsx`
- `app/src/components/posts/feed-infinite-list.tsx`
- `app/src/app/posts/[id]/page.tsx`
- `app/src/components/posts/post-comment-thread.tsx`
- `app/src/components/posts/post-share-controls.tsx`
- `PLAN.md`
- `PROGRESS.md`
- `AGENTS.md`
- 검증 결과
- `cd app && pnpm lint` 통과
- `cd app && pnpm build` 통과
- `cd app && pnpm test:e2e -- e2e/feed-loading-skeleton.spec.ts` 통과(피드 주요 회귀 경로)
- 이슈/블로커
- `e2e/notification-filter-controls.spec.ts`는 현재 환경에서 시드 초기 가시성 단계 실패가 간헐적으로 재현(알림 팝오버 UX 변경 경로와는 분리).
- 결정 기록
- 계획/진행 문서는 루트(`townpet2/PLAN.md`, `townpet2/PROGRESS.md`)만 단일 소스로 유지하고, `app/` 하위 중복 문서는 생성하지 않음.

### 2026-02-24: 게시글 상세 모바일 압축 2차
- 완료 내용
- 모바일 게시글 제목 크기를 축소하고, 작성자/시간/카운트 메타를 2줄 중심으로 재배치해 상단 높이를 줄임.
- 게시글 상세 보조 메타(작성일/범위/위치)는 `상세 정보` 접기 패턴으로 이동해 기본 노출을 축소.
- 반응/공유 영역을 1행 정렬로 재구성하고, 비회원 수정/삭제는 모바일에서 `비회원 관리` 접기 내부로 이동.
- 댓글에서 `수정/삭제`를 모바일 `관리` 접기 내부로 이동해 기본 액션 과밀을 완화.
- 변경 파일(핵심)
- `app/src/app/posts/[id]/page.tsx`
- `app/src/components/posts/guest-post-detail-actions.tsx`
- `app/src/components/posts/post-reaction-controls.tsx`
- `app/src/components/posts/post-share-controls.tsx`
- `app/src/components/posts/post-comment-thread.tsx`
- 검증 결과
- `cd app && pnpm lint` 통과
- `cd app && pnpm build` 통과
- 이슈/블로커
- 없음.

### 2026-02-24: 댓글 반응 모바일 접기 처리
- 완료 내용
- 댓글 카드에서 `추천/비추천` 반응 컨트롤을 모바일 기본 접기로 전환(`반응` summary), 데스크탑은 기존 상시 노출 유지.
- 모바일 기본 액션 노출을 답글/관리 중심으로 정리해 댓글 카드 높이를 추가로 축소.
- 변경 파일(핵심)
- `app/src/components/posts/post-comment-thread.tsx`
- 검증 결과
- `cd app && pnpm lint` 통과
- `cd app && pnpm build` 통과
- 이슈/블로커
- 없음.

### 2026-02-24: Next.js+Vercel 비용 팩트체크 + 3안 시뮬레이터 작성
- 완료 내용
- Next.js+Vercel 기반 커뮤니티 서비스에서 비용이 "기하급수"로 보이는 원인을 팩트체크 형태로 정리.
- Vercel 과금 축(함수/네트워크/이미지)과 실무 계산식, 낙관/기준/비관 3개 트래픽 시나리오를 문서화.
- 비용 절감 우선순위(이미지/캐시/봇 대응)와 아키텍처 대안(A: 유지, B: 하이브리드, C: 전체 이전)을 정리.
- 변경 파일(핵심)
- `business/비용_팩트체크_및_3안_시뮬레이터.md`
- `PLAN.md`
- 검증 결과
- 문서 작업으로 코드 빌드/테스트 실행 없음.
- 이슈/블로커
- 단가/포함량은 공급자 정책 변경 가능성이 있어, 실제 적용 시 대시보드 실측으로 월 1회 보정 필요.

### 2026-02-24: 피드↔상세 전환 체감 속도 개선(1차)
- 완료 내용
- 게시글 상세 상단 `목록으로`를 링크 이동에서 히스토리 기반 복귀(`router.back`) 버튼으로 변경하고, 히스토리가 없을 때만 `/feed`로 fallback 처리.
- 피드 목록의 게시글 링크 prefetch를 비활성화해 대량 카드 렌더 시 선행 RSC fetch로 인한 전환 지연/네트워크 혼잡을 완화.
- 상세 페이지 조회수 집계를 렌더 블로킹 `await`에서 fire-and-forget 방식으로 변경해 상세 진입 TTFB를 단축.
- 상세 페이지의 `getPostById` 호출을 `cache()` 래퍼로 통합해 동일 요청 내 메타데이터/페이지 조회 중복을 완화.
- 2차 확장(남은 고효율 항목 반영)
- 피드 ALL 모드에서 `countPosts` + 페이지네이션 의존을 제거하고 커서 기반 무한스크롤(`initialNextCursor=posts.nextCursor`)로 전환해 피드 진입 시 카운트 쿼리 비용을 제거.
- `generateMetadata`가 상세 전체 조회 대신 `getPostMetadataById`(최소 select) 경로를 사용하도록 분리해 메타 생성 DB payload를 축소.
- 변경 파일(핵심)
- `app/src/components/posts/back-to-feed-button.tsx`
- `app/src/components/posts/feed-infinite-list.tsx`
- `app/src/app/posts/[id]/page.tsx`
- `app/src/app/feed/page.tsx`
- `app/src/server/queries/post.queries.ts`
- 정량 검증(코드 기반)
- 피드 ALL 초기 로딩 DB 쿼리 수: `countPosts + listPosts`(2회) -> `listPosts`(1회)로 축소 (**50% 감소**).
- 피드 목록 1건당 미사용 relation 로드: `hospitalReview/placeReview/walkRoute` 3개 객체 제거.
- 피드 목록 1건당 미사용 상세 필드: `4 + 5 + 8 = 17개` scalar 필드 제거.
- 상세 -> 목록 복귀 경로: `/feed` 재이동 1회 강제 -> 히스토리 복귀 우선으로 변경(일반 플로우에서 **서버 라운드트립 1회 절감**).
- 상세 메타 쿼리 select 범위: 상세 본문급 include -> `title/content/type/scope/status/createdAt/updatedAt + 대표 이미지 1개`로 축소(필드 수 기준 대략 **70%+ 축소**).

### 2026-02-24: 배포 환경 성능 샘플링(현행 prod 기준)
- 측정 대상: `https://townpet2.vercel.app/feed`, `https://townpet2.vercel.app/posts/cmm06j9mb00029pejux1xguzj`, `GET /api/posts?scope=GLOBAL`
- 방법 1(curl): `time_starttransfer`(TTFB)/`time_total` 5회 반복 측정
- 방법 2(Playwright headless): feed -> post -> browser back 라운드트립 7회 반복
- 결과 요약
- feed 페이지 TTFB 약 `0.84~0.99s` (초회 포함), total 약 `0.88~1.08s`
- post 상세 TTFB 약 `0.57~0.89s`, total 약 `0.61~1.01s`
- `/api/posts?scope=GLOBAL` TTFB 약 `0.58~0.69s` (초회 cold-ish 1회 `2.13s`)
- Playwright 라운드트립 평균: feed 로드 `553ms`, 상세 로드 `565ms`, back `518ms`
- 해석
- 현재 측정은 "지금 운영 배포본" 기준 baseline이며, 로컬 코드 변경분은 아직 배포 반영 전이라 수치 차이가 즉시 반영되지는 않음.
- 후속 측정 기준(배포 반영 후)
- 동일 시나리오로 p50/p95 비교: `feed TTFB`, `post TTFB`, `api/posts TTFB`, `detail->back 완료시간`.
- 목표: `feed TTFB` 15%+, `api/posts TTFB` 20%+, `detail->back` 25%+ 개선.

### 2026-02-24: 배포 환경 15회 반복 정량 측정(p50/p95)
- 측정 방법
- 엔드포인트(`feed`, `post`, `api/posts`)는 `curl` 15회 반복으로 `time_starttransfer`/`time_total` 수집.
- `detail -> 목록복귀`는 Playwright headless로 15회 반복해 back 완료시간을 수집.
- 정량 결과(ms)
- `feed`: TTFB p50 `586.7`, p95 `654.8` / total p50 `661.6`, p95 `894.0`
- `post`: TTFB p50 `588.8`, p95 `669.9` / total p50 `679.6`, p95 `870.6`
- `api/posts`: TTFB p50 `591.0`, p95 `660.8` / total p50 `596.9`, p95 `661.1`
- `detail->back`: p50 `11`, p95 `12`, 평균 `13`
- 해석
- back 구간은 브라우저 히스토리 복귀 우선 적용 영향으로 서버 라운드트립 없이 매우 낮은 지연으로 수렴.
- feed/post/api는 현재 배포 리전/웜상태에서 약 0.59~0.67s TTFB 구간으로 측정됨.

### 2026-02-24: 기간 필터 무한스크롤 정합성 복구
- 완료 내용
- 피드 추가 로딩 API 요청에 `period` 파라미터를 전달하도록 변경해, SSR 첫 페이지와 무한스크롤 다음 페이지의 기간 조건을 일치시킴.
- API 입력 스키마에 `days(3|7|30)` 검증을 추가하고, 라우트에서 `period`/`days`를 수용하도록 확장.
- 정량 검증(코드 기반)
- 무한스크롤 API 기간 조건 전달: `0개` -> `1개(period)`.
- 유효 기간값 검증 케이스: 없음 -> `3/7/30` 3개 고정.
- 결과: 기간 필터 활성화 시 SSR/API 조회 조건 불일치 가능성 `1건` 제거.

### 2026-02-24: 품종 라운지/공동구매 템플릿 정책 연동
- 완료 내용
- 품종 라운지 조회 API `GET /api/lounges/breeds/:breedCode/posts`를 추가하고, `author.pets.breedCode` 조건으로 품종별 글 목록을 조회하도록 구현.
- 품종 공동구매 작성 API `POST /api/lounges/breeds/:breedCode/groupbuys`를 추가하고, 템플릿 필드(`상품명/목표가격/최소인원/마감일/전달방식`)를 본문 구조화 포맷으로 고정.
- 작성 경로는 기존 `createPost` 서비스로 통합해 신규유저 제한/연락처 제한/게스트 차단 정책을 동일 재사용하도록 연결.
- 정량 검증(코드 기반)
- 신규 라운지 API 엔드포인트: `0 -> 2`개 추가(조회 1, 작성 1).
- 품종 코드 검증: 자유 입력 -> `2~40자`, 영문/숫자/`_`/`-` 허용, 대문자 정규화 1단계 적용.
- 공동구매 템플릿 필수 구조 필드: `0 -> 6`개(품종코드, 상품명, 목표가격, 최소참여인원, 마감일, 전달방식).
- 품종 필터 쿼리 조건: 없음 -> `author.pets.some(breedCode)` 1개 추가.

### 2026-02-24: 품종 타겟 광고 슬롯 + 빈도 캡 적용
- 완료 내용
- 피드 서버 렌더에서 로그인 사용자의 대표 반려동물 품종/종 정보를 기반으로 광고 타겟 키(`breedCode` 우선, fallback `species`)를 생성.
- 피드 목록 클라이언트에 광고 슬롯을 1개 삽입하고, `광고` 라벨과 CTA를 고정 노출.
- 세션/일 단위 빈도 캡을 클라이언트 저장소로 적용(`sessionCap=3`, `dailyCap=8`)해 과다 노출을 제한.
- 정량 검증(코드 기반)
- 광고 슬롯 삽입 위치: 없음 -> 목록 상단 구간 `1`개(5번째 아이템 앞).
- 광고 노출 캡: 무제한 -> 세션 `3회`, 일 `8회`.
- 타겟 키 생성 규칙: 없음 -> `breedCode` 우선, fallback `species` 2단계.

### Cycle 1~20 (요약)
- 완료 내용
- 안정화(버그/타입) -> 피드/상세/관리자 UI 통일 -> 반응(좋아요/싫어요) -> 피드 단일 진입 구조 전환 완료.
- Local/Global 정책 정합성, 권한 처리, 관리자 정책 화면, 베스트/전체 피드 동선 정리.
- 검증 결과
- 각 사이클 종료 시 `eslint`, `tsc --noEmit`, `vitest` 통과 기록 유지.

### Cycle 21: 인프라 베이스라인 (진행 중)
- 완료 내용
- Redis(Upstash) 연동 + 메모리 fallback, 구조화 로깅(requestId), 에러 모니터링 유틸, `GET /api/health`, 보안 헤더 적용.
- 이슈/블로커
- Sentry DSN 미설정 환경에서 실수신 확인 미완.

### Cycle 22: 이미지 업로드 + 로딩/에러/빈 상태 (진행 중)
- 완료 내용
- 로컬 업로드 파이프라인, 게시글/프로필 이미지 반영, 공통 Skeleton/EmptyState, 글로벌/세그먼트 에러/로딩 페이지 추가.
- 이슈/블로커
- 없음.

### Cycle 23: 카카오 로그인 + 온보딩 (진행 중)
- 완료 내용
- NextAuth Kakao provider, 로그인/회원가입 버튼, 계정 링크 정책, 온보딩 흐름 보강.
- 이슈/블로커
- 실제 카카오 앱 키/콘솔 설정 기반 E2E 미완.

### Cycle 24: 피드 체류 개선 (진행 중)
- 완료 내용
- 정렬 확장(최신/좋아요/댓글), 조회수 dedupe, URL 링크화/유튜브 팝업, 무한스크롤 + 스크롤 복원 구현.
- 이슈/블로커
- 100+ 게시글 기준 실측 성능 점검 미완.

### 2026-02-24: 피드 이미지 payload 추가 경량화
- 완료 내용
- 피드/베스트 목록 쿼리의 `images` select를 `{ id }` 단일 필드로 축소하고, 목록 쿼리에서만 필요 없던 `url/order` 전송을 제거.
- 목록 이미지 `orderBy`를 제거해 각 게시글 이미지 relation 정렬 비용을 없앰(피드 카드에서는 이미지 실제 렌더를 하지 않고 개수 신호만 사용).
- `FeedPostItem.images` 타입/초기 매핑도 `id`만 유지하도록 정리.
- 정량 검증(코드 기반)
- 이미지 항목 1개당 전송 필드 수: `id,url,order`(3) -> `id`(1), **66.7% 축소**.
- 목록 쿼리에서 게시글당 relation sort 1회(`images.order ASC`) 제거 -> **0회**.
- Cycle 42 누적 기준(목록 1건당): 미사용 상세 필드 17개 + 이미지 부가필드 2개 제거.

### 2026-02-24: 품종 라운지 UI/작성 동선 구현
- 완료 내용
- 품종 라운지 페이지 `/lounges/breeds/:breedCode`를 추가해 검색/정렬/기간/카테고리 필터와 커서 기반 무한스크롤을 제공.
- 피드 무한스크롤 컴포넌트를 API 경로 주입(`apiPath`) 가능하도록 확장해 라운지 전용 API와 재사용.
- 공동구매 템플릿 작성 페이지 `/lounges/breeds/:breedCode/groupbuys/new`와 클라이언트 폼을 추가해 작성 후 상세 페이지로 이동.
- 피드 품종 광고 슬롯 CTA를 라운지 경로(`/lounges/breeds/:key`)로 전환해 광고->커뮤니티 진입 동선을 일치.
- 정량 검증(코드 기반)
- 신규 페이지 경로: `0 -> 2`개(`라운지 목록`, `공동구매 작성`).
- 피드 목록 재사용 컴포넌트 대상 API: 고정 `1개(/api/posts)` -> 주입형 `N개`.
- 라운지 필터 옵션: 정렬 `3개`, 기간 `4개(전체+3/7/30일)`, 카테고리 `9개(전체+8종)`.
- 템플릿 폼 입력 블록: 기본 `6개` + 비회원 전용 `2개`(닉네임/비밀번호).

### 2026-02-24: blocked 해소 실행 문서화
- 완료 내용
- OAuth 실계정 E2E + Sentry 실수신 검증의 필수 시크릿/워크플로우/판정 기준을 단일 체크리스트로 정리.
- 운영 가이드(`docs/GUIDE.md`)에 blocked 해소 섹션을 추가해 실행 진입점을 고정.
- AGENTS 문서의 레포 상태 설명을 현재 코드베이스 기준으로 정정.
- 정량 검증(코드 기반)
- blocked 해소 전용 문서: `0 -> 1`개(`docs/ops/blocked-unblock-checklist.md`).
- GUIDE blocked 해소 섹션: `0 -> 1`개.
- AGENTS 불일치 문구: `2`개 정정(문서-only/blueprint 제거).

### 2026-02-24: blocked 해소 워크플로우 실행 시작
- 실행 내용
- `oauth-real-e2e` 수동 실행 트리거 완료: `https://github.com/answndud/townpet2/actions/runs/22340689788`
- `ops-smoke-checks`(target=`https://townpet2.vercel.app`, verify_sentry=`true`) 트리거 완료: `https://github.com/answndud/townpet2/actions/runs/22340693180`
- 현재 상태
- 두 워크플로우 모두 `in_progress` 상태로 확인됨(실행 결과는 완료 후 별도 append 예정).

### 2026-02-24: blocked 워크플로우 1차 결과
- `ops-smoke-checks` 결과: `failure`
- 실패 원인: Sentry secrets 4종 누락
- 누락 키: `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG_SLUG`, `SENTRY_PROJECT_SLUG`
- 참고 런: `https://github.com/answndud/townpet2/actions/runs/22340693180`
- `oauth-real-e2e` 결과: 실행 중(`in_progress`)
- 참고 런: `https://github.com/answndud/townpet2/actions/runs/22340689788`

### 2026-02-24: blocked 워크플로우 재실행 결과
- `oauth-real-e2e`: `success`
- 런: `https://github.com/answndud/townpet2/actions/runs/22340689788`
- `ops-smoke-checks`(verify_sentry=false): `success`
- 런: `https://github.com/answndud/townpet2/actions/runs/22340745824`
- 잔여 블로커
- Sentry secrets 4종 미등록으로 `verify_sentry=true` 경로는 여전히 blocked 상태.

### 2026-02-24: 무료 운영 루틴 고정 + 배포 실패 방지 기본값 적용
- 완료 내용
- `ops-smoke-checks` 워크플로우의 `verify_sentry` 기본값을 `false`로 변경해, Sentry 미연결 상태에서도 health 스모크가 기본 실패하지 않도록 조정.
- 1인 운영 기준의 주간 10분 무료 체크리스트를 문서화(`배포 상태`, `health`, `로그`, `핵심 동선`, `기록`).
- GUIDE에 루틴 진입 링크를 추가하고 PLAN 우선순위를 무료 운영 루틴 중심으로 갱신.
- 정량 검증(코드 기반)
- 워크플로우 필수 외부 시크릿 경로: `4개(Sentry)` -> `0개`(기본 실행 기준).
- 주간 반복 점검 단계: `0개` -> `5개`(10분 루틴).
- 신규 운영 문서: `0 -> 1`개(`docs/ops/free-ops-weekly-checklist.md`).

## 이슈/블로커 통합
- 환경 의존 블로커
- Sentry 실수신 검증(DSN/프로젝트 설정 필요)
- 배포 환경 health 최종 검증(staging/prod 필요)
- 기능/기술 부채
- 구형 `SiteSetting(popular_search_terms_v1)` 키 운영 DB 정리 필요
- 검색 품질 최대치를 위해 staging/prod DB `pg_trgm` 확장 설치 필요

## 다음 핸드오프
- `PLAN.md` 기준 즉시 착수 순서
1. Cycle 23: 카카오/네이버 실계정 전체 플로우 E2E(온보딩->피드) 환경 구성 (현재 blocked)
2. 환경 블로커 해소: Sentry 실수신 검증(DSN/프로젝트)
3. Cycle 32 후속: 구형 `SiteSetting(popular_search_terms_v1)` 키 정리 실행

## 참고 문서
- 운영/실행 가이드: `docs/GUIDE.md`
- 현재 계획: `PLAN.md`
