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

## Cycle 3: Local/Global 정책 정합성 1차 (진행 중)

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

## Cycle 4: 운영 가시성/실행 가이드 (진행 중)

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
- [ ] Cycle 4 커밋/푸시
