# PROGRESS.md

기준일: 2026-02-19

## 진행 현황 요약
- Cycle 1~20: 완료
- Cycle 21~24: 핵심 구현 + 100+ 스크롤 성능 검증까지 완료
- Cycle 25: 검색 대표 케이스 수동 판정 + 검색 로그 저장 구조 전환 완료
- Cycle 26: 알림 UX + 댓글 정렬/접기/반응 고도화 완료
- Cycle 27: 신규 계정 제한 + 연락처/금칙어 정책 + 단계적 제재 완료
- Cycle 28: OG/JSON-LD/사이트맵/공유 기능 완료
- Cycle 29: 공개 프로필 + 반려동물 CRUD + 글쓰기 미리보기/임시저장 완료
- Cycle 30: 품질게이트 + 런북/SLO 문서화 완료
- Cycle 31: 알림 센터 커서 기반 로딩 + 공개 프로필 활동 탭 커서 페이지네이션 완료
- Cycle 22 잔여: 업로드 재시도 UX + 업로드 E2E + 느린 네트워크 skeleton 확인까지 완료

## 실행 로그

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

## 이슈/블로커 통합
- 환경 의존 블로커
- Sentry 실수신 검증(DSN/프로젝트 설정 필요)
- 배포 환경 health 최종 검증(staging/prod 필요)
- 기능/기술 부채
- 검색 로그 구형 fallback(`SiteSetting`) 제거 시점/마이그레이션 가이드 정리 필요
- 검색 품질 최대치를 위해 staging/prod DB `pg_trgm` 확장 설치 필요

## 다음 핸드오프
- `PLAN.md` 기준 즉시 착수 순서
1. Cycle 31 후속: 알림 센터 유형 필터/탭 + 읽지 않음만 보기
2. Cycle 23: 카카오/네이버 실계정 전체 플로우 E2E(온보딩->피드) 환경 구성 (현재 blocked)
3. 환경 블로커 해소: Sentry 실수신 검증(DSN/프로젝트)
4. 배포 환경 health endpoint 최종 검증(staging/prod)

## 참고 문서
- 운영/실행 가이드: `docs/GUIDE.md`
- 현재 계획: `PLAN.md`
