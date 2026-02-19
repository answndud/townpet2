# TODO Execution Board

기준일: 2026-02-19
목표: `계획 -> 개발 -> 문서화 체크`를 반복하는 실행 보드

## 운영 규칙
- 각 사이클은 `Plan`, `Build`, `Check` 3단계로 진행
- 개발 전에 체크리스트를 먼저 작성
- 개발 후 결과와 남은 리스크를 같은 문서에 즉시 갱신
- 우선순위는 `서비스 안정성 -> 커뮤니티 핵심 기능 -> 확장 기능`

## Cycle 1: 안정화 스프린트

### Plan
- [x] `POST /api/auth/password/reset/confirm` 중복 변수 선언 버그 수정
- [x] Next 16 동적 라우트 핸들러 `params` 타입 정합성 수정
- [x] `GET /api/posts/[id]` 핸들러 추가 (상세 조회 API 완성)
- [x] 현재 ESLint 오류 2건 정리 (`react/no-unescaped-entities`, `react-hooks/set-state-in-effect`)

### Build
- [x] 코드 수정 반영
- [x] 로컬 검증 실행 (`eslint`, `vitest`)

### Check
- [x] 완료 항목 체크 및 변경 파일 기록
- [x] 남은 리스크/다음 사이클 후보 업데이트

### Cycle 1 결과
- 변경 파일
- `app/src/app/api/auth/password/reset/confirm/route.ts`
- `app/src/app/api/posts/[id]/route.ts`
- `app/src/app/api/reports/[id]/route.ts`
- `app/src/app/page.tsx`
- `app/src/components/auth/verify-email-form.tsx`
- 검증 결과
- `eslint src --max-warnings=0`: 통과
- `vitest run`: 9 files / 26 tests 통과
- 잔여 리스크
- `tsc --noEmit`는 Prisma 타입/클라이언트 불일치로 다수 오류가 남아 있음
- Seed/Script, Auth/Report 관련 Prisma 타입 오류 정리가 다음 우선순위

## Next Backlog (Cycle 2 후보)
- [x] Prisma 타입/클라이언트 생성 불일치 정리
- [x] Local/Global 피드 정책 정합성 강화(대표 동네 필터)
- [ ] 메모리 Rate Limit -> Redis/Upstash 전환
- [ ] 이미지 업로드 + 좋아요/조회수 구현
- [ ] 모바일 피드 카드형 개편 + 로딩/에러 페이지 추가

## Cycle 2: 타입 안정성 1차 정리 (완료)

### Plan
- [x] Prisma Client 재생성으로 스키마-타입 불일치 1차 해소
- [x] Auth Audit / Report Audit 쿼리 타입 정합성 정리
- [x] 로그인/게시글 작성/댓글 타입 오류 정리
- [x] 남은 `tsc` 오류(Seed/테스트/외부 타입) 축소

### Build
- [x] `prisma generate` 실행
- [x] 타입 오류 다발 구간 코드 패치
- [x] 로컬 검증 실행 (`eslint`, `vitest`, `tsc`)

### Check
- [x] 진행 내용 문서 반영
- [x] Cycle 3 범위 확정

### Cycle 2 결과
- 변경 파일
- `app/prisma.config.ts`
- `app/src/components/auth/login-form.tsx`
- `app/src/components/posts/post-create-form.tsx`
- `app/src/components/posts/post-comment-thread.tsx`
- `app/src/server/services/auth.service.ts`
- `app/src/server/queries/auth-audit.queries.ts`
- `app/src/server/queries/report-audit.queries.ts`
- `app/src/server/queries/report.queries.ts`
- `app/src/server/auth.test.ts`
- `app/src/server/queries/report.queries.test.ts`
- `app/src/app/api/admin/auth-audits/route.ts`
- `app/src/app/api/admin/auth-audits/export/route.ts`
- `app/src/lib/auth.ts`
- `app/prisma/seed.ts`
- `app/scripts/seed-reports.ts`
- `app/src/types/next-auth.d.ts`
- `app/src/types/resend.d.ts`
- 검증 결과
- `eslint src --max-warnings=0`: 통과
- `vitest run`: 9 files / 26 tests 통과
- `tsc --noEmit`: 통과

