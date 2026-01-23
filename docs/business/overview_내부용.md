# TownPet 내부용 개발 Overview (신입 온보딩/즉시 투입용)

> **목적**: 신입 개발자가 TownPet의 제품 구조/도메인/코드베이스/운영 정책/개발 루틴을 “하루 안에” 이해하고, **바로 기능 개발에 투입**될 수 있도록 만드는 내부 문서
> **기준**: 최신 SPEC.md(Next.js + TypeScript 단일 스택) + Master Overview + Feature 소개 문서
> **범위**: 구현/운영 관점의 “실행 가능한” 지침 (마케팅 문구 제외)

---

## 1) 결론 (짧게)

TownPet은 **Local(동네) 기능**과 **Global(지식) 기능**을 섞지 않고 분리 운영하는 반려 플랫폼이다.
개발자는 “기능 구현”보다 **운영/신뢰(스팸·사기·분쟁·책임 리스크) 자동화**를 1순위로 두고, Next.js(App Router) 풀스택 구조에서 **템플릿 기반 UGC(구조화 입력)**를 빠르게 확장한다.

---

## 2) 시스템 한 장 요약 (무조건 먼저 읽기)

### 2.1 Local vs Global (제품/데이터/정책 분리)

* **Local**: 거리·최신성·즉시성이 핵심 → 리텐션(재방문) 중심
  예) 병원/장소 리뷰, 산책로 지도, 번개/펫친소, 마켓(대여/나눔), 실종/유기 알림
* **Global**: 축적·정합성·검색성이 핵심 → SEO/지식 자산 중심
  예) 견종 토픽, Q&A(채택), 사료/용품 DB, 전문가 콘텐츠

> 설계 원칙: **노출/검색/알림/정책(신고·제재 기준)**까지 Local/Global을 분리한다.
> 이유: Local은 스팸·업자·분쟁이 빠르게 유입되고, Global은 의료/훈련 조언 책임 이슈가 크다.

---

## 3) 아키텍처 개요 (개발자가 머릿속에 그려야 하는 그림)

### 3.1 기술 스택 (현재 기준)

* **Next.js 14+ App Router** (SSR/SSG + API Route Handlers + Server Actions)
* **TypeScript** 단일 언어 (FE/BE 통합)
* **Prisma + PostgreSQL**
* **Zod** 입력 검증
* **NextAuth(Auth.js) v5** 인증(OAuth)
* **Upstash Redis** (Rate limit/캐시)
* **Vercel 배포**, Sentry 모니터링

### 3.2 요청 흐름 (서버/DB 관점)

```
[Client]
  ├─ RSC (데이터 조회/렌더링)  ───────────────┐
  └─ Client Component (상호작용)            │
                                            ▼
[Next.js Server]
  ├─ Route Handlers (REST API)
  ├─ Server Actions (Mutation 중심)
  └─ Services Layer (비즈니스 로직 + 정책)
                 ▼
            Prisma ORM
                 ▼
          PostgreSQL (+ Redis)
```

### 3.3 “서비스 레이어”가 중요한 이유

* 단순 CRUD가 아니라,

  * **템플릿 필드 완성도 강제**
  * **스팸/어뷰징 방지**
  * **신고 기반 자동 블라인드**
  * (마켓/돌봄) 상태 머신/분쟁 정책
* 같은 정책이 **여러 엔드포인트에 반복**되므로, 라우트/액션에서 직접 처리하면 유지보수 실패한다.

---

## 4) 리포지토리 구조: 어디에 코드를 두는가

> 아래는 “찾는 시간”을 줄이기 위한 룰이다. 구현 전 반드시 준수.

### 4.1 핵심 디렉터리

* `src/app/`

  * 페이지/라우팅 + `src/app/api/**` Route Handlers
  * 라우트 그룹 `(auth)`, `(main)` 사용
* `src/server/`

  * `actions/` : Server Actions(쓰기/수정/삭제)
  * `services/` : **비즈니스 로직(정책 포함)** ← 핵심
  * `queries/` : 조회 최적화(커서 pagination, 필터)
