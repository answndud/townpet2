# TownPet GUIDE (다른 터미널 복붙 즉시 실행)

이 문서는 Codex 터미널이 아니라 본인 터미널(iTerm/Terminal)에서 바로 실행되게 작성했습니다.
명령어는 모두 절대경로 기준이라, 현재 위치와 무관하게 복붙 가능합니다.

## 1. 한 번에 준비하기 (DB + 스키마 + 더미데이터)

아래 블록을 터미널에 그대로 붙여넣으세요.

```bash
export TOWNPET_HOME="/Users/alex/project/townpet2"

open -a Docker
cd "$TOWNPET_HOME" && docker compose up -d

cd "$TOWNPET_HOME/app" && ./node_modules/.bin/prisma db push --accept-data-loss

cd "$TOWNPET_HOME/app" && SEED_DEFAULT_PASSWORD=dev-password-1234 ./node_modules/.bin/tsx prisma/seed.ts
cd "$TOWNPET_HOME/app" && SEED_DEFAULT_PASSWORD=dev-password-1234 ./node_modules/.bin/tsx scripts/seed-users.ts
cd "$TOWNPET_HOME/app" && ./node_modules/.bin/tsx scripts/seed-reports.ts
```

정상 기준:
- `docker compose ps`에서 `postgres`가 `Up`
- `seed-users.ts` 실행 후 `Seed users ready.` 출력

## 2. 개발 서버 실행 (본인 새 터미널)

권장 실행 방법은 `pnpm dev` 입니다.  
이 프로젝트는 `dev` 스크립트에 `prisma generate`가 포함되어 있어 Prisma Client 누락 오류를 예방합니다.

```bash
cd /Users/alex/project/townpet2/app && pnpm dev
```

포트를 고정해서 실행해야 할 때만 아래 대안을 사용하세요.

```bash
cd /Users/alex/project/townpet2/app && ./node_modules/.bin/prisma generate && ./node_modules/.bin/next dev -p 3000
```

접속 주소:
- `http://localhost:3000`

## 3. 안 켜질 때 즉시 확인 (복붙)

### 3-1) `next dev` 명령이 안 될 때

```bash
cd /Users/alex/project/townpet2/app
pwd
ls -la ./node_modules/.bin/next
./node_modules/.bin/next --version
```

### 3-1-1) `Unknown field reactions for include statement` 에러가 날 때

```bash
cd /Users/alex/project/townpet2/app && ./node_modules/.bin/prisma generate && ./node_modules/.bin/prisma db push
```

그 다음 개발 서버를 완전히 재시작하세요.
- 기존 서버 종료: `Ctrl + C`
- 재실행(권장): `cd /Users/alex/project/townpet2/app && pnpm dev`
- 포트 고정 필요 시: `cd /Users/alex/project/townpet2/app && ./node_modules/.bin/prisma generate && ./node_modules/.bin/next dev -p 3000`

### 3-1-2) `Cannot read properties of undefined (reading 'findUnique')` 에러가 날 때

`SiteSetting`, `UserSanction` 같은 신규 Prisma 모델이 클라이언트에 반영되지 않은 상태입니다.

```bash
cd /Users/alex/project/townpet2/app && ./node_modules/.bin/prisma generate && ./node_modules/.bin/prisma db push
```

그 다음 개발 서버를 재시작하세요.

- `ls`에서 `No such file`이면 의존성이 없는 상태입니다.
- 설치:

```bash
cd /Users/alex/project/townpet2/app && pnpm install
```

### 3-2) 이미 다른 터미널에서 서버가 떠 있을 때

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

- 결과가 나오면 이미 실행 중입니다. 새로 실행하지 말고 브라우저에서 `http://localhost:3000`으로 바로 접속하세요.
- 새로 띄우려면 기존 프로세스를 종료(`Ctrl + C` 또는 `kill <PID>`) 후 다시 실행하세요.

### 3-3) 도커 데몬 연결 실패

```bash
open -a Docker
cd /Users/alex/project/townpet2 && docker compose up -d
```

### 3-4) DB 연결 실패 (`localhost:5432`)

```bash
cd /Users/alex/project/townpet2 && docker compose ps
cd /Users/alex/project/townpet2 && docker compose logs --no-color postgres | tail -n 80
```

## 4. 더미데이터 확인 (복붙)

