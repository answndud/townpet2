# TownPet 기술 명세서 (SPEC.md)

> **목적**: 1인 개발자가 AI 도구(Cursor, Claude 등)를 활용하여 TownPet을 구축하기 위한 기술 스택, 아키텍처, 개발 프로세스 가이드
> **마지막 업데이트**: 2026-01-21
> **핵심 전략**: TypeScript 단일 언어로 프론트엔드/백엔드 통합 개발

---

## 1. 프로젝트 개요

### 1.1 한 줄 정의
**TownPet**은 동네 기반(Local) 반려생활 인프라와 지역 무관(Global) 지식 축적을 분리하여, 로컬 리텐션과 검색 유입을 동시에 확보하는 반려동물 커뮤니티 플랫폼

### 1.2 핵심 설계 원칙 (1인 AI 협업 개발 최적화)

| 원칙 | 설명 |
|------|------|
| **Single Language** | TypeScript로 프론트/백엔드 통합 → 컨텍스트 스위칭 최소화 |
| **Full-Stack Framework** | Next.js로 SSR/API/라우팅 통합 → 설정 복잡도 감소 |
| **Type-Safe Everything** | Prisma + Zod + TypeScript → 런타임 에러 사전 방지 |
| **AI-Friendly Stack** | AI가 가장 잘 이해하는 스택 선택 (React, Prisma, Tailwind) |
| **Managed Services** | DB/캐시/스토리지 모두 매니지드 → 운영 부담 최소화 |
| **Incremental Complexity** | Phase별로 복잡도 증가 (결제/채팅은 Phase 3 이후) |

### 1.3 왜 JavaScript/TypeScript인가?

| 장점 | 설명 |
|------|------|
| **단일 언어** | 프론트엔드/백엔드 동일 언어로 학습 비용 감소 |
| **AI 코드 품질** | Claude/GPT가 가장 많이 학습한 언어, 코드 생성 품질 최고 |
| **타입 공유** | 프론트/백엔드 간 타입 정의 재사용 가능 |
| **생태계** | npm 패키지 풍부, 대부분의 문제에 솔루션 존재 |
| **빠른 피드백** | HMR, 빠른 빌드로 개발 사이클 단축 |

---

## 2. 기술 스택

### 2.1 Core Framework

| 영역 | 기술 | 선정 이유 |
|------|------|----------|
| **Language** | TypeScript 5.x | 타입 안전성, AI 코드 생성 품질 최고 |
| **Framework** | Next.js 14+ (App Router) | 풀스택, SSR/SSG, API Routes 통합 |
| **Runtime** | Node.js 20 LTS | 안정성, 장기 지원 |
| **Package Manager** | pnpm | 빠른 설치, 디스크 효율 |

### 2.2 Frontend

| 영역 | 기술 | 선정 이유 |
|------|------|----------|
| **UI Library** | React 18 (Server Components) | Next.js 기본, AI가 가장 잘 아는 라이브러리 |
| **Styling** | Tailwind CSS 3.x | 유틸리티 기반, AI 친화적, 빠른 개발 |
| **Components** | shadcn/ui | 복사/붙여넣기 방식, 커스텀 용이, Radix 기반 |
| **Icons** | Lucide React | 경량, 일관된 디자인 |
| **Forms** | React Hook Form + Zod | 타입 안전 폼 검증 |
| **State** | Zustand (필요시) | 간단한 전역 상태 관리 |
| **Map** | Kakao Maps SDK | 국내 주소/POI, 무료 쿼터 |
| **Date** | date-fns | 경량, 트리쉐이킹 |

### 2.3 Backend (API)