## Cycle 3: Local/Global 정책 정합성 1차 (완료)

### Plan
- [x] 홈 피드 기본 scope를 `LOCAL`로 고정
- [x] 로컬 피드 조회 시 대표 동네 필터 강제
- [x] `/api/posts` GET에서도 로컬 조회 정책 동일 적용
- [x] 간단 회귀 테스트(LOCAL/GLOBAL 시나리오) 추가

### Build
- [x] `listPosts` 조회 조건에 `scope`, `neighborhoodId` 반영
- [x] `app/src/app/page.tsx`에서 effective scope + 대표 동네 전달
- [x] `app/src/app/api/posts/route.ts`에 로컬 접근 제약 로직 반영
- [x] 검증 실행 (`eslint`, `vitest`, `tsc`)

### Check
- [x] 변경/검증 결과 문서 반영
- [x] Cycle 3 커밋/푸시

### Cycle 3 결과
- 변경 파일
- `app/src/server/queries/post.queries.ts`
- `app/src/app/page.tsx`
- `app/src/app/api/posts/route.ts`
- `app/src/server/queries/post.queries.test.ts`
- 검증 결과
- `tsc --noEmit`: 통과
- `eslint src --max-warnings=0`: 통과
- `vitest run`: 10 files / 29 tests 통과

## Cycle 4: 운영 가시성/실행 가이드 (완료)

### Plan
- [x] Docker + Next 로컬 실행 경로를 초보자용으로 문서화
- [x] 운영 중 점검/복구 명령어(상태, 로그, 재시작) 정리
- [x] 자주 나는 오류 사례와 해결 절차 포함
- [ ] 스크린샷 기반 체크리스트(향후)

### Build
- [x] `docs/GUIDE.md` 작성
- [x] 실환경 검증: Docker 기동, DB sync, seed, 웹 응답 확인

### Check
- [x] 문서 반영 완료
- [x] Cycle 4 커밋/푸시

### Cycle 4 결과
- 변경 파일
- `docs/GUIDE.md`
- `app/src/server/queries/post.queries.test.ts`
- 검증 결과
- `tsc --noEmit`: 통과
- `eslint src --max-warnings=0`: 통과
- `vitest run`: 10 files / 29 tests 통과

## Cycle 5: 테스트 유저 더미데이터 확장 (완료)

### Plan
- [x] 단순 3명 유저 시드를 역할/상태 다양화 데이터셋으로 확장
- [x] 관리자/모더레이터/일반/비인증/동네미설정 케이스 포함
- [x] 실행 가이드에 신규 시드 절차/샘플 계정 반영

### Build
- [x] `app/scripts/seed-users.ts` 확장 구현
- [x] `scripts/seed-users.ts` 실행으로 테스트 DB 반영
- [x] Docker/Postgres 실행 상태 및 역할별 집계 확인

### Check
- [x] 문서 업데이트 완료 (`docs/GUIDE.md`, `docs/plan/todo.md`)
- [x] 검증 실행 (`tsc`, `eslint`, `vitest`)

### Cycle 5 결과
- 변경 파일
- `app/scripts/seed-users.ts`
- `docs/GUIDE.md`
- 검증 결과
- `tsc --noEmit`: 통과
- `eslint src --max-warnings=0`: 통과
- `vitest run`: 10 files / 29 tests 통과
- 테스트 환경 데이터 상태
- 유저 시드 요약: total=21, admin=2, moderator=3, user=16
- DB 전체 집계(기존 포함): USER 22 / ADMIN 2 / MODERATOR 4

## Cycle 6: 외부 터미널 실행 가이드 안정화 (완료)

### Plan
- [x] `GUIDE.md`를 Codex 전용 흐름이 아니라 외부 터미널 복붙 기준으로 전면 정리
- [x] `next dev` 실행 실패의 주원인(작업 경로/중복 서버/의존성 누락) 즉시 진단 절차 추가
- [x] 더미데이터 미노출 원인(`LOCAL` 기본 정책) 확인 절차를 더 명확히 안내

### Build
- [x] `docs/GUIDE.md` 전체 재작성 (절대경로/원라인 복붙 중심)
- [x] 서버 중복 실행 감지(`lsof`)와 로그 확인 명령 추가
- [x] 데이터 존재 확인 SQL 명령 재정렬