* `src/lib/`

  * `prisma.ts`, `auth.ts`, `validations/**(Zod)`, `constants.ts`
* `prisma/`

  * `schema.prisma`, `migrations/`, `seed.ts`
* `src/components/`

  * UI(shadcn), 레이아웃, 폼, 도메인 컴포넌트(게시물/지도)

### 4.2 변경 우선순위 규칙

기능 추가 시 일반적으로 순서는 아래다.

1. **Prisma 스키마**(데이터)
2. **Zod 스키마**(입력/검증)
3. **Service**(정책/트랜잭션/권한/상태)
4. **Action/Route**(인터페이스)
5. **UI**(폼/리스트/상세)

---

## 5) 도메인 모델 치트시트 (이걸 이해하면 절반 끝)

### 5.1 핵심 엔티티

* `User` / `Neighborhood` / `UserNeighborhood`
* `Post` (다형성: `type`, `scope(LOCAL/GLOBAL)`, `status`)
* 상세 테이블(1:1): `HospitalReview`, `PlaceReview`, `WalkRoute`, `Meetup`, `MarketListing`, `LostFoundAlert`, `QaQuestion` …
* `Comment` (대댓글)
* `Report` (신고, 상태, 관리자 조치)

### 5.2 Post 다형성(Poly) 구조의 의도

* 화면/피드/검색의 공통 단위는 **Post**로 통일
* 유형별 필드는 1:1 상세 테이블로 분리
  → 인덱싱/정렬/상태관리(블라인드) 등 운영 로직을 공통화

### 5.3 자주 쓰는 필드 의미

* `Post.scope`

  * `LOCAL`: 동네 기반 피드/알림/검색 대상
  * `GLOBAL`: Q&A/토픽/DB 등 지식 자산 대상
* `Post.status`

  * `ACTIVE`: 정상 노출
  * `HIDDEN`: 신고/정책으로 자동 숨김
  * `DELETED`: 삭제(소프트/하드 정책에 따라 다름)

---

## 6) 운영/신뢰(반드시 지켜야 하는 정책)

TownPet은 “커뮤니티+마켓+돌봄”이므로 **스팸/사기/분쟁**이 기본값이다.
신입 개발자가 가장 흔하게 실패하는 지점이 **정책 누락**이다.

### 6.1 최소 운영 정책(기본 탑재)

* **신규 계정 제한**

  * 마켓/돌봄/긴급 알림(실종/유기) 등 고위험 기능에 제한
* **Rate Limit**

  * 로그인/검색/글/댓글/신고 엔드포인트에 적용
* **링크/연락처 제한**

  * 마켓/구인/돌봄에 외부 링크/전화/카톡 ID 노출은 단계적으로 허용
* **신고 누적 → 자동 블라인드**

  * `Report` 누적 규칙과 `Post.status=HIDDEN` 전환은 서비스 레이어에서 관리
* **관리자 조치 Audit Log**

  * 누가/언제/무엇을/왜 조치했는지 기록 (추후 분쟁 대응)

### 6.2 Global 영역(의료/훈련) 책임 리스크

* “경험 공유”와 “진단/처방”으로 보이는 문구를 분리/제한
* 전문가 콘텐츠는 자격/면책/검수 규칙을 문서로 고정한 뒤 점진 적용

---

## 7) 개발 환경 셋업 (30분 컷)

### 7.1 로컬 실행

```bash
pnpm install
cp .env.example .env.local
pnpm prisma migrate dev
pnpm dev
```

### 7.2 필수 환경변수 그룹(요약)