| 영역 | 기술 | 선정 이유 |
|------|------|----------|
| **API** | Next.js Route Handlers | 별도 서버 없이 API 구현 |
| **Validation** | Zod | 스키마 정의 + 타입 추론 + 런타임 검증 |
| **Auth** | NextAuth.js (Auth.js) v5 | OAuth 통합, 세션 관리 내장 |
| **ORM** | Prisma | 타입 안전, 스키마 기반, 마이그레이션 자동 |
| **File Upload** | UploadThing / S3 Presigned | 간단한 파일 업로드 |
| **Email** | Resend | 개발자 친화적 API, 무료 티어 |
| **Rate Limit** | Upstash Ratelimit | 서버리스 호환, Redis 기반 |
| **Background Jobs** | Inngest / Trigger.dev (Phase 2+) | 서버리스 백그라운드 작업 |

### 2.4 Database & Storage

| 영역 | 기술 | 선정 이유 |
|------|------|----------|
| **Primary DB** | PostgreSQL (Supabase / Neon / Vercel Postgres) | 관계형, JSON, 매니지드 |
| **Cache** | Upstash Redis | 서버리스 Redis, 무료 티어 |
| **Object Storage** | Cloudflare R2 / AWS S3 | 비용 효율, CDN 연동 |
| **Search (Phase 2+)** | PostgreSQL Full-Text → Meilisearch | 초기는 DB, 확장 시 분리 |

### 2.5 Infrastructure & DevOps

| 영역 | 기술 | 선정 이유 |
|------|------|----------|
| **Hosting** | Vercel | Next.js 최적화, 무료 티어, 자동 배포 |
| **Database Hosting** | Supabase / Neon | PostgreSQL 매니지드, 무료 티어 |
| **CI/CD** | GitHub Actions + Vercel | 푸시 → 자동 배포 |
| **Monitoring** | Sentry | 에러 트래킹, 소스맵 지원 |
| **Analytics** | Vercel Analytics / Plausible | 프라이버시 친화적 |
| **Uptime** | Better Uptime | 무료 헬스체크 |

### 2.6 개발 도구

| 용도 | 도구 |
|------|------|
| **IDE** | Cursor (AI 기본) / VS Code |
| **API 테스트** | Thunder Client (VS Code) / Bruno |
| **DB Client** | Prisma Studio (내장) / TablePlus |
| **Version Control** | Git + GitHub |
| **Task Management** | GitHub Issues + Projects |
| **Design** | Figma (필요시) |

---

## 3. 아키텍처

### 3.1 프로젝트 구조 (Next.js App Router)