### Check
- [x] `docs/plan/todo.md` 업데이트
- [x] 변경 파일 점검 완료

### Cycle 6 결과
- 변경 파일
- `docs/GUIDE.md`
- `docs/plan/todo.md`

## Cycle 7: 홈 피드 디자인 전면 개편 (완료)

### Plan
- [x] 홈 피드 테이블 레이아웃을 카드형 피드로 전환
- [x] 화면 비율 확장(`max-w-5xl` -> 넓은 컨테이너) 및 모바일 대응 강화
- [x] 헤더/배경/타이포 톤 통일로 "개인 프로젝트 느낌" 제거
- [x] 피드 정보 밀도 개선(범위/동네/댓글/조회/좋아요/상대시간 표시)

### Build
- [x] `app/src/app/page.tsx` 전면 리디자인 (히어로, 검색, 필터칩, 카드 피드)
- [x] `app/src/app/layout.tsx` 네비게이션/폭/배경 스타일 개편
- [x] `app/src/app/globals.css` 색상 토큰 및 애니메이션 유틸 추가

### Check
- [x] `eslint src --max-warnings=0` 통과
- [x] `tsc --noEmit` 통과
- [x] `vitest run` 통과 (10 files / 29 tests)

### Cycle 7 결과
- 변경 파일
- `app/src/app/page.tsx`
- `app/src/app/layout.tsx`
- `app/src/app/globals.css`
- `docs/plan/todo.md`

## Cycle 8: 블루 톤 + 게시판 밀도형 UI 재개편 (완료)

### Plan
- [x] 그린/오렌지 계열 제거 후 스카이블루/블루 계열로 전환
- [x] 과도한 둥근 버튼/카드 제거, 각진 컴포넌트 스타일로 통일
- [x] 홈 목록에서 작성자/시간/카운트 메타를 우측 컬럼으로 이동
- [x] 게시글 상세 화면 비율/정보구조를 커뮤니티형 레이아웃으로 전면 개편
- [x] 댓글/신고/삭제 액션 UI 톤 동기화

### Build
- [x] `app/src/app/page.tsx`를 블루 톤 dense list로 재구성
- [x] `app/src/app/posts/[id]/page.tsx`를 본문+우측 정보 패널 구조로 재작성
- [x] `app/src/components/posts/post-comment-thread.tsx` 스타일 개편
- [x] `app/src/components/posts/post-report-form.tsx` 스타일 개편
- [x] `app/src/components/posts/post-detail-actions.tsx` 스타일 개편
- [x] `app/src/app/layout.tsx`, `app/src/components/auth/auth-controls.tsx`, `app/src/app/globals.css` 톤 통일

### Check
- [x] `eslint src --max-warnings=0` 통과
- [x] `tsc --noEmit` 통과
- [x] `vitest run` 통과 (10 files / 29 tests)

### Cycle 8 결과
- 변경 파일
- `app/src/app/page.tsx`
- `app/src/app/posts/[id]/page.tsx`
- `app/src/components/posts/post-comment-thread.tsx`
- `app/src/components/posts/post-report-form.tsx`
- `app/src/components/posts/post-detail-actions.tsx`
- `app/src/app/layout.tsx`
- `app/src/components/auth/auth-controls.tsx`
- `app/src/app/globals.css`
- `docs/plan/todo.md`

## Cycle 9: 사용자 동선 UI 전면 통일 2차 (완료)

### Plan
- [x] 로고 영역 정리 (`Local Knowledge Desk` 제거, 로고 클릭 시 홈 이동)
- [x] 헤더 `홈` 버튼 제거 및 내비게이션 단순화
- [x] 홈 필터 영역(범위/카테고리) 비율/위치 전면 재구성
- [x] 글쓰기 페이지 및 작성 폼의 구버전 스타일 전면 교체
- [x] 한국어 우선 문구로 교체(영문 UI 최소화)
- [x] 사용자 핵심 화면 디자인 시스템 통일(내 작성글/프로필/온보딩/로그인/회원가입/수정)

