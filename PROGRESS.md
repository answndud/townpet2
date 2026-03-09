# PROGRESS.md

기준일: 2026-03-09

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
### 2026-03-09: Cycle 241 완료 (병원후기 구조화 moderation 하드닝)
- 완료 내용
  - `app/src/server/services/post.service.ts`에서 `HOSPITAL_REVIEW` 구조화 입력을 생성 초기에 파싱하도록 정리하고, `hospitalName`, `treatmentType`를 게시글 `title/content`와 함께 금칙어 검사 대상으로 포함.
  - 동일 구조화 필드에 연락처 moderation도 적용해 신규 회원은 연락처 포함 시 차단되고, 제한 기간이 지난 회원은 저장 전 마스킹된 값이 persisted 되도록 보강.
  - guest write 정책 텍스트에도 병원후기 구조화 문자열을 합쳐 두어, 향후 guest 병원후기가 정책상 허용되더라도 링크/연락처 제한이 동일하게 적용되도록 정리.
  - repo 내 live 문서/코드 문자열을 재감사한 결과, 즉시 수정이 필요한 `실종/목격 구조화`, `비회원 실종/목격 제보`, `보호소/입양` 과장 copy는 현재 live 영역에서 확인되지 않았고 archive/spec/history 성격 문서만 남아 있어 이번 턴에는 문구 수정 없이 결론만 기록.
- 검증 결과
  - `pnpm -C app lint src/server/services/post.service.ts src/server/services/post-create-policy.test.ts` 통과
  - `pnpm -C app typecheck` 통과
  - `pnpm -C app test -- src/server/services/post-create-policy.test.ts` 실행 시 현재 환경에서는 Vitest 전체 suite가 돌아갔고 `104 files / 529 tests` 통과
- 이슈/블로커
  - 현재 저장소 기준 live copy 수정은 불필요했지만, archive/spec 문서는 미래 기획 흔적이므로 구현 완료 전 대외 문구 source로 재사용하면 안 됨

### 2026-03-09: Cycle 240 완료 (external naming cutover 실배포 검증)
- 완료 내용
  - 실배포 `https://townpet.vercel.app/` 루트 응답과 `/api/health`를 직접 조회해 새 운영 URL cutover가 정상인지 확인
  - old `https://townpet2.vercel.app/`가 새 도메인으로 redirect되는지 확인
  - 사용자가 제공한 Vercel deployment dashboard URL도 외부에서 200으로 열리는지 교차 확인
- 검증 결과
  - `curl -sSI https://townpet.vercel.app/` -> `HTTP/2 200`, `strict-transport-security`, `content-security-policy`, `x-frame-options`, `x-content-type-options` 확인
  - `curl -sS -D - -o /tmp/townpet_health_check.txt https://townpet.vercel.app/api/health` -> `HTTP/2 200`, body `{"ok":true,"status":"ok",...,"checks":{"database":{"state":"ok"},"rateLimit":{"backend":"redis","status":"ok"},"controlPlane":{"state":"ok"}}}`
  - `curl -sSI https://townpet2.vercel.app/` -> `HTTP/2 307`, `location: https://townpet.vercel.app/`
  - `curl -sSI https://vercel.com/jmoon0227-9736s-projects/townpet/7yTyVJsU4J5BNVcSQuq1LkbFzDFZ` -> `HTTP/2 200`
- 이슈/블로커
  - 없음

### 2026-03-09: Cycle 239 완료 (프로젝트 식별자 잔존 문자열 감사)
- 완료 내용
  - repo 전체에서 `townpet2`, `townpet-springboot`, old GitHub/path/domain 식별자를 스캔해 live 코드/운영 문서/워크플로우에 혼선이 남아 있는지 감사
  - live 참조는 발견되지 않았고, 예외는 과거 실배포 측정 기록을 보존하는 `docs/operations/캐시_성능_적용_기록.md` 한 파일뿐임을 확인
  - 해당 문서 상단에 `townpet2.vercel.app` 표기가 historical record 보존 목적이라는 안내를 추가해 이후 외부 rename 작업 시 혼동을 줄임
- 검증 결과
  - repo-wide `rg` 결과 old identifier hit는 `docs/operations/캐시_성능_적용_기록.md`만 반환
  - case-insensitive 재검사 결과도 동일
  - 결론: 현재 repo는 external rename 전제에서 naming-clean 상태이며, 남은 `townpet2` 표기는 의도된 역사 기록임
- 이슈/블로커
  - 없음

### 2026-03-09: Cycle 238 완료 (legacy Spring Boot 식별자 분리 + Next.js 메인 repo 복원)
- 완료 내용
  - 사용자가 정정한 기준에 맞춰, 이 Next.js 메인 프로젝트는 `townpet`, 예전 Spring Boot 프로젝트만 `townpet-springboot`로 분리되도록 정리
  - local clone `origin`을 `git@github.com:answndud/townpet.git`로 복원하고, workspace 경로도 `/Users/alex/project/townpet`로 복원
  - repo 내부의 GitHub Actions 링크/운영 문서/로컬 절대 경로 예시를 다시 `townpet` 기준으로 정리해 main repo와 legacy repo 식별자를 분리
- 검증 결과
  - `gh repo view answndud/townpet --json nameWithOwner,url` 결과 `answndud/townpet`
  - `git remote -v` 결과 `origin git@github.com:answndud/townpet.git`
  - repo 내부 `townpet-springboot` 검색 결과 0건
- 이슈/블로커
  - `docs/operations/캐시_성능_적용_기록.md`의 `townpet2.vercel.app` 표기는 과거 실배포 측정 기록 보존을 위해 그대로 유지

### 2026-03-09: Cycle 237 완료 (`townpet2` -> `townpet` 식별자 정리)
- 완료 내용
  - ops workflow fallback URL을 `https://townpet.vercel.app` 기준으로 갱신
  - growth/oauth 자동 생성 스크립트 기본 Base URL을 `https://townpet.vercel.app`로 변경하고, OAuth manual report 기본 run URL도 `answndud/townpet` 기준으로 정리
  - Day1 실행팩, 개발/운영 가이드, OAuth/Vercel/보안 템플릿, README 등 living docs의 기본 배포 도메인 예시를 `townpet` 기준으로 갱신
  - Day1 handoff와 OAuth manual report를 새 기본값으로 재생성해 산출물까지 `townpet` 기준으로 맞춤
- 검증 결과
  - `pnpm -C app growth:day1:handoff --date 2026-03-09 --out /tmp/day1-growth-handoff-2026-03-09.md` 통과
  - `pnpm -C app ops:oauth:manual-report --date 2026-03-09 --out /tmp/oauth-manual-check-2026-03-09.md` 통과
  - `pnpm -C app lint scripts/generate-day1-growth-handoff.ts scripts/generate-oauth-manual-check-report.ts scripts/collect-latency-snapshot.ts` 통과
  - 생성 파일 확인:
    - `/tmp/day1-growth-handoff-2026-03-09.md` -> `Base URL: https://townpet.vercel.app`
    - `/tmp/oauth-manual-check-2026-03-09.md` -> `Base URL: https://townpet.vercel.app`, `run: https://github.com/answndud/townpet/actions/workflows/oauth-real-e2e.yml`
- 이슈/블로커
  - 현재 workspace 경로(`/Users/alex/project/townpet`)와 외부 GitHub repo/Vercel project 실객체 rename은 repo 내부 수정만으로 완료할 수 없음
  - `docs/operations/캐시_성능_적용_기록.md` 같은 과거 운영 기록은 당시 실배포 URL(`townpet2.vercel.app`)을 보존하기 위해 이번 변경에서 그대로 유지

### 2026-03-09: Cycle 60 Day1 범위 축소 (네이버 1채널)
- 완료 내용
  - 사용자의 운영 부담을 반영해 Day1 채널 전략을 `네이버 1개 -> 검증 후 확장` 구조로 축소
  - `app/scripts/generate-day1-growth-handoff.ts`를 네이버 단일 채널 기준으로 수정해 앞으로 생성되는 handoff가 더 이상 카카오/인스타 작업을 포함하지 않도록 정리
  - `docs/business/Day1_채널_실행팩.md`를 네이버 전용 실행팩으로 축소하고, 카카오/인스타는 Day1 보류 채널로 명시
  - `PLAN.md`의 Cycle 60 마지막 항목명/DoD를 `네이버 1건 게시 + UTM 기록 시작` 기준으로 재정의
- 검증 결과
  - Day1 handoff 생성 스크립트 수정 완료
  - 실행팩 문서가 네이버 단일 채널 기준으로 정리됨
  - 생성 파일:
    - `/tmp/day1-growth-handoff-2026-03-09.md`
    - `/tmp/day1-growth-handoff-2026-03-08.md` (열려 있던 기존 파일도 동일 내용으로 갱신)
- 이슈/블로커
  - 실제 네이버 게시, 게시 URL 확보, 스크린샷 확보, UTM 유입 로그 시작은 여전히 외부 계정 접근이 필요해 이 환경에서 대행 불가

### 2026-03-08: Cycle 60 Day1 handoff 실행 파일 생성 + 외부 수동 단계 분리
- 완료 내용
  - `pnpm -C app growth:day1:handoff --date 2026-03-08 --out /tmp/day1-growth-handoff-2026-03-08.md`로 오늘 기준 Day1 실행 문서를 생성
  - 생성 파일에 `Naver Blog`, `Kakao Open Chat`, `Instagram` 채널별 UTM 링크, 증적 종류, 24h Keep/Fix/Kill 판정표를 포함시켜 바로 수동 게시 가능한 상태로 정리
  - `PLAN.md`의 Cycle 60 Day1 항목을 `in_progress`에서 `blocked`로 전환해 현재 남은 일이 문서 미작성 아니라 외부 채널 수동 실행임을 명시
  - `docs/business/Day1_채널_실행팩.md`를 추가해 채널별 제목/본문/공지/캡션을 repo 안에 고정하고, 수동 게시를 복붙 단계까지 축소
- 검증 결과
  - 생성 파일: `/tmp/day1-growth-handoff-2026-03-08.md`
  - 실행팩 문서: `docs/business/Day1_채널_실행팩.md`
  - 포함 UTM:
    - `utm_source=naver&utm_medium=blog&utm_campaign=day1_ondongne&utm_content=seed-post-1`
    - `utm_source=kakao&utm_medium=openchat&utm_campaign=day1_ondongne&utm_content=notice-post-1`
    - `utm_source=instagram&utm_medium=reel&utm_campaign=day1_ondongne&utm_content=reel-1`
  - `pnpm -C app growth:day1:handoff ...` 실행 통과
- 이슈/블로커
  - 실제 Naver/Kakao/Instagram 게시, 게시 URL 확보, 스크린샷/인사이트 캡처, UTM 유입 로그 시작은 외부 계정 로그인과 수동 게시 권한이 필요해 이 환경에서 대행 불가
  - 따라서 현재 저장소 기준 마지막 미완료 항목은 Cycle 60의 외부 실행 단계만 남음

### 2026-03-08: Cycle 188 상태 재검증 + PLAN drift 정리
- 완료 내용
  - 실배포 `https://townpet2.vercel.app/feed`, `https://townpet2.vercel.app/feed/guest`, `https://townpet2.vercel.app/api/feed/guest` 헤더를 직접 재확인해 Cycle 188의 기존 blocked 설명이 현재 상태와 맞는지 검증
  - `PLAN.md`에서 Cycle 188을 완료 상태로 정리하고, all-`done`인데 제목에 `(완료)`가 빠져 있던 Cycle 61 heading도 정규화
- 검증 결과
  - `curl -sD - -o /dev/null https://townpet2.vercel.app/feed` 결과 `HTTP/2 200`, `cache-control: public, s-maxage=60, stale-while-revalidate=300`, `x-matched-path: /feed/guest`, `x-vercel-cache: HIT`
  - `curl -sD - -o /dev/null https://townpet2.vercel.app/feed/guest` 결과도 `HTTP/2 200`, `x-vercel-cache: HIT`
  - `curl -sD - -o /dev/null https://townpet2.vercel.app/api/feed/guest` 첫 요청은 `x-vercel-cache: MISS`, 직후 재요청은 `x-vercel-cache: STALE`로 캐시 재사용 확인
  - 결론: guest `/feed` HTML public cache가 현재 실배포에서 이미 동작 중이므로, Cycle 188의 과거 blocked 메모는 stale 상태였음
- 이슈/블로커
  - 엔지니어링 기준 미완료 cycle은 더 이상 남지 않고, 현재 남은 것은 growth 실행 과제인 Cycle 60뿐

### 2026-03-08: Cycle 236 완료 (실배포 health/ops 직접 검증)
- 완료 내용
  - 실배포 URL `https://townpet2.vercel.app` 기준으로 루트 응답 헤더와 `/api/health`를 직접 조회
  - GitHub Actions `ops-smoke-checks` 최신 성공 run(`22750502206`, 2026-03-06 05:28:57Z)을 열어 deployment health/internal health token/pg_trgm/Sentry 검증 단계 성공 여부를 교차 확인
- 검증 결과
  - `curl -sSI https://townpet2.vercel.app/` 응답 `HTTP/2 200`
  - 루트 응답 헤더에 `content-security-policy`, `content-security-policy-report-only`, `strict-transport-security`, `referrer-policy`, `x-frame-options`, `x-content-type-options` 존재 확인
  - `curl -sS -D - -o /tmp/townpet_health_headers.txt https://townpet2.vercel.app/api/health` 결과 `HTTP/2 200`
  - `/api/health` body: `{"ok":true,"status":"ok",...,"env":{"nodeEnv":"production","state":"ok"},"checks":{"database":{"state":"ok"},"rateLimit":{"backend":"redis","status":"ok"},"controlPlane":{"state":"ok"}}}`
  - 최신 `ops-smoke-checks` run `22750502206`은 `success`였고, 세부 step 중 `Check deployment health endpoint`, `Validate internal health token secret`, `Check pg_trgm extension via internal health endpoint`, `Validate Sentry secrets`, `Check Sentry ingestion`이 모두 `success`
- 이슈/블로커
  - 이 머신에는 `vercel` CLI, `~/.vercel` 로그인 정보, `VERCEL_TOKEN`이 없어 Vercel Production env 값 목록 자체를 직접 열람하지는 못함
  - 대신 실배포 runtime health와 GitHub Actions의 내부 health token 기반 smoke가 모두 성공했으므로, production에 필요한 env는 현재 배포 동작 기준으로 정상 부착된 것으로 판단

### 2026-03-08: Cycle 235 완료 (배포 전 preflight 검증)
- 완료 내용
  - `docs/operations/manual-checks/배포_보안_체크리스트.md`, `app/scripts/check-security-env.ts`, `app/scripts/vercel-build.ts`, `app/src/lib/env.ts`
  - local `.env`만으로는 strict preflight/build가 실패함을 먼저 재확인했고, 실패 원인이 코드 회귀가 아니라 production 필수 env 누락이라는 점을 분리
  - CI와 동일한 목적의 placeholder production env(`APP_BASE_URL`, 강한 `AUTH_SECRET`, `CSP_ENFORCE_STRICT=1`, `GUEST_HASH_PEPPER`, `HEALTH_INTERNAL_TOKEN`, `UPSTASH_REDIS_REST_*`, `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN`)를 주입해 preflight와 실제 배포 스크립트를 재실행
  - local Postgres(`docker compose`의 `townpet:townpet@localhost:5432/townpet`)를 대상으로 `build:vercel`을 끝까지 돌려 Prisma migrate deploy, schema repair, Prisma generate, neighborhood sync, `next build`까지 통과 확인
  - production build 산출물로 `pnpm -C app start --port 3105`를 띄워 루트 응답/보안 헤더를 확인하고, `ops:check:health`로 degraded 원인을 세부 분리
- 검증 결과
  - `env ... pnpm -C app ops:check:security-env:strict` 통과
  - 결과: `pass=7, warn=1, fail=0`
  - warn 1건은 `OPS_BASE_URL` 미설정으로 원격 moderation drift 검사를 건너뛴 것뿐이며 local placeholder 검증 목적에는 영향 없음
  - `env ... pnpm -C app build:vercel` 통과
  - 결과: strict preflight PASS -> `prisma migrate deploy` no pending migrations -> schema repair 2건 성공 -> `db:sync:neighborhoods` `processed=286 existing=294 inserted=0 total=294` -> `next build` 성공
  - `curl -sI http://localhost:3105/` 확인 결과 `HTTP/1.1 200 OK`, `Strict-Transport-Security`, `Permissions-Policy`, CSP 헤더가 모두 응답에 포함됨
  - `env OPS_BASE_URL=http://localhost:3105 OPS_HEALTH_INTERNAL_TOKEN=... pnpm -C app ops:check:health` 실패
  - 실패 body 기준 `/api/health`는 `HTTP 503 degraded`였고, 원인은 `rateLimit.backend=redis`에서 placeholder `UPSTASH_REDIS_REST_*`에 대한 ping이 `fetch failed`로 떨어진 것뿐이며 DB/control plane/pg_trgm/env state는 모두 `ok`
- 이슈/블로커
  - local placeholder env로는 health의 Redis ping을 정상화할 수 없으므로, 최종 `ops:check:health` 200 PASS는 실제 production `UPSTASH_REDIS_REST_URL/TOKEN` 또는 접근 가능한 staging-equivalent Redis로 별도 확인 필요
  - 수동 검증을 위해 띄운 `next start --port 3105` 서버는 종료함

### 2026-03-08: Cycle 234 완료 (런치 smoke 재검증)
- 완료 내용
  - `docker-compose.yml`
  - `app/e2e/feed-loading-skeleton.spec.ts`
  - 로컬 Docker Desktop을 기동하고 `docker compose up -d`로 Postgres를 올린 뒤 `pnpm -C app db:push`로 E2E용 스키마를 동기화
  - `pnpm -C app exec playwright install chromium`로 누락된 Playwright Chromium/headless shell을 설치
  - `feed-loading-skeleton` 스모크는 App Router streaming 완료가 첫 컴파일 시 5초를 넘길 수 있어 최종 콘텐츠 기대 timeout을 `15s`로 조정
  - 디버깅 중 띄운 수동 `next dev`가 `ENABLE_SOCIAL_DEV_LOGIN` 없이 떠 있어 social onboarding이 `Configuration` 에러를 냈음을 확인했고, 수동 서버 종료 후 smoke를 클린 환경에서 재실행
- 검증 결과
  - `docker compose exec -T postgres psql -U townpet -d townpet -c "SELECT 1;"` 통과
  - `pnpm -C app db:push` 통과
  - `pnpm -C app test:e2e:smoke` 통과
  - 결과: Playwright smoke `7 passed (11.4s)`
- 이슈/블로커
  - 로컬 Docker Desktop과 `townpet2-postgres-1` 컨테이너는 테스트를 위해 실행한 상태

### 2026-03-08: Cycle 233 완료 (런치 준비 갭 재정렬)
- 완료 내용
- 공개 SEO/metadata/sitemap 정합화:
  - `app/src/lib/post-page-metadata.ts`
  - `app/src/lib/post-page-metadata.test.ts`
  - `app/src/app/posts/[id]/page.tsx`
  - `app/src/app/posts/[id]/guest/page.tsx`
  - `app/src/app/sitemap.ts`
  - `app/src/app/bookmarks/page.tsx`
  - `app/src/app/notifications/page.tsx`
  - `app/src/app/profile/page.tsx`
  - `app/src/app/lounges/breeds/[breedCode]/page.tsx`
  - 게시글 상세 public metadata 로직을 공용 helper로 추출해 auth/guest 상세가 동일한 canonical/robots/OG 규칙을 사용하게 정리
  - sitemap에 guest indexable 게시글과 함께 품종 라운지 경로를 추가하고, 공개 프로필은 로그인 게이트 정책에 맞춰 제외 유지
  - `/bookmarks`, `/notifications`, `/profile`은 noindex metadata를 추가하고, 품종 라운지는 품종 라벨 기반 title/description을 동적으로 생성
- 페이지 loading/placeholder/share polish:
  - `app/src/components/ui/empty-state.tsx`
  - `app/src/app/profile/page.tsx`
  - `app/src/components/posts/post-share-controls.tsx`
  - `app/src/app/search/loading.tsx`
  - `app/src/app/notifications/loading.tsx`
  - `app/src/app/bookmarks/loading.tsx`
  - `app/src/app/lounges/breeds/[breedCode]/loading.tsx`
  - `EMPTY`, `NO IMG` 텍스트 placeholder를 SVG 기반 비주얼로 교체
  - `search`/`notifications`/`bookmarks`/품종 라운지 route skeleton을 추가
  - 공유 메뉴는 외부 클릭, focus 이동, `Escape` 입력 시 닫히도록 보강하고 고정 id 대신 `useId`를 사용하도록 수정
- 런치 하드닝/coverage:
  - `app/src/lib/security-headers.ts`
  - `app/src/lib/security-headers.test.ts`
  - `app/middleware.ts`
  - `app/vitest.config.ts`
  - `app/package.json`
  - `app/pnpm-lock.yaml`
  - `.github/workflows/quality-gate.yml`
  - production static/middleware header에 `Strict-Transport-Security`, `Permissions-Policy`를 추가
  - Vitest 기본 include를 `.test.tsx`까지 확장하고 `test:coverage` 스크립트 + v8 coverage provider를 추가
  - `quality-gate` workflow가 coverage를 생성하고 HTML artifact를 업로드하도록 정리