```bash
cd /Users/alex/project/townpet2 && docker compose exec -T postgres psql -U townpet -d townpet -c "SELECT COUNT(*) AS users FROM \"User\"; SELECT COUNT(*) AS posts FROM \"Post\";"
```

```bash
cd /Users/alex/project/townpet2 && docker compose exec -T postgres psql -U townpet -d townpet -c "SELECT role, COUNT(*) FROM \"User\" GROUP BY role ORDER BY role;"
```

## 4-1. 운영 헬스체크 확인 (복붙)

```bash
curl -sS -i http://localhost:3000/api/health
```

정상 기준:
- HTTP `200`
- JSON `status: "ok"`

참고:
- 응답 헤더 `x-request-id`로 요청 추적 가능
- Redis(Upstash) 미설정 시 rate limit 백엔드는 memory fallback으로 표시됨

## 4-2. 이미지 업로드 확인 (복붙)

개발 서버에서 게시글 작성/수정 화면의 이미지 첨부를 사용하면 파일이 아래 경로에 저장됩니다.

```bash
cd /Users/alex/project/townpet2/app && ls -la public/uploads | tail -n 20
```

참고:
- 현재는 로컬 저장소(`public/uploads`) 기반입니다.
- 프로덕션 배포 전에는 R2/S3 같은 외부 스토리지로 전환해야 합니다.

## 4-3. 비회원 열람 정책 확인 (복붙)

관리자 계정으로 로그인 후 아래 페이지에서 비회원 로그인 필수 카테고리를 조정할 수 있습니다.

- `http://localhost:3000/admin/policies`

정책 반영 기준:
- 체크된 카테고리: 비회원 열람 불가(로그인 유도)
- 체크 해제된 카테고리: 비회원 열람 가능(단, `LOCAL` 범위 글은 로그인 필요)

같은 화면에서 아래 정책도 조정할 수 있습니다:
- 신규 계정 고위험 카테고리 작성 제한 시간
- 신규 계정 연락처/외부 연락 링크 포함 글·댓글 차단 시간
- 신규 계정 작성 제한 대상 카테고리 목록

## 4-4. 검색 품질 점검 리포트 생성 (복붙)

Cycle 25 검색 대표 케이스를 자동 실행해 수동 판정용 리포트를 생성합니다.

먼저 검색 케이스용 데이터가 없는 환경이면 시드를 1회 실행하세요.

```bash
cd /Users/alex/project/townpet2/app && pnpm db:seed:search-cases
```

그 다음 리포트를 생성합니다.

```bash
cd /Users/alex/project/townpet2/app && ./node_modules/.bin/tsx scripts/check-search-cases.ts
```

생성 파일:
- `docs/plan/search-manual-check-results.md`

참고:
- 리포트의 `상태` 컬럼은 수동으로 `PASS/WARN/FAIL`을 채워야 합니다.
- `similarity()` 관련 경고가 나오면 DB에 `pg_trgm` 확장이 없는 상태입니다.
- 확장 적용은 `db push`가 아니라 migration SQL 실행이 필요하므로 아래를 사용하세요.

```bash
cd /Users/alex/project/townpet2/app && pnpm db:migrate
```

### 4-4-1. 검색 통계 저장소 전환 점검 (SearchTermStat 단일 경로)

검색어 집계는 이제 `SearchTermStat`만 사용합니다.  
구형 `SiteSetting(popular_search_terms_v1)` fallback은 제거되었습니다.

운영 전환/정리 절차:
- `docs/ops/search-termstat-migration.md`

구형 키 정리(드라이런):

```bash
cd /Users/alex/project/townpet2/app && pnpm db:cleanup:legacy-search-setting
```

구형 키 정리(실행):

```bash
cd /Users/alex/project/townpet2/app && pnpm db:cleanup:legacy-search-setting -- --apply
```

## 4-5. 알림/댓글 DB 플로우 E2E 점검 (복붙)

실DB에서 아래 플로우를 자동 검증합니다.
- 글 생성
- 다른 사용자 댓글 생성
- 알림 생성 확인
- 읽음 처리 확인
- 생성 데이터 정리

```bash
cd /Users/alex/project/townpet2/app && ./node_modules/.bin/tsx scripts/e2e-notification-comment-flow.ts
```

또는 npm script:

```bash
cd /Users/alex/project/townpet2/app && pnpm test:flow:notification-comment
```

