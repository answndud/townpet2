# TownPet GUIDE (초보 운영/테스트용)

이 문서는 "로컬에서 서버를 띄우고, 웹에서 직접 확인하고, 문제가 나도 스스로 복구"하는 데 집중한 운영 가이드입니다.

## 1) 한 번에 이해하기

- 앱: Next.js (`app/`)
- DB: PostgreSQL (Docker 컨테이너)
- 기본 URL: `http://localhost:3000`
- 핵심 원칙:
- Docker(Postgres) 먼저
- DB 스키마 동기화
- 시드 데이터 주입
- 개발 서버 실행

## 2) 준비물

- macOS + 터미널
- Docker Desktop 설치
- Node.js 20+
- 이 저장소 클론 완료

## 3) 가장 빠른 실행 순서

프로젝트 루트(`townpet2/`) 기준:

```bash
# 1) Docker Desktop 실행 (GUI)
open -a Docker

# 2) DB 컨테이너 실행
docker compose up -d

# 3) 앱 디렉터리 이동
cd app

# 4) DB를 Prisma schema와 동기화
./node_modules/.bin/prisma db push --accept-data-loss

# 5) 기본 데이터 시드
SEED_DEFAULT_PASSWORD=dev-password-1234 ./node_modules/.bin/tsx prisma/seed.ts
./node_modules/.bin/tsx scripts/seed-users.ts
./node_modules/.bin/tsx scripts/seed-reports.ts

# 6) 개발 서버 실행
./node_modules/.bin/next dev
```

브라우저에서 `http://localhost:3000` 접속 후 로그인 페이지로 이동되면 정상입니다.

## 4) 로그인 테스트 계정

시드 실행 후(기본 비밀번호 동일):

- 이메일: `demo@townpet.dev`
- 비밀번호: 시드 실행 시 사용한 `SEED_DEFAULT_PASSWORD`
- 위 빠른 실행 명령을 그대로 썼다면: `dev-password-1234`

추가 테스트 계정(역할 다양화):
- 관리자: `admin.platform@townpet.dev`, `admin.ops@townpet.dev`
- 모더레이터: `mod.trust@townpet.dev`, `mod.local@townpet.dev`, `mod.content@townpet.dev`
- 일반 유저(예시): `power.reviewer@townpet.dev`, `newbie.week1@townpet.dev`, `market.scout@townpet.dev`
- 비인증 유저 테스트용: `newbie.day1@townpet.dev` (로그인 제한 시나리오 확인용)

## 5) 운영 중 자주 쓰는 명령어

루트(`townpet2/`) 기준:

```bash
# Postgres 상태 확인
docker compose ps

# Postgres 로그 보기
docker compose logs -f postgres

# Postgres 중지
docker compose stop postgres

# Postgres 재시작
docker compose restart postgres

# Postgres 완전 종료 + 네트워크 정리
docker compose down
```

앱 디렉터리(`app/`) 기준:

```bash
# 타입체크
./node_modules/.bin/tsc --noEmit

# 린트
./node_modules/.bin/eslint src --max-warnings=0

# 테스트
./node_modules/.bin/vitest run
```

## 6) 웹에서 확인할 체크리스트

### 기본 확인

- `http://localhost:3000` 접속 시 `/login` 리다이렉트
- 로그인 성공 후 피드 진입
- 글 목록/상세 조회 가능
- 댓글 작성/수정/삭제 동작

### 정책 확인 (최근 변경)

- 기본 피드는 `LOCAL` 기준
- 대표 동네 없으면 로컬 피드 접근 시 안내 화면
- `GLOBAL` 피드에서는 동네 없어도 조회 가능

## 7) 문제 해결 (실전)

### A. `Cannot connect to the Docker daemon`

원인:
- Docker Desktop 미실행

해결:
1. `open -a Docker`
2. Docker 앱이 "Engine running" 상태가 될 때까지 대기
3. `docker compose up -d` 재실행

### B. `Can't reach database server at localhost:5432`

원인:
- Postgres 컨테이너 미실행 또는 기동 중

해결:
1. `docker compose ps`
2. `docker compose logs -f postgres`
3. `docker compose up -d` 또는 `docker compose restart postgres`

### C. `User.passwordHash does not exist` (시드 실패)

원인:
- DB 스키마와 현재 Prisma schema 불일치

해결:
1. `cd app`
2. `./node_modules/.bin/prisma db push --accept-data-loss`
3. 시드 재실행

### D. `listen EPERM ... 3000` (개발 서버 포트 실패)

원인:
- 권한/환경 이슈, 이미 포트 사용 중, 보안 정책 충돌

해결:
1. 다른 터미널/프로세스에서 `next dev`가 떠있는지 확인
2. 종료 후 재실행
3. 필요 시 포트 변경: `./node_modules/.bin/next dev -p 3001`

## 8) 데이터 초기화가 필요할 때

완전 초기화(주의: 로컬 데이터 삭제):

```bash
docker compose down -v
docker compose up -d
cd app
./node_modules/.bin/prisma db push --accept-data-loss
SEED_DEFAULT_PASSWORD=dev-password-1234 ./node_modules/.bin/tsx prisma/seed.ts
./node_modules/.bin/tsx scripts/seed-reports.ts
```

## 9) 보안/크리덴셜 주의사항

- `.env*` 파일은 Git에 올리지 않기
- 로컬 비밀번호/토큰은 절대 이슈/PR 본문에 붙여넣지 않기
- 인증/메일 관련 값은 운영 환경에서 반드시 새 값으로 교체
- 민감 파일(`.pem`, `.key`, `.p12` 등)은 `.gitignore`로 제외 유지

## 10) 개발 루프 추천 (초보용)

1. `docs/plan/todo.md`에서 이번 사이클 체크리스트 작성
2. 코드 수정
3. `tsc` -> `eslint` -> `vitest` 순서로 확인
4. 웹에서 수동 테스트
5. 문서 체크 업데이트
6. 사이클 단위 커밋/푸시

이 루프를 반복하면 "무엇을 바꿨고, 왜 안전한지"를 항상 추적할 수 있습니다.