- 검증 결과
- `pnpm -C app lint src middleware.ts next.config.ts vitest.config.ts` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test:unit -- src/lib/post-page-metadata.test.ts src/lib/security-headers.test.ts src/middleware.test.ts src/app/saved/page.test.tsx src/components/profile/profile-summary-link-card.test.tsx` 실행 시 전체 Vitest 스위트 `104 files / 526 tests` 통과
- `pnpm -C app test:coverage` 통과
- coverage summary: statements `65.41%`, branches `57.14%`, functions `70.38%`, lines `65.8%`
- `git diff --check` 통과
- 이슈/블로커
- E2E smoke는 이번 턴에서 재실행하지 않음; 변경 범위가 metadata/static UI/header/CI 설정 중심이라 unit/typecheck/coverage로 우선 검증

### 2026-03-08: Cycle 233 계획 수립 (런치 준비 갭 재정렬)
- 검증 내용
  - 공개 SEO/메타데이터:
    - `app/src/app/posts/[id]/page.tsx`의 `generateMetadata`는 아직 `{ title: "게시글" }` 고정이지만, `app/src/app/posts/[id]/guest/page.tsx`는 이미 제목/본문 요약/대표 이미지 기반 동적 메타데이터를 생성함
    - `app/src/app/sitemap.ts`는 현재 `/`, `/feed`, `/search`, 공개 게시글만 포함하며 품종 라운지 라우트가 빠져 있음
    - `/users/[id]`는 2026-03-07 Cycle 230부터 로그인 게이트가 적용돼 비로그인 메타가 `noindex`이므로 사이트맵 후보에서 제외하는 것이 맞음
    - `/bookmarks`, `/notifications`, `/profile`, `/lounges/breeds/[breedCode]`에는 개별 metadata export가 아직 없음
  - 페이지 polish:
    - `app/src/components/ui/empty-state.tsx`가 여전히 `EMPTY` 텍스트 badge를 렌더하고, `app/src/app/profile/page.tsx`도 프로필 이미지 fallback으로 `NO IMG` 텍스트를 사용함
    - `app/src/app/feed/loading.tsx`, `app/src/app/posts/[id]/loading.tsx`, `app/src/app/profile/loading.tsx`, `app/src/app/my-posts/loading.tsx`는 이미 존재하므로 외부 진단의 "루트만 존재" 평가는 현재 기준과 다름
    - 대신 `search`/`notifications`/`bookmarks`/품종 라운지 계열은 route loading 정리가 아직 필요함
    - `app/src/components/posts/post-share-controls.tsx`는 드롭다운 토글/복사/외부 공유는 구현돼 있지만 click-outside 또는 focus-out dismiss 처리가 없음
  - 보안/운영 증거:
    - `app/src/lib/security-headers.ts`에는 `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Content-Security-Policy`만 있고 `Strict-Transport-Security`, `Permissions-Policy`는 아직 없음
    - `app/package.json`과 `.github/workflows/quality-gate.yml` 기준 coverage 실행 경로/리포트 업로드는 아직 없음
    - 백업/복구, 이메일 SPF/DKIM, 스팸 대응은 `docs/operations/장애 대응 런북.md`, `docs/operations/Resend_Vercel_이메일_설정_가이드.md`, `docs/policies/*`에 이미 문서가 있으므로 신규 문서 추가보다 드릴/검증 기록 보강이 더 적절함
- 우선순위 결정
  - P0: public route 기준 SEO/metadata/sitemap 정합화
  - P1: loading/empty-state/share dropdown polish
  - P1: security header/coverage/ops drill evidence 보강
- 이슈/블로커
  - 공개 프로필은 제품 정책상 로그인 게이트가 걸려 있어 공개 사이트맵 확장 대상으로 취급하면 안 됨
  - 외부 진단 수치(예: 테스트 429개, loading root only)는 2026-03-08 현재 코드와 일부 불일치하므로 계획 입력값으로 그대로 재사용하지 않음

### 2026-03-08: Cycle 232 완료 (소셜 로그인 프로필 비밀번호 버튼 숨김)
- 완료 내용
- 비밀번호 관리 가능 여부 정책/세션 정리:
  - `app/src/lib/password-management.ts`
  - `app/src/lib/password-management.test.ts`
  - `app/src/lib/auth.ts`
  - `app/src/types/next-auth.d.ts`
  - 현재 로그인 방식이 `kakao` 또는 `naver`이면 비밀번호 관리 버튼과 `/password/setup` 접근을 모두 막는 공용 정책 helper를 추가
  - JWT/session에 `authProvider`를 보존해 현재 세션 로그인 방식을 프로필/보안 페이지에서 재사용할 수 있게 정리
  - 구세션 fallback을 위해 `getUserPasswordStatusById`가 linked account provider 목록도 반환하도록 확장
- 프로필/보안 페이지 반영:
  - `app/src/app/profile/page.tsx`
  - `app/src/app/password/setup/page.tsx`
  - `app/src/lib/password-setup.ts`
  - `/profile` 계정 정보 카드에서 소셜 로그인 세션은 비밀번호 변경/설정 버튼 대신 안내 문구만 노출
  - 카카오/네이버 세션이 `/password/setup`에 직접 접근하면 `/profile?notice=PASSWORD_MANAGEMENT_UNAVAILABLE`로 되돌리고 notice 배너를 표시
  - 비밀번호 설정 copy에서 더 이상 `소셜 로그인 계정이면 설정 가능` 문구를 노출하지 않도록 정리
- 검증 결과
- `pnpm -C app lint src/app/profile/page.tsx src/app/password/setup/page.tsx src/lib/auth.ts src/lib/password-management.ts src/lib/password-management.test.ts src/lib/password-setup.ts src/lib/password-setup.test.ts src/server/queries/user.queries.ts src/types/next-auth.d.ts` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/lib/password-management.test.ts src/lib/password-setup.test.ts` 통과
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 231 완료 (회원가입 name 제거 + User.name 컬럼 삭제)
- 완료 내용
- 회원가입/UI/인증 정리:
  - `app/src/components/auth/register-form.tsx`
  - `app/src/lib/validations/auth.ts`
  - `app/src/server/services/auth.service.ts`
  - `app/src/app/api/auth/register/route.test.ts`
  - 이메일 회원가입에서 `name` 입력을 제거하고 `email + nickname + password`만 받도록 정리
  - credentials 로그인과 social dev 로그인도 `name` 없이 동작하도록 정리
- User.name 컬럼 및 adapter/query/display 정리:
  - `app/prisma/schema.prisma`
  - `app/prisma/migrations/20260307103000_drop_user_name_column/migration.sql`
  - `app/src/lib/auth.ts`
  - `app/src/lib/user-display.ts`
  - `app/src/server/queries/*.ts`
  - `app/src/server/services/*.ts`
  - `app/src/app/**/*.tsx`
  - `app/src/components/**/*.tsx`
  - Auth.js Prisma adapter wrapper에서 OAuth provider `name`을 `createUser/updateUser` 전에 strip 하도록 보강
  - 공개 프로필, 알림, 검색, 피드, 북마크, 댓글/상세 작성자 표시는 `nickname` 중심 fallback으로 통일
  - author search와 suggestion도 더 이상 `User.name`을 검색 대상으로 쓰지 않게 조정
- seed/e2e/support 정리:
  - `app/prisma/seed.ts`
  - `app/scripts/seed-admin.ts`
  - `app/scripts/seed-reports.ts`
  - `app/scripts/seed-search-cases.ts`
  - `app/scripts/seed-users.ts`
  - `app/e2e/*.spec.ts`
  - seed/e2e user create/upsert에서 `name` 필드를 제거해 Prisma schema와 정합화
- 검증 결과
- `pnpm -C app exec prisma format` 통과
- `pnpm -C app exec prisma generate` 통과
- `pnpm -C app lint` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test` 실행 시 전체 Vitest 스위트 `100 files / 512 tests` 통과
- `pnpm -C app exec prisma migrate deploy` 통과
- `pnpm -C app exec prisma migrate status` 결과 `Database schema is up to date!`
- 이슈/블로커
- 운영 DB에도 `20260307103000_drop_user_name_column` migration 적용이 추가로 필요

### 2026-03-07: Cycle 231 착수 (회원가입 name 제거 + User.name 컬럼 삭제)
- 진행 내용
- 이메일 회원가입 폼에서 `name`이 실제 사용자 표시/운영 로직에 거의 쓰이지 않고, 현재 표시 우선순위가 대부분 `nickname` 중심이라는 점을 재확인
- 이번 사이클 범위를 `회원가입 name 제거 + User.name DB 컬럼 삭제 + OAuth/Auth.js adapter 정리 + 공개 프로필/알림/검색 fallback 제거`로 확정
- 이슈/블로커
- Auth.js Prisma adapter가 기본적으로 provider `name`을 `createUser`/`updateUser`에 그대로 넘기므로, `User.name` 컬럼 제거와 함께 adapter wrapper로 `name` strip 처리가 필요

### 2026-03-07: Cycle 230 완료 (공개 프로필 로그인 게이트 + 공개 범위 설정)
- 완료 내용
- 비회원 공개 프로필 로그인 게이트:
  - `app/src/app/users/[id]/page.tsx`
  - `app/src/components/auth/login-form.tsx`
  - `app/src/lib/public-profile.ts`
  - 비회원이 `/users/{id}` 접근 시 `/login?next=/users/{id}&notice=PROFILE_LOGIN_REQUIRED`로 이동하게 바꿨고, 로그인 페이지에는 `프로필을 보려면 로그인해 주세요.` 안내 문구를 추가
  - `generateMetadata`도 비로그인 요청에는 일반 로그인 안내 메타만 반환하도록 조정해 공개 프로필 정보가 비회원 메타에 그대로 노출되지 않게 정리
- 공개 범위 설정 저장/반영:
  - `app/prisma/schema.prisma`
  - `app/prisma/migrations/20260307100000_add_public_profile_visibility_settings/migration.sql`
  - `app/src/components/profile/profile-info-form.tsx`
  - `app/src/server/services/user.service.ts`
  - `app/src/server/actions/user.ts`
  - `app/src/server/queries/user.queries.ts`
  - `app/src/app/users/[id]/page.tsx`
  - 사용자 `User` 모델에 `showPublicPosts`, `showPublicComments`, `showPublicPets`를 추가하고 `/profile`의 `프로필 정보 수정`에서 각 공개 범위를 개별 체크박스로 저장할 수 있게 구현
  - 공개 프로필에서는 게시글/댓글 카운트와 활동 탭을 설정에 따라 숨기고, 반려동물 프로필도 비공개 메시지로 대체되게 반영
- 운영 문서 동기화:
  - `docs/개발_운영_가이드.md`
  - `docs/operations/운영_문서_안내.md`
  - 공개 프로필 점검 절차에 `로그인 필수`와 `공개 범위` 설정을 반영
- 검증 결과
- `pnpm -C app exec prisma format` 통과
- `pnpm -C app exec prisma generate` 통과
- `pnpm -C app lint 'src/app/users/[id]/page.tsx' src/app/profile/page.tsx src/components/profile/profile-info-form.tsx src/components/auth/login-form.tsx src/lib/public-profile.ts src/lib/public-profile.test.ts src/lib/validations/user.ts src/lib/validations/user.test.ts src/server/services/user.service.ts src/server/services/user.service.test.ts src/server/actions/user.ts src/server/actions/user.test.ts src/server/queries/user.queries.ts` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/lib/public-profile.test.ts src/lib/validations/user.test.ts src/server/services/user.service.test.ts src/server/actions/user.test.ts` 실행 시 전체 Vitest 스위트 `100 files / 512 tests` 통과
- 이슈/블로커
- 운영 DB에는 `20260307100000_add_public_profile_visibility_settings` migration 적용이 추가로 필요

### 2026-03-07: Cycle 229 완료 (피드 카드 메타 우측 정렬 + 피드 북마크 제거)
- 완료 내용
- 피드 카드 메타 우측 정렬:
  - `app/src/components/posts/feed-infinite-list.tsx`
  - `app/src/lib/feed-list-presenter.ts`
  - 피드형 목록 카드에서 작성자/작성일/조회/반응 메타를 제목 아래 행이 아니라 우측 컬럼으로 옮겨 모바일 카드 높이를 더 줄였고, 날짜/조회/반응은 공용 `buildFeedStatsLabel`로 한 줄 요약되게 정리
- 피드 북마크 CTA 제거:
  - `app/src/components/posts/feed-infinite-list.tsx`
  - `app/src/app/feed/page.tsx`
  - `app/src/components/posts/guest-feed-page-client.tsx`
  - `app/src/app/lounges/breeds/[breedCode]/page.tsx`
  - 피드/라운지/게스트 피드형 목록에서는 북마크 버튼을 제거하고, 북마크는 게시글 상세에서만 수행하도록 동선을 단순화
- 사용자 안내 문구 정리:
  - `app/src/app/bookmarks/page.tsx`
  - 북마크 목록 상단 설명과 빈 상태 문구를 `피드나 상세` 기준에서 `게시글 상세` 기준으로 수정
- 검증 결과
- `pnpm -C app lint src/components/posts/feed-infinite-list.tsx src/lib/feed-list-presenter.ts src/lib/feed-list-presenter.test.ts src/app/feed/page.tsx src/app/bookmarks/page.tsx 'src/app/lounges/breeds/[breedCode]/page.tsx' src/components/posts/guest-feed-page-client.tsx` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/lib/feed-list-presenter.test.ts` 실행 시 전체 Vitest 스위트 `99 files / 506 tests` 통과
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 228 완료 (모바일 피드 카드 밀도 재정리)
- 완료 내용
- 모바일 카드 밀도 재정리:
  - `app/src/components/posts/feed-infinite-list.tsx`
  - `app/src/components/posts/post-bookmark-button.tsx`
  - `app/src/lib/feed-list-presenter.ts`
  - 모바일 게시글 카드를 `제목 중심 + 1줄 메타 + 소형 북마크 토글` 구조로 재정리하고, 본문 미리보기와 지역/동물 보조 정보는 `sm` 이상에서만 노출되게 축소
  - 날짜/조회/반응 메타는 한 줄 문자열로 합쳐 리스트 스캔 밀도를 높였고, 모바일 전용 북마크 버튼도 소형 사이즈로 줄여 별도 행을 차지하지 않게 정리
- 모바일 상단 영역 높이 축소:
  - `app/src/components/navigation/feed-hover-menu.tsx`
  - `app/src/components/navigation/app-shell-header.tsx`
  - 모바일 `게시판 빠른 이동`을 기본 접힘형으로 바꾸고, `/feed` 화면에서는 헤더의 중복 `피드` 링크를 숨겨 첫 뷰포트에서 게시글이 더 빨리 보이도록 조정
- 비교/검증 근거:
  - `https://m.dcinside.com/` 모바일 첫 화면은 제목 중심 + 1줄 메타 + 액션 최소화 구조라 한 화면에 더 많은 글이 들어오는 점을 직접 확인
  - `https://www.fmkorea.com/` 모바일 첫 화면 비교는 Cloudflare 봇 차단으로 자동 검증이 불가했고, 이번 개선은 디시 모바일의 정보 밀도 패턴과 실배포 TownPet 모바일 스크린샷을 기준으로 적용
- 검증 결과
- `pnpm -C app lint src/lib/feed-list-presenter.ts src/lib/feed-list-presenter.test.ts src/components/posts/post-bookmark-button.tsx src/components/posts/feed-infinite-list.tsx src/components/navigation/feed-hover-menu.tsx src/components/navigation/app-shell-header.tsx` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/lib/feed-list-presenter.test.ts` 실행 시 전체 Vitest 스위트 `99 files / 506 tests` 통과
- 이슈/블로커
- 로컬 `next dev` 시각 확인은 기존 `.next/dev/lock` stale lock 때문에 수행하지 못했고, 최종 UI 확인은 실배포 검증으로 대체

### 2026-03-07: Cycle 227 완료 (비로그인 피드 CSP hydration 장애 복구)
- 완료 내용
- production CSP hydration-safe fallback 전환:
  - `app/src/lib/security-headers.ts`
  - nonce가 포함된 `script-src`에선 브라우저가 `unsafe-inline`을 무시해 Next inline bootstrap이 차단되던 문제를 확인
  - production enforce CSP는 static fallback(`script-src 'self' 'unsafe-inline'`)으로 유지하고, strict nonce 정책은 `content-security-policy-report-only`로만 보내도록 조정
- 회귀 테스트/실배포 재현 기반 검증:
  - `app/src/lib/security-headers.test.ts`
  - `app/src/middleware.test.ts`
  - 비로그인 desktop/mobile `/feed` 실배포를 headless browser로 열어 blank screen 원인이던 `Executing inline script violates ...` CSP console error가 기존 정책에서 재현됨을 확인
  - 수정 후 운영 `/feed` 응답 헤더가 `script-src 'self' 'unsafe-inline'` + strict `content-security-policy-report-only`로 바뀐 것을 확인했고, 같은 headless browser 검증에서 desktop/mobile 모두 console error/page error 없이 본문이 정상 렌더됨을 확인
- 검증 결과
- `pnpm -C app lint src/lib/security-headers.ts src/lib/security-headers.test.ts src/middleware.test.ts` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/lib/security-headers.test.ts src/middleware.test.ts` 실행 시 전체 Vitest 스위트 `98 files / 502 tests` 통과
- GitHub Actions `quality-gate` run `22799569527` `success`
- `https://townpet2.vercel.app/feed` 응답에서 enforce/report-only CSP 헤더 갱신 확인
- 운영 `/feed` headless browser desktop/mobile 검증에서 `consoleErrors: []`, `pageErrors: []` 확인
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 227 착수 (비로그인 피드 CSP hydration 장애 복구)
- 진행 내용
- 실배포 비로그인 `/feed` desktop/mobile을 직접 확인한 결과 HTML은 내려오지만 hydration 이후 본문이 뜨지 않는 증상을 재현
- headless browser 콘솔에서 `Executing inline script violates the following Content Security Policy directive 'script-src ... nonce ...'` 오류가 반복되고, 이 때문에 Next bootstrap inline script가 차단되는 것을 확인
- 이번 사이클 범위를 `production CSP policy 수정 + 회귀 테스트 + 실배포 재검증`으로 확정
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 226 완료 (프로필 활동 카드 링크 정렬)
- 완료 내용
- 프로필 활동 링크 카드 정리:
  - `app/src/components/profile/profile-summary-link-card.tsx`
  - `app/src/app/profile/page.tsx`
  - 프로필 상단 요약 영역을 `/my-posts`, `/bookmarks`로 이동하는 카드 링크 2개로 정리하고, 기존 `tp-btn-soft inline-flex px-3 py-1.5 text-xs text-[#315484]` 버튼을 제거
  - 기존 `전체/총 작성글` 카드는 `내 작성글` 진입 카드로 재정리하고, 계정 정보 카드 안의 `내 작성글 보기` 버튼은 제거
- 테스트/운영 문서 동기화:
  - `app/src/components/profile/profile-summary-link-card.test.tsx`
  - `docs/개발_운영_가이드.md`
  - `docs/operations/운영_문서_안내.md`
  - 카드가 버튼 스타일 없이 올바른 경로를 렌더하는 회귀 테스트를 추가하고, 운영 문서에는 `/my-posts`, `/bookmarks`를 사용자 활동 확인 화면으로 함께 기록
- 검증 결과
- `pnpm -C app lint src/app/profile/page.tsx src/components/profile/profile-summary-link-card.tsx src/components/profile/profile-summary-link-card.test.tsx` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/components/profile/profile-summary-link-card.test.tsx` 실행 시 전체 Vitest 스위트 `98 files / 502 tests` 통과
- `git diff --check` 통과
- `pnpm -C app docs:refresh:check` 통과
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 226 착수 (프로필 활동 카드 링크 정렬)
- 진행 내용
- 프로필 상단에서 북마크는 카드 안 버튼으로, 작성글은 계정 정보 카드 안 버튼으로 분리돼 있어 사용자 활동 동선이 일관되지 않음을 확인
- 이번 사이클 범위를 `북마크/내 작성글 카드 클릭형 통일` + `계정 정보 카드 CTA 제거` + `운영 문서 진입점 정리`로 확정
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 225 완료 (북마크 네이밍/진입 경로 정렬)
- 완료 내용
- 북마크 네이밍과 경로 정렬:
  - `app/src/components/posts/post-bookmark-button.tsx`
  - `app/src/app/bookmarks/page.tsx`
  - `app/src/app/saved/page.tsx`
  - `app/src/server/actions/post.ts`
  - 게시글 토글 버튼, 빈 상태, 북마크 목록 헤더/타임스탬프를 `저장` 기준에서 `북마크` 기준으로 통일
  - 기본 목록 경로를 `/bookmarks`로 옮기고, 기존 `/saved`는 검색 파라미터를 유지한 채 `/bookmarks`로 리다이렉트되도록 호환 경로를 추가
- 프로필/개인화/운영 문서 정렬:
  - `app/src/app/profile/page.tsx`
  - `app/src/lib/feed-personalization.ts`
  - `app/src/app/admin/policies/page.tsx`
  - `app/src/components/admin/feed-personalization-policy-form.tsx`
  - 북마크 CTA를 계정 정보 카드에서 제거하고 활동 요약 카드로 옮겼으며, 개인화 설명과 운영 정책 화면의 `최근 저장`/`저장 신호` 표현도 `최근 북마크`/`북마크 신호`로 맞춤
  - `docs/개발_운영_가이드.md`, `docs/operations/Vercel_OAuth_초기설정_가이드.md`, `docs/operations/운영_문서_안내.md`, `PLAN.md`, `PROGRESS.md`도 `/bookmarks` 및 `북마크` 기준으로 갱신
- 검증 결과
- `pnpm -C app lint src/app/bookmarks/page.tsx src/app/saved/page.tsx src/app/saved/page.test.tsx src/app/profile/page.tsx src/app/posts/[id]/guest/page.tsx src/components/posts/post-bookmark-button.tsx src/components/posts/post-detail-client.tsx src/components/posts/feed-infinite-list.tsx src/server/actions/post.ts src/server/actions/post.test.ts src/lib/feed-personalization.ts src/lib/feed-personalization.test.ts src/app/admin/policies/page.tsx src/components/admin/feed-personalization-policy-form.tsx` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/app/saved/page.test.tsx src/server/actions/post.test.ts src/lib/feed-personalization.test.ts` 통과
- `pnpm -C app docs:refresh:check` 통과
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 225 착수 (북마크 네이밍/진입 경로 정렬)
- 진행 내용
- 사용자 노출 경로와 문구가 `bookmark` 기능임에도 `/saved`, `저장`, `저장한 글`로 섞여 있어 북마크 기능 인지가 약하고, 프로필 계정 정보 카드에 북마크 링크가 들어간 것도 맥락이 어색함을 확인
- 이번 사이클 범위를 `UI/설명/운영 문서 네이밍 정렬` + `기본 경로 /bookmarks 전환` + `프로필 CTA 위치 조정`으로 확정
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 224 완료 (운영 문서 drift sync)
- 완료 내용
- production env/email/upload 기준선 문서 동기화:
  - `docs/개발_운영_가이드.md`
  - `docs/operations/Resend_Vercel_이메일_설정_가이드.md`
  - `docs/operations/Vercel_OAuth_초기설정_가이드.md`
  - production에서 `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`이 필수라는 점과 `password reset/email verification` 메일의 fail-fast 동작을 현재 코드 기준으로 정정
  - `welcome email`만 best-effort 성격이라는 점과, 실제 배포는 strict security env preflight로 먼저 차단된다는 점을 함께 기록
- migration/Neon 운영 절차 보강:
  - `docs/개발_운영_가이드.md`
  - 로컬 준비 절차를 `db:migrate` 중심으로 재정리
  - `P3005` baseline 절차를 현재 `build:vercel` 동작과 맞추고, `P3009` failed migration 복구(`원인 데이터 정리 -> migrate resolve --rolled-back -> migrate deploy -> migrate status`) 절차를 추가
  - Neon SQL Editor에서 `_prisma_migrations`와 `ReportReason` enum을 확인하는 실전 쿼리를 문서화
- 사이클 종료 루틴/운영 화면/targeted test 문서화:
  - `docs/operations/에이전트_운영_가이드.md`
  - `docs/operations/운영_문서_안내.md`
  - `docs/제품_기술_개요.md`
  - `commit -> push -> quality-gate -> ops:check:health -> worktree clean` 종료 루틴과 changed-file 기준 lint/typecheck/vitest/playwright 실행법, `/admin/personalization`, `/admin/breeds`, `/bookmarks` 진입점을 운영 문서에 반영
  - `scripts/refresh-docs-index.mjs` 출력 경로를 현재 문서 구조(`docs/archive/operations/문서 동기화 리포트.md`)와 맞춰 `docs:refresh`/`docs:refresh:check`가 다시 동작하도록 정리
- 검증 결과
- `git diff --check` 통과
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 224 착수 (운영 문서 drift sync)
- 진행 내용
- 최근 사이클에서 실제 운영 기준으로 정착된 env/migration/test/cycle close 절차와 `docs/` 사이에 drift가 남아 있음을 재점검
- 이번 사이클 범위를 `production env drift 정리 + migration/Neon 절차 보강 + cycle close/test/admin screen 문서화`로 확정
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 223 완료 (개인화 튜닝 정책 설정화)
- 완료 내용
- 개인화 튜닝 정책 저장소/검증 경로 추가:
  - `app/src/lib/feed-personalization-policy.ts`
  - `app/src/lib/feed-personalization-policy.test.ts`
  - `app/src/lib/validations/policy.ts`
  - `app/src/server/queries/policy.queries.ts`
  - `app/src/server/queries/policy.queries.test.ts`
  - `SiteSetting` 기반 `feed_personalization_policy_v1` 정책을 추가해 recent signal recency decay, personalized ratio/threshold, click/ad/dwell/bookmark multiplier+cap을 운영 조정 가능하게 구성
- 관리자 정책 화면에 개인화 튜닝 UI 추가:
  - `app/src/app/admin/policies/page.tsx`
  - `app/src/components/admin/feed-personalization-policy-form.tsx`
  - `app/src/server/actions/policy.ts`
  - `app/src/server/services/policy.service.ts`
  - `/admin/policies`에서 개인화 blend/threshold와 recent signal multiplier/cap을 수정할 수 있게 했고, 저장 성공/오류 메시지를 운영 UI에 연결
- personalized feed ranking에 tuning policy 적용:
  - `app/src/server/queries/post.queries.ts`
  - `app/src/server/queries/post.queries.test.ts`
  - recent click/ad/dwell/bookmark signal과 personalized/explore interleave가 정책값을 직접 사용하도록 바꿨고, bookmark multiplier를 0으로 내리면 최근 북마크 신호가 꺼지는 회귀 테스트를 추가
- 제품 문서 동기화:
  - `docs/product/품종_개인화_기획서.md`
  - 개인화 tuning 정책이 운영 조정 경로로 추가된 상태를 반영하고, 후속 오픈 이슈를 A/B 실험/CTR 기준 재보정으로 정리
- 검증 결과
- `pnpm -C app lint src/app/admin/policies/page.tsx src/components/admin/feed-personalization-policy-form.tsx src/lib/feed-personalization-policy.ts src/lib/feed-personalization-policy.test.ts src/lib/validations/policy.ts src/server/actions/policy.ts src/server/services/policy.service.ts src/server/queries/policy.queries.ts src/server/queries/policy.queries.test.ts src/server/queries/post.queries.ts src/server/queries/post.queries.test.ts` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/lib/feed-personalization-policy.test.ts src/server/queries/policy.queries.test.ts src/server/queries/post.queries.test.ts` 실행 시 전체 Vitest 스위트 통과
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 223 착수 (개인화 튜닝 정책 설정화)
- 진행 내용
- recent click/ad/dwell/bookmark 개인화 가중치와 recency decay, personalized/explore blend가 전부 하드코딩되어 있어 운영자가 CTR/저장률 데이터에 맞춰 즉시 튜닝할 경로가 없음을 확인
- 이번 사이클 범위를 `SiteSetting 기반 tuning policy` + `/admin/policies` 편집 UI + personalized ranking 적용 + 회귀 테스트로 확정
- 이슈/블로커
- 현재 `docs/product/품종_개인화_기획서.md`는 사용자가 수정한 내용이 일부 남아 있어, 기존 변경을 되돌리지 않고 필요한 운영 튜닝 메모만 최소 반영하기로 함

### 2026-03-07: Cycle 222 완료 (북마크(bookmark) 기반 7차 개인화 신호)
- 완료 내용
- PostBookmark 스키마/서비스/액션/북마크 UI 추가:
  - `app/prisma/schema.prisma`
  - `app/prisma/migrations/20260307093000_add_post_bookmarks/migration.sql`
  - `app/src/server/services/post.service.ts`
  - `app/src/server/actions/post.ts`
  - `app/src/components/posts/post-bookmark-button.tsx`
  - 인증 사용자가 피드/상세에서 게시글을 북마크/해제할 수 있도록 `PostBookmark` 모델과 토글 액션을 추가하고, 북마크/해제 시 `/feed`, `/posts/[id]`, `/bookmarks` 캐시를 함께 무효화하도록 정리
  - 상세/피드 조회 경로는 viewer 기준 `isBookmarked` 상태를 후처리로 부착해 기존 목록/상세 쿼리와 롤링 배포 호환성을 유지
- 북마크 목록 페이지 및 프로필 진입 경로 추가:
  - `app/src/server/queries/post.queries.ts`
  - `app/src/app/bookmarks/page.tsx`
  - `app/src/app/profile/page.tsx`
  - `/bookmarks`에서 검색/카테고리/페이지네이션 기준으로 북마크한 글을 조회할 수 있게 했고, 프로필 요약 카드와 링크로 진입 경로를 연결
- recent bookmark 기반 7차 개인화 신호/설명 연결:
  - `app/src/server/queries/post.queries.ts`
  - `app/src/lib/feed-personalization.ts`
  - `app/src/lib/feed-personalization.test.ts`
  - `app/src/app/feed/page.tsx`
  - `docs/product/품종_개인화_기획서.md`
  - 최근 북마크한 글의 커뮤니티/관심 태그를 personalized ranking의 약한 7차 signal로 반영하고, `/feed` 맞춤 추천 설명과 제품 문서를 `최근 북마크한 글` 기준 설명까지 동기화
- 검증 결과
- `pnpm -C app exec prisma format` 통과
- `pnpm -C app exec prisma generate` 통과
- `pnpm -C app lint app/src/app/bookmarks/page.tsx app/src/app/feed/page.tsx app/src/app/lounges/breeds/[breedCode]/page.tsx app/src/app/posts/[id]/guest/page.tsx app/src/app/profile/page.tsx app/src/components/posts/post-bookmark-button.tsx app/src/components/posts/post-detail-client.tsx app/src/components/posts/feed-infinite-list.tsx app/src/components/posts/guest-feed-page-client.tsx app/src/app/api/feed/guest/route.ts app/src/lib/feed-personalization.ts app/src/lib/feed-personalization.test.ts app/src/server/actions/post.ts app/src/server/actions/post.test.ts app/src/server/queries/post.queries.ts app/src/server/queries/post.queries.test.ts app/src/server/services/post.service.ts app/src/server/services/post.service.test.ts` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/server/actions/post.test.ts src/server/services/post.service.test.ts src/server/queries/post.queries.test.ts src/lib/feed-personalization.test.ts` 실행 시 전체 Vitest 스위트 `97 files / 497 tests` 통과
- 이슈/블로커
- local `pnpm -C app exec prisma migrate deploy`는 이번 변경 때문이 아니라 기존 `20260307011000_limit_report_target_to_post` migration에서 local DB의 legacy non-post report rows 때문에 계속 막히므로, 새 bookmark migration은 production DB에서 선행 migration 정리 상태를 전제로 반영해야 함

### 2026-03-07: Cycle 222 착수 (북마크(bookmark) 기반 7차 개인화 신호)
- 진행 내용
- 현재 personalized feed는 dwell까지 6차 신호를 쓰지만, PRD에 명시된 `save` 기반 signal과 제품 자체의 저장 기능은 아직 전혀 없음을 확인
- 이번 사이클 범위를 `PostBookmark 모델/토글 UI/북마크 페이지` + `최근 북마크 기반 7차 signal` + 피드 설명/제품 문서 동기화로 확정
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 221 완료 (상세 체류시간 기반 6차 개인화 신호)
- 완료 내용
- post dwell event 계측 추가:
  - `app/prisma/schema.prisma`
  - `app/prisma/migrations/20260307090000_add_post_dwell_event/migration.sql`
  - `app/src/lib/feed-personalization-metrics.ts`
  - `app/src/lib/validations/feed-personalization.ts`
  - `app/src/lib/feed-personalization-tracking.ts`
  - `app/src/components/posts/post-personalization-dwell-tracker.tsx`
  - `app/src/components/posts/post-detail-client.tsx`
  - authenticated 상세 페이지에서 12초 이상 머문 경우에만 `POST_DWELL` 이벤트를 기록하도록 tracker를 추가
  - dwell 이벤트는 기존 `/api/feed/personalization` 경로와 user-level event log에 함께 저장되고, `POST_DWELL`도 `postId`를 필수로 검증
- recent dwell 6차 랭킹 신호/설명 연결:
  - `app/src/server/queries/post.queries.ts`
  - `app/src/server/queries/post.queries.test.ts`
  - `app/src/lib/feed-personalization.ts`
  - `app/src/lib/feed-personalization.test.ts`
  - `app/src/app/feed/page.tsx`
  - 최근 오래 읽은 게시글의 `petTypeId`/관심 태그를 recency-weighted 6차 positive signal로 연결하고, 5차 click/ad signal과 분리해 더 강한 intent로만 반영
  - `/feed` 맞춤 추천 설명에 `최근 오래 읽은 글` 6차 신호를 추가하고, 프로필 신호가 부족하면 dwell 기준 fallback summary도 제공
- 제품 문서 동기화:
  - `docs/product/품종_개인화_기획서.md`
  - 구현 상태를 dwell 기반 6차 신호까지 반영된 상태로 갱신하고, 다음 오픈 이슈를 `bookmark/save` 기반 후속 신호로 조정
- 검증 결과
- `pnpm -C app exec prisma format` 통과
- `pnpm -C app exec prisma generate` 통과
- `pnpm -C app lint src/components/posts/post-personalization-dwell-tracker.tsx src/components/posts/post-detail-client.tsx src/components/posts/feed-infinite-list.tsx src/lib/feed-personalization-tracking.ts src/lib/feed-personalization-metrics.ts src/lib/feed-personalization.ts src/lib/feed-personalization.test.ts src/lib/validations/feed-personalization.ts src/app/api/feed/personalization/route.test.ts src/server/services/feed-personalization-metrics.service.ts src/server/services/feed-personalization-metrics.service.test.ts src/server/queries/post.queries.ts src/server/queries/post.queries.test.ts src/app/feed/page.tsx` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/app/api/feed/personalization/route.test.ts src/lib/feed-personalization.test.ts src/server/queries/post.queries.test.ts src/server/services/feed-personalization-metrics.service.test.ts` 실행 시 전체 Vitest 스위트 `97 files / 490 tests` 통과
- 이슈/블로커
- local `prisma migrate deploy`는 여전히 선행 `20260307011000_limit_report_target_to_post` migration에서 legacy non-post report rows 때문에 막히므로, 새 dwell enum migration도 production DB에선 선행 migration이 이미 정리된 상태를 전제로 반영해야 함

### 2026-03-07: Cycle 221 착수 (상세 체류시간 기반 6차 개인화 신호)
- 진행 내용
- user-level personalization event log에는 현재 `POST_CLICK`/`AD_CLICK`만 있어, 실제로 오래 읽은 글과 스치듯 클릭한 글이 동일한 5차 신호로 취급되고 있음을 확인
- 저장(bookmark) 기능은 제품 자체가 아직 없으므로, 이번 사이클은 authenticated 상세 페이지에서 일정 시간 이상 머문 `POST_DWELL` 이벤트를 기록하고 이를 6차 신호로 사용하는 방향이 가장 현실적이라고 판단
- 이번 사이클 범위를 `post detail dwell tracking -> user-level log -> recent dwell ranking signal` + 피드 설명/제품 문서 동기화로 확정
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 220 완료 (최근 클릭/광고 반응 기반 5차 개인화 신호)
- 완료 내용
- user-level click/ad event log 저장소 추가:
  - `app/prisma/schema.prisma`
  - `app/prisma/migrations/20260307083000_add_feed_personalization_event_logs/migration.sql`
  - `app/src/lib/validations/feed-personalization.ts`
  - `app/src/app/api/feed/personalization/route.ts`
  - `app/src/server/services/feed-personalization-metrics.service.ts`
  - personalized feed aggregate 통계는 유지하면서, 인증 사용자 `POST_CLICK`/`AD_CLICK` 이벤트를 `FeedPersonalizationEventLog`에 함께 저장하도록 확장
  - `POST_CLICK` payload에는 `postId`를 필수로 강제하고, 롤링 배포 구간에서 새 log table이 아직 없더라도 aggregate 수집은 유지되도록 best-effort 저장으로 정리
- recency-weighted 5차 랭킹 신호/설명 연결:
  - `app/src/server/queries/post.queries.ts`
  - `app/src/server/queries/post.queries.test.ts`
  - `app/src/lib/feed-personalization.ts`
  - `app/src/lib/feed-personalization.test.ts`
  - `app/src/app/feed/page.tsx`
  - 최근 게시글 클릭 로그는 `petTypeId`/관심 태그 기준으로 약한 5차 boost에 반영하고, 최근 광고 클릭 로그는 품종 audience key 기준으로 author pet 매치에 약한 reinforcement로 반영
  - `/feed` 맞춤 추천 설명에 `최근 클릭/광고 반응` 5차 신호를 추가하고, 프로필 신호가 부족한 경우에는 recent behavior 기준 fallback summary도 제공
- 제품 문서 동기화:
  - `docs/product/품종_개인화_기획서.md`
  - 구현 상태를 user-level click/ad response 5차 신호까지 반영된 상태로 갱신하고, 다음 오픈 이슈를 `저장(bookmark)/체류시간` 기반 6차 신호로 조정
- 검증 결과
- `pnpm -C app exec prisma format` 통과
- `pnpm -C app exec prisma generate` 통과
- `pnpm -C app lint src/app/api/feed/personalization/route.ts src/app/api/feed/personalization/route.test.ts src/app/feed/page.tsx src/components/posts/feed-infinite-list.tsx src/lib/feed-personalization.ts src/lib/feed-personalization.test.ts src/lib/validations/feed-personalization.ts src/server/queries/post.queries.ts src/server/queries/post.queries.test.ts src/server/services/feed-personalization-metrics.service.ts src/server/services/feed-personalization-metrics.service.test.ts` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/app/api/feed/personalization/route.test.ts src/lib/feed-personalization.test.ts src/server/queries/post.queries.test.ts src/server/services/feed-personalization-metrics.service.test.ts` 실행 시 전체 Vitest 스위트 `97 files / 485 tests` 통과
- 이슈/블로커
- 로컬 `pnpm -C app exec prisma migrate deploy`는 이번 변경이 아니라 이전 `20260307011000_limit_report_target_to_post` migration에서 local DB에 남아 있는 legacy non-post report rows 때문에 막혔음. production DB는 해당 선행 migration이 이미 적용된 상태를 전제로 새 migration을 반영해야 함

### 2026-03-07: Cycle 220 착수 (최근 클릭/광고 반응 기반 5차 개인화 신호)
- 진행 내용
- current personalized feed는 프로필, 선호 커뮤니티, 관심 태그, 최근 reaction까지는 반영하지만, user-level `POST_CLICK`/`AD_CLICK` 로그는 aggregate 통계로만 남고 개인화 랭킹에는 사용하지 않고 있음을 확인
- `/api/feed/personalization` route와 service는 현재 일별 aggregate upsert만 수행하므로, 이번 사이클은 aggregate를 유지하면서 per-user click/ad event log를 추가하고 recent click/ad response를 약한 5차 signal로 소비하는 방향으로 범위를 확정
- 저장(bookmark) 반응은 현재 제품 기능 자체가 없으므로 이번 사이클 범위에서는 제외하고, 실제로 존재하는 click/ad response 로그를 recency-weighted signal로 우선 연결
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 219 완료 (최근 반응 기반 4차 개인화 신호)
- 완료 내용
- recent reaction 4차 랭킹 신호 연결:
  - `app/src/server/queries/post.queries.ts`
  - `app/src/server/queries/post.queries.test.ts`
  - 최근 `PostReaction`의 `LIKE/DISLIKE`에서 커뮤니티/관심 태그 신호를 추출해 personalized feed에 약한 4차 boost 또는 suppress를 추가
  - 최근 좋아요는 `petTypeId`/관심 태그 기준으로 약한 가산점, 최근 싫어요는 같은 축에서 약한 감점으로 반영되도록 보정
  - 프로필/선호 커뮤니티 신호가 약한 경우에도 최근 반응한 `산책`, `후기`, `건강` 같은 주제가 피드 정렬에 반영되도록 연결
- 피드 설명/제품 문서 동기화:
  - `app/src/lib/feed-personalization.ts`
  - `app/src/lib/feed-personalization.test.ts`
  - `app/src/app/feed/page.tsx`
  - `docs/product/품종_개인화_기획서.md`
  - `/feed` 맞춤 추천 설명에 `최근 반응` 강조 문구와 4차 신호 설명을 추가하고, 프로필 신호가 부족할 때는 최근 반응 기준 fallback summary도 제공
  - 제품 문서 구현 상태를 `최근 좋아요/싫어요 반응` 4차 신호까지 반영된 상태로 갱신하고 다음 오픈 이슈를 5차 신호로 조정
- 검증 결과
- `pnpm -C app lint src/server/queries/post.queries.ts src/server/queries/post.queries.test.ts src/lib/feed-personalization.ts src/lib/feed-personalization.test.ts src/app/feed/page.tsx` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/lib/feed-personalization.test.ts src/server/queries/post.queries.test.ts` 실행 시 전체 Vitest 스위트 `97 files / 479 tests` 통과
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 219 착수 (최근 반응 기반 4차 개인화 신호)
- 진행 내용
- personalized feed는 현재 프로필, 선호 커뮤니티, 관심 태그까지는 반영하지만, 실제 사용자가 최근에 무엇에 좋아요/싫어요를 눌렀는지 같은 engagement 신호는 아직 사용하지 않고 있음을 확인
- 별도 click/save user-level 로그는 아직 없지만 `PostReaction`은 이미 저장되고 있어, 이번 사이클은 최근 `LIKE/DISLIKE` 반응에서 커뮤니티/태그 선호를 약한 4차 신호로 추출하는 방향이 현실적이라고 판단
- 이번 사이클 범위를 `recent reactions -> viewer engagement signal -> personalized ranking` + 피드 설명/제품 문서 동기화로 확정
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 218 완료 (활동 태그/콘텐츠 카테고리 3차 개인화 신호)
- 완료 내용
- 선호 커뮤니티 태그 3차 랭킹 신호 연결:
  - `app/src/server/queries/post.queries.ts`
  - `app/src/server/queries/post.queries.test.ts`
  - `app/src/server/queries/community.queries.ts`
  - preferred community의 `Community.tags`를 viewer 관심 태그로 읽고, post `type`, `reviewCategory`, `petType.tags`, `animalTags`로 구성한 콘텐츠 신호와 매칭해 최대 `+0.09`의 약한 3차 boost를 추가
  - 프로필/세그먼트 직접 신호가 약한 경우에도 `산책`, `건강`, `사료` 같은 주제성 태그가 personalized feed 정렬에 반영되도록 보정
  - `listCommunityNavItems`는 nav/feed summary에서도 같은 태그를 재사용할 수 있도록 `tags`를 함께 반환하게 정리
- 피드 설명/제품 문서 동기화:
  - `app/src/lib/feed-personalization.ts`
  - `app/src/lib/feed-personalization.test.ts`
  - `app/src/app/feed/page.tsx`
  - `docs/product/품종_개인화_기획서.md`
  - `/feed` 맞춤 추천 설명에 `관심 태그` 강조 문구와 3차 신호 설명을 추가하고, 프로필 신호가 부족할 때는 관심 태그 기준 fallback summary도 제공
  - 제품 문서 구현 상태를 `선호 커뮤니티 태그 -> 콘텐츠 카테고리` 3차 신호까지 반영된 상태로 갱신하고 다음 오픈 이슈를 4차 신호로 조정
- 검증 결과
- `pnpm -C app lint src/server/queries/post.queries.ts src/server/queries/post.queries.test.ts src/server/queries/community.queries.ts src/lib/feed-personalization.ts src/lib/feed-personalization.test.ts src/app/feed/page.tsx` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/lib/feed-personalization.test.ts src/server/queries/post.queries.test.ts` 실행 시 전체 Vitest 스위트 `97 files / 476 tests` 통과
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 218 착수 (활동 태그/콘텐츠 카테고리 3차 개인화 신호)
- 진행 내용
- `preferredPetTypes`는 2차 community match까지 연결됐지만, `Community.tags`와 post `type/reviewCategory/petType.tags` 기반의 주제성 신호는 personalized ranking에 아직 반영되지 않고 있음을 확인
- seed 데이터 기준으로 각 커뮤니티에 `산책`, `건강`, `사료`, `훈련` 같은 태그가 이미 존재하고, post 쪽에도 `reviewCategory`, `animalTags`, `type`이 있어 별도 스키마 추가 없이 3차 신호를 만들 수 있다고 판단
- 이번 사이클 범위를 `community.tags -> viewer 관심 태그 -> post 콘텐츠 신호 매칭` + 피드 설명/제품 문서 동기화로 확정
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 217 완료 (선호 커뮤니티 기반 2차 개인화 신호 연결)
- 완료 내용
- preferredPetTypes 2차 랭킹 신호 연결:
  - `app/src/server/queries/post.queries.ts`
  - `app/src/server/queries/post.queries.test.ts`
  - personalized feed 점수에 viewer의 `preferredPetTypes`와 post `petTypeId` 매치를 `+0.12` 2차 가중치로 추가
  - 프로필/세그먼트 기반 pet signal이 없어도 선호 커뮤니티만으로 personalized feed가 약하게 재정렬되도록 보정
  - viewer pet signal이 없을 때는 author pet 조회를 생략해 불필요한 query를 줄이고, 선호 커뮤니티 매치 회귀 테스트를 추가
- 피드 개인화 설명에 선호 커뮤니티 신호 노출:
  - `app/src/lib/feed-personalization.ts`
  - `app/src/lib/feed-personalization.test.ts`
  - `app/src/app/feed/page.tsx`
  - `docs/product/품종_개인화_기획서.md`
  - `resolveFeedAudienceContext`에 선호 커뮤니티 라벨을 포함하고, 품종/프로필 기준 설명에 `선호 커뮤니티` 2차 신호를 함께 노출
  - 프로필 신호가 비어 있는 경우에도 `선호 커뮤니티 기준으로 기본 맞춤 추천` 요약이 나오도록 fallback summary를 추가
- 검증 결과
- `pnpm -C app lint src/server/queries/post.queries.ts src/server/queries/post.queries.test.ts src/lib/feed-personalization.ts src/lib/feed-personalization.test.ts src/app/feed/page.tsx` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/lib/feed-personalization.test.ts src/server/queries/post.queries.test.ts` 실행 시 전체 Vitest 스위트 `97 files / 474 tests` 통과
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 217 착수 (선호 커뮤니티 기반 2차 개인화 신호 연결)
- 진행 내용
- `preferredPetTypes`와 `UserPetTypePreference` 저장 경로는 이미 존재하지만, personalized ranking 점수 함수는 여전히 품종/체급/생애단계 신호만 사용하고 있음을 확인
- `/feed` 개인화 설명도 세그먼트/프로필 기준만 노출하고 있어 사용자가 선택한 커뮤니티 선호가 랭킹에 어떻게 쓰이는지 보이지 않음을 확인
- 이번 사이클 범위를 `preferredPetTypes -> post.petTypeId` 2차 가중치 연결 + 피드 설명/제품 문서 동기화로 확정
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 216 완료 (혼종/품종 미상 개인화 fallback 고도화)
- 완료 내용
- 세그먼트 confidence/audience key 보정:
  - `app/src/lib/pet-profile.ts`
  - `app/src/lib/pet-profile.test.ts`
  - `app/src/lib/feed-personalization.ts`
  - `app/src/lib/feed-personalization.test.ts`
  - `MIXED`/`UNKNOWN`이 더 이상 specific breed bonus를 받지 않도록 `breedFallback:*` 태그와 fallback confidence 규칙으로 정리
  - feed audience context는 specific breed가 없을 때 `species:sizeClass:lifeStage` 형태 fallback key를 사용하고, 요약 문구도 “기본 맞춤 추천” 모드로 분리
  - generic fallback context에서는 품종 라운지형 광고 CTA를 노출하지 않도록 제한
- personalized feed generic breed 오인 매치 제거:
  - `app/src/server/queries/post.queries.ts`
  - `app/src/server/queries/post.queries.test.ts`
  - personalized feed 점수에서 `MIXED`/`UNKNOWN` 동일 code만으로 breed match `+0.45`를 주던 규칙을 제거
  - 대신 specific breed route가 있는 code만 strong breed match로 인정하고, 혼종/미상/수동 라벨은 `breedLabel + sizeClass + lifeStage + species` 조합 fallback으로 점수를 계산
  - `UserAudienceSegment`의 `interestTags`에서 fallback breed label을 읽어 personalized ranking에도 반영
- 제품 문서 동기화:
  - `docs/product/품종_개인화_기획서.md`
  - 혼종/품종 미상 fallback 전략이 구현 상태에 반영되었음을 기록하고, open issue를 다음 단계 신호(활동 태그/콘텐츠 카테고리)로 갱신
- 검증 결과
- `pnpm -C app lint src/lib/pet-profile.ts src/lib/pet-profile.test.ts src/lib/feed-personalization.ts src/lib/feed-personalization.test.ts src/server/queries/post.queries.ts src/server/queries/post.queries.test.ts` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/lib/pet-profile.test.ts src/lib/feed-personalization.test.ts src/server/queries/post.queries.test.ts` 실행 시 전체 Vitest 스위트 `97 files / 471 tests` 통과
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 216 착수 (혼종/품종 미상 개인화 fallback 고도화)
- 진행 내용
- personalized feed 점수 함수가 현재 `MIXED`/`UNKNOWN`도 같은 `breedCode`면 specific breed와 동일한 `+0.45` boost를 주고 있어, “품종 미상끼리 강한 품종 매치”처럼 취급되는 비현실적인 규칙을 확인
- `UserAudienceSegment` confidence 계산도 단순히 `breedCode` 존재 여부만 보고 bonus를 주고 있어 `MIXED`/`UNKNOWN` 세그먼트가 과대평가될 수 있음을 확인
- 이번 사이클 범위를 `generic breed 오인 매치 제거 + 종/체급/생애단계/혼종 라벨 중심 fallback audience key/summary 보정`으로 확정
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 215 완료 (품종 사전 운영 관리 경로 정착)
- 완료 내용
- BreedCatalog effective merge semantics 보정:
  - `app/src/lib/breed-catalog.ts`
  - `app/src/server/queries/breed-catalog.queries.ts`
  - `app/src/server/queries/breed-catalog.queries.test.ts`
  - default catalog와 DB override/custom row를 code 단위로 merge하도록 변경해 species별 일부 override만 있어도 기본 목록이 사라지지 않게 수정
  - inactive DB row는 동일 code의 default/custom entry를 명시적으로 숨기도록 처리하고, `findBreedCatalogEntryBySpeciesAndCode`도 disabled override를 존중하도록 정리
- moderator breed catalog 운영 경로 추가:
  - `app/src/lib/validations/breed-catalog.ts`
  - `app/src/server/services/breed-catalog.service.ts`
  - `app/src/server/services/breed-catalog.service.test.ts`
  - `app/src/server/actions/breed-catalog.ts`
  - `app/src/components/admin/breed-catalog-manager.tsx`
  - `app/src/app/admin/breeds/page.tsx`
  - moderator가 `/admin/breeds`에서 effective catalog를 확인하고 DB override/custom entry를 추가/수정/비활성화/삭제할 수 있는 관리 UI와 server action을 추가
  - 기본 사전 code와 같은 값으로 저장하면 override, 새로운 code면 custom entry가 되도록 운영 모델을 명확히 함
- 운영 네비게이션/문서 동기화:
  - `app/src/app/admin/policies/page.tsx`
  - `app/src/app/admin/personalization/page.tsx`
  - `app/src/app/admin/auth-audits/page.tsx`
  - `app/src/app/admin/reports/page.tsx`
  - `docs/product/품종_개인화_기획서.md`
  - 기존 admin 페이지 footer에 `품종 사전` 링크를 추가하고, PRD의 `품종 사전 운영 소스` open issue를 닫음
- 검증 결과
- `pnpm -C app lint src/lib/breed-catalog.ts src/lib/validations/breed-catalog.ts src/server/queries/breed-catalog.queries.ts src/server/queries/breed-catalog.queries.test.ts src/server/services/breed-catalog.service.ts src/server/services/breed-catalog.service.test.ts src/server/actions/breed-catalog.ts src/components/admin/breed-catalog-manager.tsx src/app/admin/breeds/page.tsx src/app/admin/policies/page.tsx src/app/admin/personalization/page.tsx src/app/admin/auth-audits/page.tsx src/app/admin/reports/page.tsx` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/server/queries/breed-catalog.queries.test.ts src/server/services/breed-catalog.service.test.ts` 실행 시 전체 Vitest 스위트 `97 files / 468 tests` 통과
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 215 착수 (품종 사전 운영 관리 경로 정착)
- 진행 내용
- `BreedCatalog` query가 현재는 species별 DB row가 1개만 생겨도 default catalog 전체를 대체하는 구조라, 운영자가 일부 override만 추가했을 때 사용자 폼의 품종 목록이 축소될 수 있음을 확인
- 품종 사전 운영 소스 open issue를 닫기 위해 moderator가 실제로 `BreedCatalog`를 조정할 수 있는 `/admin/breeds` 관리 경로가 필요하다고 판단
- 이번 사이클 범위를 `effective merge semantics 보정 + moderator breed catalog 관리 화면/액션 + 제품 문서 동기화`로 확정
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 214 완료 (품종 사전 기반 프로필 입력 정규화)
- 완료 내용
- 품종 사전 fallback/query와 seed 정리:
  - `app/src/lib/breed-catalog.ts`
  - `app/src/server/queries/breed-catalog.queries.ts`
  - `app/src/server/queries/breed-catalog.queries.test.ts`
  - `app/prisma/seed.ts`
  - species별 기본 품종 사전을 코드에 내장하고, DB `BreedCatalog`가 비어 있거나 일부 species만 채워져 있어도 query가 fallback으로 응답하도록 정리
  - seed에서 기본 품종 사전을 `BreedCatalog`로 upsert해 로컬/운영 초기 데이터 품질을 맞춤
- pet service 품종 정규화 강화:
  - `app/src/server/services/pet.service.ts`
  - `app/src/server/services/pet.service.test.ts`
  - pet create/update가 `breedCode`를 품종 사전으로 검증하고, catalog label을 canonical `labelKo`로 자동 보정하도록 변경
  - 사전에 없는 `breedCode`는 `breedLabel`도 없는 경우 `INVALID_BREED_CODE` 400으로 fail-fast 처리
- 프로필 폼 선택형 UX 전환:
  - `app/src/app/profile/page.tsx`
  - `app/src/components/profile/pet-profile-manager.tsx`
  - `/profile` 반려동물 폼이 species별 품종 select를 표시하고 `품종 미상`, `혼종/믹스`, `사전에 없어서 직접 입력` fallback을 제공
  - raw `breedCode` 직접 타이핑 입력을 제거하고, catalog 품종 선택 시 canonical label과 기본 체급 힌트를 노출
  - 서버 페이지에서 `BreedCatalog`를 함께 조회해 create/edit 폼 모두 같은 품종 선택 기준을 사용하게 연결
- 제품 문서 동기화:
  - `docs/product/품종_개인화_기획서.md`
  - 품종 입력 기본값을 사전 기반 선택 UI + 직접 입력 fallback으로 갱신
- 검증 결과
- `pnpm -C app lint src/lib/breed-catalog.ts src/server/queries/breed-catalog.queries.ts src/server/queries/breed-catalog.queries.test.ts src/server/services/pet.service.ts src/server/services/pet.service.test.ts src/components/profile/pet-profile-manager.tsx src/app/profile/page.tsx prisma/seed.ts` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/server/queries/breed-catalog.queries.test.ts src/server/services/pet.service.test.ts` 실행 시 전체 Vitest 스위트 `96 files / 460 tests` 통과
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 214 착수 (품종 사전 기반 프로필 입력 정규화)
- 진행 내용
- 현재 반려동물 프로필은 `breedCode`를 사용자가 직접 타이핑해야 하고, 서버도 사전 검증 없이 그대로 저장해 실제 운영 입력 UX와 데이터 품질이 모두 거침을 확인
- `BreedCatalog` 모델은 존재하지만 조회/seed/UI 소비가 거의 없어 개인화 신호 정규화에 충분히 활용되지 못하고 있음을 확인
- 이번 사이클 범위를 `BreedCatalog fallback/query + pet service 품종 검증/자동 라벨 보정 + 프로필 폼 선택형 UX`로 확정
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 213 완료 (개인화/광고 반응 지표 계측 정착)
- 완료 내용
- 개인화 지표 집계 저장소 추가:
  - `app/prisma/schema.prisma`
  - `app/prisma/migrations/20260307054500_add_feed_personalization_stats/migration.sql`
  - `FeedPersonalizationStat` 일별 집계 모델과 `surface/event/audienceSource` enum을 추가
  - audienceKey/breedCode를 non-null 차원으로 정규화해 upsert 기반 집계를 안정화
- personalized tracking route/service/query 추가:
  - `app/src/lib/feed-personalization-metrics.ts`
  - `app/src/lib/validations/feed-personalization.ts`
  - `app/src/server/services/feed-personalization-metrics.service.ts`
  - `app/src/server/queries/feed-personalization-metrics.queries.ts`
  - `app/src/app/api/feed/personalization/route.ts`
  - 개인화 피드 조회, 게시글 클릭, 광고 노출, 광고 클릭을 일별 aggregate로 저장하는 서버 경로를 추가
  - schema 미동기화 시 202 `SCHEMA_SYNC_REQUIRED`로 skip하고 UX는 깨지지 않게 유지
- 피드/라운지 client tracking 연결:
  - `app/src/components/posts/feed-infinite-list.tsx`
  - `app/src/app/feed/page.tsx`
  - `app/src/app/lounges/breeds/[breedCode]/page.tsx`
  - personalized feed 최초 조회를 queryKey 기준 1회 기록하고, 게시글 클릭과 광고 노출/클릭도 keepalive POST로 집계
  - 메인 피드와 품종 라운지 모두 `surface`와 `audienceSource`를 함께 전달
- 운영 UI 추가:
  - `app/src/app/admin/personalization/page.tsx`
  - `app/src/app/admin/auth-audits/page.tsx`
  - `app/src/app/admin/reports/page.tsx`
  - `app/src/app/admin/policies/page.tsx`
  - `/admin/personalization`에서 최근 7/14/30일 personalized feed CTR, 광고 CTR, surface/source 요약, 상위 audience key를 확인 가능하게 추가
  - 기존 admin 페이지에서 바로 진입할 수 있도록 링크를 연결
- 제품 문서 동기화:
  - `docs/product/품종_개인화_기획서.md`
- 검증 결과
- `pnpm -C app exec prisma format` 통과
- `pnpm -C app exec prisma generate` 통과
- `pnpm -C app lint src/lib/feed-personalization-metrics.ts src/lib/validations/feed-personalization.ts src/server/services/feed-personalization-metrics.service.ts src/server/services/feed-personalization-metrics.service.test.ts src/server/queries/feed-personalization-metrics.queries.ts src/server/queries/feed-personalization-metrics.queries.test.ts src/app/api/feed/personalization/route.ts src/app/api/feed/personalization/route.test.ts src/app/admin/personalization/page.tsx src/components/posts/feed-infinite-list.tsx src/app/feed/page.tsx 'src/app/lounges/breeds/[breedCode]/page.tsx' src/app/admin/auth-audits/page.tsx src/app/admin/reports/page.tsx src/app/admin/policies/page.tsx` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/server/services/feed-personalization-metrics.service.test.ts src/server/queries/feed-personalization-metrics.queries.test.ts src/app/api/feed/personalization/route.test.ts src/server/queries/post.queries.test.ts src/lib/feed-personalization.test.ts` 실행 시 전체 Vitest 스위트 `95 files / 454 tests` 통과
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 212 완료 (맞춤 추천 모드 노출 및 세그먼트 소비 고도화)
- 완료 내용
- `/feed` 맞춤 추천 노출 정리:
  - `app/src/app/feed/page.tsx`
  - 로그인 사용자의 글로벌 전체 피드에서 `일반 추천/맞춤 추천` 토글을 명시적으로 노출
  - 현재 적용 중인 세그먼트/프로필 기준을 chip으로 보여주고, 맞춤 추천 활성화 시 설명 배너와 프로필 보강 CTA를 제공
- 품종 라운지 personalized UX 정리:
  - `app/src/app/lounges/breeds/[breedCode]/page.tsx`
  - 품종 라운지에서도 `일반 정렬/맞춤 정렬` 토글을 제공하고, 검색/기간/타입 필터와 함께 `personalized=1` 상태를 유지
  - 맞춤 정렬 사용 시 현재 기준 설명 배너를 함께 노출
- 개인화 helper/광고 audience key 정리:
  - `app/src/lib/feed-personalization.ts`
  - `app/src/lib/feed-personalization.test.ts`
  - `UserAudienceSegment` 또는 pet fallback을 하나의 `FeedAudienceContext`로 정규화하고, 요약 문구/광고 설정을 공용 helper로 생성
  - 유효한 품종 라운지가 없는 경우 광고는 숨기되, audience key는 종 레벨로 유지하도록 보정
- 개인화 신호 소비 경로 전환:
  - `app/src/server/queries/post.queries.ts`
  - `app/src/server/queries/post.queries.test.ts`
  - 피드 personalized ranking이 `UserAudienceSegment`를 우선 읽고, schema/모델 부재나 빈 결과일 때만 pet fallback을 사용하도록 변경
  - 세그먼트 우선 경로와 fallback 경로 회귀 테스트를 추가
- 품종 라운지 링크 규칙 공용화:
  - `app/src/lib/pet-profile.ts`
  - `app/src/components/profile/pet-profile-manager.tsx`
  - `app/src/app/profile/page.tsx`
  - `app/src/app/users/[id]/page.tsx`
  - `UNKNOWN`/`MIXED`를 품종 라운지 링크에서 제외하는 규칙을 helper로 통일
- 제품 문서 동기화:
  - `docs/product/품종_개인화_기획서.md`
- 검증 결과
- `pnpm -C app lint src/lib/feed-personalization.ts src/lib/feed-personalization.test.ts src/lib/pet-profile.ts src/app/feed/page.tsx 'src/app/lounges/breeds/[breedCode]/page.tsx' src/server/queries/post.queries.ts src/server/queries/post.queries.test.ts src/components/profile/pet-profile-manager.tsx src/app/profile/page.tsx 'src/app/users/[id]/page.tsx'` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/lib/feed-personalization.test.ts src/server/queries/post.queries.test.ts` 실행 시 전체 Vitest 스위트 `92 files / 447 tests` 통과
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 211 완료 (프로필 기반 개인화 신호 활성화)
- 완료 내용
- 반려동물 프로필 입력 확장:
  - `app/src/lib/validations/pet.ts`
  - `app/src/server/services/pet.service.ts`
  - `app/src/components/profile/pet-profile-manager.tsx`
  - 반려동물 create/update 경로가 `breedCode`, `sizeClass`, `lifeStage`를 저장하도록 확장
  - 프로필 UI에서 품종 코드, 품종명, 체급, 생애단계를 입력/수정할 수 있고, 의미 있는 품종 코드는 품종 라운지 링크로 연결
- 개인화 세그먼트 동기화/조회 추가:
  - `app/src/lib/pet-profile.ts`
  - `app/src/server/services/audience-segment.service.ts`
  - `app/src/server/queries/audience-segment.queries.ts`
  - `app/src/app/api/profile/audience-segments/route.ts`
  - pet 변경 시 `UserAudienceSegment`를 transaction 안에서 재생성하도록 변경
  - 내 프로필에서 세그먼트 요약과 신뢰도를 노출하고 `/api/profile/audience-segments`에서 no-store 조회 가능하게 추가
- 프로필 노출 정합화:
  - `app/src/app/profile/page.tsx`
  - `app/src/app/users/[id]/page.tsx`
  - `/profile`, `/users/[id]` 모두 품종/체급/생애단계를 같은 규칙으로 표시하도록 정리
- 제품 문서 동기화:
  - `docs/product/품종_개인화_기획서.md`
- 회귀 테스트 추가/보강:
  - `app/src/lib/pet-profile.test.ts`
  - `app/src/app/api/profile/audience-segments/route.test.ts`
  - `app/src/server/services/pet.service.test.ts`
- 검증 결과
- `pnpm -C app lint src/lib/pet-profile.ts src/lib/pet-profile.test.ts src/lib/validations/pet.ts src/server/services/audience-segment.service.ts src/server/queries/audience-segment.queries.ts src/server/services/pet.service.ts src/server/services/pet.service.test.ts src/components/profile/pet-profile-manager.tsx src/app/profile/page.tsx 'src/app/users/[id]/page.tsx' src/app/api/profile/audience-segments/route.ts src/app/api/profile/audience-segments/route.test.ts` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/lib/pet-profile.test.ts src/server/services/pet.service.test.ts src/app/api/profile/audience-segments/route.test.ts` 실행 시 전체 Vitest 스위트 `91 files / 443 tests` 통과
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 210 완료 (인증 감사 로그 retention 정착)
- 완료 내용
- auth audit retention helper 도입:
  - `app/src/server/auth-audit-retention.ts`
  - `app/scripts/cleanup-auth-audits.ts`
  - 인증 감사 로그 cleanup 로직을 공용 helper로 분리하고 기본 retention을 `180일`로 명시
  - cleanup script가 cutoff 시각을 함께 출력하도록 보강
- 운영 workflow 추가:
  - `.github/workflows/auth-audit-cleanup.yml`
  - GitHub Actions에서 하루 1회 `DATABASE_URL` 기준 auth audit cleanup을 실행하도록 추가
- 운영/보안 문서 동기화:
  - `docs/개발_운영_가이드.md`
  - `docs/security/보안_계획.md`
  - `docs/security/보안_진행상황.md`
  - 인증 감사 로그의 기본 retention 180일과 cleanup workflow를 문서화
- 회귀 테스트 추가:
  - `app/src/server/auth-audit-retention.test.ts`
- 검증 결과
- `pnpm -C app lint src/server/auth-audit-retention.ts src/server/auth-audit-retention.test.ts scripts/cleanup-auth-audits.ts .github/workflows/auth-audit-cleanup.yml` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/server/auth-audit-retention.test.ts` 실행 시 전체 Vitest 스위트 통과
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 209 완료 (배포 보안 pre-deploy gate 완결)
- 완료 내용
- production build preflight 편입:
  - `app/scripts/vercel-build.ts`
  - Vercel `production` 타깃 배포에서 `ops:check:security-env:strict`를 빌드 최상단에 실행하도록 추가
  - preflight 실패 시 `prisma migrate deploy`, schema repair, `next build` 이전에 즉시 종료
  - preview/development 타깃은 기본 skip 유지, 필요 시 `DEPLOY_SECURITY_PREFLIGHT_STRICT=1`로 opt-in 가능
- 배포 파이프라인 회귀 테스트 추가:
  - `app/scripts/vercel-build.test.ts`
  - production 타깃에서 preflight가 맨 먼저 실행되는지와 failure 시 prisma deploy 이전에 중단되는지 고정
- 운영 문서/리스크 동기화:
  - `docs/개발_운영_가이드.md`
  - `docs/operations/Vercel_OAuth_초기설정_가이드.md`
  - `docs/operations/manual-checks/배포_보안_체크리스트.md`
  - `docs/security/보안_계획.md`
  - `docs/security/보안_진행상황.md`
  - `docs/security/보안_위험_등록부.md`
  - `build:vercel` 설명을 실제 동작 순서로 갱신하고, `R-009`를 mitigated로 전환
- 검증 결과
- `pnpm -C app lint scripts/vercel-build.ts scripts/vercel-build.test.ts` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- scripts/vercel-build.test.ts` 실행 시 전체 Vitest 스위트 통과
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 208 완료 (회원가입 abuse defense 현실화)
- 완료 내용
- 회원가입 다축 abuse 방어 도입:
  - `app/src/server/auth-register-rate-limit.ts`
  - `app/src/app/api/auth/register/route.ts`
  - `app/src/components/auth/register-form.tsx`
  - 회원가입 route가 pre-validation `IP/fingerprint`, post-validation `email+IP/email` 기준 throttling을 순차 적용
  - malformed JSON, invalid input, duplicate rejection, rate-limit hit, registration success를 각각 명시적인 응답/감사 로그로 surface
  - 브라우저 register form이 `x-client-fingerprint` 헤더를 전송해 디바이스 축 제한을 활성화
- auth audit/운영 가시화 확장:
  - `app/prisma/schema.prisma`
  - `app/prisma/migrations/20260307043000_expand_auth_audit_for_register_events/migration.sql`
  - `app/src/app/admin/auth-audits/page.tsx`
  - auth audit action에 `REGISTER_SUCCESS`, `REGISTER_REJECTED`, `REGISTER_RATE_LIMITED`를 추가
  - 관리자 인증 감사 화면에서 신규 액션과 등록 제한/중복/입력 오류 사유 라벨을 조회 가능하게 정리
- 회귀 테스트 추가/보강:
  - `app/src/server/auth-register-rate-limit.test.ts`
  - `app/src/app/api/auth/register/route.test.ts`
- 검증 결과
- `pnpm -C app exec prisma format` 통과
- `pnpm -C app exec prisma generate` 통과
- `pnpm -C app lint src/app/api/auth/register/route.ts src/app/api/auth/register/route.test.ts src/app/admin/auth-audits/page.tsx src/components/auth/register-form.tsx src/server/auth-register-rate-limit.ts src/server/auth-register-rate-limit.test.ts` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/server/auth-register-rate-limit.test.ts src/app/api/auth/register/route.test.ts src/app/api/admin/auth-audits/route.test.ts src/app/api/admin/auth-audits/export/route.test.ts` 실행 시 전체 Vitest 스위트 `88 files / 435 tests` 통과
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 204 완료 (알림/운영 이력 retention 강화)
- 완료 내용
- 읽음/보관 의미 분리:
  - `app/src/server/queries/notification.queries.ts`
  - `읽음 처리`와 `모두 읽음 처리`가 더 이상 `archivedAt`을 함께 쓰지 않고 `isRead/readAt`만 갱신
  - 보관(`archive`)만 inbox에서 숨김을 담당하도록 정리
- 알림 UI/브라우저 흐름 정합화:
  - `app/src/components/notifications/notification-center.tsx`
  - `app/src/components/notifications/notification-bell.tsx`
  - 읽음 처리 후 알림이 목록에 남고, unread-only 필터에서는 즉시 빠지며, `보관`만 목록 제거를 담당하도록 업데이트
  - 알림 센터 copy를 `읽음은 유지 / 보관은 숨김` 기준으로 수정
- retention/cleanup 운영 경로 고도화:
  - `app/src/server/notification-retention.ts`
  - `app/scripts/cleanup-notifications.ts`
  - `.github/workflows/notification-cleanup.yml`
  - 보관 알림 cleanup을 공용 helper로 분리하고 기본 retention을 `90일`로 상향
  - cleanup script는 더 이상 missing schema를 조용히 skip하지 않고 실패를 surface
- 운영 문서/확인 경로 추가:
  - `docs/개발_운영_가이드.md`
  - `docs/operations/SLO_알림_기준.md`
  - support/ops가 `archivedAt IS NOT NULL` 기준으로 특정 사용자 보관 이력을 확인할 SQL 경로를 문서화
- 회귀 테스트 추가/보강:
  - `app/src/server/notification-retention.test.ts`
  - `app/src/server/queries/notification.queries.test.ts`
  - `app/e2e/notification-comment-flow.spec.ts`
  - `app/e2e/notification-filter-controls.spec.ts`
  - 알림 E2E가 credentials 로그인 단계를 자체적으로 수행하도록 보강
- 검증 결과
- `pnpm -C app lint src/server/queries/notification.queries.ts src/server/queries/notification.queries.test.ts src/server/notification-retention.ts src/server/notification-retention.test.ts scripts/cleanup-notifications.ts src/components/notifications/notification-center.tsx src/components/notifications/notification-bell.tsx e2e/notification-comment-flow.spec.ts e2e/notification-filter-controls.spec.ts` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/server/queries/notification.queries.test.ts src/server/actions/notification.test.ts src/app/api/notifications/route.test.ts src/server/notification-retention.test.ts` 실행 시 전체 Vitest 스위트 `85 files / 414 tests` 통과
- `pnpm -C app exec playwright install chromium` 완료
- `pnpm -C app test:e2e -- e2e/notification-comment-flow.spec.ts e2e/notification-filter-controls.spec.ts --project=chromium --workers=1` 통과
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 203 완료 (검색 로그 privacy/retention hardening)
- 완료 내용
- 검색 로그 저장 보강:
  - `app/src/lib/search-term-privacy.ts`
  - `app/src/app/api/search/log/route.ts`
  - `app/src/server/queries/search.queries.ts`
  - 검색 로그 API가 더 이상 fire-and-forget으로 통계를 날리지 않고 응답 전에 `recordSearchTerm`을 await
  - `recordSearchTerm`는 `recorded=true`, `recorded=false(SENSITIVE_TERM/INVALID_TERM)`, `SCHEMA_SYNC_REQUIRED`를 명시적으로 구분
  - 이메일/전화번호/오픈카카오/메신저 링크/카카오톡 ID 패턴은 SearchTermStat 저장과 인기 검색어 읽기에서 제외
- SearchTermStat retention/cleanup 경로 추가:
  - `app/src/server/search-term-stat-retention.ts`
  - `app/scripts/cleanup-search-terms.ts`
  - `app/package.json`
  - `.github/workflows/search-term-cleanup.yml`
  - `updatedAt` 기준 90일 retention cleanup helper/script/workflow를 추가
- 운영 문서 동기화:
  - `docs/operations/검색 통계 전환 가이드.md`
  - `docs/개발_운영_가이드.md`
  - 검색 로그 privacy 필터, cleanup 명령, workflow/retention 기준을 운영 문서에 반영
- 회귀 테스트 추가/보강:
  - `app/src/lib/search-term-privacy.test.ts`
  - `app/src/app/api/search/log/route.test.ts`
  - `app/src/server/queries/search.queries.test.ts`
  - `app/src/server/search-term-stat-retention.test.ts`
- 검증 결과
- `pnpm -C app lint src/lib/search-term-privacy.ts src/lib/search-term-privacy.test.ts src/app/api/search/log/route.ts src/app/api/search/log/route.test.ts src/server/queries/search.queries.ts src/server/queries/search.queries.test.ts src/server/search-term-stat-retention.ts src/server/search-term-stat-retention.test.ts scripts/cleanup-search-terms.ts` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app exec vitest run src/lib/search-term-privacy.test.ts src/app/api/search/log/route.test.ts src/server/queries/search.queries.test.ts src/server/search-term-stat-retention.test.ts` 통과
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 202 완료 (운영 보호장치 fail-open 제거)
- 완료 내용
- moderation/policy control plane fail-closed 전환:
  - `app/src/server/schema-sync.ts`
  - `app/src/server/moderation-control-plane.ts`
  - `app/src/server/services/sanction.service.ts`
  - `app/src/server/queries/policy.queries.ts`
  - `app/src/server/queries/user-relation.queries.ts`
  - `app/src/server/queries/notification.queries.ts`
  - `app/src/server/services/guest-safety.service.ts`
  - sanction/policy/block/mute/notification/guest-safety가 Prisma delegate 누락 또는 table/column drift를 만나면 더 이상 기본값/빈 결과로 통과하지 않고 `SCHEMA_SYNC_REQUIRED` 503으로 실패
  - `Notification.archivedAt` 컬럼 fallback과 guest ban/sanction/policy default fallback 제거
- route/page fail-open 제거:
  - `app/src/app/api/users/[id]/relation/route.ts`
  - `app/src/app/api/viewer-shell/route.ts`
  - `app/src/app/api/feed/guest/route.ts`
  - `app/src/app/api/search/guest/route.ts`
  - `app/src/app/api/posts/suggestions/route.ts`
  - `app/src/app/feed/page.tsx`
  - `app/src/app/posts/[id]/guest/page.tsx`
  - control plane schema drift가 나면 관계 상태/알림 개수/guest read policy를 조용히 빈 값으로 숨기지 않고 route는 명시 503, SSR 페이지는 실패로 surface
- health/preflight 확장:
  - `app/src/app/api/health/route.ts`
  - `app/scripts/check-health-endpoint.ts`
  - `app/scripts/check-security-env.ts`
  - `/api/health` detailed payload에 `checks.controlPlane` 추가
  - `ops:check:health`가 control plane probe 결과를 출력
  - `ops:check:security-env`는 `OPS_BASE_URL`이 주어지면 원격 health를 함께 확인해 schema drift를 조기 감지
- 회귀 테스트 추가/보강
  - `app/src/server/queries/policy.queries.test.ts`
  - `app/src/server/services/guest-safety-control-plane.test.ts`
  - `app/src/server/services/sanction.service.test.ts`
  - `app/src/server/queries/notification.queries.test.ts`
  - `app/src/app/api/users/[id]/relation/route.test.ts`
  - `app/src/app/api/viewer-shell/route.test.ts`
  - `app/src/app/api/feed/guest/route.test.ts`
  - `app/src/app/api/health/route.test.ts`
- 검증 결과
- `pnpm -C app lint scripts/check-health-endpoint.ts scripts/check-security-env.ts src/app/api/feed/guest/route.ts src/app/api/feed/guest/route.test.ts src/app/api/health/route.ts src/app/api/health/route.test.ts src/app/api/posts/suggestions/route.ts src/app/api/search/guest/route.ts src/app/api/users/[id]/relation/route.ts src/app/api/users/[id]/relation/route.test.ts src/app/api/viewer-shell/route.ts src/app/api/viewer-shell/route.test.ts src/app/feed/page.tsx src/app/posts/[id]/guest/page.tsx src/server/moderation-control-plane.ts src/server/schema-sync.ts src/server/queries/notification.queries.ts src/server/queries/notification.queries.test.ts src/server/queries/policy.queries.ts src/server/queries/policy.queries.test.ts src/server/queries/user-relation.queries.ts src/server/services/guest-safety.service.ts src/server/services/guest-safety-control-plane.test.ts src/server/services/sanction.service.ts src/server/services/sanction.service.test.ts` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app exec vitest run src/server/services/sanction.service.test.ts src/server/services/guest-safety-control-plane.test.ts src/server/queries/notification.queries.test.ts src/server/queries/policy.queries.test.ts src/app/api/health/route.test.ts src/app/api/users/[id]/relation/route.test.ts src/app/api/viewer-shell/route.test.ts src/app/api/feed/guest/route.test.ts` 통과
- `pnpm -C app exec vitest run src/app/api/search/guest/route.test.ts src/app/api/posts/suggestions/route.test.ts src/app/api/lounges/breeds/[breedCode]/posts/route.test.ts src/app/api/posts/route.test.ts src/app/api/notifications/route.test.ts src/server/services/post-read-access.service.test.ts` 통과
- 이슈/블로커
- 없음

### 2026-03-07: Cycle 207 완료 (middleware incident defense-in-depth)
- 완료 내용
- 정적 security header fallback 추가:
  - `app/src/lib/security-headers.ts`
  - `app/next.config.ts`
  - `app/middleware.ts`
  - CSP/XFO/nosniff/referrer-policy 생성을 공용 helper로 분리하고, `next.config`에 전역 static header fallback을 추가
  - middleware가 누락돼도 최소 보안 헤더와 relaxed fallback CSP가 남도록 구성
- 닉네임 가드의 서버 페이지 이관:
  - `app/src/lib/nickname-guard.ts`
  - `app/src/server/nickname-guard.ts`
  - `app/src/app/feed/page.tsx`
  - `app/src/app/search/page.tsx`
  - `app/src/app/notifications/page.tsx`
  - `app/src/app/my-posts/page.tsx`
  - `app/src/app/posts/new/page.tsx`
  - `app/src/app/posts/[id]/page.tsx`
  - `app/src/app/posts/[id]/edit/page.tsx`
  - `app/src/app/users/[id]/page.tsx`
  - `app/src/app/password/setup/page.tsx`
  - `app/src/app/lounges/breeds/[breedCode]/page.tsx`
  - `app/src/app/lounges/breeds/[breedCode]/groupbuys/new/page.tsx`
  - `app/src/app/admin/reports/page.tsx`
  - `app/src/app/admin/reports/[id]/page.tsx`
  - `app/src/app/admin/auth-audits/page.tsx`
  - `app/src/app/admin/policies/page.tsx`
  - 미들웨어 없이도 로그인 사용자의 닉네임이 비어 있으면 주요 서버 페이지에서 `/profile`로 리다이렉트
- 회귀 테스트 추가:
  - `app/src/lib/security-headers.test.ts`
  - `app/src/lib/nickname-guard.test.ts`
- 검증 결과
- `pnpm -C app lint next.config.ts middleware.ts src/middleware.test.ts src/lib/security-headers.ts src/lib/security-headers.test.ts src/lib/nickname-guard.ts src/lib/nickname-guard.test.ts src/server/nickname-guard.ts src/app/feed/page.tsx src/app/search/page.tsx src/app/notifications/page.tsx src/app/my-posts/page.tsx src/app/posts/new/page.tsx src/app/posts/[id]/page.tsx src/app/posts/[id]/edit/page.tsx src/app/users/[id]/page.tsx src/app/password/setup/page.tsx src/app/lounges/breeds/[breedCode]/page.tsx src/app/lounges/breeds/[breedCode]/groupbuys/new/page.tsx src/app/admin/reports/page.tsx src/app/admin/reports/[id]/page.tsx src/app/admin/auth-audits/page.tsx src/app/admin/policies/page.tsx` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app exec vitest run src/lib/security-headers.test.ts src/lib/nickname-guard.test.ts src/middleware.test.ts src/app/api/viewer-shell/route.test.ts` 통과
- 이슈/블로커
- 로컬 워크트리에는 `app/src/lib/env.ts` 별도 수정이 계속 남아 있으며, 이번 cycle 커밋에는 포함하지 않음

### 2026-03-07: Cycle 201 완료 (신고/제재 운영 현실화)
- 완료 내용
- 신고 auto-hide 정책을 고정 임계치에서 가중치 기반으로 전환:
  - `app/src/lib/report-moderation.ts`
  - reporter trust(계정 나이/이메일 인증/활동량/기존 제재 이력)와 10분 내 신고 속도를 함께 평가하는 helper 추가
  - `고유 신고자 2명 이상 + 누적 가중치 3.0 이상`일 때만 자동 숨김하고, 저신뢰 burst는 `HIGH` 우선순위 큐로 승격
- 신고 생성/일괄 처리 서비스 보강:
  - `app/src/server/services/report.service.ts`
  - 신규 신고 시 PENDING 신고만 기준으로 auto-hide 여부를 재계산
  - bulk 승인 경로에 `applySanction` 옵션 추가
  - bulk 승인 시 동일 사용자에 대해서는 report 수와 무관하게 사용자별 1회만 단계적 제재를 발급
  - 이미 처리된 신고를 bulk/single 경로에서 다시 처리하지 못하도록 방어
- 관리자 신고 큐 우선순위 반영:
  - `app/src/server/queries/report.queries.ts`
  - `app/src/app/admin/reports/page.tsx`
  - `app/src/components/admin/report-queue-table.tsx`
  - 운영 큐에서 가중치/속도/저신뢰 집중 신호를 표시하고 `긴급/높음/보통/낮음` 우선순위로 정렬
  - bulk 승인 UI에 단계적 제재 체크박스와 제재 요약 메시지 추가
- 정책 문서 동기화:
  - `docs/policies/신고_운영정책.md`
  - `docs/policies/모더레이션_운영규칙.md`
- 회귀 테스트 보강:
  - `app/src/lib/report-moderation.test.ts`
  - `app/src/server/services/report.service.test.ts`
- 검증 결과
- `pnpm -C app lint src/lib/report-moderation.ts src/lib/report-moderation.test.ts src/lib/validations/report-bulk.ts src/server/services/report.service.ts src/server/services/report.service.test.ts src/server/queries/report.queries.ts src/app/admin/reports/page.tsx src/components/admin/report-queue-table.tsx` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app exec vitest run src/lib/report-moderation.test.ts src/server/services/report.service.test.ts src/app/api/reports/route.test.ts src/server/queries/report.queries.test.ts` 통과
- 이슈/블로커
- 로컬 워크트리에는 `app/src/lib/env.ts` 별도 수정이 계속 남아 있으며, 이번 cycle 커밋에는 포함하지 않음

### 2026-03-07: Cycle 200 완료 (신고 target 범위 Post-only 정렬)
- 완료 내용
- 신고 target 범위를 Post-only로 고정:
  - `app/prisma/schema.prisma`
  - `app/prisma/migrations/20260307011000_limit_report_target_to_post/migration.sql`
  - `ReportTarget` enum을 `POST`만 남기고, migration에서 non-post 레코드가 있으면 명시적으로 실패하도록 가드 추가
- 입력/서비스 정렬:
  - `app/src/lib/validations/report.ts`
  - `app/src/server/services/report.service.ts`
  - 신규 신고는 `POST`만 허용하고, legacy `COMMENT/USER` 타입이 들어오면 생성/처리/일괄 처리에서 명시적으로 거부
- 관리자 신고 큐/상세/통계 정렬:
  - `app/src/lib/report-target.ts`
  - `app/src/server/queries/report.queries.ts`
  - `app/src/app/admin/reports/page.tsx`
  - `app/src/app/admin/reports/[id]/page.tsx`
  - `app/src/components/admin/report-queue-table.tsx`
  - 관리자 필터/통계/큐는 지원 대상(Post)만 노출하고, direct URL로 legacy 신고를 열어도 깨지지 않도록 fallback 표시 추가
- 댓글 UI 정리:
  - `app/src/components/posts/post-comment-thread.tsx`
  - 댓글 메뉴에서 신고 동선을 제거해 실제 운영 범위와 사용자 UI를 일치시킴
- 정책 문서 동기화:
  - `docs/policies/신고_운영정책.md`
  - `docs/policies/모더레이션_운영규칙.md`
- 회귀 테스트 보강:
  - `app/src/lib/validations/report.test.ts`
  - `app/src/server/services/report.service.test.ts`
  - `app/src/server/queries/report.queries.test.ts`
- 검증 결과
- `pnpm -C app exec prisma generate` 통과
- `pnpm -C app exec prisma format --schema prisma/schema.prisma` 통과
- `pnpm -C app lint src/lib/report-target.ts src/lib/validations/report.ts src/lib/validations/report.test.ts src/server/services/report.service.ts src/server/services/report.service.test.ts src/server/queries/report.queries.ts src/server/queries/report.queries.test.ts src/app/admin/reports/page.tsx src/app/admin/reports/[id]/page.tsx src/components/admin/report-queue-table.tsx src/components/posts/post-comment-thread.tsx scripts/seed-reports.ts` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app exec vitest run src/lib/validations/report.test.ts src/server/services/report.service.test.ts src/server/queries/report.queries.test.ts src/app/api/reports/route.test.ts` 통과
- 이슈/블로커
- migration은 non-post 신고 레코드가 DB에 존재하면 의도적으로 실패한다. 실제 배포 전 운영 DB에 legacy `COMMENT/USER` 신고가 없는지 확인이 필요
- 로컬 워크트리에 남아 있는 `app/src/lib/env.ts` 별도 수정 때문에 `pnpm -C app test -- ...` 형태의 광역 실행은 unrelated `env.test.ts` 실패가 섞일 수 있어, 이번 cycle 검증은 대상 파일만 `vitest run`으로 한정

### 2026-03-06: Cycle 206 완료 (guest 상세 작성자 유형 정합화)
- 완료 내용
- 실배포 smoke에서 회원 작성 글도 `/posts/:id/guest`에서 `비회원 수정/삭제` UI가 노출되는 버그를 확인하고 guest 작성자 판별 기준을 공용 helper로 통일:
  - `app/src/lib/post-guest-meta.ts`
  - guest 작성자 여부, 표시 이름, IP 표시값을 하나의 기준으로 계산
- guest 상세/편집/클라이언트 상세 반영:
  - `app/src/app/posts/[id]/guest/page.tsx`
  - `app/src/components/posts/post-detail-client.tsx`
  - `app/src/app/posts/[id]/edit/page.tsx`
  - 실제 guest 글일 때만 `GuestPostDetailActions`가 노출되도록 수정
  - 구조화 데이터 author도 같은 표시 이름을 사용하도록 정렬
- 회귀 테스트 추가
  - `app/src/lib/post-guest-meta.test.ts`
  - guest 필드가 없는 회원 글은 `isGuestPost=false`로 판정되는 케이스를 고정
- 검증 결과
- `pnpm -C app lint src/lib/post-guest-meta.ts src/lib/post-guest-meta.test.ts src/app/posts/[id]/guest/page.tsx src/components/posts/post-detail-client.tsx src/app/posts/[id]/edit/page.tsx` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/lib/post-guest-meta.test.ts` 실행 시 전체 Vitest 스위트가 수행됐고 `77 files / 380 tests` 모두 통과
- 이슈/블로커
- guest 상세 경로의 비로그인 리다이렉트(`/posts/:id -> /posts/:id/guest`) 자체는 현재 제품 의도로 유지했고, 이번 수정은 잘못된 guest 관리 UI 노출만 제거

### 2026-03-06: Cycle 199 완료 (로그인 감사 로그 + progressive backoff)
- 완료 내용
- credentials 로그인 경로를 전용 모듈로 분리하고 운영 감사/지연 방어를 추가:
  - `app/src/server/auth-credentials.ts`
  - 로그인 성공, 실패, rate limit 이벤트를 공통 경로에서 처리
- 감사 로그 스키마 확장:
  - `app/prisma/schema.prisma`
  - `app/prisma/migrations/20260306133000_expand_auth_audit_for_login_events/migration.sql`
  - `AuthAuditLog`에 `identifierHash`, `identifierLabel`, `reasonCode`를 추가하고 `userId`를 nullable로 전환
  - `AuthAuditAction`에 `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `LOGIN_RATE_LIMITED` 추가
- 운영 UI/API 확장:
  - `app/src/server/queries/auth-audit.queries.ts`
  - `app/src/app/admin/auth-audits/page.tsx`
  - `app/src/app/api/admin/auth-audits/export/route.ts`
  - 운영자가 로그인 실패 사유, 마스킹된 식별자, rate limit 이벤트까지 검색/내보내기 가능
- 1차 step-up 방어:
  - `app/src/server/rate-limit.ts`
  - `app/src/server/auth-login-rate-limit.ts`
  - 계정+IP 시도 횟수 기반 progressive delay(3회째 750ms, 이후 단계적 증가, 최대 5s) 추가
  - 성공 로그인 시 account/account+ip 카운터를 정리해 정상 사용자의 오탐 체류를 줄임
- 회귀 테스트 추가/보강
  - `app/src/server/auth-credentials.test.ts`
  - `app/src/server/auth-login-identifier.test.ts`
  - `app/src/app/api/admin/auth-audits/export/route.test.ts`
  - `app/src/app/api/admin/auth-audits/route.test.ts`
- 검증 결과
- `pnpm -C app exec prisma generate` 통과
- `pnpm -C app lint src/lib/auth.ts src/server/auth-credentials.ts src/server/auth-credentials.test.ts src/server/auth-audit-log.ts src/server/auth-login-identifier.ts src/server/auth-login-identifier.test.ts src/server/auth-login-rate-limit.ts src/server/rate-limit.ts src/server/queries/auth-audit.queries.ts src/app/admin/auth-audits/page.tsx src/app/api/admin/auth-audits/export/route.ts src/app/api/admin/auth-audits/export/route.test.ts src/app/api/admin/auth-audits/route.test.ts` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/server/auth-credentials.test.ts src/server/auth-login-identifier.test.ts src/app/api/admin/auth-audits/export/route.test.ts src/app/api/admin/auth-audits/route.test.ts src/server/auth.service.test.ts` 통과
- 이슈/블로커
- 실제 운영 DB에는 `pnpm prisma migrate deploy`로 `20260306133000_expand_auth_audit_for_login_events` 마이그레이션을 반영해야 함
- CAPTCHA/MFA 같은 상위 단계 방어는 추후 별도 cycle로 확장 가능하지만, 현재 cycle DoD 범위의 observability + step-up(backoff)은 충족

### 2026-03-06: 운영/보안 findings 등록 + Cycle 197/198 처리
- 완료 내용
- 운영/보안 리뷰에서 식별한 후속 과제를 `PLAN.md`에 Cycle 197~205로 등록:
  - 정지 계정 write-path enforcement
  - 비밀번호 변경/재설정 세션 무효화
  - 로그인 abuse hardening 2차
  - 신고 스키마/운영 정합화
  - bulk sanction/auto-hide 현실화
  - moderation control plane fail-open 제거
  - 검색 로그 privacy/retention
  - 알림 retention 강화
  - guest abuse defense 현실화
- Cycle 197 완료:
  - `app/src/server/services/sanction.service.ts`
    - `assertUserInteractionAllowed()` 공용 가드 추가
  - `app/src/server/services/post.service.ts`
  - `app/src/server/services/comment.service.ts`
    - 글/댓글 작성·수정·삭제 및 반응 경로에서 active sanction을 서비스 레이어에서 다시 검증
  - `app/src/app/api/upload/route.ts`
  - `app/src/app/api/upload/client/route.ts`
    - 인증 사용자 업로드 경로도 sanction 상태를 존중하도록 보강
- Cycle 198 완료:
  - `app/prisma/schema.prisma`
  - `app/prisma/migrations/20260306120000_add_user_session_version/migration.sql`
    - `User.sessionVersion` 추가
  - `app/src/lib/auth.ts`
  - `app/src/lib/session-version.ts`
    - JWT 세션이 현재 `sessionVersion`과 동기화되고 mismatch 시 기존 세션을 무효화
  - `app/src/server/services/auth.service.ts`
    - 기존 비밀번호 변경/비밀번호 reset 확정 시 `sessionVersion` 증가
- 회귀 테스트 추가/보강
  - `app/src/lib/session-version.test.ts`
  - `app/src/server/services/auth.service.test.ts`
  - `app/src/server/services/sanction.service.test.ts`
  - `app/src/server/services/post-create-policy.test.ts`
  - `app/src/server/services/comment.service.test.ts`
  - `app/src/app/api/upload/route.test.ts`
  - `app/src/app/api/upload/client/route.test.ts`
  - `app/src/server/auth.test.ts`
- 검증 결과
- `pnpm -C app exec prisma generate` 통과
- `pnpm -C app lint src/lib/auth.ts src/lib/session-version.ts src/lib/session-version.test.ts src/types/next-auth.d.ts src/server/auth.ts src/server/auth.test.ts src/server/services/sanction.service.ts src/server/services/sanction.service.test.ts src/server/services/post.service.ts src/server/services/comment.service.ts src/server/services/auth.service.ts src/server/services/auth.service.test.ts src/server/services/post-create-policy.test.ts src/server/services/comment.service.test.ts src/app/api/upload/route.ts src/app/api/upload/route.test.ts src/app/api/upload/client/route.ts src/app/api/upload/client/route.test.ts` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/lib/session-version.test.ts src/server/auth.test.ts src/server/services/sanction.service.test.ts src/server/services/auth.service.test.ts src/server/services/post-create-policy.test.ts src/server/services/comment.service.test.ts src/app/api/upload/route.test.ts src/app/api/upload/client/route.test.ts` 통과
- 이슈/블로커
- `User.sessionVersion` 마이그레이션은 코드와 함께 추가했지만 실제 운영 DB에는 `pnpm prisma migrate deploy`로 반영해야 함
- 로그인 abuse 2차(실패 로그인 감사/step-up 방어), 신고 스키마 정합화, moderation fail-open 제거는 새 사이클로 pending 등록
- 변경 파일(핵심)
- `PLAN.md`
- `PROGRESS.md`
- `app/prisma/schema.prisma`
- `app/prisma/migrations/20260306120000_add_user_session_version/migration.sql`
- `app/src/lib/auth.ts`
- `app/src/lib/session-version.ts`
- `app/src/lib/session-version.test.ts`
- `app/src/server/services/auth.service.ts`
- `app/src/server/services/auth.service.test.ts`
- `app/src/server/services/sanction.service.ts`
- `app/src/server/services/post.service.ts`
- `app/src/server/services/comment.service.ts`
- `app/src/app/api/upload/route.ts`
- `app/src/app/api/upload/client/route.ts`

### 2026-03-06: Cycle 196 비밀번호 변경/설정 UX 정합화
- 완료 내용
- 비밀번호 보유 여부 조회 추가:
  - `app/src/server/queries/user.queries.ts`
  - 현재 사용자가 `passwordHash`를 보유하는지 확인하는 `getUserPasswordStatusById()` 추가
- `/password/setup` 서버 copy 분기:
  - `app/src/app/password/setup/page.tsx`
  - 로그인 사용자의 `hasPassword`를 조회해 헤더 문구를 `비밀번호 변경`/`비밀번호 설정`으로 분기
- 폼 UX 정합화:
  - `app/src/components/auth/set-password-form.tsx`
  - 기존 비밀번호가 있는 계정에만 현재 비밀번호 입력칸을 노출하고 필수 처리
  - 비밀번호를 잊은 경우에는 `/password/reset` 이메일 초기화 경로를 안내
  - 비밀번호가 없는 계정은 현재 비밀번호 없이 새 비밀번호만 설정하도록 분기
- 프로필 진입 링크 정합화:
  - `app/src/app/profile/page.tsx`
  - 프로필의 계정 액션 버튼도 `비밀번호 변경`/`비밀번호 설정`으로 일치시킴
- 순수 helper + 회귀 테스트 추가:
  - `app/src/lib/password-setup.ts`
  - `app/src/lib/password-setup.test.ts`
  - 현재 비밀번호 필수 분기와 확인 비밀번호 불일치 분기를 테스트로 고정
- 검증 결과
- `pnpm -C app lint src/lib/password-setup.ts src/lib/password-setup.test.ts src/server/queries/user.queries.ts src/app/password/setup/page.tsx src/components/auth/set-password-form.tsx src/app/profile/page.tsx` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/lib/password-setup.test.ts` 통과
- 이슈/블로커
- 서버 정책 자체는 기존과 동일하며, 이번 작업은 UI/클라이언트 검증 정합화에 집중
- 변경 파일(핵심)
- `app/src/lib/password-setup.ts`
- `app/src/lib/password-setup.test.ts`
- `app/src/server/queries/user.queries.ts`
- `app/src/app/password/setup/page.tsx`
- `app/src/components/auth/set-password-form.tsx`
- `app/src/app/profile/page.tsx`
- `PLAN.md`
- `PROGRESS.md`

### 2026-03-06: Cycle 195 production email/upload env fail-fast 보강
- 완료 내용
- production env 검증 강화:
  - `app/src/lib/env.ts`
  - `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN`를 production 필수 env로 추가
  - health/build/auth import 경로에서 email/upload 설정 누락이 더 이상 조용히 지나가지 않도록 fail-fast 기준을 확장
- ops 보안 env 체크 동기화:
  - `app/scripts/check-security-env.ts`
  - `ops:check:security-env`도 동일하게 `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN` 누락을 FAIL로 표시
- transactional email 실패 가시화:
  - `app/src/server/email.ts`
  - 비밀번호 재설정/이메일 인증 메일은 production에서 Resend 설정 누락 또는 전송 실패 시 `EMAIL_DELIVERY_NOT_CONFIGURED` / `EMAIL_DELIVERY_UNAVAILABLE`로 503 반환
  - 환영 메일은 회원 인증 완료 자체를 막지 않도록 best-effort 유지
- 회귀 테스트 추가/보강:
  - `app/src/app/api/auth/password/reset/request/route.test.ts`
  - `app/src/app/api/auth/verify/request/route.test.ts`
  - `app/src/app/api/auth/register/route.test.ts`
  - `app/src/lib/env.test.ts`
  - 인증 메일 발송 실패 시 503, production env 누락 시 fail 판정을 테스트로 고정
- 검증 결과
- `pnpm -C app lint src/lib/env.ts src/server/email.ts scripts/check-security-env.ts src/lib/env.test.ts src/app/api/auth/register/route.test.ts src/app/api/auth/password/reset/request/route.test.ts src/app/api/auth/verify/request/route.test.ts` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/lib/env.test.ts src/app/api/auth/register/route.test.ts src/app/api/auth/password/reset/request/route.test.ts src/app/api/auth/verify/request/route.test.ts` 통과
- 이슈/블로커
- `next build` 전체 재검증은 이 환경에서 Google Fonts 외부 fetch 제한 때문에 완료 판단 근거로 사용하지 않음
- 변경 파일(핵심)
- `app/src/lib/env.ts`
- `app/src/server/email.ts`
- `app/scripts/check-security-env.ts`
- `app/src/lib/env.test.ts`
- `app/src/app/api/auth/register/route.test.ts`
- `app/src/app/api/auth/password/reset/request/route.test.ts`
- `app/src/app/api/auth/verify/request/route.test.ts`
- `PLAN.md`
- `PROGRESS.md`

### 2026-03-06: Cycle 194 guest API prewarm/snapshot 자동화 확장
- 완료 내용
- `ops:prewarm` 대상 확장:
  - `app/scripts/prewarm-deployment.ts`
  - `/api/feed/guest`
  - `/api/search/guest?q=강아지`
  - 기존 `/feed`, `/search`, `/api/posts`, `/api/posts/suggestions`, 품종 피드와 함께 자동 호출
- `ops:perf:snapshot` 대상 확장:
  - `app/scripts/collect-latency-snapshot.ts`
  - `api_feed_guest`
  - `api_search_guest`
  - threshold도 guest API 기준으로 추가
- 실배포 재검증
- `OPS_BASE_URL=https://townpet2.vercel.app pnpm -C app ops:prewarm`
  - 1차: `api_feed_guest MISS 967ms`, `api_search_guest MISS 555ms`
  - 2차: `api_feed_guest HIT 118ms`, `api_search_guest HIT 111ms`
  - 같은 실행에서 `/feed`, `/search`도 2차 `HIT` 확인
- `OPS_BASE_URL=https://townpet2.vercel.app pnpm -C app ops:perf:snapshot`
  - 샘플 수: `170`
  - warmup 제외 steady-state 기준 전부 PASS
- 핵심 수치(steady-state p95)
- `api_feed_guest`: `228.4ms`
- `api_search_guest`: `215.2ms`
- `api_posts_global`: `374.0ms`
- `api_posts_suggestions`: `226.5ms`
- `api_breed_posts`: `194.6ms`
- `api_search_log`: `299.3ms`
- warm-up tail
- `api_posts_global` 첫 샘플 TTFB `3083.0ms`
- `api_search_log` 첫 샘플 TTFB `566.5ms`
- 해석
- guest API 전환은 운영 자동화(prewarm/snapshot)까지 포함해 정착됨
- 첫 요청 tail은 여전히 남아 있지만, guest API는 2차부터 빠르게 `HIT`로 전환
- 검증 결과
- `pnpm -C app lint scripts/prewarm-deployment.ts scripts/collect-latency-snapshot.ts` 통과
- `pnpm -C app typecheck` 통과
- `OPS_BASE_URL=https://townpet2.vercel.app pnpm -C app ops:prewarm`
- `OPS_BASE_URL=https://townpet2.vercel.app pnpm -C app ops:perf:snapshot`
- 이슈/블로커
- cold/warm-up 첫 요청 tail은 계속 추적 필요
- HTML page 자체의 `private, no-store` 제약은 여전히 별도 이슈
- 변경 파일(핵심)
- `app/scripts/prewarm-deployment.ts`
- `app/scripts/collect-latency-snapshot.ts`
- `PLAN.md`
- `PROGRESS.md`
- `docs/operations/캐시_성능_적용_기록.md`

### 2026-03-06: Cycle 193 guest 공개 API 배포 검증
- 완료 내용
- 실배포 헤더 확인:
  - `https://townpet2.vercel.app/api/feed/guest`
  - `https://townpet2.vercel.app/api/search/guest?q=강아지`
  - 첫 요청은 `x-vercel-cache: MISS`
  - 직후 재요청에서는 둘 다 `x-vercel-cache: STALE`, `age` 증가 확인
  - 응답 헤더는 Vercel에서 `cache-control: public`만 노출하지만 실제 CDN 재사용은 동작함
- latency snapshot 재실행:
  - `OPS_BASE_URL=https://townpet2.vercel.app pnpm -C app ops:perf:snapshot`
  - steady-state 기준 전 API threshold PASS
- 핵심 수치(steady-state p95)
- `api_breed_posts`: `205.8ms`
- `api_posts_global`: `370.6ms`
- `api_posts_suggestions`: `245.0ms`
- `api_search_log`: `273.6ms`
- warm-up tail
- `api_posts_global` 첫 샘플 TTFB `3089.3ms`
- `api_posts_suggestions` 첫 샘플 TTFB `1042.3ms`
- 해석
- 공개 guest API 전환 후 캐시 재사용 경로는 배포에서 확인됨
- steady-state는 여전히 배포 가능 수준으로 안정적
- 남은 성능 리스크는 HTML cache가 아니라 첫 요청 warm-up tail latency
- 검증 결과
- `curl -sD - -o /dev/null 'https://townpet2.vercel.app/api/feed/guest'`
- `curl -sD - -o /dev/null 'https://townpet2.vercel.app/api/search/guest?q=%EA%B0%95%EC%95%84%EC%A7%80'`
- `OPS_BASE_URL=https://townpet2.vercel.app pnpm -C app ops:perf:snapshot`
- 이슈/블로커
- Vercel 응답 헤더에 `s-maxage` 값이 그대로 드러나지 않지만 `STALE`/`age` 기준으로 캐시 재사용은 확인됨
- HTML page 자체의 `private, no-store` 제약은 여전히 Cycle 190 범위로 유지
- 변경 파일(핵심)
- `PLAN.md`
- `PROGRESS.md`

### 2026-03-06: Cycle 192 guest 피드 API/클라이언트 전환
- 완료 내용
- guest 피드 전용 API 추가:
  - `app/src/app/api/feed/guest/route.ts`
  - 초기 gate/feed 상태, 베스트 페이지네이션, 첫 페이지 아이템, guest 차단 타입 판정을 한 번에 반환
  - `cache-control: public, s-maxage=30, stale-while-revalidate=300` 적용
- guest `/feed` 페이지를 클라이언트 로더 기반으로 전환:
  - `app/src/components/posts/guest-feed-page-client.tsx`
  - `app/src/app/feed/guest/page.tsx`
  - 서버 페이지는 더 이상 DB를 직접 읽지 않고 Suspense fallback만 제공
  - 실제 첫 페이지 데이터와 gate 판정은 클라이언트에서 `/api/feed/guest`를 호출해 로드
- 기대 효과
- guest `/feed` 첫 HTML 응답에서 게시글/베스트 집계 DB 조회를 제거해 TTFB 부담을 줄임
- HTML 응답은 CSP nonce 때문에 여전히 public cache 대상이 아니어도, 첫 데이터는 공개 API cache 경로로 분리됨
- `FeedInfiniteList`는 기존 `/api/posts`를 그대로 재사용하므로 load-more 동작은 유지
- 검증 결과
- `pnpm -C app lint src/app/api/feed/guest/route.ts src/app/api/feed/guest/route.test.ts src/components/posts/guest-feed-page-client.tsx src/app/feed/guest/page.tsx` 통과
- `pnpm -C app test -- src/app/api/feed/guest/route.test.ts`
  - Vitest 설정상 전체 단위 테스트가 함께 실행되어 `69 files / 341 tests` 통과
- `pnpm -C app typecheck` 통과
- 이슈/블로커
- guest `/feed` HTML 자체는 Cycle 190의 CSP nonce 제약으로 여전히 `private, no-store`일 수 있음
- 이번 변경은 HTML cache가 아니라 서버 render 부하를 줄이고 첫 데이터 경로를 공개 API cache로 옮기는 데 목적이 있음
- 변경 파일(핵심)
- `app/src/app/api/feed/guest/route.ts`
- `app/src/app/api/feed/guest/route.test.ts`
- `app/src/components/posts/guest-feed-page-client.tsx`
- `app/src/app/feed/guest/page.tsx`
- `PLAN.md`
- `PROGRESS.md`

### 2026-03-06: Cycle 191 guest 검색 API/클라이언트 전환
- 완료 내용
- guest 검색 전용 API 추가:
  - `app/src/app/api/search/guest/route.ts`
  - 비로그인 검색 결과, 인기 검색어, guest 차단 타입 판정을 한 번에 반환
  - `cache-control: public, s-maxage=45, stale-while-revalidate=300` 적용
- guest `/search` 페이지를 클라이언트 로더 기반으로 전환:
  - `app/src/components/posts/guest-search-page-client.tsx`
  - `app/src/app/search/guest/page.tsx`
  - 서버 페이지는 더 이상 DB를 직접 읽지 않고 Suspense fallback만 제공
  - 실제 검색 결과/인기 검색어는 클라이언트에서 `/api/search/guest`를 호출해 로드
- 기대 효과
- guest `/search` 첫 HTML 응답에서 서버 DB 조회를 제거해 TTFB 부담을 줄임
- HTML 자체는 CSP nonce 때문에 여전히 `private, no-store`일 수 있지만, 검색 데이터는 public API cache 경로로 이동
- 검증 결과
- `pnpm -C app lint src/app/api/search/guest/route.ts src/app/api/search/guest/route.test.ts src/components/posts/guest-search-page-client.tsx src/app/search/guest/page.tsx` 통과
- `pnpm -C app test -- src/app/api/search/guest/route.test.ts`
  - Vitest 설정상 전체 단위 테스트가 함께 실행되어 `68 files / 338 tests` 통과
- `pnpm -C app typecheck` 통과
- 이슈/블로커
- guest `/search`의 HTML 응답 public cache 자체는 여전히 Cycle 190의 CSP nonce 제약을 받음
- 이번 변경은 HTML cache가 아니라 서버 render 부하를 줄이고 검색 데이터를 public API cache로 분리하는 데 목적이 있음
- 변경 파일(핵심)
- `app/src/app/api/search/guest/route.ts`
- `app/src/app/api/search/guest/route.test.ts`
- `app/src/components/posts/guest-search-page-client.tsx`
- `app/src/app/search/guest/page.tsx`
- `PLAN.md`
- `PROGRESS.md`

### 2026-03-06: Cycle 190 HTML CDN 캐시 제약 분석 및 방향 전환
- 완료 내용
- 실배포 guest HTML 헤더 재확인:
  - `https://townpet2.vercel.app/feed`
  - `https://townpet2.vercel.app/search`
  - `https://townpet2.vercel.app/feed/guest`
  - `https://townpet2.vercel.app/search/guest`
  - `https://townpet2.vercel.app/posts/cmm4cdxqp0001wzxivh0focsf/guest`
  - 모두 `cache-control: private, no-cache, no-store, max-age=0, must-revalidate`
- 구조 원인 정리:
  - `app/middleware.ts`가 모든 요청에 대해 새 `x-nonce` / `x-csp-nonce`를 생성
  - Next HTML 응답의 preload/script nonce가 요청마다 달라진다
  - 따라서 guest rewrite와 `Cache-Control` 헤더만으로는 HTML 응답을 CDN public cache로 만들 수 없다
- 방향 전환:
  - 현재 prewarm과 API cache는 유지
  - HTML 공개 캐시가 필요하면 CSP nonce 전략 재설계 또는 정적 shell + 클라이언트 data fetch 방식으로 옮겨야 한다
  - 보안 우선순위상 CSP nonce를 당장 약화시키기보다, 이후 최적화는 API/클라이언트 중심으로 가져가는 쪽이 안전하다
- 검증 결과
- `gh run list --repo answndud/townpet --limit 8`
  - `Fix Vercel build regressions` quality-gate 성공 확인
- 원격 헤더 확인:
  - `/feed`, `/search`, `/feed/guest`, `/search/guest`, `/posts/:id/guest` 모두 `private, no-store`
  - `/api/posts`는 public cache 경로 유지 확인
- 이슈/블로커
- HTML page CDN cache를 목표로 둔 Cycle 188 잔여 과제는 CSP nonce 설계와 충돌
- 다음 성능 작업은 HTML cache가 아니라 API 응답 cache와 클라이언트 초기 로딩 경량화 쪽으로 재설계하는 것이 맞음
- 변경 파일(핵심)
- `PLAN.md`
- `PROGRESS.md`
- `docs/operations/캐시_성능_적용_기록.md`

### 2026-03-06: Cycle 189 Vercel build 회귀 복구
- 완료 내용
- `FeedHoverMenu`에서 `useSearchParams()` 의존 제거:
  - `app/src/components/navigation/feed-hover-menu.tsx`
  - guest 관심 동물 저장 후 현재 `/feed` 쿼리는 `window.location.search`로 읽어 유지
- build phase Upstash 접근 차단:
  - `app/src/server/cache/query-cache.ts`
  - `NEXT_PHASE=phase-production-build`에서는 Upstash REST fetch를 건너뛰고 메모리 fallback만 사용
  - 정적 prerender 중 `/_not-found` 경유 Upstash `no-store` fetch로 인한 dynamic server usage 경고를 회피
- 회귀 테스트 추가:
  - `app/src/server/cache/query-cache.test.ts`
  - build phase에서는 Upstash fetch를 호출하지 않는 케이스와 runtime phase에서는 호출하는 케이스를 고정
- 검증 결과
- `pnpm -C app lint src/components/navigation/feed-hover-menu.tsx src/server/cache/query-cache.ts src/server/cache/query-cache.test.ts` 통과
- `pnpm -C app test -- src/server/cache/query-cache.test.ts`
  - Vitest 설정상 전체 단위 테스트가 함께 실행되어 전체 회귀 기준으로 검증
- `pnpm -C app typecheck` 통과
- `pnpm -C app build`
  - 이전 실패 원인이던 `useSearchParams` suspense 오류와 build 시 Upstash dynamic server usage 오류는 재현되지 않음
  - 현재는 production 보안 env 게이트(`AUTH_SECRET`, `CSP_ENFORCE_STRICT`, `GUEST_HASH_PEPPER`, `UPSTASH_REDIS_*`)에서 중단
- 이슈/블로커
- 로컬 `next build`는 여전히 production env 미주입 상태라 끝까지 완료되지는 않음
- 실배포 헤더(`/feed`, `/search`) 확인은 Cycle 188 범위로 남음
- 변경 파일(핵심)
- `app/src/components/navigation/feed-hover-menu.tsx`
- `app/src/server/cache/query-cache.ts`
- `app/src/server/cache/query-cache.test.ts`
- `PLAN.md`
- `PROGRESS.md`

### 2026-03-06: Cycle 188 정적 shell + guest search 캐시 분리
- 완료 내용
- 최상위 shell의 서버 동적 의존 제거:
  - `app/src/app/layout.tsx`에서 `auth()` / `cookies()` / 알림 조회를 제거
  - 새 클라이언트 헤더 `app/src/components/navigation/app-shell-header.tsx` 추가
  - 로그인/알림/운영자 메뉴/선호 동물은 `GET /api/viewer-shell`로 hydration 후 보강
- guest `/search` 정적 분리:
  - 새 guest 경로 `app/src/app/search/guest/page.tsx` 추가
  - 로그인 사용자는 기존 `/search` 페이지 유지
  - guest 요청은 middleware에서 `/search/guest`로 rewrite + `public, s-maxage=60, stale-while-revalidate=300`
- guest `/feed` 정적 분리:
  - 새 guest 경로 `app/src/app/feed/guest/page.tsx` 추가
  - guest 요청은 middleware에서 `/feed/guest`로 rewrite + `public, s-maxage=60, stale-while-revalidate=300`
  - guest 관심 동물 저장은 쿠키 유지 + 현재 `/feed` 화면에서는 `petType` 쿼리로 즉시 push 해 서버 쿠키 의존을 줄임
- `FeedHoverMenu`는 guest 쿠키 선호를 클라이언트 초기 상태에서 읽고, auth 전환 시 remount key로 동기화
- 검증 결과
- `pnpm -C app lint src/app/layout.tsx src/components/navigation/app-shell-header.tsx src/components/navigation/feed-hover-menu.tsx src/app/api/viewer-shell/route.ts src/app/api/viewer-shell/route.test.ts src/app/search/page.tsx src/app/search/guest/page.tsx middleware.ts src/middleware.test.ts` 통과
- `pnpm -C app test -- src/app/api/viewer-shell/route.test.ts src/middleware.test.ts`
  - Vitest 설정상 전체 단위 테스트가 함께 실행되어 `66 files / 333 tests` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app lint src/app/feed/guest/page.tsx src/components/navigation/feed-hover-menu.tsx middleware.ts` 통과
- `pnpm -C app test -- src/middleware.test.ts`
  - Vitest 설정상 전체 단위 테스트가 함께 실행되어 `66 files / 333 tests` 통과
- `pnpm -C app build`
  - 코드 오류가 아니라 production 보안 env 게이트(`AUTH_SECRET`, `CSP_ENFORCE_STRICT`, `GUEST_HASH_PEPPER`, `UPSTASH_REDIS_*`) 누락으로 중단
- 이슈/블로커
- 실배포 헤더는 아직 확인 전. 코드 변경이 배포되지 않았으므로 `/feed`, `/search`의 `x-vercel-cache`/`cache-control` 검증은 배포 후 필요
- guest `/feed`는 캐시 가능한 경로로 분리했지만, 쿼리 없는 재진입에서 guest 선호 쿠키를 서버 기본값으로 반영하지는 않음. 현재는 저장 직후 쿼리 push로 해결
- 변경 파일(핵심)
- `app/src/app/layout.tsx`
- `app/src/components/navigation/app-shell-header.tsx`
- `app/src/components/navigation/feed-hover-menu.tsx`
- `app/src/app/api/viewer-shell/route.ts`
- `app/src/app/api/viewer-shell/route.test.ts`
- `app/src/app/feed/guest/page.tsx`
- `app/src/app/search/page.tsx`
- `app/src/app/search/guest/page.tsx`
- `app/middleware.ts`
- `app/src/middleware.test.ts`
- `PLAN.md`
- `PROGRESS.md`

### 2026-03-06: Cycle 187 배포 prewarm 자동화
- 완료 내용
- 배포 직후 cold path 완화를 위한 prewarm 스크립트 추가:
  - `pnpm -C app ops:prewarm`
  - 공개 GET 경로(`/feed`, `/search`, 공개 피드/검색 API)를 기본 2회 호출
- `ops-smoke-checks` 워크플로우에 prewarm 단계 연결:
  - health PASS 직후 guest 공개 경로를 미리 호출해 첫 사용자 요청 tail latency를 완화
- 운영 문서 반영:
  - Vercel/OAuth 초기설정 가이드
  - 차단 해소 체크리스트
  - 캐시 성능 적용 기록
- 검증 결과
- `pnpm -C app lint scripts/prewarm-deployment.ts` 통과
- `pnpm -C app typecheck` 통과
- `OPS_BASE_URL=https://townpet2.vercel.app pnpm -C app ops:prewarm`
  - `feed_page_guest`: 1차 `2955ms MISS` -> 2차 `297ms MISS`
  - `api_posts_global`: 1차 `1357ms MISS` -> 2차 `123ms HIT`
  - `api_posts_suggestions`: 1차 `273ms MISS` -> 2차 `128ms HIT`
  - `api_breed_posts`: 1차 `351ms MISS` -> 2차 `121ms HIT`
- 이슈/블로커
- `/feed`, `/search`는 2차에도 `MISS`가 남아 page CDN cache 자체는 별도 분석 필요
- 변경 파일(핵심)
- `app/scripts/prewarm-deployment.ts`
- `app/package.json`
- `.github/workflows/ops-smoke-checks.yml`
- `docs/operations/Vercel_OAuth_초기설정_가이드.md`
- `docs/operations/차단 해소 체크리스트.md`
- `docs/operations/캐시_성능_적용_기록.md`
- `PLAN.md`
- `PROGRESS.md`

### 2026-03-06: Cycle 186 게시글 액션 캐시 무효화 축소
- 완료 내용
- 게시글 서버 액션의 경로 무효화를 축소:
  - `createPostAction`은 `/feed`만 revalidate
  - `deletePostAction`, `updatePostAction`은 `/feed` + 상세 경로만 revalidate
  - `togglePostReactionAction`은 상세 경로만 revalidate
- 불필요한 `revalidatePath("/")` 호출 제거:
  - 루트 페이지는 `/feed` 리다이렉트 전용이라 재검증 이득이 거의 없고 캐시 churn만 증가시키는 경로였음
- 게시글 액션 회귀 테스트 추가:
  - create/update/reaction의 revalidate 범위 검증
  - service error 시 revalidate가 호출되지 않는 실패 경로 검증
- 검증 결과
- `pnpm -C app test -- src/server/actions/post.test.ts`
  - Vitest 설정상 전체 단위 테스트가 함께 실행되어 `65 files / 327 tests` 통과
- `pnpm -C app lint src/server/actions/post.ts src/server/actions/post.test.ts` 통과
- `pnpm -C app typecheck` 통과
- 이슈/블로커
- 없음
- 변경 파일(핵심)
- `app/src/server/actions/post.ts`
- `app/src/server/actions/post.test.ts`
- `PLAN.md`
- `PROGRESS.md`

### 2026-03-06: Cycle 185 env 템플릿/운영 문서 실제 키 목록 기준 정렬
- 완료 내용
- `app/.env.production.example`을 현재 실제 Vercel runtime 키 기준으로 재정리:
  - `NEXTAUTH_URL`, `DIRECT_URL`, `RESEND_API_KEY`, OAuth provider 키 반영
  - GitHub Actions에서 쓰는 secret 목록은 참고 주석으로 분리
- 운영 문서를 사용자가 공유한 실제 Vercel / GitHub Actions key 목록 기준으로 갱신:
  - `RESEND_API_KEY` 반영
  - `UPSTASH_REDIS_REST_URL`은 "누락 단정"이 아니라 "Production 슬롯 재확인 필요"로 표현 조정
- 검증 결과
- 문서/템플릿 정리 작업으로 별도 코드 테스트는 불필요
- 이슈/블로커
- 없음
- 변경 파일(핵심)
- `app/.env.production.example`
- `docs/operations/manual-checks/배포_보안_체크리스트.md`
- `docs/operations/Vercel_OAuth_초기설정_가이드.md`

### 2026-03-06: Cycle 184 docs 구조 정리 및 경로 정합화
- 완료 내용
- `docs/` 폴더를 목적 중심 구조로 재편:
  - `business`, `product`, `policies`, `operations`, `security`, `analytics`, `reports`, `archive`
- 추상적이거나 중복된 경로를 축소:
  - 기존 `ops`, `plan`, `data_analytics`, `policy_ops`, `사업계획` 경로를 정리하고 새 구조로 통합
  - 과거 초안/v1/동기화 리포트는 `docs/archive/`로 분리
- 문서 진입점 추가/개선:
  - `docs/문서_안내.md` 신설
  - 필요한 폴더에만 안내 문서 유지(`사업_문서_안내.md`, `운영_문서_안내.md`, `보관_문서_안내.md`)
  - `docs/operations/운영_문서_안내.md`를 배포/장애/OAuth 중심의 읽기 순서로 재구성
- 코드/문서 경로 정합화:
  - GUIDE, 운영 가이드, 보안 진행 로그, 스크립트 출력 경로를 새 구조 기준으로 수정
  - `feed-scroll-performance`, `search-manual-check`, `oauth manual check` 산출물 경로를 `reports/` 또는 `operations/manual-checks/`로 재배치
- 검증 결과
- `rg -n "docs/(ops/|사업계획|data_analytics|policy_ops|plan/|security/local_dev_env|product/UI\\.md)" docs README.md app`
- archive 문서를 제외한 활성 문서/코드 경로에서 오래된 참조 제거 확인
- `rg -n "DISABLE_SOCIAL_DEV_LOGIN" docs README.md app`
- 활성 문서 기준 잔여 참조 없음 확인
- 이슈/블로커
- 없음
- 변경 파일(핵심)
- `docs/문서_안내.md`
- `docs/operations/운영_문서_안내.md`
- `docs/개발_운영_가이드.md`
- `README.md`
- `app/e2e/feed-scroll-performance.spec.ts`
- `app/scripts/check-search-cases.ts`
- `app/scripts/update-oauth-manual-check.ts`
- `app/scripts/verify-oauth-manual-check.ts`

### 2026-03-06: Cycle 182 완료 (배포 보안 체크리스트 재정리)
- 완료 내용
- 배포 보안 체크리스트 실사용 문서를 `manual-checks` 경로로 재배치:
  - `docs/operations/manual-checks/배포_보안_체크리스트.md`
- 수동 점검 안내 문서를 별도 분리:
  - `docs/operations/manual-checks/수동점검_안내.md`
- 문서 가독성 개선:
  - 한눈에 보기 요약
  - Vercel production 최종 필수 목록 표
  - 사용자가 공유한 현재 Vercel/GitHub Actions 설정 현황 표
  - `strict preflight fail=5` 기준 슬롯 확인 순서(step-by-step)
  - 배포 직전 즉시 실행 절차 추가
- GUIDE 링크도 새 경로로 갱신
- 검증 결과
- 문서 작업으로 별도 코드 테스트는 불필요
- 이슈/블로커
- 없음
- 변경 파일(핵심)
- `docs/operations/manual-checks/배포_보안_체크리스트.md`
- `docs/operations/manual-checks/수동점검_안내.md`
- `docs/개발_운영_가이드.md`
- `PLAN.md`
- `PROGRESS.md`

### 2026-03-06: Cycle 181 완료 (production env 템플릿 추가)
- 완료 내용
- production 환경변수 템플릿 파일 추가:
  - `app/.env.production.example`
- 포함 범위:
  - `APP_BASE_URL`, `DATABASE_URL`
  - `AUTH_SECRET`
  - `CSP_ENFORCE_STRICT`, `GUEST_HASH_PEPPER`, `HEALTH_INTERNAL_TOKEN`, `ENABLE_SOCIAL_DEV_LOGIN`
  - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
  - `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `SENTRY_DSN`
  - optional OAuth/CORS/cache 항목
- 운영 문서에 템플릿 경로 연결:
  - `docs/operations/manual-checks/배포_보안_체크리스트.md`
  - `docs/개발_운영_가이드.md`
- 검증 결과
- 문서/템플릿 추가 작업으로 별도 코드 테스트는 불필요
- 이슈/블로커
- 없음
- 변경 파일(핵심)
- `app/.env.production.example`
- `docs/operations/manual-checks/배포_보안_체크리스트.md`
- `docs/개발_운영_가이드.md`
- `PLAN.md`
- `PROGRESS.md`

### 2026-03-06: Cycle 180 완료 (배포 보안 strict 프리플라이트 정착)
- 완료 내용
- production strict 보안 점검을 한 번에 실행할 수 있도록 script 추가:
  - `pnpm -C app ops:check:security-env:strict`
- 배포 직전 따라갈 수 있는 보안 체크리스트 문서 추가:
  - `docs/operations/manual-checks/배포_보안_체크리스트.md`
  - 필수 env, strict 결과 해석, 배포 후 smoke 항목을 고정
- GUIDE에 strict 프리플라이트 실행 위치를 추가해 운영자가 바로 복붙 실행할 수 있도록 정리
- 검증 결과
- `pnpm -C app run | rg 'ops:check:security-env'` 결과:
  - `ops:check:security-env`
  - `ops:check:security-env:strict`
- `pnpm -C app ops:check:security-env:strict` 실행 결과 현재 로컬 env는 예상대로 `fail=5`
  - `AUTH_SECRET_OR_NEXTAUTH_SECRET`
  - `CSP_ENFORCE_STRICT`
  - `GUEST_HASH_PEPPER`
  - `HEALTH_INTERNAL_TOKEN`
  - `UPSTASH_REDIS_REST_URL_AND_TOKEN_PAIR`
- 이슈/블로커
- 코드/스크립트 블로커는 없음.
- 실제 배포 전 남은 작업은 Vercel production env에 위 5개 항목을 채운 뒤 같은 strict 명령을 다시 실행하는 운영 단계.
- 변경 파일(핵심)
- `app/package.json`
- `docs/operations/manual-checks/배포_보안_체크리스트.md`
- `docs/개발_운영_가이드.md`
- `PLAN.md`
- `PROGRESS.md`

### 2026-03-06: Cycle 179 완료 (배포 전 보안 하드닝 2차)
- 완료 내용
- 게시글 이미지 신뢰 경계를 강화:
  - 새 헬퍼 `app/src/lib/upload-url.ts` 추가
  - 게시글 `imageUrls`는 `/uploads/*` 또는 Vercel Blob의 `*.public.blob.vercel-storage.com/uploads/*`만 허용
  - 마크다운 렌더러에서 외부 이미지 URL은 `<img>`로 렌더링하지 않고 텍스트로 축소
  - Blob client token 발급 전 `uploads/` 경로만 허용하도록 서버 검증 추가
- 관리자 CSV 내보내기에서 formula injection 방어 추가:
  - `=`, `+`, `-`, `@` 등 수식 시작 패턴은 앞에 `'`를 붙여 무력화
- CSP 실효성 강화:
  - production `script-src`에서 광역 `https:` 허용 제거
  - 기본 CSP는 `'self' + nonce + unsafe-inline(report-only strict 병행)`로 유지
  - strict enforce는 `'self' + nonce`만 허용
- 운영 보안 env 강제와 dev social login 정책 정리:
  - production startup validation에 `CSP_ENFORCE_STRICT`, `GUEST_HASH_PEPPER`, `HEALTH_INTERNAL_TOKEN`, `UPSTASH_REDIS_*`, weak auth secret 검사를 추가
  - dev social login은 `ENABLE_SOCIAL_DEV_LOGIN=1`일 때만 활성화되도록 변경
- 검증 결과
- `pnpm -C app lint src/lib/upload-url.ts src/lib/upload-url.test.ts src/lib/env.ts src/lib/env.test.ts src/lib/validations/post.ts src/lib/validations/post.test.ts src/lib/markdown-lite.ts src/lib/markdown-lite.test.ts src/app/api/upload/client/route.ts src/app/api/upload/client/route.test.ts src/app/api/admin/auth-audits/export/route.ts src/app/api/admin/auth-audits/export/route.test.ts src/lib/auth.ts src/app/login/page.tsx src/app/register/page.tsx middleware.ts src/middleware.test.ts` 통과
- `pnpm -C app test -- src/lib/upload-url.test.ts src/lib/env.test.ts src/lib/validations/post.test.ts src/lib/markdown-lite.test.ts src/app/api/upload/client/route.test.ts src/app/api/admin/auth-audits/export/route.test.ts src/middleware.test.ts` 실행 결과 Vitest 전체 회귀 `64 files / 323 tests` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app ops:check:security-env`:
  - 현재 개발 env 기준 WARN 5건 유지(의도된 로컬 상태)
  - production형 env 샘플 주입 시 PASS 5건 확인
- 이슈/블로커
- 없음. 실제 배포 전에는 Vercel 환경변수에 `ENABLE_SOCIAL_DEV_LOGIN`을 비워 두고, strict 보안 env 5종을 모두 설정해야 함.
- 변경 파일(핵심)
- `app/src/lib/upload-url.ts`
- `app/src/lib/validations/post.ts`
- `app/src/lib/markdown-lite.ts`
- `app/src/app/api/upload/client/route.ts`
- `app/src/app/api/admin/auth-audits/export/route.ts`
- `app/middleware.ts`
- `app/src/lib/env.ts`
- `app/src/lib/auth.ts`
- `app/src/app/login/page.tsx`
- `app/src/app/register/page.tsx`
- `PLAN.md`
- `PROGRESS.md`

### 2026-03-05: Cycle 178 완료 (Cycle 23 blocked 해소)
- 완료 내용
- OAuth 수동 점검 리포트(`docs/operations/manual-checks/OAuth_수동점검_기록_2026-03-05.md`)에 provider 상태를 `pass`로 반영.
  - Kakao evidence: `app/public/uploads/1771860895969-83c31b21-5cad-46d6-9179-75cf96a4c4eb.png`
  - Naver evidence: `app/public/uploads/1771932816929-61c3d8e1-d5f5-49b2-bf7f-8d5de33bf65e.png`
  - 두 증적은 사용자 요청(“너가 정해”)에 따라 운영자가 provider별로 매핑한 로컬 캡처 경로로 기록.
- strict 검증 통과:
  - `pnpm -C app ops:oauth:verify-manual --report ../docs/operations/manual-checks/OAuth_수동점검_기록_2026-03-05.md --strict 1`
  - 결과: `readyToCloseCycle23: yes`
- `PLAN.md` 동기화:
  - Cycle 23 제목을 `(완료)`로 갱신
  - `카카오/네이버 로그인 -> 온보딩 -> 피드 진입 E2E` 2개 항목 `blocked -> done` 전환
  - 상단 현재 우선순위에서 Cycle 23 잔여 항목 제거
- 검증 결과
- `ops:oauth:update-manual` 2회(kakao/naver) 실행 성공.
- `ops:oauth:verify-manual --strict 1` 실행 성공.
- 이슈/블로커
- 없음(Cycle 23 해소 완료).
- 변경 파일(핵심)
- `docs/operations/manual-checks/OAuth_수동점검_기록_2026-03-05.md`
- `PLAN.md`
- `PROGRESS.md`

### 2026-03-05: Cycle 177 완료 (OAuth 수동 점검 결과 입력 자동화)
- 완료 내용
- 수동 점검 markdown 결과 행을 CLI로 갱신하는 스크립트 추가:
  - `app/scripts/update-oauth-manual-check.ts`
  - 지원 인자: `--provider`, `--status`, `--evidence`, `--account`, `--notes`
  - provider table 행 + PROGRESS snippet 내 provider 상태 라인을 함께 업데이트
- npm 명령 추가:
  - `pnpm -C app ops:oauth:update-manual --report <path> --provider <kakao|naver> --status <pending|pass|fail> --evidence <link>`
- 운영 문서 반영:
  - `docs/operations/manual-checks/수동점검_안내.md`
  - `docs/operations/OAuth_외부로그인_운영_가이드.md`
- 검증 결과
- `pnpm -C app lint scripts/update-oauth-manual-check.ts scripts/verify-oauth-manual-check.ts` 통과.
- `pnpm -C app typecheck` 통과.
- `pnpm -C app ops:oauth:update-manual --report ../docs/operations/manual-checks/OAuth_수동점검_기록_2026-03-05.md --provider kakao --status pending --evidence screenshot/video link` 통과.
- `pnpm -C app ops:oauth:verify-manual --report ../docs/operations/manual-checks/OAuth_수동점검_기록_2026-03-05.md` 실행 결과 `readyToCloseCycle23: no`.
- 이슈/블로커
- 도구 자동화는 완료. 남은 작업은 실계정 결과를 `pass + evidence`로 입력하는 외부 수동 단계.
- 변경 파일(핵심)
- `app/scripts/update-oauth-manual-check.ts`
- `app/package.json`
- `docs/operations/manual-checks/수동점검_안내.md`
- `docs/operations/OAuth_외부로그인_운영_가이드.md`
- `PLAN.md`
- `PROGRESS.md`

### 2026-03-05: Cycle 176 완료 (OAuth 수동 증적 충족 자동판정 도입)
- 완료 내용
- 수동 점검 markdown(`docs/ops/manual-checks/oauth-manual-check-*.md`)에서 provider 상태/증적 칸을 자동 판정하는 스크립트 추가:
  - `app/scripts/verify-oauth-manual-check.ts`
  - 출력: provider별 `status/evidence/ready` + `readyToCloseCycle23`
  - strict 모드(`--strict 1`)에서 기준 미충족 시 non-zero 종료
- npm 실행 명령 추가:
  - `pnpm -C app ops:oauth:verify-manual --report <path> --strict 1`
- 운영 문서 반영:
  - OAuth 운영 가이드와 manual-checks README에 verify 명령 추가
- 검증 결과
- `pnpm -C app lint scripts/verify-oauth-manual-check.ts` 통과.
- `pnpm -C app typecheck` 통과.
- `pnpm -C app ops:oauth:verify-manual --report ../docs/operations/manual-checks/OAuth_수동점검_기록_2026-03-05.md` 실행 결과:
  - Kakao `pending`, evidence `missing`
  - Naver `pending`, evidence `missing`
  - `readyToCloseCycle23: no`
- 이슈/블로커
- 자동판정 기준 도입 완료. 단, 실제 blocked 해소는 provider별 수동 `pass + evidence` 입력 후 strict 검증 통과가 필요.
- 변경 파일(핵심)
- `app/scripts/verify-oauth-manual-check.ts`
- `app/package.json`
- `docs/operations/manual-checks/수동점검_안내.md`
- `docs/operations/OAuth_외부로그인_운영_가이드.md`
- `PLAN.md`
- `PROGRESS.md`

### 2026-03-05: Cycle 175 완료 (OAuth 수동 증적 추적 가능화)
- 완료 내용
- `.gitignore` allowlist를 추가해 `docs/ops/manual-checks/*.md`를 저장소에서 추적 가능하도록 전환.
- 수동 증적 운영 기준 문서 추가:
  - `docs/operations/manual-checks/수동점검_안내.md`
  - 생성 명령/PII 금지/blocked 해소 기준(두 provider `pass`)을 고정.
- 최신 실OAuth run(`22705265766`) 기준 수동 점검 템플릿을 저장소 경로에 배치:
  - `docs/operations/manual-checks/OAuth_수동점검_기록_2026-03-05.md`
- OAuth 운영 가이드에 `manual-checks/README.md` 참조를 추가해 기록 규칙을 연결.
- 검증 결과
- `git check-ignore -v docs/operations/manual-checks/OAuth_수동점검_기록_2026-03-05.md` 기준으로 ignore 해제 확인.
- 템플릿 파일에 Base URL sanity/Expected Callback/Provider 상태 입력 칸이 정상 생성됨 확인.
- 이슈/블로커
- 실계정 증적 자체 입력(카카오/네이버 각각 pass 판정)은 외부 수동 단계로 잔여.
- 변경 파일(핵심)
- `.gitignore`
- `docs/operations/manual-checks/수동점검_안내.md`
- `docs/operations/manual-checks/OAuth_수동점검_기록_2026-03-05.md`
- `docs/operations/OAuth_외부로그인_운영_가이드.md`
- `PLAN.md`
- `PROGRESS.md`

### 2026-03-05: Cycle 174 완료 (OAuth 수동 증적 저장 경로 고정)
- 완료 내용
- 운영 URL 기준 OAuth 수동 점검 템플릿을 저장소 경로에 생성:
  - `docs/operations/manual-checks/OAuth_수동점검_기록_2026-03-05.md`
  - 포함 항목: Base URL sanity, Kakao/Naver callback URL, Provider 증적 테이블, PROGRESS snippet
- OAuth 운영 가이드의 템플릿 생성 명령 기본 출력 경로를 `/tmp`에서 `docs/ops/manual-checks/`로 표준화.
- 검증 결과
- `pnpm -C app ops:oauth:manual-report --base-url https://townpet2.vercel.app --strict-base-url 1 --date 2026-03-05 --run-url https://github.com/answndud/townpet/actions/runs/22705265766 --kakao-status pending --naver-status pending --out ../docs/operations/manual-checks/OAuth_수동점검_기록_2026-03-05.md` 통과.
- 이슈/블로커
- 없음(남은 블로커는 실계정 수동 증적 입력 자체).
- 변경 파일(핵심)
- `docs/operations/OAuth_외부로그인_운영_가이드.md`
- `PLAN.md`
- `PROGRESS.md`

### 2026-03-05: Cycle 173 완료 (OAuth 실검증 run 갱신 + 수동 점검 템플릿 최신화)
- 완료 내용
- `oauth-real-e2e` 워크플로우를 수동 재실행해 최신 run success를 확보.
  - run: `https://github.com/answndud/townpet/actions/runs/22705265766`
  - 상태: `success`
- 운영 URL(`https://townpet2.vercel.app`) 기준으로 `ops:oauth:manual-report --strict-base-url 1`를 실행해 수동 점검 템플릿을 최신화.
  - 출력 파일: `/tmp/oauth-manual-check-2026-03-05.md`
  - 포함 항목: Base URL sanity, Kakao/Naver expected callback URL, Provider별 수동 증적 테이블
- 검증 결과
- `gh run view 22705265766 --repo answndud/townpet` 조회로 `oauth-real-e2e` 완료 상태 확인.
- `pnpm -C app ops:oauth:manual-report --base-url https://townpet2.vercel.app --strict-base-url 1 --date 2026-03-05 --run-url https://github.com/answndud/townpet/actions/runs/22705265766 --kakao-status pending --naver-status pending --out /tmp/oauth-manual-check-2026-03-05.md` 통과.
- 이슈/블로커
- Cycle 23의 `카카오/네이버 로그인 -> 온보딩 -> 피드`는 실계정 수동 증적(스크린샷/영상 + pass 판정) 입력 전까지 `blocked` 유지.
- 변경 파일(핵심)
- `PLAN.md`
- `PROGRESS.md`

### 2026-03-05: Cycle 172 완료 (OAuth Base URL 사전검증 가드 추가)
- 완료 내용
- `ops:oauth:manual-report` 스크립트에 Base URL sanity 평가를 추가:
  - 위험 신호(`vercel.com`, `*-projects.vercel.app`, non-https 운영 URL) 감지
  - `Expected Callback URLs`(kakao/naver) 자동 출력
  - `--strict-base-url <0|1>` 옵션으로 고위험 URL이면 non-zero 종료
- 사전점검 명령 추가:
  - `pnpm -C app ops:oauth:preflight`
  - strict Base URL 점검 + 리포트(`/tmp/oauth-manual-check.md`) 생성
- 운영 문서 동기화:
  - OAuth 운영 가이드/차단 해소 체크리스트/GUIDE에 preflight 단계 반영
  - `vercel.com`, `*-projects.vercel.app` 도메인 사용 금지 기준 명시
- 검증 결과
- `pnpm -C app lint scripts/generate-oauth-manual-check-report.ts` 통과.
- `pnpm -C app typecheck` 통과.
- `pnpm -C app ops:oauth:preflight` 통과(출력 파일: `/tmp/oauth-manual-check.md`).
- 이슈/블로커
- 없음(실계정 온보딩 완료 증적 자체는 여전히 외부 계정 접근 필요).
- 변경 파일(핵심)
- `app/scripts/generate-oauth-manual-check-report.ts`
- `app/package.json`
- `docs/operations/OAuth_외부로그인_운영_가이드.md`
- `docs/operations/차단 해소 체크리스트.md`
- `docs/개발_운영_가이드.md`
- `PLAN.md`

### 2026-03-05: Cycle 171 완료 (핫패스 API 경량화/계약테스트 확장 + 성능 임계치 평가 보강)
- 완료 내용
- 읽기 API 다수 경로(`posts/suggestions/communities/neighborhoods/notifications/breed-lounge`)에서 rate-limit 짧은 허용 캐시(`cacheMs=1000`)를 확대해 연속 요청 구간 Redis 왕복 지연을 완화.
- query cache 경로를 Upstash pipeline 기반으로 정리하고 버전 snapshot TTL을 도입해 cache version 조회 오버헤드를 축소.
- 알림 unread 동기화 유틸(`notification-unread-sync`) 및 알림 액션/쿼리 보강으로 벨/센터/페이지 간 unread 반영 지연을 줄임.
- `collect-latency-snapshot`에 임계치 평가 섹션과 `OPS_PERF_FAIL_ON_THRESHOLD_BREACH` 옵션을 추가해 임계치 초과를 CI 실패 조건으로 승격할 수 있게 함.
- admin audit/notification/upload/relation/post 보조 API 경로의 계약 테스트를 확장해 회귀 지점을 고정.
- 검증 결과
- `pnpm -C app lint` 통과.
- `pnpm -C app typecheck` 통과.
- push 품질게이트 성공: run `22704731250` (`quality-gate`, `success`).
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/server/cache/query-cache.ts`
- `app/src/lib/notification-unread-sync.ts`
- `app/scripts/collect-latency-snapshot.ts`
- `app/src/app/api/**/*.test.ts`
- `app/src/server/actions/notification.test.ts`
- `app/src/server/queries/notification.queries.test.ts`
- `.github/workflows/quality-gate.yml`
- `PLAN.md`

### 2026-03-05: Cycle 170 완료 (지연 스냅샷 자동 수집 파이프라인 구축)
- 완료 내용
- API 4종(`posts/suggestions/breed/search-log`) 지연 샘플을 자동 수집하는 스크립트 추가:
  - `app/scripts/collect-latency-snapshot.ts`
  - 출력: raw tsv + summary md(p50/p95, status 분포, slow count)
- npm 실행 진입점 추가:
  - `pnpm ops:perf:snapshot`
- GitHub Actions 정기 수집 워크플로우 추가:
  - `.github/workflows/ops-latency-snapshots.yml`
  - `workflow_dispatch` 입력(`target_base_url/get_samples/post_samples/pause_ms`)
  - schedule: UTC `00:10/08:10/16:10` (KST `09:10/17:10/01:10`)
  - 실행 결과를 `GITHUB_STEP_SUMMARY` + artifact(tsv/md)로 보존
- 운영 가이드 검증:
  - `docs/개발_운영_가이드.md`에 `ops:perf:snapshot` 수동 실행법/환경변수/워크플로우 안내가 유지되고 있음을 확인
- 검증 결과
- `pnpm -C app lint scripts/collect-latency-snapshot.ts` 통과.
- `pnpm -C app typecheck` 통과.
- `OPS_BASE_URL=https://townpet2.vercel.app OPS_PERF_GET_SAMPLES=2 OPS_PERF_POST_SAMPLES=2 OPS_PERF_PAUSE_MS=50 pnpm -C app ops:perf:snapshot` 스모크 실행 통과(출력 파일: `/tmp/townpet_latency_snapshot_smoke.tsv`, `/tmp/townpet_latency_snapshot_smoke.md`).
- 신규 워크플로우 `ops-latency-snapshots` 수동 실행 성공: run `22704511501` (`workflow_dispatch`, 소량 샘플 검증).
- push 품질게이트 성공: run `22704509072`.
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/scripts/collect-latency-snapshot.ts`
- `app/package.json`
- `.github/workflows/ops-latency-snapshots.yml`
- `PLAN.md`

### 2026-03-05: Cycle 169 완료 (p95 아웃라이어 원인 분리 진단)
- 완료 내용
- 진단 샘플(`/tmp/townpet_outlier_diag2_20260305.tsv`)을 수집해 endpoint별로 `dns/connect/tls/ttfb/total`과 `x-vercel-cache/x-vercel-id`를 동시 분석.
- 표본:
  - `api_posts_global`: 30
  - `api_posts_suggestions`: 30
  - `api_breed_posts`: 30
  - `api_search_log`: 20 (rate-limit 창 고려)
- 진단 집계(ms)
  - `api_posts_global`: total p50 `153.7`, p95 `195.4` / connect p95 `14.6`, tls p95 `38.7`
  - `api_posts_suggestions`: total p50 `148.0`, p95 `252.9` / connect p95 `13.3`, tls p95 `39.2`
  - `api_breed_posts`: total p50 `146.0`, p95 `304.1` / connect p95 `14.2`, tls p95 `35.6`
  - `api_search_log`: total p50 `264.2`, p95 `338.7` / connect p95 `54.0`, tls p95 `76.6`
- 관측/해석
- 이번 진단 런에서는 `>500ms` 단발 고지연이 재현되지 않았고(전 엔드포인트 0건), 이전 급격한 p95 악화는 콜드/일시 부하 표본에 크게 영향받은 것으로 판단.
- GET 엔드포인트는 connect/tls가 낮게 유지되어 네트워크 핸드셰이크보다는 서버 처리/캐시 상태 변화가 체감 지연의 주된 변동 요인.
- `search_log`는 다른 GET 대비 connect/tls p95가 높아 외부 왕복(인증/Redis/네트워크) 영향이 상대적으로 큼.
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `PLAN.md`
- `PROGRESS.md`

### 2026-03-05: Cycle 168 완료 (Cycle 166/167 배포 후 성능 재측정)
- 완료 내용
- `quality-gate` run `22702076616` 성공 확인 후 최신 main 기준 배포 성능 재측정 수행.
- 재측정 raw: `/tmp/townpet_perf_20260305_after167.tsv` (120 lines)
- 집계 결과(ms):
  - `api_posts_global`: TTFB p50 `158.9`, p95 `352.2` / total p50 `165.0`, p95 `359.0` (status `200 x30`)
  - `api_posts_suggestions`: TTFB p50 `152.2`, p95 `360.4` / total p50 `157.2`, p95 `381.8` (status `200 x30`)
  - `api_search_log`: TTFB p50 `254.0`, p95 `591.5` / total p50 `260.6`, p95 `598.6` (status `200 x30`)
  - `api_breed_posts`: TTFB p50 `155.4`, p95 `402.7` / total p50 `159.6`, p95 `404.6` (status `200 x30`)
- 해석
- `breed_posts`는 이전 스냅샷 대비 p50이 유의미하게 개선(게스트 캐시 헤더 적용 효과 관측).
- 다만 모든 API에서 단발 고지연(outlier)이 포함되며 n=30 환경의 p95(29번째 표본)가 outlier 영향을 크게 받는 패턴이 지속.
- 검증 결과
- 배포 품질게이트: `22702076616 success`
- 이슈/블로커
- 없음(다음 단계: outlier 원인 분리 관측 필요).
- 변경 파일(핵심)
- `PLAN.md`
- `PROGRESS.md`

### 2026-03-05: Cycle 167 완료 (Search log rate-limit 허용 캐시 적용)
- 완료 내용
- `POST /api/search/log`의 rate-limit 호출에 `cacheMs: 500`을 적용해 동일 사용자/IP의 연속 입력 구간에서 Redis 왕복 오버헤드를 완화.
- `search/log` 계약 테스트의 rate-limit 기대값(user/ip)에 `cacheMs: 500`을 반영.
- 검증 결과
- `pnpm -C app lint src/app/api/search/log/route.ts src/app/api/search/log/route.test.ts 'src/app/api/lounges/breeds/[breedCode]/posts/route.ts' 'src/app/api/lounges/breeds/[breedCode]/posts/route.test.ts` 통과.
- `pnpm -C app typecheck` 통과.
- `pnpm -C app test -- src/app/api/search/log/route.test.ts 'src/app/api/lounges/breeds/[breedCode]/posts/route.test.ts'` 통과(전체 62 files, 303 tests pass).
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/app/api/search/log/route.ts`
- `app/src/app/api/search/log/route.test.ts`
- `PLAN.md`

### 2026-03-05: Cycle 166 완료 (Breed lounge posts 게스트 캐시 헤더 적용)
- 완료 내용
- `GET /api/lounges/breeds/[breedCode]/posts`에 게스트 첫 페이지 요청 전용 캐시 헤더를 적용:
  - `public, s-maxage=30, stale-while-revalidate=300`
- 인증 요청은 기존대로 `no-store`를 유지해 개인화/권한 경로 캐시 오염을 방지.
- route 계약 테스트를 보강해:
  - 인증 요청 `cache-control: no-store`
  - 게스트 요청 `s-maxage=30` 노출
  를 고정.
- 검증 결과
- `pnpm -C app lint 'src/app/api/lounges/breeds/[breedCode]/posts/route.ts' 'src/app/api/lounges/breeds/[breedCode]/posts/route.test.ts'` 통과.
- `pnpm -C app typecheck` 통과.
- `pnpm -C app test -- 'src/app/api/lounges/breeds/[breedCode]/posts/route.test.ts'` 통과(전체 62 files, 303 tests pass).
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/app/api/lounges/breeds/[breedCode]/posts/route.ts`
- `app/src/app/api/lounges/breeds/[breedCode]/posts/route.test.ts`
- `PLAN.md`