기본 사용자:
- recipient: `power.reviewer@townpet.dev`
- actor: `mod.trust@townpet.dev`

환경변수로 변경 가능:
- `E2E_RECIPIENT_EMAIL`
- `E2E_ACTOR_EMAIL`

## 4-6. 브라우저 E2E (Playwright) 실행 (복붙)

알림 `이동` 클릭 시 자동 읽음 처리되는 흐름을 브라우저에서 검증합니다.

사전 준비:
- Docker/Postgres 실행
- `pnpm db:push`
- 시드 유저 존재(`power.reviewer@townpet.dev`, `mod.trust@townpet.dev`)

실행:

```bash
cd /Users/alex/project/townpet2/app && pnpm test:e2e -- e2e/notification-comment-flow.spec.ts
```

참고:
- 최초 1회는 브라우저 설치가 필요할 수 있습니다.
- 브라우저 미설치 시:

```bash
cd /Users/alex/project/townpet2/app && npx playwright install chromium
```

## 4-7. 피드 100+ 스크롤 성능 점검 (복붙)

Cycle 24 잔여 항목(무한 스크롤 프레임/메모리 점검) 자동 실행입니다.

```bash
cd /Users/alex/project/townpet2/app && pnpm perf:feed:scroll
```

생성 파일:
- `docs/plan/feed-scroll-performance-report.md`

검증 기준:
- 로드 게시글 수 `>= 100`
- `p95 frame <= 42ms`
- `jank(>50ms) <= 8%`

참고:
- 테스트가 실행되면서 성능 샘플 게시글 140개를 생성 후 정리합니다.
- 로컬 환경 부하(브라우저/백그라운드 앱)에 따라 `PASS/WARN`은 달라질 수 있습니다.

## 4-8. 이미지 업로드 E2E 점검 (복붙)

Cycle 22 잔여 항목(업로드/조회/삭제 검증) 자동 실행입니다.

```bash
cd /Users/alex/project/townpet2/app && pnpm test:e2e:upload
```

검증 내용:
- 로그인 후 게시글 작성에서 이미지 업로드
- 게시글 상세에서 첨부 이미지 확인
- 생성 게시글 삭제까지 완료

참고:
- 스크립트는 세션 쿠키 호스트 일관성을 위해 `PLAYWRIGHT_BASE_URL=http://localhost:3000`으로 실행됩니다.
- 테스트 계정이 없으면 시나리오 시작 시 `e2e.upload@townpet.dev` 계정을 자동 준비합니다.

## 4-9. 신규 계정 안전 정책 DB 플로우 점검 (복붙)

운영 정책(신규 계정 제한 시간/카테고리)이 서비스 로직에 반영되는지 DB 플로우로 검증합니다.

```bash
cd /Users/alex/project/townpet2/app && pnpm test:flow:new-user-policy
```

검증 내용:
- 신규 유저: 제한 카테고리 작성 차단
- 신규 유저: 연락처 포함 댓글 차단
- 기존 유저: 연락처 포함 댓글은 마스킹 후 저장
- 테스트 종료 시 정책/데이터 자동 복구

## 4-10. 관리자 정책 변경 UI E2E 점검 (복붙)

관리자 정책 화면에서 신규 계정 안전 정책 입력값 변경/저장/새로고침 유지 흐름을 검증합니다.

```bash
cd /Users/alex/project/townpet2/app && pnpm test:e2e:admin-policies
```

검증 내용:
- `/admin/policies` 접근
- 신규 계정 안전 정책 입력값(시간/카테고리) 변경 후 저장
- 성공 메시지 확인
- 새로고침 후 값 유지 확인

## 4-9. 느린 로딩 skeleton 점검 (복붙)

Cycle 22 잔여 항목(지연 응답 시 feed skeleton 표시) 자동 실행입니다.

```bash
cd /Users/alex/project/townpet2/app && pnpm test:e2e:feed-loading
```

검증 내용:
- 느린 응답 상황에서 `/feed` 로딩 스켈레톤 표시 확인
- 로딩 후 피드 본문(`feed-post-list`) 정상 렌더링 확인

참고:
- 테스트는 `debugDelayMs` 파라미터를 사용해 지연 상황을 재현합니다.
- `debugDelayMs`는 프로덕션(`NODE_ENV=production`)에서는 무시됩니다.

## 4-10. 카카오 OAuth 운영 절차 (키 갱신/점검)

### 필수 환경변수

