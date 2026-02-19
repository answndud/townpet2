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

```bash
cd /Users/alex/project/townpet2/app && ./node_modules/.bin/next dev -p 3000
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

## 5. 게시글이 안 보이는 이유 (중요)

현재 메인 페이지(`/`)는 `베스트 게시판`입니다.
일반 피드는 `/feed`에서 확인합니다.

일반 피드(`/feed`)의 기본 범위는 `LOCAL`이라,
로그인한 유저의 대표 동네와 같은 동네 글만 기본으로 보입니다.

즉시 확인:
- 베스트 메인: `http://localhost:3000/`
- 일반 피드: `http://localhost:3000/feed`
- 글로벌 피드: `http://localhost:3000/feed?scope=GLOBAL`
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
