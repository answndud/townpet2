---
name: prisma-migrate
description: Prisma 스키마 변경과 마이그레이션 생성/검증/시드까지 안전하게 수행한다.
compatibility: opencode
metadata:
  workflow: db
  stack: prisma-postgres
  risk: high
---

## What I do
- prisma/schema.prisma 변경을 “의도/호환성/인덱스” 관점에서 검토한다.
- migrate dev / db push / studio / seed 루틴을 표준화한다.
- 쿼리 패턴에 맞는 인덱싱, N+1 방지(select/include 명시)를 함께 점검한다.

## When to use me
- 새로운 모델/필드/관계/enum 추가
- 인덱스/unique 변경
- 성능 이슈로 스키마/인덱스를 손볼 때

## Guardrails (must)
- include/select 명시, N+1 회피
- cursor pagination 우선, offset 남용 금지
- raw SQL 최소화

## Workflow
1) Plan
   - 변경 목적(기능/성능/정합성)과 역호환성 여부 명시
2) Update schema.prisma
3) Migration
   - pnpm prisma migrate dev (또는 pnpm db:migrate)
4) Verify
   - pnpm db:studio 로 데이터 확인
   - 필요한 경우 pnpm db:seed
5) Update query/service
   - 쿼리/서비스가 새로운 필드/관계에 맞게 수정되었는지 확인
6) Tests
   - 최소 1개 관련 테스트 추가/수정

## Commands (copy/paste)
- pnpm prisma migrate dev
- pnpm db:push
- pnpm db:studio
- pnpm db:seed