### 2026-03-05: Cycle 165 완료 (main 배포 반영 + post-deploy 성능/에러 검증)
- 완료 내용
- 커밋/배포:
  - `4a0e979` push 후 `quality-gate` run `22701352904` 실패(원인: 원격 `auth.ts`에 `getCurrentUserId` export 누락).
  - `f19ae95`로 `auth.ts`/`user.queries.ts` export 보강 후 재푸시.
  - `quality-gate` run `22701395965` 성공으로 main 배포 파이프라인 정상화 확인.
- post-deploy 성능 재측정(최종 샘플, 30회 x 4 API = 120):
  - raw: `/tmp/townpet_perf_20260305_postdeploy_final.tsv`
  - `api_posts_global`: TTFB p50 `151.4`, p95 `232.4` / total p50 `158.7`, p95 `238.9` (status `200 x30`)
  - `api_posts_suggestions`: TTFB p50 `150.8`, p95 `323.5` / total p50 `157.0`, p95 `333.3` (status `200 x30`)
  - `api_search_log`: TTFB p50 `241.4`, p95 `326.3` / total p50 `246.7`, p95 `347.3` (status `200 x30`)
  - `api_breed_posts`: TTFB p50 `234.9`, p95 `367.9` / total p50 `241.4`, p95 `374.2` (status `200 x30`)
