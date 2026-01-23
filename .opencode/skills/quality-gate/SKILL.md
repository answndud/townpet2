---
name: quality-gate
description: 변경사항을 lint/test/e2e/build 게이트로 검증하고, 실패 시 최소 단위로 원인을 좁혀 수정 제안을 한다.
compatibility: opencode
metadata:
  workflow: qa
  risk: low
---

## What I do
- 표준 커맨드로 품질 게이트를 통과시키는 것을 목표로 한다.
- 실패하면 “가장 작은 재현 단위(단일 테스트/파일)”로 좁힌다.
- 아키텍처 규칙(서비스/쿼리/검증 분리) 위반을 찾아낸다.

## When to use me
- PR 올리기 직전
- 기능/버그 수정 후 “통합 점검”이 필요할 때

## Commands (copy/paste)
- pnpm lint
- pnpm test
- pnpm test:e2e
- pnpm build

## Single-test recipes
- Vitest: pnpm test -- path/to/test.spec.ts
- Playwright: pnpm test:e2e -- path/to/test.spec.ts

## Definition of Done
- lint + unit 통과
- 변경 영향이 UI 플로우면 e2e도 통과(또는 명시적으로 제외 사유 기록)
- build 통과
- 에러 처리/입력 검증/정책 규칙 위반 없음