- `KAKAO_CLIENT_ID`
- `KAKAO_CLIENT_SECRET`
- `AUTH_SECRET` (또는 `NEXTAUTH_SECRET`)
- `APP_BASE_URL` (운영 도메인)

### 카카오 콘솔 설정 체크리스트

1. 카카오 디벨로퍼스 -> 내 애플리케이션 -> 제품 설정 -> 카카오 로그인 활성화
2. Redirect URI 등록:
- `https://<운영도메인>/api/auth/callback/kakao`
- (스테이징 사용 시) `https://<스테이징도메인>/api/auth/callback/kakao`
3. 동의 항목에서 `이메일` 활성화(필수)  
4. 보안 -> Client Secret 사용 설정 및 비밀키 확인

### 키 로테이션 순서

1. 카카오 콘솔에서 새 Client Secret 발급
2. 배포 환경 시크릿 업데이트 (`KAKAO_CLIENT_SECRET`)
3. 필요 시 `KAKAO_CLIENT_ID`도 함께 교체
4. 애플리케이션 재배포
5. 로그인 페이지에서 카카오 버튼 노출 및 리다이렉트 확인

### 로컬 스모크 테스트 (복붙)

```bash
cd /Users/alex/project/townpet2/app && pnpm test:e2e:kakao-entry
```

검증 내용:
- 로그인 페이지 카카오 버튼 노출
- 카카오 로그인 진입 요청(`/api/auth/signin/kakao`) 시작 확인
- 회원가입 페이지 카카오 가입 버튼 노출 확인

참고:
- 이 스모크는 `진입 검증`만 수행합니다(`devShowKakao=1` 개발 플래그 사용).  
- 실제 `카카오 계정 로그인 -> 온보딩 완료` 전체 E2E는 카카오 테스트 앱 계정/권한이 있는 환경에서 별도 실행해야 합니다.

## 4-11. 네이버 OAuth 운영 절차 (키 갱신/점검)

### 필수 환경변수

- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`
- `AUTH_SECRET` (또는 `NEXTAUTH_SECRET`)
- `APP_BASE_URL` (운영 도메인)

### 네이버 개발자센터 설정 체크리스트

1. 네이버 개발자센터 -> 애플리케이션 등록/선택
2. 로그인 오픈 API 사용 설정
3. 서비스 URL 등록
4. Callback URL 등록:
- `https://<운영도메인>/api/auth/callback/naver`
- (스테이징 사용 시) `https://<스테이징도메인>/api/auth/callback/naver`
5. 이메일 제공 동의 항목 활성화

### 키 로테이션 순서

1. 네이버 개발자센터에서 Client Secret 재발급
2. 배포 환경 시크릿 업데이트 (`NAVER_CLIENT_SECRET`)
3. 필요 시 `NAVER_CLIENT_ID` 교체
4. 애플리케이션 재배포
5. 로그인 페이지에서 네이버 버튼 노출/진입 확인

### 로컬 스모크 테스트 (복붙)

```bash
cd /Users/alex/project/townpet2/app && pnpm test:e2e:naver-entry
```

검증 내용:
- 로그인 페이지 네이버 버튼 노출
- 네이버 로그인 진입 요청(`/api/auth/signin/naver`) 시작 확인
- 회원가입 페이지 네이버 가입 버튼 노출 확인

참고:
- 이 스모크는 `진입 검증`만 수행합니다(`devShowNaver=1` 개발 플래그 사용).
- 실제 `네이버 계정 로그인 -> 온보딩 완료` 전체 E2E는 네이버 테스트 앱 계정/권한이 있는 환경에서 별도 실행해야 합니다.

## 4-11A. 소셜 로그인 온보딩 전체 E2E (개발용 경로)

목적:
- 외부 OAuth 콘솔/계정 상태와 무관하게 `소셜 로그인 버튼 -> 온보딩 -> 피드 진입` 전체 플로우를 자동 검증

사용 환경변수:
- `ENABLE_SOCIAL_DEV_LOGIN=1` (비프로덕션에서만 동작)
- 선택:
  - `E2E_SOCIAL_KAKAO_EMAIL`
  - `E2E_SOCIAL_NAVER_EMAIL`

실행 (복붙):

```bash
cd /Users/alex/project/townpet2/app && pnpm test:e2e:social-onboarding
```