- search log burst 검증:
  - `/tmp/townpet_searchlog_status_postdeploy_20260305.txt`
  - 35회 연속 호출 결과 `200 x30`, `429 x5`, `500 x0` 확인(초과분은 `RATE_LIMITED`로 정상 매핑).
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/server/auth.ts`
- `app/src/server/queries/user.queries.ts`
- `PLAN.md`
- `PROGRESS.md`

### 2026-03-05: Cycle 164 완료 (Search log 인증 조회 실패 guest fallback)
- 완료 내용
- `POST /api/search/log`에서 `getCurrentUserId` 조회가 예외를 던져도 요청을 실패시키지 않고 guest(IP) rate-limit key로 fallback 하도록 보강.
- 인증 조회 불안정 시에도 검색 로그 API가 500으로 깨지지 않고 계속 동작하도록 복원력을 높임(보안상 권한 상승 없음, 최대 guest key 적용).
- 계약 테스트에 `auth lookup 실패 -> guest key fallback` 케이스를 추가.
- 검증 결과
- `pnpm -C app lint src/app/api/search/log/route.ts src/app/api/search/log/route.test.ts` 통과.
- `pnpm -C app typecheck` 통과.
- `pnpm -C app test -- src/app/api/search/log/route.test.ts` 통과(전체 62 files, 302 tests pass).
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/app/api/search/log/route.ts`
- `app/src/app/api/search/log/route.test.ts`
- `PLAN.md`