### Build
- [x] `app/src/app/layout.tsx` 로고 링크 구조로 수정, 홈 버튼 제거
- [x] `app/src/app/page.tsx` 필터 레이아웃 재설계(카테고리 대면적 + 범위 사이드 패널)
- [x] `app/src/app/posts/new/page.tsx`, `app/src/components/posts/post-create-form.tsx` 전면 스타일 교체
- [x] `app/src/app/posts/[id]/edit/page.tsx`, `app/src/components/posts/post-detail-edit-form.tsx` 스타일 통일
- [x] `app/src/app/my-posts/page.tsx`, `app/src/app/profile/page.tsx` 재구성
- [x] `app/src/components/neighborhood/neighborhood-gate-notice.tsx` 스타일/문구 교체
- [x] `app/src/app/onboarding/page.tsx`, `app/src/components/onboarding/onboarding-form.tsx` 통일
- [x] `app/src/app/login/page.tsx`, `app/src/components/auth/login-form.tsx` 통일
- [x] `app/src/app/register/page.tsx`, `app/src/components/auth/register-form.tsx` 통일
- [x] `app/src/app/verify-email/page.tsx`, `app/src/components/auth/verify-email-form.tsx` 통일
- [x] `app/src/app/password/reset/page.tsx`, `app/src/components/auth/reset-password-form.tsx` 통일
- [x] `app/src/app/password/setup/page.tsx`, `app/src/components/auth/set-password-form.tsx` 통일

### Check
- [x] `eslint src --max-warnings=0` 통과
- [x] `tsc --noEmit` 통과
- [x] `vitest run` 통과 (10 files / 29 tests)

### Cycle 9 결과
- 변경 파일
- `app/src/app/layout.tsx`
- `app/src/app/page.tsx`
- `app/src/app/posts/new/page.tsx`
- `app/src/components/posts/post-create-form.tsx`
- `app/src/app/posts/[id]/edit/page.tsx`
- `app/src/components/posts/post-detail-edit-form.tsx`
- `app/src/app/my-posts/page.tsx`
- `app/src/app/profile/page.tsx`
- `app/src/components/neighborhood/neighborhood-gate-notice.tsx`
- `app/src/app/onboarding/page.tsx`
- `app/src/components/onboarding/onboarding-form.tsx`
- `app/src/app/login/page.tsx`
- `app/src/components/auth/login-form.tsx`
- `app/src/app/register/page.tsx`
- `app/src/components/auth/register-form.tsx`
- `app/src/app/verify-email/page.tsx`
- `app/src/components/auth/verify-email-form.tsx`
- `app/src/app/password/reset/page.tsx`
- `app/src/components/auth/reset-password-form.tsx`
- `app/src/app/password/setup/page.tsx`
- `app/src/components/auth/set-password-form.tsx`
- `app/src/app/posts/[id]/page.tsx`
- `docs/plan/todo.md`

## Cycle 10: 글쓰기 타입 기본/정렬 개선 (완료)

### Plan
- [x] 글 작성 기본 타입을 `자유게시판`으로 변경
- [x] 타입 드롭다운을 가벼운 주제 우선 순서로 재정렬

### Build
- [x] `app/src/components/posts/post-create-form.tsx`에서 타입 옵션 순서 조정
- [x] `formState.type` 기본값을 `PostType.FREE_BOARD`로 변경
- [x] 제출 후 상태 초기화 시 타입도 `FREE_BOARD`로 복귀하도록 정리

### Check
- [x] `eslint src --max-warnings=0`
- [x] `tsc --noEmit`
- [x] `vitest run`

### Cycle 10 결과
- 변경 파일
- `app/src/components/posts/post-create-form.tsx`
- `docs/plan/todo.md`

## Cycle 11: 프로필/관리자 화면 디자인 통일 (완료)

### Plan
- [x] `/profile`, `/admin/reports`, `/admin/auth-audits` 잔여 구 디자인 제거
- [x] 관리자 하위 컴포넌트(`report-queue-table`, `report-actions`, `report-update-banner`) 톤 통일
- [x] 관리자 상세(`/admin/reports/[id]`)까지 동일 시스템 적용