검증 내용:
- 카카오/네이버 버튼 클릭 후 온보딩 진입
- 닉네임 저장 + 대표 동네 저장
- 최종 `/feed` 진입 확인

주의:
- 이 시나리오는 테스트 전용 provider(`social-dev`)를 사용하며, 실제 카카오/네이버 계정 인증 자체를 대체하지는 않습니다.

## 4-11B. 실OAuth 리다이렉트 스모크 (카카오/네이버)

목적:
- 실환경 OAuth 시크릿이 정상 연결되어 로그인 버튼 클릭 시 각 공급자 호스트로 리다이렉트되는지 확인

로컬 실행 (복붙):

```bash
cd /Users/alex/project/townpet2/app && pnpm test:e2e:social-real-oauth
```

필수 환경변수:
- `AUTH_SECRET` 또는 `NEXTAUTH_SECRET` (둘 중 하나 이상)
- `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`
- `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`

GitHub Actions 수동 실행:
- 워크플로우: `.github/workflows/oauth-real-e2e.yml`
- 트리거: `workflow_dispatch`
- 필요 repository secrets:
  - `AUTH_SECRET` 또는 `NEXTAUTH_SECRET` (둘 중 하나 이상)
  - `KAKAO_CLIENT_ID`
  - `KAKAO_CLIENT_SECRET`
  - `NAVER_CLIENT_ID`
  - `NAVER_CLIENT_SECRET`

## 4-11C. 배포 Health + Sentry 실수신 스모크

목적:
- 배포 환경에서 `/api/health` 200 + `status: "ok"`를 자동 점검
- Sentry 이벤트가 실제 프로젝트에 수신되는지 자동 확인

로컬 실행 (복붙):

```bash
cd /Users/alex/project/townpet2/app && OPS_BASE_URL="https://<배포도메인>" pnpm ops:check:health
```

Sentry 실수신까지 포함한 로컬 실행 (복붙):

```bash
cd /Users/alex/project/townpet2/app && SENTRY_DSN="https://<publicKey>@o0.ingest.sentry.io/<projectId>" SENTRY_AUTH_TOKEN="<token>" SENTRY_ORG_SLUG="<org>" SENTRY_PROJECT_SLUG="<project>" pnpm ops:check:sentry
```

GitHub Actions 수동 실행:
- 워크플로우: `.github/workflows/ops-smoke-checks.yml`
- 트리거: `workflow_dispatch`
- 입력값:
  - `target_base_url`: 점검할 배포 URL
  - `verify_sentry`: `true`면 Sentry 실수신까지 점검
- 필요 repository secrets(`verify_sentry=true`일 때):
  - `SENTRY_DSN`
  - `SENTRY_AUTH_TOKEN`
  - `SENTRY_ORG_SLUG`
  - `SENTRY_PROJECT_SLUG`

## 4-12. 신규 계정 고위험 카테고리 작성 제한

현재 정책:
- 가입 후 `24시간` 이내 일반 사용자(`USER`)는 아래 카테고리 작성이 제한됩니다.
- 제한 카테고리: `마켓(MARKET_LISTING)`, `실종/발견(LOST_FOUND)`, `번개(MEETUP)`
- 관리자/모더레이터는 제한 대상이 아닙니다.
- 연락처/외부 연락 링크 탐지 정책:
  - 신규 계정(`24시간 이내`)은 연락처 포함 콘텐츠 작성/수정 차단
  - 그 외 사용자는 저장 시 연락처 자동 마스킹
  - 탐지 대상: 전화번호, 이메일, 카카오 오픈채팅 링크, 메신저 링크(`t.me`, `wa.me`, `line.me`), 카카오톡 ID 문구

오류 응답:
- 코드: `NEW_USER_RESTRICTED_TYPE`
- 상태: HTTP `403`
- 메시지에 남은 대기 시간(시간 단위)이 포함됩니다.
- 코드: `CONTACT_RESTRICTED_FOR_NEW_USER`
- 상태: HTTP `403`

## 4-13. 금칙어/단계적 제재 정책

관리자 정책 화면:
- `http://localhost:3000/admin/policies`

신고 큐(제재 적용/이력 확인):
- `http://localhost:3000/admin/reports`

동작 요약:
- 금칙어: 게시글(제목/본문), 댓글(본문) 저장 시 매칭되면 차단
- 오류 코드: `FORBIDDEN_KEYWORD_DETECTED` (HTTP `400`)
- 신고 승인 시 `단계적 제재 적용` 체크가 켜져 있으면 자동 상승:
  - 1회: 경고
  - 2회: 7일 정지
  - 3회: 30일 정지
  - 4회+: 영구 정지