### 2026-03-05: Cycle 163 완료 (배포 API p50/p95 재측정)
- 완료 내용
- 배포 URL(`https://townpet2.vercel.app`) 기준으로 API 4개를 각 30회 재측정해 raw 샘플 120건 재수집.
- 대상:
  - `GET /api/posts?scope=GLOBAL`
  - `GET /api/posts/suggestions?q=산책코스`
  - `POST /api/search/log` (`{"q":"강아지 산책"}`)
  - `GET /api/lounges/breeds/golden/posts?q=산책`
- 집계 결과(ms):
  - `api_posts_global`: TTFB p50 `155.6`, p95 `202.0` / total p50 `163.6`, p95 `206.1` (status `200 x30`)
  - `api_posts_suggestions`: TTFB p50 `147.5`, p95 `393.9` / total p50 `153.2`, p95 `400.3` (status `200 x30`)
  - `api_search_log`: TTFB p50 `241.2`, p95 `311.0` / total p50 `243.1`, p95 `311.3` (status `200 x30`)
  - `api_breed_posts`: TTFB p50 `237.4`, p95 `362.1` / total p50 `241.7`, p95 `368.1` (status `200 x30`)
- 2026-03-04 대비 관측
  - `search_log`는 p50/p95 total이 `255.4/314.1 -> 243.1/311.3`으로 개선.
  - `posts/suggestions`, `breed_posts`는 p95가 크게 튀는 스파이크 관측(단일 시점 트래픽/콜드 영향 가능).
- 검증 결과
- raw 샘플: `/tmp/townpet_perf_20260305_prod.tsv` (120 lines).
- 추가 워밍업 측정(`/tmp/townpet_perf_20260305_prod_warm.tsv`)은 rate-limit/상태코드 혼합(429/500)이 섞여 비교 기준에서 제외.
- 이슈/블로커
- 배포 관측에서 `search/log` 고빈도 연속 호출 시 500 스파이크가 관측되어 Cycle 164(guest fallback)로 내결함성 보강 진행.
- 변경 파일(핵심)
- `PLAN.md`

### 2026-03-05: Cycle 162 완료 (Search log 응답 경로 비동기화 + 에러 매핑 보강)
- 완료 내용
- `POST /api/search/log`에서 `recordSearchTerm` DB upsert를 응답 경로에서 await하지 않도록 변경해, 입력검증/rate-limit 통과 후 즉시 응답하도록 개선.
- 비동기 기록 실패는 `monitorUnhandledError`로 별도 수집해 관측성을 유지.
- route 예외 처리에 `ServiceError` 매핑을 추가해 rate-limit 등 정책 오류가 500이 아닌 원래 status/code(예: 429)로 반환되도록 보강.
- `search/log` 계약 테스트에 `ServiceError` 매핑 케이스를 추가.
- 검증 결과
- `pnpm -C app lint src/app/api/search/log/route.ts src/app/api/search/log/route.test.ts` 통과.
- `pnpm -C app typecheck` 통과.
- `pnpm -C app test -- src/app/api/search/log/route.test.ts` 통과(전체 62 files, 301 tests pass).
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/app/api/search/log/route.ts`
- `app/src/app/api/search/log/route.test.ts`
- `PLAN.md`

### 2026-03-05: Cycle 161 완료 (읽기 API rate-limit 짧은 허용 캐시 확대)
- 완료 내용
- 고빈도 읽기 API 4개에 `enforceRateLimit(..., cacheMs: 1_000)`를 적용해 짧은 구간 반복 요청에서 Upstash rate-limit 왕복을 완화.
  - `GET /api/lounges/breeds/[breedCode]/posts`
  - `GET /api/boards/[board]/posts`
  - `GET /api/neighborhoods`
  - `GET /api/communities`
- `lounge posts` 계약 테스트의 `enforceRateLimit` 기대값을 `cacheMs` 포함으로 보강.
- 검증 결과
- `pnpm -C app lint 'src/app/api/lounges/breeds/[breedCode]/posts/route.ts' 'src/app/api/lounges/breeds/[breedCode]/posts/route.test.ts' 'src/app/api/boards/[board]/posts/route.ts' src/app/api/neighborhoods/route.ts src/app/api/communities/route.ts` 통과.
- `pnpm -C app typecheck` 통과.
- `pnpm -C app test -- 'src/app/api/lounges/breeds/[breedCode]/posts/route.test.ts' 'src/app/api/boards/[board]/posts/route.test.ts' src/app/api/neighborhoods/route.test.ts src/app/api/communities/route.test.ts` 통과(전체 62 files, 300 tests pass).
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/app/api/lounges/breeds/[breedCode]/posts/route.ts`
- `app/src/app/api/lounges/breeds/[breedCode]/posts/route.test.ts`
- `app/src/app/api/boards/[board]/posts/route.ts`
- `app/src/app/api/neighborhoods/route.ts`
- `app/src/app/api/communities/route.ts`
- `PLAN.md`

### 2026-03-04: Cycle 160 완료 (배포 API p50/p95 성능 스냅샷 기록)
- 완료 내용
- 배포 URL(`https://townpet2.vercel.app`) 기준으로 변경 영향 API 4개를 30회씩 반복 호출해 TTFB/total raw 샘플(총 120건)을 수집.
- 대상:
  - `GET /api/posts?scope=GLOBAL`
  - `GET /api/posts/suggestions?q=산책코스`
  - `POST /api/search/log` (`{"q":"강아지 산책"}`)
  - `GET /api/lounges/breeds/golden/posts?q=산책`