```
townpet/
├── src/
│   ├── app/                          # App Router (페이지 + API)
│   │   ├── (auth)/                   # 인증 관련 라우트 그룹
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (main)/                   # 메인 레이아웃 그룹
│   │   │   ├── feed/                 # 동네 피드
│   │   │   ├── hospital/             # 병원 리뷰
│   │   │   ├── place/                # 동반가능 장소
│   │   │   ├── walk/                 # 산책로
│   │   │   ├── meetup/               # 번개/펫친소
│   │   │   ├── market/               # 마켓
│   │   │   ├── lost-found/           # 실종/유기
│   │   │   ├── qa/                   # Q&A (Global)
│   │   │   ├── topic/                # 품종 토픽 (Global)
│   │   │   ├── profile/              # 프로필
│   │   │   └── layout.tsx
│   │   │
│   │   ├── admin/                    # 관리자
│   │   │   ├── reports/
│   │   │   ├── users/
│   │   │   └── layout.tsx
│   │   │
│   │   ├── api/                      # API Route Handlers
│   │   │   ├── auth/[...nextauth]/   # NextAuth
│   │   │   ├── posts/
│   │   │   ├── comments/
│   │   │   ├── upload/
│   │   │   ├── reports/
│   │   │   └── trpc/[trpc]/          # (선택) tRPC 엔드포인트
│   │   │
│   │   ├── layout.tsx                # 루트 레이아웃
│   │   ├── page.tsx                  # 랜딩 페이지
│   │   ├── error.tsx                 # 에러 바운더리
│   │   ├── not-found.tsx
│   │   └── globals.css
│   │
│   ├── components/                   # 재사용 컴포넌트
│   │   ├── ui/                       # shadcn/ui 컴포넌트
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   ├── layout/                   # 레이아웃 컴포넌트
│   │   │   ├── header.tsx
│   │   │   ├── footer.tsx
│   │   │   ├── sidebar.tsx
│   │   │   └── mobile-nav.tsx
│   │   ├── forms/                    # 폼 컴포넌트
│   │   ├── posts/                    # 게시물 관련
│   │   └── maps/                     # 지도 관련
│   │
│   ├── lib/                          # 유틸리티 & 설정
│   │   ├── prisma.ts                 # Prisma 클라이언트
│   │   ├── auth.ts                   # NextAuth 설정
│   │   ├── utils.ts                  # 공통 유틸
│   │   ├── validations/              # Zod 스키마
│   │   │   ├── post.ts
│   │   │   ├── user.ts
│   │   │   └── index.ts
│   │   └── constants.ts              # 상수 정의
│   │
│   ├── server/                       # 서버 전용 코드
│   │   ├── actions/                  # Server Actions
│   │   │   ├── post.ts
│   │   │   ├── comment.ts
│   │   │   └── report.ts
│   │   ├── services/                 # 비즈니스 로직
│   │   │   ├── post.service.ts
│   │   │   ├── user.service.ts
│   │   │   └── moderation.service.ts
│   │   └── queries/                  # 데이터 조회 함수
│   │       ├── post.queries.ts
│   │       └── user.queries.ts
│   │
│   ├── hooks/                        # 커스텀 훅
│   │   ├── use-posts.ts
│   │   ├── use-auth.ts
│   │   └── use-infinite-scroll.ts
│   │
│   ├── types/                        # 타입 정의
│   │   ├── index.ts
│   │   └── next-auth.d.ts            # NextAuth 타입 확장
│   │
│   └── styles/                       # 추가 스타일
│
├── prisma/
│   ├── schema.prisma                 # DB 스키마
│   ├── seed.ts                       # 시드 데이터
│   └── migrations/                   # 마이그레이션
│
├── public/
│   ├── images/
│   └── icons/
│
├── .env.example
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── pnpm-lock.yaml
```

### 3.2 데이터 흐름