* DB: `DATABASE_URL`
* Auth: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`
* Redis: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
* Storage: R2/S3 관련 키
* Map: `NEXT_PUBLIC_KAKAO_MAP_API_KEY`
* Email/Sentry 등

> 온보딩 체크: **마이그레이션 성공**, **로그인 성공**, **게시물 작성 성공**, **이미지 업로드 성공**, **지도 로딩 성공**까지 1회 완료하면 개발 투입 가능.

---

## 8) “기능 추가” 표준 절차 (신입은 이대로만 하면 됨)

### 8.1 템플릿 게시물 유형 추가(예: 새로운 Local 리뷰 타입)

1. `prisma/schema.prisma`

   * `PostType` enum에 타입 추가
   * 상세 모델(1:1) 추가 + `Post`에 optional relation 추가
   * 필요한 index 설계(피드/검색 기준)
2. `src/lib/validations/<domain>.ts`

   * Zod 스키마 정의(필수/선택 필드, 범위 검증)
3. `src/server/services/<domain>.service.ts`

   * 권한(동네/로그인), 정책(신규 제한), 상태 처리
   * 트랜잭션(Post + Detail 동시 생성)
4. `src/server/actions/<domain>.ts` 또는 `src/app/api/<domain>/route.ts`

   * 외부 인터페이스(에러 포맷 일관화)
5. `src/components/forms/<domain>-form.tsx` + 페이지 연결
6. 테스트

   * 서비스 유닛/통합(Vitest), 최소 E2E(핵심 플로우)

### 8.2 “신고/블라인드”가 있는 기능은 반드시 같이 구현

* 게시물 생성/수정만 만들고 신고/제재 흐름을 빼면 운영이 즉시 무너진다.
* 최소한:

  * 신고 생성
  * 자동 블라인드 조건
  * 관리자 해제/확정(조치 이력)

---

## 9) 성능/쿼리 기본 가이드 (실무에서 자주 터지는 곳)

### 9.1 피드/검색은 커서 기반이 기본

* offset paging 금지(대규모에서 느림/불안정)
* 인덱스:

  * `(neighborhoodId, type, status, createdAt desc)` 류의 복합 인덱스는 필수
  * Global은 `(type, scope, status)` + 검색 전략(초기엔 PG Full-Text)

### 9.2 Prisma 쿼리 규칙

* `include/select` 명시(필요한 것만)
* N+1 방지(관계 조회 계획)
* 조회는 `queries/`로 모아서 재사용/최적화

---

## 10) 협업/PR 규칙 (1인 개발+AI 협업 기준이더라도 필요)

### 10.1 브랜치

* `main`: production
* `feature/*`, `fix/*`, `hotfix/*`

### 10.2 커밋 컨벤션

* `feat(scope): ...`, `fix(auth): ...` 등

### 10.3 PR 체크리스트(최소)

* 타입 체크 통과
* 마이그레이션 포함 여부 확인
* 신규 API는 Zod 검증 포함
* Rate limit/신규 제한 적용 여부
* 실패 케이스(권한/없는 리소스/중복/상태) 처리 여부

---

## 11) “첫 주” 추천 투입 티켓 (바로 시작 가능한 것들)

신입이 빠르게 감을 잡으려면, **정책/도메인/CRUD가 모두 얽힌 작은 기능**이 좋다.

1. **병원 리뷰 템플릿 폼 개선**

* 필수 필드 검증(Zod) 강화, 비용 breakdown 입력 UX

2. **신고 자동 블라인드 규칙 구현/정교화**

* 누적 기준/시간창/중복 신고 제한(동일 사용자 중복 방지)

3. **마켓 대여 체크리스트(인수/반납) 기본 스키마**

* 상태 전이 최소 버전(AVAILABLE → RESERVED → SOLD/CANCELLED)

4. **Local 피드 필터**

* 동네 범위(대표/인접), PostType 필터, 정렬 옵션

5. **실종/유기 알림 작성 제한**

* 신규 계정 제한 + 위치/사진 필수 조건 + 관리자 큐

---

## 12) 반례/리스크 (중요한 것만)

* **스팸/업자**: 기능이 커질수록 유입은 “항상” 더 빠르다 → 제한/레이트리밋/링크 정책이 먼저다.
* **결제/수수료**: 결제는 기능이 아니라 CS/환불/분쟁 시스템 → Phase 후반.
* **Global 의료 조언**: 표현 하나로 민원/법적 리스크 발생 가능 → 표준 문구/면책/검수 규칙 필요.