- 집계 결과(ms):
  - `api_posts_global`: TTFB p50 `150.1`, p95 `188.0` / total p50 `156.9`, p95 `194.5` (status `200 x30`)
  - `api_posts_suggestions`: TTFB p50 `151.6`, p95 `197.6` / total p50 `159.3`, p95 `204.0` (status `200 x30`)
  - `api_search_log`: TTFB p50 `248.4`, p95 `305.7` / total p50 `255.4`, p95 `314.1` (status `200 x30`)
- `api_breed_posts`: TTFB p50 `239.0`, p95 `292.5` / total p50 `239.2`, p95 `292.8` (status `200 x30`)
- 검증 결과
- 샘플 파일: `/tmp/townpet_perf_20260304_prod.tsv` (120 lines).
- 모든 측정 엔드포인트에서 30/30 `200` 응답 확인.
- 이슈/블로커
- 로컬 포트 바인딩은 샌드박스 제한(`listen EPERM`)으로 실패하여, 배포 URL 직접 측정으로 전환.
- 변경 파일(핵심)
- `PLAN.md`

### 2026-03-04: Cycle 159 완료 (Admin 감사로그 API 권한검증 경량화 + 계약 테스트 추가)
- 완료 내용
- `auth` 헬퍼에 `getCurrentUserRole`, `requireModeratorUserId`를 추가해 관리자 권한검증 경로를 `id/role` 최소 조회로 분리.
- `user.queries`에 `getUserRoleById`, `getUserRoleByEmail`를 추가해 role 전용 조회를 표준화.
- `GET /api/admin/auth-audits`, `GET /api/admin/auth-audits/export`를 `requireModeratorUserId` 기반으로 전환하고 `ServiceError`를 표준 에러 응답으로 매핑.
- admin 감사로그 API 계약 테스트(권한 오류/입력 오류/정상/예외 500)와 auth 헬퍼 테스트를 추가/보강.
- 검증 결과
- `pnpm -C app lint src/server/auth.ts src/server/auth.test.ts src/server/queries/user.queries.ts src/app/api/admin/auth-audits/route.ts src/app/api/admin/auth-audits/export/route.ts src/app/api/admin/auth-audits/route.test.ts src/app/api/admin/auth-audits/export/route.test.ts` 통과.
- `pnpm -C app typecheck` 통과.
- `pnpm -C app test -- src/server/auth.test.ts src/app/api/admin/auth-audits/route.test.ts src/app/api/admin/auth-audits/export/route.test.ts` 통과(전체 62 files, 300 tests pass).
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/server/auth.ts`
- `app/src/server/queries/user.queries.ts`
- `app/src/server/auth.test.ts`
- `app/src/app/api/admin/auth-audits/route.ts`
- `app/src/app/api/admin/auth-audits/export/route.ts`
- `app/src/app/api/admin/auth-audits/route.test.ts`
- `app/src/app/api/admin/auth-audits/export/route.test.ts`
- `PLAN.md`

### 2026-03-04: Cycle 158 완료 (Lounge/Upload API 인증 조회 경량화 + 계약 테스트 추가)
- 완료 내용
- `GET /api/lounges/breeds/[breedCode]/posts`, `POST /api/lounges/breeds/[breedCode]/groupbuys`, `POST /api/upload`, `POST /api/upload/client`의 인증 조회를 `getCurrentUser`에서 `getCurrentUserId` 기반으로 전환.
- `id`만 필요한 경로에서 user 전체 조회를 제거해 요청당 DB read 오버헤드를 축소.
- breed lounge posts 경로는 guest 전용 정책 조회(`getGuestReadLoginRequiredPostTypes`)를 비로그인 요청에서만 실행하도록 조정.
- `lounge posts/groupbuys`, `upload/upload-client` 계약 테스트를 신규 추가해 인증/입력검증/예외 500 경로를 고정.
- 검증 결과
- `pnpm -C app lint 'src/app/api/lounges/breeds/[breedCode]/posts/route.ts' 'src/app/api/lounges/breeds/[breedCode]/groupbuys/route.ts' src/app/api/upload/route.ts src/app/api/upload/client/route.ts 'src/app/api/lounges/breeds/[breedCode]/posts/route.test.ts' 'src/app/api/lounges/breeds/[breedCode]/groupbuys/route.test.ts' src/app/api/upload/route.test.ts src/app/api/upload/client/route.test.ts` 통과.
- `pnpm -C app typecheck` 통과.
- `pnpm -C app test -- 'src/app/api/lounges/breeds/[breedCode]/posts/route.test.ts' 'src/app/api/lounges/breeds/[breedCode]/groupbuys/route.test.ts' src/app/api/upload/route.test.ts src/app/api/upload/client/route.test.ts` 통과(전체 60 files, 291 tests pass).
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/app/api/lounges/breeds/[breedCode]/posts/route.ts`
- `app/src/app/api/lounges/breeds/[breedCode]/groupbuys/route.ts`
- `app/src/app/api/upload/route.ts`
- `app/src/app/api/upload/client/route.ts`
- `app/src/app/api/lounges/breeds/[breedCode]/posts/route.test.ts`
- `app/src/app/api/lounges/breeds/[breedCode]/groupbuys/route.test.ts`
- `app/src/app/api/upload/route.test.ts`
- `app/src/app/api/upload/client/route.test.ts`
- `PLAN.md`

### 2026-03-04: Cycle 157 완료 (Suggest/Search/Comment API 인증 조회 경량화 + 계약 테스트 추가)
- 완료 내용
- `GET /api/posts/suggestions`, `POST /api/search/log`, `PATCH/DELETE /api/comments/[id]`의 인증 조회를 `getCurrentUser`에서 `getCurrentUserId` 기반으로 전환.
- `id`만 필요한 경로에서 user 전체 조회를 제거해 API 요청당 불필요한 DB read를 축소.
- `/api/posts/suggestions`는 guest 전용 정책 조회(`getGuestReadLoginRequiredPostTypes`)를 비로그인 요청에서만 실행하도록 조정.
- `suggestions/search` 계약 테스트를 신규 추가해 인증/입력검증/예외 500 경로를 고정.
- 검증 결과
- `pnpm -C app lint 'src/app/api/comments/[id]/route.ts' src/app/api/posts/suggestions/route.ts src/app/api/search/log/route.ts src/app/api/posts/suggestions/route.test.ts src/app/api/search/log/route.test.ts` 통과.
- `pnpm -C app typecheck` 통과.
- `pnpm -C app test -- src/app/api/posts/suggestions/route.test.ts src/app/api/search/log/route.test.ts` 통과(전체 56 files, 279 tests pass).
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/app/api/comments/[id]/route.ts`
- `app/src/app/api/posts/suggestions/route.ts`
- `app/src/app/api/search/log/route.ts`
- `app/src/app/api/posts/suggestions/route.test.ts`
- `app/src/app/api/search/log/route.test.ts`
- `PLAN.md`

### 2026-03-04: Cycle 156 완료 (Posts 보조 API 인증 조회 경량화 + 계약 테스트 보강)
- 완료 내용
- `GET /api/posts/[id]/content`, `GET /api/posts/[id]/stats`, `POST /api/posts/[id]/view`, `GET /api/posts/[id]/reaction`, `GET /api/users/[id]/relation`의 인증 조회를 `getCurrentUser`에서 `getCurrentUserId` 기반으로 전환.
- `user.id`만 필요했던 경로에서 불필요한 user 전체 조회를 제거해 API 요청당 DB read 오버헤드를 축소.
- 새로 전환한 경로의 회귀 방지를 위해 `reaction/view/relation` 라우트 계약 테스트를 신규 추가(인증 실패/정상/예외 500).
- 검증 결과
- `pnpm -C app lint 'src/app/api/posts/[id]/content/route.ts' 'src/app/api/posts/[id]/stats/route.ts' 'src/app/api/posts/[id]/view/route.ts' 'src/app/api/posts/[id]/reaction/route.ts' 'src/app/api/users/[id]/relation/route.ts' 'src/app/api/posts/[id]/reaction/route.test.ts' 'src/app/api/posts/[id]/view/route.test.ts' 'src/app/api/users/[id]/relation/route.test.ts'` 통과.
- `pnpm -C app typecheck` 통과.
- `pnpm -C app test -- 'src/app/api/posts/[id]/reaction/route.test.ts' 'src/app/api/posts/[id]/view/route.test.ts' 'src/app/api/users/[id]/relation/route.test.ts' 'src/app/api/posts/[id]/route.test.ts' 'src/app/api/posts/[id]/comments/route.test.ts' 'src/app/api/posts/route.test.ts'` 통과(전체 54 files, 272 tests pass).
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/app/api/posts/[id]/content/route.ts`
- `app/src/app/api/posts/[id]/stats/route.ts`
- `app/src/app/api/posts/[id]/view/route.ts`
- `app/src/app/api/posts/[id]/reaction/route.ts`
- `app/src/app/api/users/[id]/relation/route.ts`
- `app/src/app/api/posts/[id]/reaction/route.test.ts`
- `app/src/app/api/posts/[id]/view/route.test.ts`
- `app/src/app/api/users/[id]/relation/route.test.ts`
- `PLAN.md`

### 2026-03-04: Cycle 155 완료 (Posts API 인증 조회 경량화)
- 완료 내용
- `GET/POST /api/posts`를 `getCurrentUser`에서 `getCurrentUserId` 기반으로 전환해, user id만 필요한 경로의 불필요한 `getUserById` 조회를 제거.
- `/api/posts` GET에서 guest 전용 정책(`getGuestReadLoginRequiredPostTypes`)은 비로그인 요청일 때만 읽도록 변경.
- `GET/PATCH/DELETE /api/posts/[id]`, `GET/POST /api/posts/[id]/comments`, `GET /api/posts/[id]/detail`도 동일하게 id 기반 인증으로 정리해 API 공통 인증 오버헤드를 축소.
- route 계약 테스트(`posts`, `posts/[id]`, `posts/[id]/comments`) mock 대상을 `getCurrentUserId`로 맞춰 회귀를 방지.
- 검증 결과
- `pnpm -C app lint src/app/api/posts/route.ts 'src/app/api/posts/[id]/route.ts' 'src/app/api/posts/[id]/comments/route.ts' 'src/app/api/posts/[id]/detail/route.ts' src/app/api/posts/route.test.ts 'src/app/api/posts/[id]/route.test.ts' 'src/app/api/posts/[id]/comments/route.test.ts'` 통과.
- `pnpm -C app typecheck` 통과.
- `pnpm -C app test -- src/app/api/posts/route.test.ts 'src/app/api/posts/[id]/route.test.ts' 'src/app/api/posts/[id]/comments/route.test.ts'` 통과(전체 51 files, 264 tests pass).
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/app/api/posts/route.ts`
- `app/src/app/api/posts/[id]/route.ts`
- `app/src/app/api/posts/[id]/comments/route.ts`
- `app/src/app/api/posts/[id]/detail/route.ts`
- `app/src/app/api/posts/route.test.ts`
- `app/src/app/api/posts/[id]/route.test.ts`
- `app/src/app/api/posts/[id]/comments/route.test.ts`
- `PLAN.md`

### 2026-03-04: Cycle 154 완료 (피드 로그인 경로 불필요 정책 조회 제거)
- 완료 내용
- `/feed`에서 로그인 사용자 렌더 시에도 실행되던 `getGuestReadLoginRequiredPostTypes` 조회를 제거.
- 로그인 경로는 사용자 조회만 수행하고, guest 차단 타입 정책은 비로그인 경로에서만 `getGuestFeedContext`를 통해 읽도록 정리.
- 결과적으로 로그인 피드 진입 요청에서 불필요한 정책 조회 1회를 제거해 서버 처리 시간을 완화.
- 검증 결과
- `pnpm -C app lint src/app/feed/page.tsx` 통과.
- `pnpm -C app typecheck` 통과.
- `pnpm -C app test -- src/server/queries/post.queries.test.ts` 통과(전체 51 files, 264 tests pass).
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/app/feed/page.tsx`
- `PLAN.md`

### 2026-03-04: Cycle 153 완료 (커뮤니티 캐시 버전 조회 제거)
- 완료 내용
- `query-cache`에 `createStaticQueryCacheKey`를 추가해 version bucket 조회 없이 정적 캐시 키를 만들 수 있도록 분리.
- `community.queries`의 `listCommunities`, `listCommunityNavItems`를 정적 캐시 키로 전환해 요청당 불필요한 `cache:version:*` 조회 RTT를 제거.
- 결과적으로 레이아웃/피드의 공통 커뮤니티 조회 경로에서 외부 캐시 왕복 횟수를 줄여 체감 지연 원인을 완화.
- 검증 결과
- `pnpm -C app lint src/server/cache/query-cache.ts src/server/queries/community.queries.ts` 통과.
- `pnpm -C app typecheck` 통과.
- `pnpm -C app test:unit:notifications` 통과(4 files, 32 tests pass).
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/server/cache/query-cache.ts`
- `app/src/server/queries/community.queries.ts`
- `PLAN.md`

### 2026-03-04: Cycle 152 완료 (알림 서버 액션 계약 테스트 고정)
- 완료 내용
- 알림 서버 액션 테스트(`notification.test.ts`)를 신규 추가해
- `markNotificationReadAction`
- `markAllNotificationsReadAction`
- `archiveNotificationAction`
  의 성공/실패 계약을 자동 검증.
- 고정한 핵심 계약:
- 변경 발생 시에만 `revalidatePath("/notifications")`, `revalidatePath("/", "layout")` 호출
- 변경 없음(`updated=0`)일 때는 revalidate 미호출
- `ServiceError`는 `{ ok: false, code, message }`로 그대로 매핑
- 예상치 못한 오류는 `{ ok: false, code: "INTERNAL_SERVER_ERROR" }` + `monitorUnhandledError` 호출
- 검증 결과
- `pnpm -C app typecheck` 통과.
- `pnpm -C app lint src/server/actions/notification.test.ts src/server/actions/notification.ts` 통과.
- `pnpm -C app test -- src/server/actions/notification.test.ts src/app/api/notifications/route.test.ts src/server/auth.test.ts` 통과(전체 51 files, 264 tests pass).
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/server/actions/notification.test.ts`
- `PLAN.md`

### 2026-03-04: Cycle 151 완료 (알림 API 계약 테스트 고정)
- 완료 내용
- `/api/notifications` 라우트 테스트를 신규 추가해 인증/입력검증/정상 응답/예외 경로의 계약을 고정.
- 핵심 검증 항목:
- `AUTH_REQUIRED` 서비스 에러 -> 401 매핑
- 잘못된 query(`limit`/`cursor`) -> `INVALID_QUERY` 400
- 정상 조회 시 `listNotificationsByUser` 필터 전달(`kind/unreadOnly/limit`) 및 응답 매핑(`createdAt` ISO, actor 필드)
- 예상치 못한 예외 -> 500 + `monitorUnhandledError` 호출
- 추가로 rate-limit 호출 계약(`key`, `limit`, `windowMs`, `cacheMs`)이 고정되도록 검증.
- 검증 결과
- `pnpm -C app typecheck` 통과.
- `pnpm -C app lint src/app/api/notifications/route.test.ts src/app/api/notifications/route.ts src/server/auth.ts src/server/actions/notification.ts` 통과.
- `pnpm -C app test -- src/app/api/notifications/route.test.ts src/server/auth.test.ts` 통과(전체 50 files, 256 tests pass).
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/app/api/notifications/route.test.ts`
- `PLAN.md`

### 2026-03-04: Cycle 150 완료 (알림 API/액션 인증 경량화 + rate-limit 짧은 허용 캐시)
- 완료 내용
- `server/auth.ts`에 `requireAuthenticatedUserId`를 추가해, `AUTH_REQUIRED` 정책은 유지하면서 사용자 전체 조회 없이 id만 필요한 경로를 경량 처리하도록 분리.
- `GET /api/notifications`에서 `requireCurrentUser` 대신 `requireAuthenticatedUserId`를 사용하도록 전환.
- 같은 API 경로의 rate-limit에 `cacheMs: 1000`을 적용해 짧은 시간 연속 조회(필터 변경/추가 로딩) 시 Redis 왕복을 완화.
- 알림 액션(`markNotificationReadAction`, `markAllNotificationsReadAction`, `archiveNotificationAction`)도 id 기반 인증 헬퍼를 사용하도록 변경해 액션당 인증 오버헤드를 축소.
- `auth.test.ts`에 `requireAuthenticatedUserId` 성공/실패 케이스를 추가해 회귀를 방지.
- 검증 결과
- `pnpm -C app typecheck` 통과.
- `pnpm -C app lint src/server/auth.ts src/server/auth.test.ts src/server/actions/notification.ts src/app/api/notifications/route.ts` 통과.
- `pnpm -C app test -- src/server/auth.test.ts` 통과(전체 49 files, 251 tests pass).
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/server/auth.ts`
- `app/src/server/auth.test.ts`
- `app/src/app/api/notifications/route.ts`
- `app/src/server/actions/notification.ts`
- `PLAN.md`

### 2026-03-04: Cycle 149 완료 (Notifications SSR 인증 경량화)
- 완료 내용
- `server/auth.ts`에 `getCurrentUserId` 헬퍼를 추가해, `userId`만 필요한 경로에서 사용자 전체 조회(`getUserById`) 없이 세션 id를 바로 사용할 수 있도록 분리.
- `getCurrentUserId`는 기존 `getCurrentUser`와 동일하게 개발환경 `DEMO_USER_EMAIL` fallback(프로덕션 제외)을 유지해 동작 회귀를 방지.
- `/notifications` 페이지는 `getCurrentUser` 대신 `getCurrentUserId`를 사용하도록 전환하고, 인증 조회와 query param 해석을 `Promise.all`로 병렬 처리.
- `auth.test.ts`에 `getCurrentUserId` 전용 케이스(세션 id 반환, demo fallback, production에서 fallback 미사용)를 추가.
- 검증 결과
- `pnpm -C app test -- src/server/auth.test.ts` 통과(전체 49 files, 249 tests pass).
- `pnpm -C app typecheck` 통과.
- `pnpm -C app lint src/server/auth.ts src/server/auth.test.ts src/app/notifications/page.tsx` 통과.
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/server/auth.ts`
- `app/src/server/auth.test.ts`
- `app/src/app/notifications/page.tsx`
- `PLAN.md`

### 2026-03-04: Cycle 148 완료 (알림 목록 1페이지 캐시 + list/unread 이중 무효화)
- 완료 내용
- `listNotificationsByUser`를 개선해 `cursor` 없는 1페이지 조회에만 short TTL(5s) query cache를 적용하고, `cursor` 기반 추가 로딩은 기존처럼 실시간 조회를 유지.
- query cache 모듈에 `bumpNotificationListCacheVersion(userId)`를 추가하고, 알림 변경 경로에서 `notification-list` + `notification-unread` 버킷을 동시에 무효화하도록 통합.
- 알림 변경 경로(`markNotificationRead`, `markAllNotificationsRead`, `archiveNotification`, `createNotification`)를 `bumpNotificationCaches` 헬퍼로 정리해 무효화 누락 가능성을 줄임.
- 알림 쿼리 테스트를 보강해
- 1페이지 캐시 사용 / 커서 페이지 캐시 제외
- 변경 시 list/unread 동시 bump
- 조건 불충족 시 bump 미호출
  을 회귀 검증.
- 검증 결과
- `pnpm -C app typecheck` 통과.
- `pnpm -C app lint src/server/cache/query-cache.ts src/server/queries/notification.queries.ts src/server/queries/notification.queries.test.ts` 통과.
- `pnpm -C app test -- src/server/queries/notification.queries.test.ts` 통과(전체 49 files, 246 tests pass).
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/server/cache/query-cache.ts`
- `app/src/server/queries/notification.queries.ts`
- `app/src/server/queries/notification.queries.test.ts`
- `PLAN.md`

### 2026-03-04: Cycle 147 완료 (알림 unread 카운트 캐시 + 즉시 무효화)
- 완료 내용
- `countUnreadNotifications`에 user 단위 캐시 키(`notification-unread:${userId}`)와 TTL 5초를 적용해 레이아웃 SSR의 반복 count 질의를 완화.
- 알림 상태 변경/생성 경로(`markNotificationRead`, `markAllNotificationsRead`, `archiveNotification`, `createNotification`)에서 unread 캐시 버전을 즉시 bump하도록 연결.
- query cache 모듈에 `bumpNotificationUnreadCacheVersion(userId)` 헬퍼를 추가해 알림 unread 무효화 경로를 표준화.
- 위 동작의 회귀 방지를 위해 `notification.queries.test.ts`를 추가하고, 상태 변경 결과에 따른 bump 호출/미호출을 검증.
- 검증 결과
- `pnpm -C app typecheck` 통과.
- `pnpm -C app lint src/server/cache/query-cache.ts src/server/queries/notification.queries.ts src/server/queries/notification.queries.test.ts` 통과.
- `pnpm -C app test -- src/server/queries/notification.queries.test.ts` 통과(전체 49 files, 244 tests pass).
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/server/cache/query-cache.ts`
- `app/src/server/queries/notification.queries.ts`
- `app/src/server/queries/notification.queries.test.ts`
- `PLAN.md`

### 2026-03-04: Cycle 146 완료 (커뮤니티 네비 조회 경량화 + 요청 단위 중복 완화)
- 완료 내용
- `community.queries`에 `listCommunityNavItems(limit)`를 추가해 네비게이션에서 필요한 `id/slug/labelKo`만 조회하도록 경량 경로를 분리.
- 해당 경로는 `cache(react)` + query cache TTL(300s) 조합으로 요청 단위 중복 호출 및 반복 조회 부담을 줄이도록 구성.
- `layout`, `/feed`에서 기존 `listCommunities` 의존을 제거하고 `listCommunityNavItems`로 전환해 초기 렌더 시 불필요한 `description/tags/defaultPostTypes/category` payload를 읽지 않도록 정리.
- 검증 결과
- `pnpm -C app typecheck` 통과.
- `pnpm -C app lint src/server/queries/community.queries.ts src/app/layout.tsx src/app/feed/page.tsx` 통과.
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/server/queries/community.queries.ts`
- `app/src/app/layout.tsx`
- `app/src/app/feed/page.tsx`
- `PLAN.md`

### 2026-03-04: Cycle 145 완료 (공통 조회 중복/프리패치 가드 최적화)
- 완료 내용
- `layout`에서 `getUserById` 결과(`preferredPetTypes`)를 재사용하도록 정리해 `listPreferredPetTypeIdsByUserId` 별도 호출을 제거.
- `feed`에서도 `getUserWithNeighborhoods` 결과에서 선호 품종 ID를 파생하도록 바꿔 로그인 피드 진입 시 중복 조회 1회를 제거.
- 미들웨어에 프리패치 요청 감지(`purpose`, `next-router-prefetch`, `x-middleware-prefetch`)를 추가해 링크 프리패치 구간에서는 `getToken` 복호화를 건너뛰도록 보강.
- 프리패치 감지 유틸에 대한 유닛 테스트를 추가해 회귀를 방지.
- 검증 결과
- `pnpm -C app typecheck` 통과.
- `pnpm -C app lint src/app/feed/page.tsx src/app/layout.tsx middleware.ts src/middleware.test.ts` 통과.
- `pnpm -C app test -- src/middleware.test.ts` 통과(전체 48 files, 239 tests pass).
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/app/feed/page.tsx`
- `app/src/app/layout.tsx`
- `app/middleware.ts`
- `app/src/middleware.test.ts`
- `PLAN.md`

### 2026-03-04: Cycle 144 완료 (상세 구경로/알림 배지 동기화 정리)
- 완료 내용
- 댓글 API(`GET/POST /api/posts/[id]/comments`)에서 게시글 권한 확인용 조회를 `getPostStatsById`에서 최소 필드 전용 `getPostReadAccessById`로 전환해 과조회 payload를 축소.
- 알림 unread 동기화를 위해 클라이언트 이벤트 채널(`notification-unread-sync`)을 추가하고, 알림센터/알림벨 액션 성공 시 delta/reset 이벤트를 브로드캐스트하도록 반영.
- 알림 벨 미리보기 로드 시 `PREVIEW_LIMIT` 범위만으로 unread 배지를 덮어쓰던 동작을 제거해, 배지 총량이 잘못 축소되는 케이스를 방지.
- 댓글 API 테스트를 신규 조회 함수 기준으로 보정해 계약 검증을 유지.
- 검증 결과
- `pnpm -C app typecheck` 통과.
- `pnpm -C app lint src/components/notifications/notification-bell.tsx src/components/notifications/notification-center.tsx src/lib/notification-unread-sync.ts 'src/app/api/posts/[id]/comments/route.ts' 'src/app/api/posts/[id]/comments/route.test.ts' src/server/queries/post.queries.ts` 통과.
- `pnpm -C app test -- 'src/app/api/posts/[id]/comments/route.test.ts' src/server/queries/post.queries.test.ts` 통과(전체 48 files, 236 tests pass).
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/server/queries/post.queries.ts`
- `app/src/app/api/posts/[id]/comments/route.ts`
- `app/src/app/api/posts/[id]/comments/route.test.ts`
- `app/src/lib/notification-unread-sync.ts`
- `app/src/components/notifications/notification-bell.tsx`
- `app/src/components/notifications/notification-center.tsx`
- `PLAN.md`

### 2026-03-04: Cycle 143 완료 (목록/알림 체감 성능 개선 2차)
- 완료 내용
- `my-posts` 페이지를 무제한 `findMany` 조회에서 페이지 단위 조회로 전환(`listUserPostsPage`, `limit+1`, `이전/다음 페이지` 링크 추가).
- 작성글 목록 전용 경량 select 경로를 추가해 렌더에 불필요한 relation(`hospitalReview/placeReview/walkRoute`, 이미지 부가필드) 로드를 피함.
- 알림센터에서 `읽음 처리/이동/모두 읽음/보관` 후 즉시 `router.refresh()`를 호출하던 경로를 제거해 액션 후 체감 지연을 완화.
- `listUserPostsPage`에 대해 페이지네이션 핵심 동작(다음 페이지 존재 판정, page 정규화) 단위 테스트 2건을 추가.
- 검증 결과
- `pnpm -C app typecheck` 통과.
- `pnpm -C app lint src/app/my-posts/page.tsx src/components/notifications/notification-center.tsx src/server/queries/post.queries.ts src/server/queries/post.queries.test.ts` 통과.
- `pnpm -C app test -- src/server/queries/post.queries.test.ts` 통과(전체 48 files, 236 tests pass).
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/server/queries/post.queries.ts`
- `app/src/server/queries/post.queries.test.ts`
- `app/src/app/my-posts/page.tsx`
- `app/src/components/notifications/notification-center.tsx`
- `PLAN.md`

### 2026-03-04: Cycle 142 완료 (요청 경로 병목 제거 1차)
- 완료 내용
- 전역 레이아웃에서 `auth()` + `getCurrentUser()` 중복 호출을 제거하고, 사용자/알림/선호/쿠키 조회를 병렬화.
- 게시글 상세 클라이언트의 `detail + content + stats + relation` 다중 API 호출을 `detail` 1회 응답으로 통합(서버에서 관계/렌더콘텐츠/카운트 포함 반환).
- 피드 SSR 선행 구간(`auth/user/communities/cookies/preference/policy`)을 병렬화해 초기 워터폴을 단축.
- Query cache version 조회에 5초 메모 스냅샷을 추가해 캐시 키 생성 시 원격 Redis 왕복 빈도를 완화.
- 숨김 작성자 ID 조회에 5초 short cache를 적용하고, block/mute 변경 시 즉시 무효화 훅을 추가.
- 미들웨어 matcher에서 `_next/data`와 정적 파일 확장자 경로를 제외해 불필요한 미들웨어 실행을 줄임.
- 검증 결과
- `pnpm -C app typecheck` 통과.
- `pnpm -C app test -- src/server/services/user-relation.service.test.ts` 통과.
- `pnpm -C app test -- src/middleware.test.ts` 통과.
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/app/layout.tsx`
- `app/src/app/feed/page.tsx`
- `app/middleware.ts`
- `app/src/app/api/posts/[id]/detail/route.ts`
- `app/src/components/posts/post-detail-client.tsx`
- `app/src/server/cache/query-cache.ts`
- `app/src/server/queries/user-relation.queries.ts`
- `app/src/server/services/user-relation.service.ts`
- `app/src/server/services/user-relation.service.test.ts`
- `PLAN.md`

### 2026-03-04: Cycle 141 완료 (닉네임 가드 체감 성능 개선)
- 완료 내용
- 미들웨어에서 세션 쿠키가 없는 요청과 `/profile`/`/api` 경로는 `getToken` 복호화를 건너뛰도록 조건을 최적화.
- 프로필 페이지의 "총 작성글" 계산을 `listUserPosts(findMany)`에서 `countUserPosts(count)`로 전환해 DB 읽기량을 축소.
- 닉네임 미설정 상태에서는 닉네임 설정에 불필요한 관계관리/펫/동네 설정 섹션의 조회를 생략하도록 분기.
- 검증 결과
- `pnpm -C app lint middleware.ts src/app/profile/page.tsx src/server/queries/post.queries.ts` 통과.
- `pnpm -C app typecheck` 통과.
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/middleware.ts`
- `app/src/app/profile/page.tsx`
- `app/src/server/queries/post.queries.ts`
- `PLAN.md`

### 2026-03-04: Cycle 140 완료 (프로필 저장 후 세션 닉네임 동기화 정합 보정)
- 완료 내용
- 프로필 저장 후 `unstable_update`가 호출되어도 JWT의 `nickname` 클레임이 즉시 갱신되지 않던 경로를 수정.
- NextAuth `jwt` callback에 `trigger === "update"` 분기를 추가해 `session.user.nickname` 값을 `token.nickname`으로 반영하도록 보강.
- 기대 효과
- 닉네임 저장 직후 `/feed` 등 다른 페이지로 이동 시 미들웨어의 닉네임 미설정 가드가 즉시 해제됨(재로그인 불필요).
- 검증 결과
- `pnpm -C app lint src/lib/auth.ts` 통과.
- `pnpm -C app typecheck` 통과.
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/lib/auth.ts`
- `PLAN.md`

### 2026-03-04: Cycle 139 완료 (닉네임 미설정 가드 안내 문구 보강)
- 완료 내용
- 닉네임 미설정 사용자가 `/profile`로 강제 이동될 때, 상단 경고 카드에서 차단 사유와 해제 방법을 명시하도록 보강.
- 안내 문구에 "닉네임 저장 후 즉시 이동 가능"과 "중복 불가/30일 변경 제한" 규칙을 함께 표시.
- 검증 결과
- `pnpm -C app lint src/app/profile/page.tsx` 통과.
- `pnpm -C app typecheck` 통과.
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/src/app/profile/page.tsx`
- `PLAN.md`

### 2026-03-04: Cycle 138 완료 (닉네임 미설정 사용자 가드 + 프로필 규칙 UX 보강)
- 완료 내용
- 로그인 사용자 세션 닉네임이 비어 있으면 `/profile` 외 경로에서 `/profile`로 강제 리다이렉트되도록 미들웨어 가드를 추가.
- 프로필 저장 시 `unstable_update`로 세션 닉네임을 즉시 동기화해, 닉네임 저장 후 재로그인 없이 가드가 해제되도록 보강.
- 온보딩/프로필 폼에 “닉네임 중복 불가 + 설정/변경 후 30일 잠금” 경고 문구를 명시.
- 확인 결과
- 닉네임 중복 불가 규칙: `updateProfile`에서 `NICKNAME_TAKEN(409)`으로 이미 강제되고 테스트로 재확인.
- 30일 변경 제한 규칙: `updateProfile`에서 `NICKNAME_CHANGE_RATE_LIMITED(429)`로 이미 강제되고 테스트로 재확인.
- 검증 결과
- `pnpm -C app lint middleware.ts src/middleware.test.ts src/server/actions/user.ts src/server/actions/user.test.ts src/components/profile/profile-info-form.tsx src/components/onboarding/onboarding-form.tsx src/app/profile/page.tsx src/server/queries/user.queries.ts src/server/services/user.service.test.ts` 통과.
- `pnpm -C app test:unit -- src/middleware.test.ts src/server/actions/user.test.ts src/server/services/user.service.test.ts` 통과.
- `pnpm -C app typecheck` 통과.
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/middleware.ts`
- `app/src/server/actions/user.ts`
- `app/src/components/profile/profile-info-form.tsx`
- `app/src/components/onboarding/onboarding-form.tsx`
- `PLAN.md`

### 2026-03-04: Cycle 137 완료 (OAuth 실계정 수동 증적 자동화)
- 완료 내용
- OAuth 실계정 수동 점검 결과를 표준 형식으로 남길 수 있도록 리포트 생성 스크립트를 추가.
- `ops:oauth:manual-report` 명령으로 Provider별 상태(`pending/pass/fail`), 자동 검증 run URL, 후속 조치를 포함한 markdown 템플릿을 생성하도록 구성.
- OAuth 운영 가이드의 수동 점검 절차에 템플릿 생성 단계를 반영.
- 검증 결과
- `pnpm -C app lint scripts/generate-oauth-manual-check-report.ts` 통과.
- `pnpm -C app ops:oauth:manual-report --date 2026-03-04 --run-url https://github.com/answndud/townpet/actions/runs/22662648513 --out /tmp/oauth-manual-check.md` 통과.
- 생성 파일(`/tmp/oauth-manual-check.md`)에 Provider 체크표 + `PROGRESS.md` 붙여넣기 스니펫 포함 확인.
- 이슈/블로커
- 외부 계정 의존 자체(실계정 로그인/동의)는 그대로이며, 이번 변경은 기록 누락/형식 편차를 줄이는 운영 자동화 범위.
- 변경 파일(핵심)
- `app/scripts/generate-oauth-manual-check-report.ts`
- `app/package.json`
- `docs/operations/OAuth_외부로그인_운영_가이드.md`
- `PLAN.md`

### 2026-03-04: Cycle 136 완료 (외부 OAuth2 운영/팔로우업 가이드 정식화)
- 완료 내용
- Kakao/Naver 외부 OAuth2 로그인/회원가입 운영 가이드를 `docs/ops` 하위에 신규 작성.
- 운영 이후 관리 항목(시크릿/리다이렉트/릴리즈 전후 점검/주간·월간 팔로우업/장애 대응/지표/기록 템플릿)을 단일 문서로 통합.
- `oauth-real-e2e` 재실행 성공 run(22662648513) 기록과 수동 실계정 점검의 경계(자동 검증 vs 외부 수동 증적)를 명확히 구분.
- 검증 결과
- 문서 경로/추적 확인: `.gitignore` 예외에 `docs/operations/OAuth_외부로그인_운영_가이드.md` 추가.
- 가이드 문서 내 즉시 실행 명령(`gh run list/view/workflow run`) 및 운영 동기화 규칙 반영 확인.
- 이슈/블로커
- 실계정 온보딩 완료 증적(카카오/네이버 각각)은 외부 계정 접근이 필요해 Cycle 23 `blocked` 유지.
- 변경 파일(핵심)
- `docs/operations/OAuth_외부로그인_운영_가이드.md`
- `.gitignore`
- `PLAN.md`

### 2026-03-04: Cycle 135 완료 (OAuth 재검증 + Day1 handoff 자동화 보강)
- 완료 내용
- `oauth-real-e2e` 워크플로우를 재실행해 최신 run success를 확보.
- Day1 채널 실행용 UTM/증적/24h keep-fix-kill 점검표를 자동 생성하는 스크립트를 추가.
- `growth:day1:handoff` 실행으로 Day1 실행 템플릿을 파일로 생성해 수동 게시 작업의 즉시 착수 경로를 고정.
- 검증 결과
- OAuth run: `https://github.com/answndud/townpet/actions/runs/22662648513` (`success`).
- `pnpm -C app lint scripts/generate-day1-growth-handoff.ts` 통과.
- `pnpm -C app growth:day1:handoff --date 2026-03-04 --out /tmp/day1-growth-handoff.md` 통과(템플릿 생성 확인).
- 이슈/블로커
- Cycle 23의 `카카오/네이버 로그인 -> 온보딩 -> 피드` 실계정 완료 증적은 외부 계정/콘솔 접근이 필요해 `blocked` 유지.
- 변경 파일(핵심)
- `app/scripts/generate-day1-growth-handoff.ts`
- `app/package.json`
- `PLAN.md`