- 정지/영구 정지 계정은 로그인 상태여도 상호작용 API에서 차단
  - 오류 코드: `ACCOUNT_SUSPENDED`, `ACCOUNT_PERMANENTLY_BANNED` (HTTP `403`)

DB 확인 (복붙):

```bash
cd /Users/alex/project/townpet2 && docker compose exec -T postgres psql -U townpet -d townpet -c "SELECT \"level\", COUNT(*) FROM \"UserSanction\" GROUP BY \"level\" ORDER BY \"level\";"
```

## 4-14. 유저 차단/뮤트 정책

사용 위치:
- 게시글 상세: 작성자 영역의 `차단` / `뮤트` 버튼
- 댓글 목록: 각 댓글 작성자 행의 `차단` / `뮤트` 버튼
- 관계 관리: `http://localhost:3000/profile` (차단/뮤트 목록 해제)

동작 기준:
- 차단(`UserBlock`)
  - 피드/검색/게시글/댓글에서 대상 사용자 콘텐츠 숨김
  - 댓글 작성/반응/신고 등 상호작용 차단
- 뮤트(`UserMute`)
  - 내 화면에서 대상 사용자 콘텐츠 숨김(상호작용 강제 차단은 아님)

DB 확인 (복붙):

```bash
cd /Users/alex/project/townpet2 && docker compose exec -T postgres psql -U townpet -d townpet -c "SELECT COUNT(*) AS blocks FROM \"UserBlock\"; SELECT COUNT(*) AS mutes FROM \"UserMute\";"
```

## 4-15. SEO/공유 점검

### sitemap / robots 확인 (복붙)

```bash
curl -sS http://localhost:3000/sitemap.xml | head -n 40
curl -sS http://localhost:3000/robots.txt
```

기준:
- `sitemap.xml`에 `/feed`, `/search`, 공개 가능한 `/posts/{id}` URL 포함
- `robots.txt`에 sitemap 경로 노출

### 게시글 메타/JSON-LD 확인

게시글 페이지 소스에서 아래 항목을 확인하세요.
- Open Graph meta (`og:title`, `og:description`)
- Twitter meta (`twitter:card`, `twitter:title`)
- JSON-LD `<script type="application/ld+json">`

### 게시글 공유 버튼 확인

게시글 상세 페이지에서 아래 버튼 동작을 확인하세요.
- `링크 복사`: 클립보드 복사 성공 메시지
- `X 공유`: 새 창에서 X intent 페이지 열림
- `카카오 공유`: sharer 페이지 열림

## 4-16. 공개 프로필/활동 탭 점검

공개 프로필 URL:
- `http://localhost:3000/users/{userId}`

탭:
- `?tab=posts`
- `?tab=comments`
- `?tab=reactions`

체크 항목:
- 피드/검색/게시글/댓글의 작성자 이름 클릭 시 공개 프로필로 이동
- 프로필 상단에 닉네임/소개/가입일/활동 카운트 노출
- 내 프로필(`/profile`)에서 `공개 프로필 보기` 버튼 동작

## 4-17. 소개(bio) 저장 점검

입력 위치:
- 온보딩: 닉네임 설정 섹션의 `소개(선택)`
- 내 프로필: `프로필 정보 수정`

제약:
- 최대 240자

DB 확인 (복붙):

```bash
cd /Users/alex/project/townpet2 && docker compose exec -T postgres psql -U townpet -d townpet -c "SELECT id, nickname, LENGTH(COALESCE(bio,'')) AS bio_len FROM \"User\" ORDER BY \"createdAt\" DESC LIMIT 10;"
```

## 4-18. 반려동물 프로필 CRUD 점검

입력 위치:
- 내 프로필: `http://localhost:3000/profile` -> `반려동물 프로필`

체크 항목:
- 등록: 이름/종 필수, 나이/이미지URL/소개 선택값 저장
- 수정: 기존 항목 편집 후 즉시 반영
- 삭제: 삭제 확인 후 목록에서 제거
- 공개 노출: `http://localhost:3000/users/{userId}`의 `반려동물 프로필` 섹션에 표시

DB 확인 (복붙):

