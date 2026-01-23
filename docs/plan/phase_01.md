# phase_01.md
# Phase 1 (MVP Core) 개발 순서/프로세스

목적
- Phase 1 MVP를 실제 개발 순서대로 진행하며 기록한다
- 이후 Phase 2+ 문서 작성의 기준 템플릿으로 사용한다

전제
- 기술 스택: Next.js App Router + TypeScript + Prisma + Zod + Tailwind
- 정책 선행: 신고/자동 블라인드, 레이트리밋, 신규 제한을 기본 내장
- Local/Global 분리 원칙을 모든 기능에서 유지

개발 프로세스 규칙
- PLAN -> SCHEMA -> GENERATE -> REVIEW -> TEST -> DEPLOY
- 기능 추가 순서: Prisma -> Zod -> Service -> Action/Route -> UI -> Tests
- 고위험 기능(Market/Care/Lost&Found)은 정책/운영 로직 먼저

진행 표기 규칙
- [ ] TODO: 착수 전
- [~] DOING: 진행 중
- [x] DONE: 완료
- [!] BLOCKED: 외부 의존/정책 미확정으로 중단

Phase 1 목표
- 동네 기반(Local) 핵심 루프 검증
- 구조화 템플릿 기반 데이터 축적
- 운영/신뢰 자동화의 최소 버전 확보

Phase 0 목표 (스캐폴딩)
- Next.js App Router + TypeScript + Tailwind 기본 구조 확보
- 디렉터리 구조/코딩 컨벤션 초기 세팅
- 개발 환경과 스크립트 정리

Phase 0.5 목표 (DB/Prisma)
- Docker Postgres 기반 로컬 DB 구성
- Prisma 초기 스키마 + 마이그레이션
- 최소 seed 데이터로 로컬 개발 시작

세부 순서 (작성/진행 기록용)

Phase 0) 프로젝트 초기 스캐폴딩
- [x] Next.js 14 App Router 스캐폴딩
- [~] Tailwind CSS + shadcn/ui 준비
- [~] 기본 디렉터리 구조 정리
- [~] ESLint/TypeScript strict 확인
- [x] 환경 변수 기본 템플릿 정리

Phase 0.5) DB/Prisma 초기화
- [x] Docker Postgres 구성
- [x] Prisma 초기 설정 + `schema.prisma`
- [x] 마이그레이션 실행
- [x] seed 데이터 작성

1) 프로젝트 초기 셋업
- [x] Next.js 14 App Router 기본 구조
- [~] Tailwind CSS + shadcn/ui 세팅
- [x] ESLint/TypeScript strict 설정
- [x] 기본 레이아웃/네비게이션 스캐폴딩

2) 데이터 계층
- [x] `prisma/schema.prisma` 기본 모델 작성
- [x] 로컬 DB 연결 및 `pnpm prisma migrate dev`
- [x] 초기 seed 데이터(동네, 테스트 유저)

3) 인증/프로필/동네 설정
- [ ] NextAuth v5 기본 로그인 플로우
- [ ] 사용자 프로필 설정/편집
- [ ] 동네 선택(대표/보조) 및 정책 반영

4) 게시물 코어 (Post 다형성)
- [x] Post 기본 스키마/상태/인덱스
- [x] 공통 작성/수정/삭제 Service
- [x] 기본 피드(커서 pagination)
- [~] 댓글 작성/리스트

5) 병원/장소 리뷰 (Local)
- [x] 템플릿 기반 폼 필드 정의
- [x] Zod 스키마 + 서버 검증
- [x] 리스트/상세 화면 + 필터

6) 산책로 공유 (Local)
- [ ] 지도 연동(Kakao Maps)
- [~] 좌표 데이터 저장/조회
- [~] 안전 태그/편의 시설 태그

7) 신고/운영 자동화 (필수)
- [x] 신고 생성 + 중복 제한
- [x] 누적 기준 자동 블라인드(HIDDEN)
- [~] 관리자 조치 이력(Audit Log)

8) 품질 보강
- [~] Rate limit 적용(로그인/검색/작성/신고)
- [~] 기본 테스트(Vitest) + 핵심 플로우 E2E
- [ ] Sentry/로그 기본 세팅(선택)

9) 배포/검증
- [ ] Vercel Preview 배포
- [ ] 핵심 플로우 수동 QA
- [ ] Phase 1 완료 기준 체크

완료 기준(Definition of Done)
- 핵심 Local 기능(병원/장소/산책)에서 구조화 데이터가 누적된다
- 신고/블라인드/레이트리밋이 동작한다
- TypeScript strict + Zod 검증이 모든 외부 입력을 보호한다
- 피드/검색은 커서 기반으로 동작한다

다음 단계
- Phase 2 문서에서 마켓/펫친소/실종 알림 순서를 확장