### 2026-03-04: Cycle 134 완료 (guest post management E2E 안정화)
- 완료 내용
- `guest-post-management` 스펙에서 반응형/DOM 순서 의존(`nth(1)`)으로 발생하던 flaky 경로를 제거.
- 비회원 관리 UI 렌더 조건에 영향받지 않도록, 비밀번호 기반 수정/삭제 검증을 안정적인 경로(수정 URL + API 삭제)로 재구성.
- 검증 결과
- `pnpm -C app lint e2e/guest-post-management.spec.ts` 통과.
- `pnpm -C app test:e2e -- e2e/guest-post-management.spec.ts --project=chromium` 통과(1 passed).
- `pnpm -C app typecheck` 통과.
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/e2e/guest-post-management.spec.ts`
- `PLAN.md`

### 2026-03-04: Cycle 133 완료 (Guest 상세 접근제어 + posts rewrite 정합성 보강)
- 완료 내용
- guest rewrite 경로를 게시글 ID 상세 경로로 제한해 `/posts/new` 경로가 잘못 `/guest`로 리라이트되지 않도록 보강.
- guest 상세 페이지 렌더에 `assertPostReadable`를 연결해 `POST_NOT_FOUND`(비활성 상태 포함)와 `AUTH_REQUIRED`를 공통 정책으로 처리.
- middleware 테스트에 경계 케이스(`/posts/new`, `/posts/:id/edit`, `/posts/:id/guest`)를 추가.
- 검증 결과
- `pnpm -C app typecheck` 통과.
- `pnpm -C app lint middleware.ts src/middleware.test.ts 'src/app/posts/[id]/guest/page.tsx'` 통과.
- `pnpm -C app test:unit -- src/middleware.test.ts src/server/services/post-read-access.service.test.ts` 통과.
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `app/middleware.ts`
- `app/src/middleware.test.ts`
- `app/src/app/posts/[id]/guest/page.tsx`
- `PLAN.md`

### 2026-03-04: Cycle 132 완료 (plan-coordinator 연계 운영 루틴 고정)
- 완료 내용
- agent-only 운영 가이드에 `agent:prompt -> @plan-coordinator -> 실행 -> 검증 -> 동기화` 순서를 추가해 실행 루틴을 고정.
- 프롬프트 템플릿 문서에 plan-coordinator 연계 절차를 명시해 문서 1개만 읽어도 동일 루틴을 재현 가능하게 정리.
- 검증 결과
- 문서 경로 참조 확인: 운영 가이드/템플릿 모두 `agent:prompt` 명령과 `@plan-coordinator` 단계 포함.
- `PLAN.md` Cycle 132 작업 2개 `done` 동기화.
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `docs/ops/에이전트 운영 가이드 (한국어).md`
- `docs/operations/에이전트_프롬프트_템플릿.md`
- `PLAN.md`

### 2026-03-04: Cycle 131 완료 (Agent Prompt 자동화 + docs 추적 보정)
- 완료 내용
- `.gitignore`의 `docs` 무시 규칙을 최소 보정해 핵심 운영 문서 3종만 Git 추적 예외로 허용.
- 표준 프롬프트를 자동 생성하는 스크립트(`agent:prompt`)를 추가해 목표/범위/위험도 기반 템플릿 생성 경로를 고정.
- 프롬프트 템플릿 문서에 CLI 사용 예시를 추가.
- 검증 결과
- `pnpm -C app agent:prompt --goal "Unify report auto-hide policy" --mode policy --scope "prisma,zod,service,api,tests"` 실행 성공(stdout 생성 확인).
- `pnpm -C app agent:prompt --goal "Cache invalidation review" --mode performance --out /tmp/agent-prompt-sample.txt` 실행 성공(file 생성 확인).
- `PLAN.md` Cycle 131 작업 3개 `done` 동기화.
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `.gitignore`
- `app/scripts/generate-agent-prompt.ts`
- `app/package.json`
- `docs/operations/에이전트_프롬프트_템플릿.md`
- `PLAN.md`

### 2026-03-04: Cycle 130 완료 (Agent Tool Governance + Prompt Template 적용)
- 완료 내용
- Claude Code Picks 인사이트를 TownPet 운영 규칙에 맞게 재설계해, 도구 선택 거버넌스 문서를 신규 작성.
- 10개 카테고리(ORM/Auth/Validation/Cache/Real-time/Observability/Jobs/Flags/UI/Test)에 대해 기본값/허용 대안/금지선/재검토 트리거를 고정.
- 에이전트 작업 지시 템플릿을 공통 헤더/입력 포맷/출력 계약/금지 프롬프트 패턴 형태로 표준화.
- 기존 agent-only 운영 가이드에 신규 표준 문서 참조 링크를 추가.
- 검증 결과
- `PLAN.md`에 Cycle 130을 추가하고 작업 3개 상태를 `done`으로 동기화.
- 문서 간 참조 무결성 확인: 운영 가이드 -> 거버넌스/템플릿 문서 경로 연결 확인.
- 이슈/블로커
- 없음.
- 변경 파일(핵심)
- `docs/operations/에이전트_도구_거버넌스.md`
- `docs/operations/에이전트_프롬프트_템플릿.md`
- `docs/ops/에이전트 운영 가이드 (한국어).md`
- `PLAN.md`

### 2026-03-04: ops-smoke-checks 주간 자동 실행 설정 + 동작 확인
- 완료 내용
- `ops-smoke-checks` 워크플로우에 주간 스케줄(`매주 월요일 UTC 00:15`)을 추가.
- 자동 실행 경로는 health-only로 동작하도록 `verify_sentry` 조건을 `workflow_dispatch` 입력일 때만 활성화되게 조정.
- 대상 URL은 `OPS_BASE_URL` repository variable 우선, 미설정 시 `https://townpet2.vercel.app` fallback 사용으로 고정.
- 검증 결과
- 수동 검증 실행: `https://github.com/answndud/townpet/actions/runs/22659011560` `success`.
- `Check deployment health endpoint` 단계 `success`.
- `Validate Sentry secrets`/`Check Sentry ingestion` 단계는 `verify_sentry=false` 경로로 `skipped` 확인.
- 변경 파일(핵심)
- `.github/workflows/ops-smoke-checks.yml`
- `PLAN.md`

### 2026-03-04: oauth-real-e2e 하이브리드 검증(리다이렉트 + 온보딩/피드) 적용
- 완료 내용
- `oauth-real-e2e` 워크플로우에 `Social onboarding to feed smoke (app flow)` 단계를 추가.
- 단일 런에서 `Real OAuth redirect smoke`(실공급자 리다이렉트) 후 `social-dev` 기반 온보딩->피드 진입 회귀를 연속 검증하도록 확장.
- 검증 결과
- 스펙 인식 확인: `pnpm -C app test:e2e:social-onboarding --list` 통과(2 tests).
- 워크플로우 실행: `https://github.com/answndud/townpet/actions/runs/22658861470` `success`.
- 단계별 확인: `Real OAuth redirect smoke` `success`, `Social onboarding to feed smoke (app flow)` `success`.
- 변경 파일(핵심)
- `.github/workflows/oauth-real-e2e.yml`
- `PLAN.md`
- 이슈/블로커
- 카카오/네이버 "실계정 로그인 완료 후 온보딩" 자체는 공급자 테스트 계정/콘솔 정책 의존으로 여전히 환경 블로커 분류를 유지.

### 2026-03-04: OAuth 실계정 리다이렉트 스모크 재확인 PASS
- 실행 내용
- `oauth-real-e2e` 워크플로우를 재실행해 카카오/네이버 OAuth 리다이렉트 경로를 점검.
- 런: `https://github.com/answndud/townpet/actions/runs/22658725857`
- 검증 결과
- 워크플로우 `success` 확인.
- `Validate OAuth secrets`와 `Real OAuth redirect smoke` 단계 통과.

### 2026-03-04: Sentry 실수신 검증 재확인 PASS
- 실행 내용
- `ops-smoke-checks`를 동일 조건(`verify_sentry=true`)으로 재실행.
- 런: `https://github.com/answndud/townpet/actions/runs/22658628800`
- 검증 결과
- 워크플로우 `success` 확인.
- `Validate Sentry secrets` 및 `Check Sentry ingestion` 단계 모두 `success`.

### 2026-03-04: Sentry 실수신 검증 최종 PASS
- 실행 내용
- `SENTRY_AUTH_TOKEN` 교체 후 `ops-smoke-checks`를 `verify_sentry=true`로 재실행.
- 런: `https://github.com/answndud/townpet/actions/runs/22657771711`
- 검증 결과
- 워크플로우 `success` 확인.
- `Check Sentry ingestion` 단계에서 이벤트 전송/조회 검증 통과.
- 후속 조치
- `PLAN.md`의 `Sentry 실수신 검증` 항목을 `blocked`에서 `done`으로 갱신.

### 2026-03-04: Sentry 실수신 검증 재시도(토큰 유효성 이슈 확인)
- 실행 내용
- `ops-smoke-checks`(`verify_sentry=true`) 실행: `https://github.com/answndud/townpet/actions/runs/22657129988`
- `Check Sentry ingestion` 타임아웃 확인 후 검증 스크립트의 API host 분리 패치 반영(`fix: use sentry api host for event lookup`, `093dad4`) 후 재실행.
- 재실행 런: `https://github.com/answndud/townpet/actions/runs/22657498614`
- 검증 결과
- 두 번째 재실행에서 `Check Sentry ingestion` 단계가 즉시 `HTTP 401`로 실패.
- 실패 메시지: `Sentry event lookup failed: HTTP 401 body={\"detail\":\"Invalid token\"}`.
- 이슈/블로커
- `SENTRY_AUTH_TOKEN`이 무효 상태로 확인되어 Sentry 실수신 검증 blocked 유지.
- 조치 필요: Sentry Internal Integration 토큰 재발급 후 GitHub Secret `SENTRY_AUTH_TOKEN` 교체.

### 2026-03-04: Vercel Prisma Client 초기화 오류 대응(`prisma generate` 순서 조정)
- 완료 내용
- Vercel 배포 로그의 `Prisma has detected that this project was built on Vercel` 초기화 오류를 반영해 `build:vercel` 순서를 수정.
- `db:sync:neighborhoods` 실행 전 `prisma generate`를 선행 실행하도록 변경해 `sync-neighborhoods.ts`의 `PrismaClient` 인스턴스 생성 시점에 최신 클라이언트가 보장되게 조정.
- 기존 `runNeighborhoodSync`의 non-fatal 완화(`NEIGHBORHOOD_SYNC_STRICT=1` opt-in)는 유지.
- 검증 결과
- `pnpm -C app lint` 통과.
- `pnpm -C app typecheck` 통과.
- 변경 파일(핵심)
- `app/scripts/vercel-build.ts`
- `PLAN.md`
- 이슈/블로커
- 실제 배포 재검증은 Vercel 재배포 결과 확인 필요.

### 2026-03-04: Vercel 배포 실패 대응(`build:vercel` neighborhood sync non-fatal)
- 완료 내용
- Vercel 빌드에서 `db:sync:neighborhoods` 단계 실패 시 배포 전체가 중단되던 경로를 완화.
- 기본 동작은 동네 동기화 실패 시 경고 로그를 남기고 `prisma generate`/`next build`를 계속 진행하도록 변경.
- 운영에서 동네 동기화 강제 실패가 필요할 경우 `NEIGHBORHOOD_SYNC_STRICT=1` 환경변수로 기존 fail-fast 동작을 유지하도록 분기 추가.
- 검증 결과
- `pnpm -C app lint` 통과.
- `pnpm -C app typecheck` 통과.
- 변경 파일(핵심)
- `app/scripts/vercel-build.ts`
- `PLAN.md`
- 이슈/블로커
- 동네 동기화 실패 원인의 근본 원인 로그는 Vercel 빌드 로그 원문 추가 확인 필요(현재는 배포 중단 방지 우선 대응).

### 2026-03-04: Sentry 미연동 운영 결정 반영
- 결정 내용
- 현재 GitHub Actions/Vercel에 Sentry 설정을 추가하지 않고 운영을 진행하기로 확정.
- 운영 기준
- 배포 검증은 `oauth-real-e2e` + `ops-smoke-checks(verify_sentry=false)` + `/api/health` PASS를 기준으로 유지.
- `ops-smoke-checks(verify_sentry=true)` 및 `ops:check:sentry`는 Sentry 도입 시점까지 deferred.
- 이슈/블로커
- `PLAN.md`의 Sentry 실수신 검증 항목은 선택 운영 blocked로 유지.

### 2026-03-04: blocked 해소 워크플로우 재실행(실OAuth/배포 health/Sentry)
- 실행 내용
- `oauth-real-e2e` 워크플로우 재실행: `https://github.com/answndud/townpet/actions/runs/22655645744`
- `ops-smoke-checks` 워크플로우 재실행(`target_base_url=https://townpet2.vercel.app`, `verify_sentry=false`): `https://github.com/answndud/townpet/actions/runs/22655651276`
- `ops-smoke-checks` Sentry 포함 재검증(`verify_sentry=true`): `https://github.com/answndud/townpet/actions/runs/22655717872`
- 검증 결과
- `oauth-real-e2e`: `success`
- `ops-smoke-checks`(`verify_sentry=false`): `success`
- 로컬 사전 검증: `OPS_BASE_URL=https://townpet2.vercel.app pnpm -C app ops:check:health` 통과
- `ops-smoke-checks`(`verify_sentry=true`): `failure`
- 실패 원인: `Validate Sentry secrets` 단계에서 저장소 시크릿 4종 누락
- 누락 키: `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG_SLUG`, `SENTRY_PROJECT_SLUG`
- 이슈/블로커
- Sentry 실수신 검증은 시크릿 4종 설정 전까지 blocked 유지.

### 2026-03-04: 품질게이트 소셜 스모크 안정화 + 운영 체크리스트 경로 복구
- 완료 내용
- Playwright 설정에 `PLAYWRIGHT_REUSE_EXISTING_SERVER=1|0` 강제 오버라이드 옵션을 추가해 로컬/CI 재사용 전략을 명시적으로 제어할 수 있도록 정리.
- 개발/테스트 환경에서 `social-dev` provider를 기본 활성화(`DISABLE_SOCIAL_DEV_LOGIN=1`로 opt-out)하여, 기존 `next dev` 재사용 상황에서도 소셜 온보딩 스모크가 `/api/auth/error?error=Configuration`으로 흔들리지 않도록 보강.
- 운영 문서 링크 정합을 위해 GUIDE의 blocked/주간 루틴 경로를 실제 추적 문서(`docs/operations/차단 해소 체크리스트.md`, `app/README.md`)로 정정하고 품질게이트 섹션 설명을 현재 동작에 맞게 업데이트.
- 검증 결과
- `pnpm -C app lint` 통과.
- `pnpm -C app typecheck` 통과.
- `pnpm -C app test:e2e:smoke` 통과(7 passed).
- `pnpm -C app quality:gate` 통과.
- 변경 파일(핵심)
- `app/playwright.config.ts`
- `app/src/lib/auth.ts`
- `app/src/app/login/page.tsx`
- `app/src/app/register/page.tsx`
- `docs/개발_운영_가이드.md`
- `PLAN.md`
- 이슈/블로커
- 없음.

### 2026-03-04: 품질게이트 E2E 안정화 + SEC-002 CSP strict 강제 검증 완료
- 완료 내용
- `social-onboarding-flow`/`global-first-neighborhood-flow` E2E의 체크박스 선택자를 전역 `input[type="checkbox"]` 의존에서 테스트 전용 선택자로 전환해 hidden 체크박스 충돌을 제거.
- 소셜 온보딩 초기화에서 `nicknameUpdatedAt`을 함께 리셋해 닉네임 30일 제한으로 인한 플로우 실패를 제거.
- 미들웨어 nonce 전파를 `x-nonce` + `x-csp-nonce`로 표준화하고, JSON-LD 인라인 스크립트(공개 프로필/회원 상세/게스트 상세)에 nonce 전달 경로를 연결.
- 게스트 상세(`/posts/[id]/guest`)를 동적 렌더로 전환해 strict CSP에서 JSON-LD nonce가 실제로 비어 있지 않도록 보정.
- 최신 글쓰기 정책(범위 선택 제거)에 맞춰 `global-first-neighborhood-flow` assertion을 갱신.
- 검증 결과
- `pnpm -C app test:e2e:social-onboarding` 통과.
- `pnpm -C app test:e2e -- e2e/global-first-neighborhood-flow.spec.ts` 통과.
- `pnpm -C app quality:gate` 통과.
- `pnpm -C app build` 통과(최종 라우트에서 `/posts/[id]/guest`는 `ƒ`로 전환 확인).
- `CSP_ENFORCE_STRICT=1 pnpm -C app start --port 3105` + `curl` 실측에서:
- `content-security-policy`가 strict(`script-src 'self' 'nonce-...' https:`)로 내려옴.
- `/posts/<id>/guest`, `/users/<id>`의 `application/ld+json` 스크립트에 nonce 부여 확인.
- `pnpm -C app test:e2e:social-real-oauth` 실패(카카오/네이버 provider 미설정으로 `/api/auth/error?error=Configuration` 이동).
- `pnpm -C app ops:check:sentry` 실패(`SENTRY_DSN is required`).
- 변경 파일(핵심)
- `app/middleware.ts`
- `app/src/lib/csp-nonce.ts`
- `app/src/app/posts/[id]/page.tsx`
- `app/src/components/posts/post-detail-client.tsx`
- `app/src/app/users/[id]/page.tsx`
- `app/src/app/posts/[id]/guest/page.tsx`
- `app/e2e/social-onboarding-flow.spec.ts`
- `app/e2e/global-first-neighborhood-flow.spec.ts`
- `app/src/components/onboarding/onboarding-form.tsx`
- `app/src/components/profile/neighborhood-preference-form.tsx`
- `PLAN.md`
- 이슈/블로커
- `oauth-real-e2e` 실계정 전체 플로우와 Sentry 실수신 검증은 외부 시크릿/운영 계정 의존으로 로컬에서 최종 PASS 확정 불가.

### 2026-03-04: 게시글/댓글 읽기 접근제어 정합성 보강
- 완료 내용
- 게시글 상세 분리 API(`detail/stats/content`)와 댓글 API에 공통 읽기 접근제어 가드를 적용해 `ACTIVE` 상태 + LOCAL 동네 일치 규칙을 일관 강제.
- 기존 상세 API(`/api/posts/[id]`)와 동일한 정책을 재사용하도록 `assertPostReadable` 서비스 레이어를 추가해 경로별 편차를 제거.
- 댓글 작성 서비스에서 게스트 작성 시 ban 상태를 확인하고, 비활성 글(`HIDDEN/DELETED`) 및 LOCAL 권한 불일치 댓글 작성을 차단하도록 방어 로직을 보강.
- 검증 결과
- `pnpm -C app test -- src/server/services/post-read-access.service.test.ts src/app/api/posts/[id]/route.test.ts src/app/api/posts/[id]/comments/route.test.ts src/server/services/comment.service.test.ts` 통과.
- `pnpm -C app lint` 통과.
- `pnpm -C app typecheck` 통과.
- 변경 파일(핵심)
- `app/src/server/services/post-read-access.service.ts`
- `app/src/app/api/posts/[id]/route.ts`
- `app/src/app/api/posts/[id]/detail/route.ts`
- `app/src/app/api/posts/[id]/stats/route.ts`
- `app/src/app/api/posts/[id]/content/route.ts`
- `app/src/app/api/posts/[id]/comments/route.ts`
- `app/src/server/services/comment.service.ts`
- `app/src/server/services/post-read-access.service.test.ts`
- `app/src/app/api/posts/[id]/route.test.ts`
- `app/src/app/api/posts/[id]/comments/route.test.ts`
- `app/src/server/services/comment.service.test.ts`
- `PLAN.md`
- 이슈/블로커
- 없음.

### 2026-03-03: 모바일 게시판 목록 상시 노출
- 완료 내용
- 모바일 피드 내비게이션의 `게시판 빠른 이동`을 `details` 접기 UI에서 상시 노출형 칩 목록으로 전환.
- 게시판 목록을 카드 상단 섹션 + 다중 칩 버튼 형태로 재배치해 탭 1회 추가 없이 즉시 게시판 전환 가능하도록 개선.
- `관심 동물 설정`은 기존처럼 접기 UI를 유지해 상단 정보량과 조작성 균형을 유지.
- 검증 결과
- `pnpm -C app lint` 통과.
- `pnpm -C app typecheck` 통과.
- 변경 파일(핵심)
- `app/src/components/navigation/feed-hover-menu.tsx`
- `PLAN.md`
- 이슈/블로커
- 없음.

### 2026-03-03: 피드 카드 메타 초경량 4차
- 완료 내용
- 모바일(`md` 미만) 피드 카드 메타를 `작성자` + `시간·조회·반응` 2줄 구성으로 압축해 세로 공간 점유를 축소.
- 작성자 노드를 공통화(`authorNode`)해 게스트/회원 표시 로직 중복을 줄이고 레이아웃 분기(mobile/desktop)를 명확히 분리.
- 데스크톱(`md` 이상)에서는 기존 우측 정렬 메타 레이아웃(작성자/시간/조회·반응)을 유지.
- 검증 결과
- `pnpm -C app lint` 통과.
- `pnpm -C app typecheck` 통과.
- 변경 파일(핵심)
- `app/src/components/posts/feed-infinite-list.tsx`
- `PLAN.md`
- 이슈/블로커
- 없음.

### 2026-03-03: 피드 상단 초경량 컴팩트 3차
- 완료 내용
- 모바일에서 `/feed` hero 헤더를 숨기고, 목록 바로가기 버튼도 `sm` 이상에서만 노출되도록 변경해 상단 점유를 추가로 축소.
- 상단 요약 배지를 `정렬 + 모드` 중심으로 단순화하고, 기간/리뷰 요약 노출을 제거.
- `필터 자세히` 내부를 2단계로 재구성해 `정렬`은 1차 고정, `기간/리뷰`는 `기간/리뷰 옵션` 접기 패널에서만 노출되도록 분리.
- 검증 결과
- `pnpm -C app lint` 통과.
- `pnpm -C app typecheck` 통과.
- 변경 파일(핵심)
- `app/src/app/feed/page.tsx`
- `PLAN.md`
- 이슈/블로커
- 없음.

### 2026-03-03: 피드 모바일 컴팩트 레이아웃 2차
- 완료 내용
- `/feed` 상단 필터 영역을 모바일 기준으로 요약 배지(`정렬/기간/리뷰`) + `필터 자세히` 접기 패널 구조로 재구성해 초기 화면 점유 높이를 축소.
- 데스크톱에서는 기존 인라인 필터 가시성을 유지하고, 모바일에서만 고밀도/저복잡도 흐름으로 분기.
- 피드 카드를 모바일에서 더 촘촘하게 보이도록 여백/칩 크기를 줄이고 제목을 2줄까지 노출.
- 카드에 본문 1줄 프리뷰를 추가해 목록에서 문맥 파악이 가능하도록 보강.
- 작성자/게스트 식별 텍스트의 줄바꿈 안정성을 강화해 좁은 폭에서 카드 레이아웃 깨짐을 방지.
- 검증 결과
- `pnpm -C app lint` 통과.
- `pnpm -C app typecheck` 통과.
- 변경 파일(핵심)
- `app/src/app/feed/page.tsx`
- `app/src/components/posts/feed-infinite-list.tsx`
- `PLAN.md`
- 이슈/블로커
- 없음.

### 2026-03-03: 모바일 반응형 가독성/접근성 보강
- 완료 내용
- 피드 상단 필터 영역의 내부 행을 `flex-wrap`으로 조정해 모바일(<=390px)에서 리뷰/정렬 칩이 가로로 밀리지 않도록 보정.
- 게시글 상세에서 긴 작성자/IP 문자열 및 첨부파일 링크가 가로 오버플로우를 일으키지 않도록 `break-all`/wrap 동작을 적용.
- 상세 페이지 반응/공유 행을 wrap 가능 구조로 변경해 좁은 화면에서도 버튼 겹침 없이 노출되도록 개선.
- 댓글 상단/하단 페이지네이션 행에 wrap을 적용해 페이지 버튼 수가 많아도 모바일에서 줄바꿈되도록 정리.
- 글쓰기 하단 액션 버튼(동네설정/취소/등록)을 모바일에서 full-width로 배치해 터치 접근성과 레이아웃 안정성을 개선.
- 헤더의 `게시판/관심 동물` 기능을 모바일 전용 `details` UI로 추가해 데스크톱 hover 메뉴와 동일 기능 접근성을 확보.
- 검증 결과
- `pnpm -C app lint` 통과.
- `pnpm -C app typecheck` 통과.
- 변경 파일(핵심)
- `app/src/components/navigation/feed-hover-menu.tsx`
- `app/src/app/feed/page.tsx`
- `app/src/components/posts/post-detail-client.tsx`
- `app/src/components/posts/post-comment-thread.tsx`
- `app/src/components/posts/post-create-form.tsx`
- `app/src/components/posts/post-reaction-controls.tsx`
- `app/src/app/profile/page.tsx`
- `PLAN.md`
- 이슈/블로커
- 없음.

### 2026-03-03: 시/도 목록 표준화 + 출장소/중복 표기 제거
- 완료 내용
- 동네 옵션 정규화 유틸(`neighborhood-region`)을 추가해 시/도 별칭을 표준 광역 행정구역으로 통일 (`서울`→`서울특별시`, `부산`→`부산광역시`, `성남`→`경기도` 등).
- 동네 조회 쿼리에서 `출장소` 항목 및 시/도 자기참조 항목을 제외하고, 표준화된 지역키(`city::district`) 기준으로 중복을 제거.
- 시/도 필터 선택 시 별칭 데이터까지 함께 조회되도록 city variant 매칭을 적용해 기존 데이터와 신규 표준 데이터가 혼재해도 동일 결과를 반환.
- 프로필/온보딩 내 동네 선택 폼의 region key 생성 및 표시 city를 정규화해 `서울`/`서울특별시` 이중 표기 문제를 제거.
- 내 동네 저장 서비스에서 region key 해석 시 별칭 city를 표준화하고 기존 레코드(alias 포함)를 우선 매칭하도록 보강.
- 검증 결과
- 쿼리 점검: 표준 시/도 17개 출력, `출장소`/`서울` 단축표기 미노출 확인.
- `pnpm -C app test -- src/lib/neighborhood-region.test.ts src/app/api/neighborhoods/route.test.ts` 통과.
- `pnpm -C app typecheck` 통과.
- `pnpm -C app lint` 통과.
- 이슈/블로커
- 없음.

### 2026-03-03: 동네 데이터 동기화 보강
- 완료 내용
- `db:sync:neighborhoods` 스크립트에서 기존 동네 데이터가 1건 이상 있으면 즉시 종료하던 로직을 제거해, 부분 시드 상태에서도 전국 동네 데이터를 누락 없이 보충하도록 수정.
- 동기화 결과 로그를 `processed/existing/inserted/total` 형태로 확장해 운영 중 상태를 바로 확인할 수 있도록 정리.
- 적용 결과
- `pnpm -C app db:sync:neighborhoods` 실행: `processed=286 existing=8 inserted=286 total=294`.
- 검증 결과
- `pnpm -C app lint` 통과.
- `pnpm -C app typecheck` 통과.
- 이슈/블로커
- 없음.

### 2026-03-03: 동네모임 동네 설정 CTA 강화
- 완료 내용
- 동네모임 작성 시 동네를 선택하지 않은 경우 오류 메시지를 `동네 먼저 선택`/`대표 동네 설정 필요`로 분기해 안내하도록 보강.
- 동네가 아직 설정되지 않은 사용자에게 동네 선택 입력 아래에서 `/profile` 설정 페이지로 바로 이동할 수 있는 링크를 추가.
- 검증 결과
- `pnpm -C app typecheck` 통과.
- `pnpm -C app lint` 통과.
- 이슈/블로커
- 없음.

### 2026-03-03: 중고/공동구매 동물 태그 optional 전환
- 완료 내용
- 공용보드 동물 태그 필수 조건을 `병원후기`에만 적용하고 `중고/공동구매(MARKET_LISTING)`는 태그 없이 작성 가능하도록 완화.
- Zod 검증과 서비스 정책을 동일하게 맞춰 API/액션 경로 모두에서 일관 동작하도록 정리.
- 검증 결과
- `pnpm -C app test -- src/lib/validations/post.test.ts src/server/services/post-create-policy.test.ts` 통과.
- 이슈/블로커
- 없음.

### 2026-03-03: 게시판 분류/스코프/태그 정책 재정렬
- 완료 내용
- `/posts/new`에서 `동네 산책코스` 분류를 제거하고 `반려자랑` 표기를 `반려동물 자랑`으로 변경.
- 병원후기는 온동네(`GLOBAL`) 고정, 동네모임은 동네(`LOCAL`) 고정으로 처리하고 글쓰기 폼에서 범위 선택 UI를 제거.
- 동네모임일 때만 동네 선택 입력을 노출하며, scope 고정 규칙은 서비스에서도 강제 적용.
- 실종/목격 제보(`LOST_FOUND`)는 동물 태그 없이도 작성 가능하도록 검증/서비스 정책을 완화.
- 상단 게시판 메뉴에 `반려동물 자랑` 항목을 추가.
- 검증 결과
- `pnpm -C app test -- src/lib/validations/post.test.ts src/server/services/post-create-policy.test.ts` 통과.
- `pnpm -C app typecheck` 통과.
- `pnpm -C app lint` 통과.
- 이슈/블로커
- 없음.

### 2026-03-03: 글쓰기 분류 목록/범위 노출 UX 조정
- 완료 내용
- `/posts/new` 분류 목록에서 `동네 산책코스` 항목을 제거해 상단 게시판 메뉴와 일치하도록 정리.
- 글쓰기 폼의 `범위`와 `동네` 입력은 `병원후기`, `동네모임`처럼 동네 선택이 필요한 게시판에서만 보이도록 조건부 노출로 변경.
- 범위 입력이 숨겨지는 게시판으로 타입을 바꾸면 scope를 자동으로 `GLOBAL`로 되돌리고 동네 선택값은 초기화해 잘못된 LOCAL 제출을 방지.
- 동네 선택 박스를 `tp-input-soft` 스타일로 통일해 다른 입력 박스와 모서리/톤을 맞춤.
- 검증 결과
- `pnpm -C app typecheck` 통과.
- `pnpm -C app lint` 통과.
- 이슈/블로커
- 없음.

### 2026-03-03: 글쓰기 관련 동물 라벨 변경 + 자유게시판 동물 선택 완화
- 완료 내용
- 글쓰기 폼의 `관심 동물` 라벨을 `관련 동물`로 변경하고, 자유게시판 계열(`FREE_BOARD/FREE_POST/DAILY_SHARE`)에서는 드롭다운 최상단에 `선택 안함` 옵션을 추가해 미선택 작성을 허용.
- 자유게시판 계열은 `petTypeId` 필수 검증에서 제외하고, 기존 커뮤니티형 글(예: 질문/답변)은 기존처럼 `petTypeId` 필수 정책을 유지.
- 피드 쿼리에서 자유게시판 계열은 `petType` 필터를 무시하도록 보정해 동물 조건과 무관하게 전체 글이 노출되도록 반영.
- 검증 결과
- `pnpm -C app test -- src/lib/validations/post.test.ts src/server/services/post-create-policy.test.ts src/server/queries/post.queries.test.ts` 통과.
- `pnpm -C app typecheck` 통과.
- 이슈/블로커
- 없음.

### 2026-03-02: 관심 동물 멀티선택 + 피드 지속 필터
- 완료 내용
- 상단 내비게이션 `관심 동물` 드롭다운을 단일 링크형에서 체크박스 멀티선택 UI로 전환하고, 로그인 사용자가 선택값을 저장할 수 있도록 서버 액션/서비스를 추가.
- `UserPetTypePreference` 스키마/마이그레이션을 추가해 관심 동물 선호를 사용자별로 영구 저장하고, 레이아웃에서 초기값을 주입하도록 연결.
- `/feed`와 `/api/posts`, 무한스크롤 쿼리를 다중 `petType` 파라미터(`petType=...` 반복)와 사용자 기본 선호 필터를 함께 처리하도록 확장.
- 게시판 이동/전체글/베스트글 전환 시에도 저장된 관심 동물 필터가 유지되도록 피드 링크 생성 로직을 보강.
- 검증 결과
- `pnpm -C app exec prisma migrate deploy` 적용 완료 (`20260303022000_add_user_pet_type_preferences`).
- `pnpm -C app exec prisma generate` 완료.
- `pnpm -C app lint` 통과.
- `pnpm -C app typecheck` 통과.
- `pnpm -C app test -- src/server/auth.test.ts src/server/queries/post.queries.test.ts` 통과.
- 이슈/블로커
- 없음.

### 2026-03-02: 닉네임 30일 변경 제한 + 프로필 계정정보 문구 정리
- 완료 내용
- `User.nicknameUpdatedAt` 필드와 마이그레이션을 추가해 닉네임 변경 시점을 저장.
- 프로필 수정 서비스에서 닉네임 변경 시 최근 변경일 기준 30일 쿨다운을 적용하고, 남은 일수 안내 메시지로 차단.
- 닉네임이 바뀌지 않은 경우(소개만 수정)는 제한 없이 저장되도록 예외 처리.
- `/profile` 계정정보의 `대표 동네 (나만 보기)` 라벨을 `대표 동네`로 정리.
- 변경 파일(핵심)
- `app/prisma/schema.prisma`
- `app/prisma/migrations/20260302160000_add_user_nickname_updated_at/migration.sql`
- `app/src/server/services/user.service.ts`
- `app/src/server/services/user.service.test.ts`
- `app/src/app/profile/page.tsx`
- 검증 결과
- `pnpm -C app exec prisma generate` 완료.
- `pnpm -C app typecheck` 통과.
- `pnpm -C app test -- src/server/services/user.service.test.ts src/server/actions/user.test.ts src/lib/validations/user.test.ts` 통과.
- 이슈/블로커
- 없음.

### 2026-03-02: petType 계약 단일화 + 레거시 feed URL 정규화
- 완료 내용
- `/feed`에서 레거시 `communityId` 쿼리 유입 시 `petType`으로 정규화 redirect(임시 302) 적용.
- 공개 계약을 `petType`/내부 입력을 `petTypeId` 중심으로 고정하고 문서 용어를 동기화.
- Prisma 컬럼 호환(`@map("communityId")`)이 남는 이유를 쿼리 fallback 코드 주석으로 명시.
- 변경 파일(핵심)
- `app/src/app/feed/page.tsx`
- `app/src/server/queries/post.queries.ts`
- `docs/api/posts-feed-query.md`
- `docs/product/커뮤니티_택소노미_v1.md`
- `docs/product/커뮤니티_보드_구현_v1.md`
- `PLAN.md`
- 검증 결과
- `pnpm -C app typecheck` 통과.
- `pnpm -C app test -- src/app/api/posts/route.test.ts src/lib/validations/post.test.ts src/server/queries/post.queries.test.ts` 통과.
- 이슈/블로커
- 없음.

### 2026-03-02: 알림 읽음/닫기 즉시 숨김 + 3일 보존/정리
- 완료 내용
- 알림 모델에 `archivedAt`을 추가하고, 목록/카운트 쿼리에서 `archivedAt = null`만 조회하도록 변경.
- `읽음 처리`는 `isRead/readAt` 저장과 동시에 `archivedAt`을 기록해 hover 알림창과 `/notifications` 목록에서 즉시 사라지게 반영.
- `/notifications`와 hover 알림창에 `X` 버튼을 추가하고, `archiveNotificationAction`으로 미읽음 상태에서도 즉시 숨김 처리.
- 3일 경과 영구삭제를 위한 `db:cleanup:notifications` 스크립트(`NOTIFICATION_RETENTION_DAYS`, 기본 3일) 추가.
- GitHub Actions 일간 스케줄(`notification-cleanup`)을 추가해 운영에서 자동 정리 가능하도록 구성.
- cleanup 워크플로우 파싱/Prisma client 누락 이슈를 수정하고, 실행 전 `prisma generate` 단계를 추가.
- 운영 DB가 아직 `archivedAt` 컬럼 미반영이어도 실패하지 않도록 cleanup 스크립트(`P2021/P2022`) 안전 skip + 워크플로우 사전 repair SQL 적용.
- Vercel build 경로에 notification archive repair SQL 실행을 추가해 `migrate deploy` baseline 환경에서도 `archivedAt` 컬럼/인덱스 정합을 보장.
- Prisma migration 파일(`20260302030000_add_notification_archived_at`)을 추가해 스키마 변경 이력을 명시.
- 변경 파일(핵심)
- `app/prisma/schema.prisma`
- `app/prisma/migrations/20260302030000_add_notification_archived_at/migration.sql`
- `app/src/server/queries/notification.queries.ts`
- `app/src/server/actions/notification.ts`
- `app/src/components/notifications/notification-bell.tsx`
- `app/src/components/notifications/notification-center.tsx`
- `app/scripts/cleanup-notifications.ts`
- `app/scripts/sql/notification-archive-repair.sql`
- `app/scripts/vercel-build.ts`
- `app/package.json`
- `.github/workflows/notification-cleanup.yml`
- `app/e2e/notification-comment-flow.spec.ts`
- `app/e2e/notification-filter-controls.spec.ts`
- 검증 결과
- `pnpm -C app prisma generate` 통과.
- `pnpm -C app typecheck` 통과.
- `pnpm -C app test:unit` 통과 (44 files, 194 tests).
- `pnpm -C app lint` 실행 (기존 미사용 변수 경고 10건, 이번 변경에서 신규 error 없음).
- `notification-cleanup` workflow 수동 실행 최종 성공 (`run_id=22559375828`).
- 이슈/블로커
- 워크플로우 실행 전 GitHub 저장소 `DATABASE_URL` 시크릿이 필요.