```
┌─────────────────────────────────────────────────────────────┐
│                         Client                              │
│  (React Server Components + Client Components)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Server                          │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Server Actions  │  │ Route Handlers  │                  │
│  │ (Mutations)     │  │ (REST API)      │                  │
│  └────────┬────────┘  └────────┬────────┘                  │
│           │                    │                            │
│           ▼                    ▼                            │
│  ┌─────────────────────────────────────────┐               │
│  │            Services Layer               │               │
│  │  (Business Logic + Validation)          │               │
│  └────────────────────┬────────────────────┘               │
│                       │                                     │
│                       ▼                                     │
│  ┌─────────────────────────────────────────┐               │
│  │              Prisma ORM                 │               │
│  │         (Type-safe Queries)             │               │
│  └────────────────────┬────────────────────┘               │
└───────────────────────│─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL                               │
│              (Supabase / Neon)                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Prisma 스키마 (핵심)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============ 사용자 ============
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  nickname      String?   @unique
  image         String?
  role          UserRole  @default(USER)
  
  // 동네 설정
  neighborhoods UserNeighborhood[]
  
  // 관계
  posts         Post[]
  comments      Comment[]
  reports       Report[]  @relation("ReportedBy")
  receivedReports Report[] @relation("ReportedUser")
  
  // 타임스탬프
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // NextAuth
  accounts      Account[]
  sessions      Session[]
}

enum UserRole {
  USER
  ADMIN
  MODERATOR
}

// ============ 동네 ============
model Neighborhood {
  id        String   @id @default(cuid())
  name      String   // 동 이름
  city      String   // 시/도
  district  String   // 구/군
  lat       Float?
  lng       Float?
  
  users     UserNeighborhood[]
  posts     Post[]
}

model UserNeighborhood {
  id             String       @id @default(cuid())
  userId         String
  neighborhoodId String
  isPrimary      Boolean      @default(false)
  
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  neighborhood   Neighborhood @relation(fields: [neighborhoodId], references: [id])
  
  @@unique([userId, neighborhoodId])
}

// ============ 게시물 (다형성) ============
model Post {
  id             String      @id @default(cuid())
  authorId       String
  neighborhoodId String?
  
  type           PostType
  scope          PostScope   @default(LOCAL)
  status         PostStatus  @default(ACTIVE)
  
  title          String
  content        String      @db.Text
  
  // 공통 필드
  viewCount      Int         @default(0)
  likeCount      Int         @default(0)
  commentCount   Int         @default(0)
  
  // 관계
  author         User        @relation(fields: [authorId], references: [id])
  neighborhood   Neighborhood? @relation(fields: [neighborhoodId], references: [id])
  comments       Comment[]
  images         PostImage[]
  reports        Report[]
  
  // 타입별 상세 (1:1)
  hospitalReview HospitalReview?
  placeReview    PlaceReview?
  walkRoute      WalkRoute?
  meetup         Meetup?
  marketListing  MarketListing?
  lostFoundAlert LostFoundAlert?
  qaQuestion     QaQuestion?
  
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  
  @@index([authorId])
  @@index([neighborhoodId, type, status, createdAt(sort: Desc)])
  @@index([type, scope, status])
}

enum PostType {
  HOSPITAL_REVIEW
  PLACE_REVIEW
  WALK_ROUTE
  MEETUP
  MARKET_LISTING
  LOST_FOUND
  QA_QUESTION
  QA_ANSWER
  FREE_POST
}

enum PostScope {
  LOCAL
  GLOBAL
}

enum PostStatus {
  ACTIVE
  HIDDEN
  DELETED
}

// ============ 병원 리뷰 상세 ============
model HospitalReview {
  id           String   @id @default(cuid())
  postId       String   @unique
  post         Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  
  hospitalName String
  visitDate    DateTime
  treatmentType String  // 진료 항목
  totalCost    Int?     // 총 비용
  waitTime     Int?     // 대기 시간 (분)
  rating       Int      // 1-5
  
  // 세부 항목 (JSON)
  costBreakdown Json?   // { "진찰료": 15000, "검사비": 30000, ... }
}

// ============ 산책로 상세 ============
model WalkRoute {
  id          String   @id @default(cuid())
  postId      String   @unique
  post        Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  
  routeName   String
  distance    Float?   // km
  duration    Int?     // 분
  difficulty  RouteDifficulty @default(EASY)
  
  // 지도 데이터
  coordinates Json     // [[lat, lng], ...]
  
  // 태그
  hasStreetLights Boolean @default(false)
  hasRestroom     Boolean @default(false)
  hasParkingLot   Boolean @default(false)
  safetyTags      String[] // ["차량주의", "자전거주의", ...]
}

enum RouteDifficulty {
  EASY
  MODERATE
  HARD
}

// ============ 마켓 상세 ============
model MarketListing {
  id          String        @id @default(cuid())
  postId      String        @unique
  post        Post          @relation(fields: [postId], references: [id], onDelete: Cascade)
  
  listingType MarketType
  price       Int
  condition   ItemCondition @default(GOOD)
  
  // 대여 전용
  depositAmount Int?
  rentalPeriod  String?     // "1주", "1개월" 등
  
  status      MarketStatus  @default(AVAILABLE)
}

enum MarketType {
  SELL
  RENT
  SHARE
}

enum ItemCondition {
  NEW
  LIKE_NEW
  GOOD
  FAIR
}

enum MarketStatus {
  AVAILABLE
  RESERVED
  SOLD
  CANCELLED
}

// ============ 기타 상세 테이블 ============
model PlaceReview {
  id        String @id @default(cuid())
  postId    String @unique
  post      Post   @relation(fields: [postId], references: [id], onDelete: Cascade)
  
  placeName String
  placeType String // "카페", "식당", "공원" 등
  address   String?
  isPetAllowed Boolean @default(true)
  rating    Int
}

model Meetup {
  id           String       @id @default(cuid())
  postId       String       @unique
  post         Post         @relation(fields: [postId], references: [id], onDelete: Cascade)
  
  meetupDate   DateTime
  location     String
  maxParticipants Int       @default(10)
  currentCount Int          @default(0)
  status       MeetupStatus @default(OPEN)
}

enum MeetupStatus {
  OPEN
  FULL
  CLOSED
  CANCELLED
}

model LostFoundAlert {
  id          String          @id @default(cuid())
  postId      String          @unique
  post        Post            @relation(fields: [postId], references: [id], onDelete: Cascade)
  
  alertType   LostFoundType
  petType     String          // "강아지", "고양이"
  breed       String?
  lastSeenAt  DateTime
  lastSeenLocation String
  lat         Float?
  lng         Float?
  status      LostFoundStatus @default(ACTIVE)
}

enum LostFoundType {
  LOST
  FOUND
}

enum LostFoundStatus {
  ACTIVE
  RESOLVED
  CLOSED
}

model QaQuestion {
  id           String     @id @default(cuid())
  postId       String     @unique
  post         Post       @relation(fields: [postId], references: [id], onDelete: Cascade)
  
  tags         String[]
  acceptedAnswerId String?
  answerCount  Int        @default(0)
}

// ============ 댓글 ============
model Comment {
  id        String   @id @default(cuid())
  postId    String
  authorId  String
  parentId  String?  // 대댓글
  
  content   String   @db.Text
  status    PostStatus @default(ACTIVE)
  
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  author    User     @relation(fields: [authorId], references: [id])
  parent    Comment? @relation("CommentReplies", fields: [parentId], references: [id])
  replies   Comment[] @relation("CommentReplies")
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([postId, createdAt(sort: Desc)])
}

// ============ 이미지 ============
model PostImage {
  id       String @id @default(cuid())
  postId   String
  url      String
  order    Int    @default(0)
  
  post     Post   @relation(fields: [postId], references: [id], onDelete: Cascade)
}

// ============ 신고 ============
model Report {
  id          String       @id @default(cuid())
  reporterId  String
  targetType  ReportTarget
  targetId    String
  targetUserId String?
  
  reason      ReportReason
  description String?
  status      ReportStatus @default(PENDING)
  
  reporter    User         @relation("ReportedBy", fields: [reporterId], references: [id])
  targetUser  User?        @relation("ReportedUser", fields: [targetUserId], references: [id])
  post        Post?        @relation(fields: [targetId], references: [id])
  
  // 관리자 조치
  resolvedAt  DateTime?
  resolvedBy  String?
  resolution  String?
  
  createdAt   DateTime     @default(now())
  
  @@index([targetType, targetId])
  @@index([status])
}

enum ReportTarget {
  POST
  COMMENT
  USER
}

enum ReportReason {
  SPAM
  HARASSMENT
  INAPPROPRIATE
  FAKE
  OTHER
}

enum ReportStatus {
  PENDING
  RESOLVED
  DISMISSED
}

// ============ NextAuth ============
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

---

## 4. 개발 프로세스

### 4.1 AI 협업 워크플로우

```
┌─────────────────────────────────────────────────────────────┐
│              AI-Assisted Development (TypeScript)           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. PLAN (계획)                                             │
│     └─ 기능 요구사항을 Cursor/Claude에게 설명               │
│     └─ 컴포넌트/API 구조 결정                               │
│     └─ Prisma 스키마 변경 검토                              │
│                                                             │
│  2. SCHEMA (스키마)                                         │
│     └─ Prisma 스키마 수정                                   │
│     └─ npx prisma migrate dev                               │
│     └─ Zod validation 스키마 생성                           │
│                                                             │
│  3. GENERATE (코드 생성)                                    │
│     └─ Server Action 또는 API Route 생성                    │
│     └─ React 컴포넌트 생성                                  │
│     └─ 타입이 자동으로 공유됨!                              │
│                                                             │
│  4. REVIEW (검토)                                           │
│     └─ TypeScript 에러 확인 (컴파일 타임 검증)              │
│     └─ 비즈니스 로직 정합성 확인                            │
│     └─ 보안 포인트 체크                                     │
│                                                             │
│  5. TEST (테스트)                                           │
│     └─ Vitest 유닛/통합 테스트                              │
│     └─ Playwright E2E (선택)                                │
│     └─ 브라우저 수동 QA                                     │
│                                                             │
│  6. DEPLOY (배포)                                           │
│     └─ git push → Vercel 자동 배포                          │
│     └─ Preview URL 확인 → main 머지                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 브랜치 전략

