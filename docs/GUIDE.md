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

아래 한 줄을 그대로 실행하세요.  
(`Prisma Client`를 먼저 갱신해서 `Unknown field ...` 오류를 예방합니다)

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
- 재실행: `cd /Users/alex/project/townpet2/app && ./node_modules/.bin/prisma generate && ./node_modules/.bin/next dev -p 3000`

### 3-1-2) `Cannot read properties of undefined (reading 'findUnique')` 에러가 날 때

`SiteSetting` 같은 신규 Prisma 모델이 클라이언트에 반영되지 않은 상태입니다.

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