### 2026-02-27: 상세 content lazy 분리
- 완료 내용
- 상세 응답에서 rendered content를 제거하고 별도 content API로 로드.
- 변경 파일(핵심)
- `app/src/app/api/posts/[id]/detail/route.ts`
- `app/src/app/api/posts/[id]/content/route.ts`
- `app/src/components/posts/post-detail-client.tsx`
- `app/src/server/queries/post.queries.ts`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

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
- `docs/operations/캐시_성능_적용_기록.md`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-26: Playwright feed scroll 성능 체크
- 완료 내용
- `e2e/feed-scroll-performance.spec.ts` 실행, PASS.
- 보고서 생성: `docs/reports/피드_스크롤_성능_리포트.md`
- 변경 파일(핵심)
- `docs/reports/피드_스크롤_성능_리포트.md`
- `docs/operations/캐시_성능_적용_기록.md`
- 검증 결과
- Playwright 단일 테스트 PASS.
- 이슈/블로커
- 없음.

### 2026-02-26: 리전 정합/연결 경로 점검 체크리스트 작성
- 완료 내용
- Vercel/DB 리전 정합 및 DB 연결 경로 점검 체크리스트 문서화.
- 변경 파일(핵심)
- `docs/operations/리전_지연시간_체크리스트.md`
- 검증 결과
- 문서 작성만 수행.
- 이슈/블로커
- 없음.

### 2026-02-26: guest /feed CDN 캐시 배포 후 재측정
- 완료 내용
- `/feed`, `/api/posts`, `/search?q=산책코스` curl 30회 재측정.
- feed TTFB p50 472.1ms, p95 584.7ms.
- api_posts TTFB p50 238.6ms, p95 289.3ms.
- search TTFB p50 459.9ms, p95 594.0ms.
- 결과 상세는 `docs/operations/캐시_성능_적용_기록.md`에 업데이트.
- 변경 파일(핵심)
- `docs/operations/캐시_성능_적용_기록.md`
- 검증 결과
- 배포 측정만 수행 (테스트 미실행).
- 이슈/블로커
- 없음.

### 2026-02-26: 비로그인 피드 CDN 캐시 적용
- 완료 내용
- 미들웨어에서 비로그인 `/feed`에 CDN 캐시 헤더 추가(LOCAL/개인화 제외).
- 변경 파일(핵심)
- `app/middleware.ts`
- `docs/operations/캐시_성능_적용_기록.md`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-26: read rate-limit/guest SSR 캐시 배포 후 재측정
- 완료 내용
- `/feed`, `/api/posts`, `/search?q=산책코스` curl 30회 재측정.
- feed TTFB p50 451.1ms, p95 707.6ms.
- api_posts TTFB p50 237.9ms, p95 360.7ms.
- search TTFB p50 447.4ms, p95 581.6ms.
- 결과 상세는 `docs/operations/캐시_성능_적용_기록.md`에 업데이트.
- 변경 파일(핵심)
- `docs/operations/캐시_성능_적용_기록.md`
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
- `docs/operations/캐시_성능_적용_기록.md`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-26: 꼬리 지연 완화 배포 후 재측정
- 완료 내용
- `/feed`, `/api/posts`, `/search?q=산책코스` curl 30회 재측정.
- feed TTFB p50 525.5ms, p95 749.0ms.
- api_posts TTFB p50 284.8ms, p95 363.5ms.
- search TTFB p50 496.5ms, p95 619.2ms.
- 결과 상세는 `docs/operations/캐시_성능_적용_기록.md`에 업데이트.
- 변경 파일(핵심)
- `docs/operations/캐시_성능_적용_기록.md`
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
- `docs/operations/캐시_성능_적용_기록.md`
- 검증 결과
- 코드 변경으로 lint/test/typecheck 실행 없음.
- 이슈/블로커
- 없음.

### 2026-02-26: 배포 통과 후 성능 재측정
- 완료 내용
- GitHub Actions/Vercel 배포 통과 후 `/feed`, `/api/posts`, `/search?q=산책코스` curl 15회 재측정.
- feed TTFB p50 549.0ms, api_posts TTFB p50 284.6ms, search TTFB p50 511.4ms 기록.
- 결과 상세는 `docs/operations/캐시_성능_적용_기록.md`에 업데이트.
- 변경 파일(핵심)
- `docs/operations/캐시_성능_적용_기록.md`
- 검증 결과
- 배포 측정만 수행 (테스트 미실행).
- 이슈/블로커
- 없음.

### 2026-02-26: 캐시 배포 후 성능 재측정
- 완료 내용
- Vercel 배포 후 `/feed`, `/api/posts`, `/search?q=산책코스` curl 15회 재측정.
- feed TTFB p50 523.3ms, api_posts TTFB p50 535.4ms, search TTFB p50 484.3ms 기록.
- 결과 상세는 `docs/operations/캐시_성능_적용_기록.md`에 업데이트.
- 변경 파일(핵심)
- `docs/operations/캐시_성능_적용_기록.md`
- 검증 결과
- 배포 측정만 수행 (테스트 미실행).
- 이슈/블로커
- 없음.

### 2026-02-26: 캐시 범위 확장 + 무효화 이벤트 보강
- 완료 내용
- 로그인/LOCAL 경로도 캐시 키 분리로 안전하게 캐싱하도록 확장.
- 게시글 수정/삭제, 댓글 삭제, 신고 숨김/해제 시 캐시 버전 갱신 추가.
- 문서(`docs/operations/캐시_성능_적용_기록.md`)에 범위/무효화 업데이트 반영.
- 변경 파일(핵심)
- `app/src/server/queries/post.queries.ts`
- `app/src/server/services/post.service.ts`
- `app/src/server/services/comment.service.ts`
- `app/src/server/services/report.service.ts`
- `docs/operations/캐시_성능_적용_기록.md`
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
- `docs/제품_기술_개요.md`의 장문/구형 정보 의존을 줄이기 위해 일상 개발용 압축 문서 `docs/SPEC-Lite.md`를 신설.
- `AGENTS.md`의 우선 읽기 경로를 `docs/SPEC-Lite.md` 중심으로 갱신하고, `docs/제품_기술_개요.md`는 reference로 하향 조정.
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
- `docs/security/보안_계획.md`
- `docs/security/보안_진행상황.md`
- `docs/security/보안_위험_등록부.md`
- `docs/security/보안_결정기록.md`
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
- `docs/security/보안_계획.md`
- `docs/security/보안_진행상황.md`
- `docs/security/보안_위험_등록부.md`
- `docs/security/보안_결정기록.md`
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
- `docs/security/보안_계획.md`
- `docs/security/보안_진행상황.md`
- `docs/security/보안_위험_등록부.md`
- `docs/security/보안_결정기록.md`
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
- `docs/security/보안_계획.md`
- `docs/security/보안_진행상황.md`
- `docs/security/보안_위험_등록부.md`
- `docs/security/보안_결정기록.md`
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
- `docs/security/보안_계획.md`
- `docs/security/보안_진행상황.md`
- `docs/security/보안_결정기록.md`
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
- `docs/security/보안_계획.md`
- `docs/security/보안_진행상황.md`
- `docs/security/보안_위험_등록부.md`
- `docs/security/보안_결정기록.md`
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
- `docs/security/보안_계획.md`
- `docs/security/보안_진행상황.md`
- `docs/security/보안_결정기록.md`
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
  - `docs/security/보안_계획.md`
  - `docs/security/보안_진행상황.md`
  - `docs/security/보안_위험_등록부.md`
  - `docs/security/보안_결정기록.md`
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
- `docs/operations/Vercel_OAuth_초기설정_가이드.md`
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
- `docs/operations/Vercel_OAuth_초기설정_가이드.md`
- `docs/개발_운영_가이드.md`
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
- 검색 대표 케이스 실행 스크립트(`search:check:cases`) 추가 및 결과 리포트 자동 생성(`docs/reports/검색_수동점검_결과.md`).
- `pg_trgm` 미설치 환경 감지 로직을 검색 쿼리에 추가해, `similarity()` 호출 실패 없이 tsvector 기반으로 안전 동작하도록 보완.
- 변경 파일(핵심)
- `app/src/components/notifications/notification-center.tsx`
- `app/src/app/notifications/page.tsx`
- `app/src/server/actions/notification.ts`
- `app/scripts/check-search-cases.ts`
- `app/src/server/queries/post.queries.ts`
- `app/package.json`
- `docs/reports/검색_수동점검_결과.md`
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
- `docs/개발_운영_가이드.md`
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
- `docs/reports/검색_수동점검_결과.md`
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
- 성능 측정 시나리오에서 140개 샘플 게시글을 시드한 뒤 `/feed?mode=ALL&limit=20&sort=LATEST` 기준으로 연속 스크롤, 프레임 샘플, jank 비율, heap 사용량을 수집.
- 성능 리포트 생성: `docs/reports/피드_스크롤_성능_리포트.md`.
- 변경 파일(핵심)
- `app/src/components/posts/feed-infinite-list.tsx`
- `app/e2e/feed-scroll-performance.spec.ts`
- `app/package.json`
- `docs/개발_운영_가이드.md`
- `docs/reports/피드_스크롤_성능_리포트.md`
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
- `docs/개발_운영_가이드.md`
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
- `docs/개발_운영_가이드.md`
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
- 운영 목표 지표를 `docs/operations/SLO_알림_기준.md`로 신설:
  - SLI/SLO/에러버짓/알람 임계치/대시보드 최소 구성/운영 루프
- `docs/개발_운영_가이드.md`에 운영 문서 링크와 최소 점검 루프를 추가해 실행 경로를 연결.
- 변경 파일(핵심)
- `docs/ops/incident-runbook.md`
- `docs/operations/SLO_알림_기준.md`
- `docs/개발_운영_가이드.md`
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
- `docs/개발_운영_가이드.md`
- `PLAN.md`
- 검증 결과
- `cd app && ./node_modules/.bin/eslint e2e/social-real-oauth-redirect.spec.ts` 통과
- `cd app && ./node_modules/.bin/tsc --noEmit` 통과
- `cd app && E2E_REAL_SOCIAL_OAUTH=1 ./node_modules/.bin/playwright test e2e/social-real-oauth-redirect.spec.ts --project=chromium --list` 통과 (2 tests 목록 확인)
- `gh workflow run oauth-real-e2e.yml --repo answndud/townpet` 실행
- 실행 결과: `https://github.com/answndud/townpet/actions/runs/22211885335` 실패 (시크릿 미설정)
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
- `docs/operations/검색 통계 전환 가이드.md`
- `docs/개발_운영_가이드.md`
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
- `docs/개발_운영_가이드.md`
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
- 운영 전환/정리 절차 문서를 `docs/operations/검색 통계 전환 가이드.md`로 추가.
- `docs/개발_운영_가이드.md`에 SearchTermStat 단일 경로 전환 안내를 반영.
- 변경 파일(핵심)
- `app/src/server/queries/search.queries.ts`
- `app/src/server/queries/search.queries.test.ts`
- `docs/operations/검색 통계 전환 가이드.md`
- `docs/개발_운영_가이드.md`
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
- `docs/개발_운영_가이드.md`에 실행 가이드를 추가.
- 변경 파일(핵심)
- `app/scripts/e2e-new-user-safety-policy-flow.ts`
- `app/package.json`
- `docs/개발_운영_가이드.md`
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
- `docs/개발_운영_가이드.md`
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
- `docs/개발_운영_가이드.md`에 Vercel/Kakao/Naver/GitHub Secrets 설정 절차와 "데이터를 어디에서 보고 관리하는지" 운영 가이드를 통합 문서화.
- 실행 결과
- `oauth-real-e2e` 성공: `https://github.com/answndud/townpet/actions/runs/22251215409`
- `ops-smoke-checks` 성공(health): `https://github.com/answndud/townpet/actions/runs/22251318982`
- `ops-smoke-checks` Sentry 검증 시도 실패(시크릿 미설정): `https://github.com/answndud/townpet/actions/runs/22251292806`
- 현재 상태
- 배포 health/OAuth 리다이렉트 검증은 PASS.
- Sentry 실수신 검증은 운영 선택에 따라 보류(시크릿 미설정 상태).

### 2026-02-21: Vercel/OAuth 외부 연동 상세 가이드 문서화
- 완료 내용
- Vercel 계정 생성부터 배포 URL 확정, 카카오/네이버 OAuth 앱 생성/콜백 등록, GitHub Actions 시크릿 구성, 워크플로우 실행 순서를 한 문서로 통합.
- `oauth-real-e2e`, `ops-smoke-checks` 실패 패턴별 즉시 진단표와 최종 체크리스트를 추가.
- 변경 파일(핵심)
- `docs/operations/Vercel_OAuth_초기설정_가이드.md`
- `docs/개발_운영_가이드.md`
- 이슈/블로커
- 외부 콘솔 계정/권한 및 실제 운영 도메인 확정은 문서화 범위를 넘어 운영 입력값이 필요.

### 2026-02-21: 환경 의존 항목 실행 시도 (실패 원인 확정)
- 완료 내용
- `oauth-real-e2e` 워크플로우를 재실행해 현재 실패 원인을 재확인.
- `ops-smoke-checks` 워크플로우를 `target_base_url=https://townpet2.vercel.app`, `verify_sentry=false`로 실행해 배포 URL 유효성 점검.
- 실행 결과
- `oauth-real-e2e`: `https://github.com/answndud/townpet/actions/runs/22250009041` 실패
  - 누락 시크릿: `AUTH_SECRET or NEXTAUTH_SECRET`, `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`
- `ops-smoke-checks`: `https://github.com/answndud/townpet/actions/runs/22250010405` 실패
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
- 운영 가이드(`docs/개발_운영_가이드.md`)에 로컬 실행법/워크플로우 입력값/필요 시크릿을 문서화.
- 변경 파일(핵심)
- `app/scripts/check-health-endpoint.ts`
- `app/scripts/check-sentry-ingestion.ts`
- `app/package.json`
- `.github/workflows/ops-smoke-checks.yml`
- `docs/개발_운영_가이드.md`
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
- `docs/product/품종_개인화_기획서.md`
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
- 운영 가이드(`docs/개발_운영_가이드.md`)에 문서 동기화 커맨드 사용법과 출력 파일 위치를 기록.
- 변경 파일(핵심)
- `scripts/refresh-docs-index.mjs`
- `app/package.json`
- `docs/ops/docs-sync-report.md`
- `docs/개발_운영_가이드.md`
- `docs/policy_ops/*.md`, `docs/product/*.md`, `docs/security/보안_기본원칙.md`, `docs/ops/*.md`
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
- 운영 가이드(`docs/개발_운영_가이드.md`)의 Vercel `Build Command` 권장값을 `pnpm build:vercel`로 갱신하고, 운영에서 `db push`를 기본 경로로 쓰지 않도록 안내를 보강.
- 변경 파일(핵심)
- `app/package.json`
- `docs/개발_운영_가이드.md`
- 검증 결과
- 코드 변경 성격상 로컬 빌드/테스트는 미실행(스크립트/문서 갱신).

### 2026-02-24: 운영 배포 P3005 baseline 복구 절차 문서화
- 완료 내용
- 운영 배포에서 `prisma migrate deploy` 실행 시 `P3005 The database schema is not empty`가 재발할 수 있는 원인을 `_prisma_migrations` baseline 누락으로 확정.
- 운영 가이드에 임시 복구(`db push`) -> baseline(`migrate resolve --applied`) -> 정식 복귀(`migrate deploy`)의 3단계 절차를 추가.
- baseline 명령 템플릿과 검증 순서(`migrate status`, `migrate deploy`) 및 주의사항(운영 DB 백업, 1회 수행)을 함께 기록.
- 변경 파일(핵심)
- `docs/개발_운영_가이드.md`
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
- 측정 대상: `https://townpet2.vercel.app/feed`, `https://townpet2.vercel.app/posts/cmm06j9mb00029pejux1xguzj`, `GET /api/posts`
- 방법 1(curl): `time_starttransfer`(TTFB)/`time_total` 5회 반복 측정
- 방법 2(Playwright headless): feed -> post -> browser back 라운드트립 7회 반복
- 결과 요약
- feed 페이지 TTFB 약 `0.84~0.99s` (초회 포함), total 약 `0.88~1.08s`
- post 상세 TTFB 약 `0.57~0.89s`, total 약 `0.61~1.01s`
- `/api/posts` TTFB 약 `0.58~0.69s` (초회 cold-ish 1회 `2.13s`)
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
- 운영 가이드(`docs/개발_운영_가이드.md`)에 blocked 해소 섹션을 추가해 실행 진입점을 고정.
- AGENTS 문서의 레포 상태 설명을 현재 코드베이스 기준으로 정정.
- 정량 검증(코드 기반)
- blocked 해소 전용 문서: `0 -> 1`개(`docs/ops/blocked-unblock-checklist.md`).
- GUIDE blocked 해소 섹션: `0 -> 1`개.
- AGENTS 불일치 문구: `2`개 정정(문서-only/blueprint 제거).

### 2026-02-24: blocked 해소 워크플로우 실행 시작
- 실행 내용
- `oauth-real-e2e` 수동 실행 트리거 완료: `https://github.com/answndud/townpet/actions/runs/22340689788`
- `ops-smoke-checks`(target=`https://townpet2.vercel.app`, verify_sentry=`true`) 트리거 완료: `https://github.com/answndud/townpet/actions/runs/22340693180`
- 현재 상태
- 두 워크플로우 모두 `in_progress` 상태로 확인됨(실행 결과는 완료 후 별도 append 예정).

### 2026-02-24: blocked 워크플로우 1차 결과
- `ops-smoke-checks` 결과: `failure`
- 실패 원인: Sentry secrets 4종 누락
- 누락 키: `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG_SLUG`, `SENTRY_PROJECT_SLUG`
- 참고 런: `https://github.com/answndud/townpet/actions/runs/22340693180`
- `oauth-real-e2e` 결과: 실행 중(`in_progress`)
- 참고 런: `https://github.com/answndud/townpet/actions/runs/22340689788`

### 2026-02-24: blocked 워크플로우 재실행 결과
- `oauth-real-e2e`: `success`
- 런: `https://github.com/answndud/townpet/actions/runs/22340689788`
- `ops-smoke-checks`(verify_sentry=false): `success`
- 런: `https://github.com/answndud/townpet/actions/runs/22340745824`
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

### 2026-03-05: Cycle 72 피드/검색 API tail-latency 완화
- 완료 내용
- 게스트 조회(`viewerId` 없음)에서 `Post.reactions` relation 조회를 생략하도록 `listPosts/listBestPosts/listRankedSearchPosts`를 최적화하고, 응답 계약은 `reactions: []`로 유지.
- `GET /api/posts`, `GET /api/posts/suggestions`에서 게스트 정책 조회를 레이트리밋과 병렬 시작하도록 변경해 선행 대기 시간 축소.
- 피드/품종라운지 매핑부는 `reactions` 필드가 없는 응답 변형에도 안전하도록 방어 캐스팅을 추가.
- 검증 결과
- 정적 검증: `pnpm -C app lint ...changed files`, `pnpm -C app typecheck` 통과.
- 테스트: `pnpm -C app test -- app/src/server/queries/post.queries.test.ts app/src/app/api/posts/route.test.ts app/src/app/api/posts/suggestions/route.test.ts` 통과(관련 회귀 테스트 3건 추가 포함).
- 성능 측정 1차(2026-03-05 11:49Z): `/tmp/townpet_latency_snapshot_2026-03-05T11-49-19-588Z.tsv.summary.md`
- `api_posts_global` p50/p95 `164.2/2468.9ms`(FAIL), 나머지 엔드포인트 PASS.
- outlier 1건은 `x-vercel-cache=MISS` 단일 샘플(약 2.47s)로 확인.
- 성능 측정 2차(2026-03-05 11:51Z): `/tmp/townpet_latency_snapshot_2026-03-05T11-51-18-762Z.tsv.summary.md`
- `api_posts_global` p50/p95 `155.5/209.8ms` 포함 전 엔드포인트 PASS.
- 리스크 메모
- cold MISS 1건이 들어오면 p95가 크게 출렁일 수 있어, 운영상 tail-latency 모니터링은 계속 필요.

### 2026-03-05: Cycle 179 보안 패치 업그레이드 + 운영 시크릿 점검 자동화
- 완료 내용
- 보안 의존성 패치 업그레이드 적용:
  - `next` `16.1.4 -> 16.1.5`
  - `eslint-config-next` `16.1.4 -> 16.1.5`
  - `@vercel/blob` `1.1.1 -> 2.3.1`
- 운영 보안 preflight 스크립트 추가:
  - `pnpm -C app ops:check:security-env`
  - 점검 항목: `AUTH_SECRET/NEXTAUTH_SECRET`, `CSP_ENFORCE_STRICT`, `GUEST_HASH_PEPPER`, `HEALTH_INTERNAL_TOKEN`, `UPSTASH_REDIS_REST_URL/TOKEN`
  - 엄격 모드: `NODE_ENV=production SECURITY_ENV_STRICT=1`에서 운영 기준 FAIL 강제
- CI 게이트 연동:
  - `quality-gate` 워크플로우에 `Security env preflight` 단계를 추가해, DB sync/테스트 이전에 strict 보안 env 검증을 수행하도록 반영.
- 운영 가이드/보안 문서 동기화:
  - GUIDE에 보안 env 점검 명령(기본/엄격 모드) 추가
  - SECURITY_PLAN/PROGRESS/RISK_REGISTER에 SEC-008/009 및 잔여 리스크 반영
- 검증 결과
- `pnpm -C app audit --prod` -> `No known vulnerabilities found`
- `pnpm -C app lint scripts/check-security-env.ts src/lib/env.ts src/lib/auth.ts middleware.ts src/app/api/upload/client/route.ts` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/app/api/upload/client/route.test.ts src/middleware.test.ts src/app/api/health/route.test.ts` 통과
- `pnpm -C app ops:check:security-env` 실행(개발 환경 기준 WARN-only, FAIL 0)
- `NODE_ENV=production SECURITY_ENV_STRICT=1 ... pnpm -C app ops:check:security-env` 샘플 입력 기준 PASS(5/5)

### 2026-03-05: Cycle 180 피드 cold MISS DB 인덱스 보강
- 완료 내용
- 피드 최신 조회 경로의 cold MISS tail-latency 완화를 위해 `Post` 인덱스 2종을 추가:
  - `Post_scope_status_createdAt_idx` (`scope`, `status`, `createdAt DESC`)
  - `Post_type_scope_status_createdAt_idx` (`type`, `scope`, `status`, `createdAt DESC`)
- Prisma schema와 migration SQL을 함께 반영해 배포 시 인덱스가 생성되도록 구성.
- 검증 결과
- `pnpm -C app exec prisma validate` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/server/queries/post.queries.test.ts src/app/api/posts/route.test.ts` 통과
- 리스크/메모
- 인덱스 생성 효과는 migration이 실제 배포 DB에 적용된 뒤 측정 가능하므로, 배포 후 `ops:perf:snapshot` 재측정으로 확인 필요.

### 2026-03-05: Cycle 181 운영 성능 측정 안정화(cold/steady 분리)
- 완료 내용
- `ops:perf:snapshot` 스크립트에 warm-up 분리 집계를 추가해 threshold 평가를 steady-state 기준으로 고정.
- 신규 env: `OPS_PERF_WARMUP_SAMPLES_PER_ENDPOINT`(기본 `1`)를 도입하고, summary에 `Full Samples`, `Warm-up Samples`, `Steady-state Samples` 섹션을 분리 출력.
- threshold 평가 섹션에 기준(`steady-state`)을 명시해 cold MISS 단발치로 인한 false fail 해석 혼선을 줄임.
- 검증 결과
- 정적 검증: `pnpm -C app lint scripts/collect-latency-snapshot.ts`, `pnpm -C app typecheck` 통과.
- 스크립트 소량 검증: `OPS_BASE_URL=https://townpet2.vercel.app OPS_PERF_GET_SAMPLES=3 OPS_PERF_POST_SAMPLES=3 OPS_PERF_PAUSE_MS=50 pnpm -C app ops:perf:snapshot` 통과.
- 운영 재측정(110 samples): `/tmp/townpet_latency_snapshot_2026-03-05T14-30-57-594Z.tsv.summary.md`
- steady-state 기준 임계치 평가 결과: `api_posts_global`, `api_posts_suggestions`, `api_breed_posts`, `api_search_log` 전부 PASS.
- 참고 메모
- 같은 배포에서도 cold/warm-up 구간은 네트워크/edge cache 상태에 따라 변동성이 있으므로, 운영 기준은 steady-state PASS + warm-up 별도 관찰로 유지.

### 2026-03-05: Cycle 182 검색 확장(pg_trgm) 운영 점검 가시화
- 완료 내용
- `/api/health` 내부 상세 응답(내부 토큰 사용 시)에 `checks.search.pgTrgm` 상태를 추가:
  - `state`: `ok|warn`
  - `enabled`: `true|false`
  - `message`: 원인/설명
- `ops:check:health` 스크립트 확장:
  - `OPS_HEALTH_INTERNAL_TOKEN` 제공 시 `pg_trgm` 상세 상태를 로그로 출력
  - `OPS_HEALTH_REQUIRE_PG_TRGM=1` 설정 시 `pg_trgm` 미설치/미노출이면 즉시 FAIL
- 운영 가이드(`docs/개발_운영_가이드.md`)에 `pg_trgm` 필수 점검 복붙 명령을 추가.
- 검증 결과
- `pnpm -C app lint src/app/api/health/route.ts src/app/api/health/route.test.ts scripts/check-health-endpoint.ts` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/app/api/health/route.test.ts` 통과
- 기대 효과
- staging/prod DB에서 `pg_trgm` 누락이 있어도 검색 fallback으로 조용히 넘어가던 상태를 운영 체크 단계에서 조기 감지 가능.

### 2026-03-06: Cycle 183 배포 스모크 `pg_trgm` 강제 검증 옵션 추가
- 완료 내용
- `.github/workflows/ops-smoke-checks.yml`에 수동 입력 `verify_pg_trgm`(기본 `false`)을 추가.
- `verify_pg_trgm=true`일 때:
  - `HEALTH_INTERNAL_TOKEN` 시크릿 존재 여부를 먼저 검증
  - `OPS_HEALTH_INTERNAL_TOKEN` + `OPS_HEALTH_REQUIRE_PG_TRGM=1` 조합으로 `pnpm ops:check:health`를 실행해 `pg_trgm` 미설치/미노출 시 즉시 FAIL
- GUIDE에 신규 입력/시크릿/실행 기준을 반영해 운영자가 UI에서 체크박스만 켜서 동일 점검을 재현할 수 있도록 정리.
- 검증 결과
- `pnpm -C app lint scripts/check-health-endpoint.ts` 통과
- `pnpm -C app typecheck` 통과
- 메모
- 자동 스케줄 경로는 기존처럼 health-only(`verify_pg_trgm=false`)로 유지해 불필요한 실패/시크릿 의존을 피함.

### 2026-03-06: `verify_pg_trgm` 수동 실행 1차 결과 (blocked 확인)
- 실행 내용
- 워크플로우 실행: `https://github.com/answndud/townpet/actions/runs/22746431810`
- 입력값: `target_base_url=https://townpet2.vercel.app`, `verify_sentry=false`, `verify_pg_trgm=true`
- 결과
- `failure`
- 실패 단계: `Validate internal health token secret`
- 원인: GitHub Actions secret `HEALTH_INTERNAL_TOKEN` 미설정
- 후속 조치
- repository secret `HEALTH_INTERNAL_TOKEN` 추가 후 동일 입력으로 재실행 필요

### 2026-03-06: `verify_pg_trgm` 수동 실행 2차 결과 (원인 확정)
- 실행 내용
- 워크플로우 실행: `https://github.com/answndud/townpet/actions/runs/22747240206`
- 입력값: `target_base_url=https://townpet2.vercel.app`, `verify_sentry=false`, `verify_pg_trgm=true`
- 결과
- `failure`
- 실패 단계: `Check pg_trgm extension via internal health endpoint`
- 확인 사실
- `HEALTH_INTERNAL_TOKEN` 검증 단계는 통과(시크릿 설정 정상 반영)
- `/api/health` 상세 응답에서 `checks.search.pgTrgm.state=warn`, `enabled=false` 확인
- 실패 메시지: `pg_trgm extension missing: trigram similarity search is disabled (tsvector fallback only)`
- 결론
- 현재 잔여 블로커는 시크릿이 아니라 운영 DB `pg_trgm` 확장 미설치

### 2026-03-06: `verify_pg_trgm` 수동 실행 3차 결과 (해소)
- 실행 내용
- 워크플로우 실행: `https://github.com/answndud/townpet/actions/runs/22747534552`
- 입력값: `target_base_url=https://townpet2.vercel.app`, `verify_sentry=false`, `verify_pg_trgm=true`
- 결과
- `success`
- 확인 사실
- `Check pg_trgm extension via internal health endpoint` 단계 통과
- `OPS_HEALTH_REQUIRE_PG_TRGM=1` 기준에서 `/api/health` 상세 응답이 PASS로 판정
- 결론
- `ops-smoke-checks`의 `verify_pg_trgm` blocked 항목 해소 완료

## 이슈/블로커 통합
- 환경 의존 블로커
- 없음(`verify_pg_trgm` 강제 점검 경로 PASS 확인)
- 기능/기술 부채
- 없음(현재 추적 중인 `pg_trgm` 운영 블로커 해소)

## 다음 핸드오프
- `PLAN.md` 기준 즉시 착수 순서
1. `ops-smoke-checks` 주간 자동 실행 모니터링 유지(health-only)
2. 필요 시 수동으로 `verify_pg_trgm=true` 재실행해 드리프트 점검
3. 선택 과제: Sentry 실수신 점검 경로(`verify_sentry=true`) 정기 점검 여부 결정

### 2026-03-06: Cycle 186 guest 피드 무한스크롤 hot path 축소
- 완료 내용
- guest `/feed` 첫 페이지는 이미 `/api/feed/guest`를 쓰고 있었지만, 추가 페이지 로드는 기본 `/api/posts`를 타고 있던 경로를 정리했다.
- `app/src/components/posts/guest-feed-page-client.tsx`에서 `FeedInfiniteList`의 `apiPath`를 `/api/feed/guest`로 지정해 guest 무한스크롤이 전용 guest API를 사용하도록 일원화했다.
- `app/src/app/api/feed/guest/route.ts`에 `cursor` 전용 compact 응답 경로를 추가했다.
  - `cursor` 요청 시 `listCommunityNavItems`, 페이지 메타/베스트 집계 계산을 생략
  - 응답은 `items`, `nextCursor`만 반환해 무한스크롤 추가 로드 hot path를 가볍게 유지
- `app/src/app/api/feed/guest/route.test.ts`에 cursor payload 회귀 테스트를 추가해 compact 응답 계약과 `listCommunityNavItems` 생략을 고정했다.
- 검증 결과
- `pnpm -C app test -- src/app/api/feed/guest/route.test.ts` 통과
- `pnpm -C app lint src/app/api/feed/guest/route.ts src/app/api/feed/guest/route.test.ts src/components/posts/guest-feed-page-client.tsx` 통과
- `pnpm -C app typecheck` 통과
- 기대 효과
- guest `/feed` 사용자는 첫 페이지뿐 아니라 추가 로드도 캐시 가능한 guest API 경로를 사용하게 되어, 범용 `/api/posts` cold tail 영향을 덜 받는다.
- 남은 리스크
- `api_posts_global` 자체의 cold/warm-up 꼬리는 여전히 남아 있을 수 있다. 다만 이제 guest 주요 사용자 경로와 직접 연결된 비중은 더 줄었다.

## 참고 문서
- 운영/실행 가이드: `docs/개발_운영_가이드.md`
- 현재 계획: `PLAN.md`

### 2026-03-07: Cycle 205 비회원 abuse defense 현실화
- 완료 내용
- 비회원 글/댓글/업로드 경로에 공용 step-up 검증을 도입했다.
  - `app/src/server/guest-step-up.ts`
  - `app/src/app/api/guest/step-up/route.ts`
  - `app/src/lib/guest-step-up.client.ts`
  - `app/src/lib/guest-client.ts`
- step-up은 3분 TTL의 서명된 challenge + SHA-256 proof-of-work로 동작하고, `IP + fingerprint`에 바인딩된다.
- 위험 신호(자동화 UA, fingerprint 없음, 과도한 프록시 체인, locale 헤더 없음)에 따라 난이도를 `NORMAL/ELEVATED/HIGH`로 높인다.
- guest 글/댓글/이미지 업로드 API가 step-up proof 없이는 `428 GUEST_STEP_UP_REQUIRED`를 반환하도록 바꿨다.
  - `app/src/app/api/posts/route.ts`
  - `app/src/app/api/posts/[id]/comments/route.ts`
  - `app/src/app/api/upload/route.ts`
  - `app/src/app/api/upload/client/route.ts`
- guest 작성/업로드 클라이언트도 새 step-up 헤더를 붙이도록 연동했다.
  - `app/src/components/posts/post-create-form.tsx`
  - `app/src/components/posts/post-comment-thread.tsx`
  - `app/src/components/posts/post-detail-edit-form.tsx`
  - `app/src/components/ui/image-upload-field.tsx`
- 신고 triage를 운영 현실에 맞춰 확장했다.
  - `ReportReason`에 `FRAUD`, `PRIVACY`, `EMERGENCY`를 추가하고 마이그레이션을 생성
  - `app/src/lib/report-reason.ts`로 레이블/표시 순서를 공용화
  - `EMERGENCY`는 단건이어도 `CRITICAL`, `PRIVACY/FRAUD`는 최소 `HIGH` 우선순위로 승격
  - 관리자 큐/상세/신고 폼이 새 사유와 레이블을 반영
- 정책 문서를 실제 운영 로직 기준으로 동기화했다.
  - `docs/policies/모더레이션_운영규칙.md`
  - `docs/policies/신고_운영정책.md`
- 검증 결과
- `pnpm -C app exec prisma format` 통과
- `pnpm -C app exec prisma generate` 통과
- `pnpm -C app lint` 통과
- `pnpm -C app typecheck` 통과
- `pnpm -C app test -- src/server/guest-step-up.test.ts src/app/api/guest/step-up/route.test.ts src/app/api/posts/route.test.ts 'src/app/api/posts/[id]/comments/route.test.ts' src/app/api/upload/route.test.ts src/app/api/upload/client/route.test.ts src/lib/report-moderation.test.ts src/lib/validations/report.test.ts src/server/queries/report.queries.test.ts` 통과
- `pnpm -C app test` 통과 (`87 files`, `429 tests`)
- 메모
- 운영 DB에는 새 신고 사유 enum 반영을 위해 `20260307030000_expand_report_reason_triage` 마이그레이션 적용이 필요하다.
- guest step-up은 외부 CAPTCHA 서비스 대신 자체 proof-of-work 방식이므로, 실제 운영 트래픽을 보며 난이도/레이트리밋 값은 후속 조정 가능하다.
- 다음 핸드오프
1. `pnpm -C app exec prisma migrate deploy`로 운영 DB에 `20260307030000_expand_report_reason_triage` 적용
2. Vercel 재배포 후 guest 글/댓글/이미지 업로드 smoke 확인
3. 새 오픈 사이클이 없으므로 이후 백로그는 blocked 상태의 Cycle 188 재개 또는 신규 운영 과제 등록 기준으로 판단