```
main (production) ← Vercel 자동 배포
  ↑
  └── feature/xxx (기능 개발) → Preview 배포
  └── fix/xxx (버그 수정)
  └── hotfix/xxx (긴급)
```

### 4.3 커밋 컨벤션

```
<type>(<scope>): <subject>

feat(hospital): 병원 리뷰 작성 기능 구현
fix(auth): 카카오 로그인 콜백 에러 수정
refactor(post): 게시물 조회 쿼리 최적화
style(ui): 버튼 컴포넌트 스타일 수정
docs(readme): 설치 가이드 추가
test(market): 마켓 거래 테스트 추가
chore(deps): next 15.0.0 업그레이드
```

### 4.4 일일 개발 루틴

```
[오전] 계획
  - GitHub Issues에서 오늘 작업 선택
  - AI와 접근 방법 토론
  - 필요 시 Prisma 스키마 설계

[오후] 구현
  - AI로 코드 생성 → 타입 체크 → 개선
  - 컴포넌트 + API 동시 개발
  - PR 생성 → Preview 확인

[저녁] 정리
  - 코드 리뷰/머지
  - 다음 작업 정리
```

---

## 5. Phase별 구현 계획

### Phase 1: MVP Core (4-6주)

**목표**: 동네 기반 정보 공유로 핵심 루프 검증

