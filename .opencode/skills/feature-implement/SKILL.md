---
name: feature-implement
description: TownPet 기능을 설계-구현-테스트까지 end-to-end로 추가한다 (Prisma→Zod→Service→Action/Route→UI→Tests).
compatibility: opencode
metadata:
  stack: nextjs-app-router
  language: typescript
  workflow: feature
  risk: medium
---

## What I do
- 기능 요구를 최소 질문으로 고정하고, 구현 순서를 강제한다: Prisma → Zod → Service → Action/Route → UI → Tests.
- TownPet 도메인 규칙(로컬/글로벌 분리, 신고/레이트리밋/신규제한)을 위반하지 않게 “정책 먼저” 적용한다.
- PR 단위로 안전하게 변경 범위를 좁힌다.

## When to use me
- “새 기능” 또는 “기능 확장”을 할 때.
- 특히 UGC/검색/작성/신고/로그인 등 악용 가능성이 있는 플로우를 다룰 때.

## I need (inputs)
- 기능 목적 1줄 + 성공 기준(acceptance criteria) 3~7개
- Local/Global 어디에 속하는지
- 데이터가 필요하면: 엔티티/필드/관계 초안
- 보안/정책 요구(레이트리밋, 신규유저 제한, 신고 자동숨김 등)
- 관련 과거 조사 기록(`docs/agent-memory/research-index.md`)

## Output
- 변경 파일 목록 + 핵심 로직 설명
- 마이그레이션(필요 시), API/Action, UI, 테스트(최소 1개 이상)
- 실행한 커맨드 및 결과 요약
- 재사용 가치가 큰 결정은 `docs/agent-memory/research-log.md`에 기록

## Guardrails (must)
- Local vs Global 분리 유지 (피드/검색/알림/정책).  
- 신고는 자동숨김(HIDDEN) + 관리자 감사(audit) 가능해야 함.  
- 로그인/검색/작성/신고는 레이트리밋 + 신규유저 제한 필수.  
- 외부 입력은 Zod로 검증(unknown→validate).  
- Route Handler/Server Action에서 raw error throw 금지(정규화된 에러 응답).  

## Workflow
1) PLAN
   - acceptance criteria를 체크리스트로 재작성
   - Local/Global 배치 결정(경계면 명시)
   - 정책(레이트리밋/신규제한/신고) 적용 지점 확정

2) SCHEMA (Prisma)
   - prisma/schema.prisma 변경
   - 필요한 인덱스/unique/enum 고려

3) VALIDATION (Zod)
   - src/lib/validations/* 에 입력 스키마 작성
   - 폼/액션/API 모두 같은 스키마를 재사용하도록 설계

4) BUSINESS LOGIC (Service)
   - src/server/services/* 에 정책을 포함한 핵심 로직 구현
   - DB 접근은 Prisma + parameter binding (raw SQL 최소)

5) API / MUTATION (Action or Route Handler)
   - Mutation: src/server/actions/*
   - API: src/app/api/** (Route Handlers)
   - 에러 응답 정규화(401/403 포함)

6) UI
   - 가능하면 Server Component로 데이터 페치
   - interactivity 필요할 때만 Client Component

7) TESTS
   - 최소 1개: Vitest(unit/integration) 또는 Playwright(e2e)
   - 악용 플로우면 “정책 테스트”(rate limit / new user restriction)도 포함

## Commands (copy/paste)
- pnpm install
- pnpm lint
- pnpm test
- pnpm test:e2e
- pnpm build

## Definition of Done
- acceptance criteria 모두 충족
- lint + unit 테스트 통과(필수), e2e는 영향 범위에 따라 추가
- 로컬/글로벌 경계 위반 없음
- 입력 검증 + 에러 정규화 + 레이트리밋/신규제한(필요 시) 적용됨