### Build
- [x] `app/src/app/admin/reports/page.tsx` 블루 dense 레이아웃으로 재구성
- [x] `app/src/app/admin/auth-audits/page.tsx` 블루 dense 레이아웃으로 재구성
- [x] `app/src/components/admin/report-queue-table.tsx` 전면 스타일 교체
- [x] `app/src/components/admin/report-actions.tsx` 스타일 교체
- [x] `app/src/components/admin/report-update-banner.tsx` 스타일 교체
- [x] `app/src/app/admin/reports/[id]/page.tsx` 상세 화면 통일

### Check
- [x] `eslint src --max-warnings=0` 통과
- [x] `tsc --noEmit` 통과
- [x] `vitest run` 통과 (10 files / 29 tests)

### Cycle 11 결과
- 변경 파일
- `app/src/app/admin/reports/page.tsx`
- `app/src/app/admin/auth-audits/page.tsx`
- `app/src/app/admin/reports/[id]/page.tsx`
- `app/src/components/admin/report-queue-table.tsx`
- `app/src/components/admin/report-actions.tsx`
- `app/src/components/admin/report-update-banner.tsx`
- `docs/plan/todo.md`

## Cycle 12: 좋아요 베스트 게시판 도입 (완료)

### Plan
- [x] 좋아요 중심 정렬의 베스트 게시글 조회 쿼리 추가
- [x] 메인 피드 상단에 베스트 미리보기 섹션 노출
- [x] `/best` 전용 게시판(범위/카테고리/기간 필터) 구현
- [x] 상단 내비게이션에 베스트 진입 링크 추가
- [x] 쿼리 테스트/정적검사/문서 체크 완료

### Build
- [x] `app/src/server/queries/post.queries.ts`에 `listBestPosts` 추가
- [x] `app/src/lib/post-presenter.ts` 생성 (카테고리 메타/표시 유틸 공용화)
- [x] `app/src/app/page.tsx`에 `좋아요 베스트` 섹션 + `/best` 이동 링크 추가
- [x] `app/src/app/best/page.tsx` 신규 생성
- [x] `app/src/app/layout.tsx` 헤더 메뉴에 `베스트` 링크 추가
- [x] `app/src/server/queries/post.queries.test.ts` 베스트 쿼리 테스트 보강

### Check
- [x] `eslint src --max-warnings=0` 통과
- [x] `tsc --noEmit` 통과
- [x] `vitest run` 통과 (10 files / 31 tests)

### Cycle 12 결과
- 변경 파일
- `app/src/server/queries/post.queries.ts`
- `app/src/server/queries/post.queries.test.ts`
- `app/src/lib/post-presenter.ts`
- `app/src/app/page.tsx`
- `app/src/app/best/page.tsx`
- `app/src/app/layout.tsx`
- `docs/plan/todo.md`

## Cycle 13: 베스트 메인 전환 + 좋아요/싫어요 반응 (완료)

### Plan
- [x] 메인(`/`)을 베스트 게시판으로 고정하고 일반 피드를 별도 경로로 분리
- [x] 베스트/피드 화면에서 카테고리 전환 링크(베스트 <-> 일반 피드) 제공
- [x] 게시글별 좋아요/싫어요 토글 기능(DB 스키마 + 서버 액션 + UI) 구현
- [x] 반응 수(`likeCount`, `dislikeCount`)를 목록/상세에 모두 노출
- [x] 더미데이터 시드에 반응 샘플 추가

### Build
- [x] `app/src/app/page.tsx`를 `/best` 리다이렉트로 변경
- [x] `app/src/app/feed/page.tsx` 생성(기존 일반 피드 이동)
- [x] `app/prisma/schema.prisma`에 `PostReaction`, `PostReactionType`, `Post.dislikeCount` 추가
- [x] `app/src/server/services/post.service.ts`에 `togglePostReaction` 추가
- [x] `app/src/server/actions/post.ts`에 `togglePostReactionAction` 추가
- [x] `app/src/components/posts/post-reaction-controls.tsx` 추가
- [x] `app/src/app/feed/page.tsx`, `app/src/app/best/page.tsx`, `app/src/app/posts/[id]/page.tsx` 반응 UI 연동
- [x] `app/prisma/seed.ts` 반응 더미데이터 반영
- [x] `app/src/app/layout.tsx`에 `피드` 메뉴 추가