| 주차 | 작업 | 산출물 |
|------|------|--------|
| 1 | 프로젝트 셋업 | Next.js, Prisma, Auth, 배포 파이프라인 |
| 2 | 인증 & 프로필 | 카카오 로그인, 프로필 페이지, 동네 설정 |
| 3 | 게시물 코어 | CRUD, 피드, 이미지 업로드 |
| 4 | 병원/장소 리뷰 | 템플릿 폼, 검색, 필터 |
| 5 | 산책로 | 카카오맵 연동, 코스 그리기, 태그 |
| 6 | 신고/운영 & QA | 신고 시스템, 관리자 페이지, 버그 수정 |

**기술 체크리스트:**
- [ ] Next.js 14 App Router 셋업
- [ ] Prisma + PostgreSQL (Supabase) 연결
- [ ] NextAuth.js v5 카카오 로그인
- [ ] shadcn/ui 컴포넌트 설치
- [ ] Tailwind CSS 설정
- [ ] 게시물 다형성 구조 구현
- [ ] 커서 기반 무한 스크롤
- [ ] 이미지 업로드 (UploadThing / R2)
- [ ] 카카오맵 연동
- [ ] Zod 폼 검증
- [ ] 신고/자동 블라인드 로직
- [ ] Rate Limit (Upstash)
- [ ] Vercel 배포

### Phase 2: 로컬 네트워크 (4주)

| 기능 | 설명 |
|------|------|
| 산책 번개 | 모임 생성/참여, 실시간 인원 업데이트 |
| 펫친소 | 프로필 탐색, 관심 표시 |
| 마켓 | 판매/대여/나눔, 상태 관리 |
| 실종/유기 | 긴급 알림, 위치 기반 |

**기술 추가:**
- [ ] 이메일 알림 (Resend)
- [ ] 거래 상태 머신
- [ ] 지도 반경 검색 (PostGIS / Haversine)

### Phase 3: Global & 수익 (4주)