```bash
cd /Users/alex/project/townpet2 && docker compose exec -T postgres psql -U townpet -d townpet -c "SELECT \"userId\", name, species, age, LEFT(COALESCE(bio,''), 20) AS bio_preview FROM \"Pet\" ORDER BY \"createdAt\" DESC LIMIT 20;"
```

## 4-19. 글쓰기 미리보기/임시저장 점검

입력 위치:
- 글쓰기 페이지(게시글 작성 폼) `내용` 영역

체크 항목:
- 탭 전환: `작성`/`미리보기` 토글 동작
- 툴바: `굵게/기울임/코드/링크/목록/인용` 버튼으로 선택 텍스트 포맷
- 자동 임시저장: 0.5초 내 localStorage 저장
- 자동 복원: 페이지 재진입 시 임시저장 내용 로드
- 삭제: `임시저장 삭제` 버튼으로 드래프트 제거
- 게시 성공 후 정리: 게시글 등록 시 임시저장 자동 제거

브라우저 확인:
- DevTools Console에서 `localStorage.getItem('townpet:post-create-draft:v1')`로 저장 여부 확인

## 5. 게시글이 안 보이는 이유 (중요)

현재 메인 페이지(`/`)는 `전체 게시판(/feed)`으로 연결됩니다.
베스트글은 `/feed`에서 `베스트글` 탭으로 전환해 확인합니다.

`전체 게시판`(`/feed`)의 기본 범위는 `LOCAL`이라,
로그인한 유저의 대표 동네와 같은 동네 글만 기본으로 보입니다.

즉시 확인:
- 기본 진입(전체 게시판): `http://localhost:3000/` 또는 `http://localhost:3000/feed`
- 베스트글 모드: `http://localhost:3000/feed?mode=BEST`
- 전체 게시판 글로벌 범위: `http://localhost:3000/feed?scope=GLOBAL`
- 테스트 계정 로그인: `demo@townpet.dev` / `dev-password-1234`

샘플 계정:
- 관리자: `admin.platform@townpet.dev`, `admin.ops@townpet.dev`
- 모더레이터: `mod.trust@townpet.dev`, `mod.local@townpet.dev`, `mod.content@townpet.dev`
- 일반 유저: `power.reviewer@townpet.dev`
- 비인증/신규: `newbie.day1@townpet.dev`

## 6. 종료 명령

개발 서버 종료:
- 서버 실행 터미널에서 `Ctrl + C`

DB 중지:

```bash
cd /Users/alex/project/townpet2 && docker compose stop postgres
```

전체 종료:

```bash
cd /Users/alex/project/townpet2 && docker compose down
```

## 7. 보안 주의

- `.env`, `.env.local`은 Git 커밋 금지
- 키 파일(`*.pem`, `*.key`, `*.p12`) 커밋 금지
- 테스트 비밀번호를 운영 환경에서 재사용 금지
- 운영 배포 전 필수 환경변수 점검: `DATABASE_URL`, `AUTH_SECRET`(또는 `NEXTAUTH_SECRET`)
- 카카오 로그인 사용 시 추가 환경변수: `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`
- 네이버 로그인 사용 시 추가 환경변수: `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`
- 개발용 소셜 로그인(`ENABLE_SOCIAL_DEV_LOGIN`)은 운영 환경에서 사용 금지

## 8. 품질게이트(CI)

워크플로우:
- `.github/workflows/quality-gate.yml`

로컬 동일 검증(복붙):

```bash
cd /Users/alex/project/townpet2/app
pnpm quality:check
```

E2E 스모크(Playwright):

```bash
cd /Users/alex/project/townpet2/app
pnpm test:e2e:smoke
```

옵션:
- 외부 서버 재사용: `PLAYWRIGHT_SKIP_WEBSERVER=1`
- webServer 커맨드 교체: `PLAYWRIGHT_WEB_SERVER_COMMAND="./node_modules/.bin/next start --port 3000"`

## 9. 운영 문서(런북/SLO)

운영 기준 문서:
- 장애 대응 런북: `docs/ops/incident-runbook.md`
- SLO/알람 기준: `docs/ops/slo-alerts.md`

최소 점검 루프:
1. 일간: `GET /api/health` + 5xx 비율 확인
2. 주간: p95 지연시간/에러 버짓 소진율 리뷰
3. 장애 발생 시: 런북 3장(즉시 대응 체크리스트)부터 실행