### Check
- [x] `prisma generate` 통과
- [x] `prisma db push` 통과
- [x] `eslint src --max-warnings=0` 통과
- [x] `tsc --noEmit` 통과
- [x] `vitest run` 통과 (11 files / 33 tests)

### Cycle 13 결과
- 변경 파일
- `app/src/app/page.tsx`
- `app/src/app/feed/page.tsx`
- `app/src/app/best/page.tsx`
- `app/src/app/posts/[id]/page.tsx`
- `app/src/components/posts/post-reaction-controls.tsx`
- `app/src/components/posts/post-create-form.tsx`
- `app/src/components/posts/post-detail-actions.tsx`
- `app/src/server/actions/post.ts`
- `app/src/server/services/post.service.ts`
- `app/src/server/services/post.service.test.ts`
- `app/src/server/queries/post.queries.ts`
- `app/src/app/api/posts/route.ts`
- `app/src/app/api/posts/[id]/route.ts`
- `app/src/app/layout.tsx`
- `app/src/app/posts/new/page.tsx`
- `app/prisma/schema.prisma`
- `app/prisma/seed.ts`
- `docs/GUIDE.md`
- `docs/plan/todo.md`

## Cycle 14: Prisma 클라이언트 불일치 런타임 오류 방지 (완료)

### Plan
- [x] `Unknown field reactions` 런타임 오류 원인 정리
- [x] 개발 서버 실행 전 Prisma Client 재생성 루틴 반영
- [x] GUIDE에 복구 절차(명령어 복붙) 추가

### Build
- [x] `app/package.json`의 `dev` 스크립트를 `prisma generate && next dev`로 변경
- [x] `docs/GUIDE.md`의 개발 서버 명령/에러 대응 절차 갱신

### Check
- [x] `eslint src --max-warnings=0` 통과
- [x] `tsc --noEmit` 통과
- [x] `vitest run` 통과 (11 files / 33 tests)

### Cycle 14 결과
- 변경 파일
- `app/package.json`
- `docs/GUIDE.md`
- `docs/plan/todo.md`

## Cycle 15: 반응 include 런타임 호환 fallback (완료)

### Plan
- [x] `Unknown field reactions` 런타임 오류의 즉시 우회 경로 추가
- [x] Prisma Client 불일치 상태에서도 페이지가 죽지 않도록 쿼리 fallback 구현

### Build
- [x] `app/src/server/queries/post.queries.ts`에 `reactions` include 실패 감지 로직 추가
- [x] 실패 시 `reactions` 제외 재조회 + `reactions: []` 보정 반환 구현
- [x] `getPostById`, `listPosts`, `listBestPosts` 모두 동일 fallback 적용

### Check
- [x] `eslint src --max-warnings=0` 통과
- [x] `tsc --noEmit` 통과
- [x] `vitest run` 통과 (11 files / 33 tests)

### Cycle 15 결과
- 변경 파일
- `app/src/server/queries/post.queries.ts`
- `docs/plan/todo.md`

## Cycle 16: 반응 카운트 undefined 크래시 방지 (완료)

### Plan
- [x] `/feed` 런타임 `toLocaleString` 크래시 원인(카운트 undefined) 제거
- [x] 반응 컴포넌트/표시 유틸/상세 화면을 모두 방어형 처리

### Build
- [x] `app/src/components/posts/post-reaction-controls.tsx`에서 카운트 초기값 안전 보정
- [x] `app/src/lib/post-presenter.ts`의 `formatCount`를 nullable/undefined 안전 처리
- [x] `app/src/app/posts/[id]/page.tsx`에서 상세 카운트 안전 보정
- [x] `app/src/app/feed/page.tsx`, `app/src/app/best/page.tsx`, `app/src/app/posts/[id]/page.tsx`의 `reactions` 접근을 optional chaining으로 강화

### Check
- [x] `eslint src --max-warnings=0` 통과
- [x] `tsc --noEmit` 통과
- [x] `vitest run` 통과 (11 files / 33 tests)

### Cycle 16 결과
- 변경 파일
- `app/src/components/posts/post-reaction-controls.tsx`
- `app/src/lib/post-presenter.ts`
- `app/src/app/posts/[id]/page.tsx`
- `app/src/app/feed/page.tsx`
- `app/src/app/best/page.tsx`
- `docs/plan/todo.md`