| 기능 | 설명 |
|------|------|
| Q&A | 질문/답변/채택 |
| 품종 토픽 | 카테고리별 게시판 |
| 사료 DB | 제품 정보 + 리뷰 |
| 어필리에이트 | 제휴 링크 |

### Phase 4+: 고도화

- 실시간 채팅 (Socket.io / Ably)
- 푸시 알림 (FCM)
- 결제 (토스페이먼츠)
- 멤버십/광고

---

## 6. 품질 & 운영

### 6.1 테스트 전략

| 레벨 | 도구 | 범위 |
|------|------|------|
| Unit | Vitest | 유틸, 서비스 함수 |
| Integration | Vitest + Prisma | API Routes, Server Actions |
| E2E | Playwright | 핵심 사용자 플로우 |
| Type | TypeScript | 컴파일 타임 검증 (가장 중요!) |

**우선순위:**
1. TypeScript strict 모드 유지
2. Zod로 런타임 입력 검증
3. 인증/결제 로직 테스트
4. E2E는 핵심 플로우만

### 6.2 보안 체크리스트

- [ ] HTTPS (Vercel 기본)
- [ ] CSRF (NextAuth 기본 지원)
- [ ] XSS (React 기본 이스케이프)
- [ ] SQL Injection (Prisma 파라미터 바인딩)
- [ ] Rate Limiting (Upstash)
- [ ] 환경변수 관리 (Vercel 대시보드)
- [ ] 파일 업로드 검증 (확장자, 크기)
- [ ] Server-only 코드 분리

### 6.3 성능 최적화

| 영역 | 기법 |
|------|------|
| Rendering | RSC(React Server Components) 활용 |
| Data | Prisma 쿼리 최적화, include/select 명시 |
| Caching | Next.js fetch 캐시, unstable_cache |
| Images | next/image 최적화, WebP |
| Bundle | dynamic import, 코드 스플리팅 |

### 6.4 모니터링

```
[Error]     Sentry (무료 티어)
[Analytics] Vercel Analytics
[Uptime]    Better Uptime
[Logs]      Vercel 내장 로그
```

---

## 7. 환경 설정

### 7.1 로컬 개발

```bash
# 1. 의존성 설치
pnpm install

# 2. 환경변수 복사
cp .env.example .env.local

# 3. DB 마이그레이션
pnpm prisma migrate dev

# 4. 개발 서버 실행
pnpm dev
```

### 7.2 환경 변수

```bash
# .env.example

# Database (Supabase)
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# OAuth - Kakao
KAKAO_CLIENT_ID=""
KAKAO_CLIENT_SECRET=""

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# Storage (Cloudflare R2)
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME="townpet-uploads"
R2_PUBLIC_URL=""

# Kakao Map
NEXT_PUBLIC_KAKAO_MAP_API_KEY=""

# Email (Resend)
RESEND_API_KEY=""

# Sentry
SENTRY_DSN=""
```

### 7.3 Docker (선택, 로컬 DB)

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: townpet
      POSTGRES_USER: townpet
      POSTGRES_PASSWORD: townpet
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

---

## 8. AI 활용 가이드

### 8.1 효과적인 프롬프트 패턴

**기능 구현:**
```
TownPet 프로젝트에서 [기능]을 구현해줘.

요구사항:
- [요구사항 1]
- [요구사항 2]

기술 스택: Next.js 14 App Router, Prisma, TypeScript, Tailwind, shadcn/ui
관련 파일: [파일 경로]

결과물:
1. Prisma 스키마 변경 (필요시)
2. Zod 검증 스키마
3. Server Action 또는 API Route
4. React 컴포넌트
5. 타입 정의
```

**버그 수정:**
```
[파일]에서 [문제] 에러 발생

에러 메시지:
[전체 에러]

예상: [정상 동작]
실제: [현재 동작]

원인과 수정 방법을 알려줘.
```

### 8.2 TypeScript 스택의 AI 장점

| 장점 | 설명 |
|------|------|
| **타입 추론** | AI가 생성한 코드의 타입 오류를 IDE가 즉시 표시 |
| **자동 완성** | Prisma, Zod 타입이 자동 추론되어 AI 응답 품질 향상 |
| **코드 공유** | 프론트/백 같은 언어라 컨텍스트 전달 용이 |
| **풍부한 예제** | AI 학습 데이터에 React/Next.js 코드 가장 많음 |

### 8.3 AI가 잘 도와주는 영역

- ✅ React 컴포넌트 생성
- ✅ Prisma 쿼리 작성
- ✅ Zod 스키마 정의
- ✅ Tailwind 스타일링
- ✅ Server Actions 구현
- ✅ API Route Handlers
- ✅ 타입 정의
- ✅ 에러 핸들링

### 8.4 직접 판단 필요

- ⚠️ 비즈니스 로직 정합성
- ⚠️ 보안 취약점 검토
- ⚠️ UX/UI 의사결정
- ⚠️ 성능 최적화 전략
- ⚠️ 운영 정책 설계

---

## 9. 의존성 (package.json)

```json
{
  "name": "townpet",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "test": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "next": "14.2.x",
    "react": "18.3.x",
    "react-dom": "18.3.x",
    
    "@prisma/client": "5.x",
    "next-auth": "5.0.0-beta.x",
    "@auth/prisma-adapter": "2.x",
    
    "zod": "3.x",
    "react-hook-form": "7.x",
    "@hookform/resolvers": "3.x",
    
    "@radix-ui/react-dialog": "1.x",
    "@radix-ui/react-dropdown-menu": "2.x",
    "@radix-ui/react-slot": "1.x",
    "class-variance-authority": "0.7.x",
    "clsx": "2.x",
    "tailwind-merge": "2.x",
    "lucide-react": "0.x",
    
    "date-fns": "3.x",
    "@upstash/redis": "1.x",
    "@upstash/ratelimit": "1.x",
    "resend": "3.x",
    
    "@sentry/nextjs": "8.x"
  },
  "devDependencies": {
    "typescript": "5.x",
    "@types/node": "20.x",
    "@types/react": "18.x",
    "@types/react-dom": "18.x",
    
    "prisma": "5.x",
    "tsx": "4.x",
    
    "tailwindcss": "3.4.x",
    "postcss": "8.x",
    "autoprefixer": "10.x",
    
    "eslint": "8.x",
    "eslint-config-next": "14.x",
    "@typescript-eslint/eslint-plugin": "7.x",
    
    "vitest": "1.x",
    "@vitejs/plugin-react": "4.x",
    "playwright": "1.x",
    "@playwright/test": "1.x"
  }
}
```

---

## 10. 참고 문서

| 문서 | 경로 | 용도 |
|------|------|------|
| 비즈니스 오버뷰 | `/docs/01_business/` | 비즈니스 컨텍스트 |
| MVP 범위 | `/docs/02_product/03_mvp_scope_v1.md` | Phase별 스코프 |
| 데이터 모델 | `/docs/02_product/05_data_model_erd.md` | ERD 설계 |
| 운영 정책 | `/docs/03_policy_ops/` | 신고/차단/거래 규칙 |
| 인프라 | `/docs/07_infra/` | 배포/CI/CD |
| 보안 | `/docs/09_security/` | 보안 가이드라인 |

---

## Appendix: 빠른 시작

```bash
# 1. 저장소 클론
git clone https://github.com/your-repo/townpet.git
cd townpet

# 2. 의존성 설치
pnpm install

# 3. 환경 변수 설정
cp .env.example .env.local
# .env.local 편집 (Supabase, Kakao OAuth 등)

# 4. DB 마이그레이션
pnpm prisma migrate dev

# 5. 개발 서버 실행
pnpm dev

# 6. 브라우저 열기
open http://localhost:3000
```

---

*이 문서는 프로젝트 진행에 따라 지속적으로 업데이트됩니다.*
