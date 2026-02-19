---
name: bugfix-triage
description: TownPet 버그를 재현→원인분석→최소수정→회귀테스트 추가까지 수행한다.
compatibility: opencode
metadata:
  workflow: bugfix
  risk: low
---

## What I do
- 재현 가능한 최소 케이스(MRE)부터 만든다.
- 원인(로그/스택/데이터)을 좁히고, 최소 변경으로 수정한다.
- 같은 버그가 재발하지 않도록 회귀 테스트를 추가한다.

## When to use me
- 에러 메시지/스택트레이스/이상 동작이 명확할 때
- 테스트 실패(Vitest/Playwright) 기반으로 고칠 때

## I need (inputs)
- 에러 메시지/로그 전체
- 예상 vs 실제
- 관련 경로(페이지/액션/API) 또는 파일 후보
- 재현 steps (가능하면)
- 유사 이슈 기록(`docs/agent-memory/research-index.md`)

## Workflow
1) Reproduce
   - 가능한 경우 먼저 테스트로 재현(기존 테스트 실패면 그대로 활용)

2) Locate
   - 입력 검증(Zod), 서비스 로직, 쿼리, 라우트 핸들러 순서로 확인
   - raw error throw/에러 응답 누락 여부 확인

3) Fix (minimal)
   - 범위 최소화, 타입/스키마로 방어
   - PII 누출 가능 로그/에러 메시지 점검

4) Add regression test
   - Vitest: 케이스 기반 unit/integration
   - Playwright: 유저 플로우 기반 e2e
   
5) Document the fix (required when it was a real bug/error)
	- 새 파일 생성:
		- docs/errors/YYYY-MM-DD_<slug>.md
	- 파일명 규칙:
		- 날짜는 오늘 기준(예: 2026-01-21)
		- slug는 kebab-case로 원인/영향을 요약(예: prisma-node-version)

6) Quality gate
   - lint + 해당 테스트 + (필요 시) build

## Single-test recipes (copy/paste)
- Vitest
  - pnpm test -- path/to/test.spec.ts
  - pnpm test -- -t "partial test name"
- Playwright
  - pnpm test:e2e -- path/to/test.spec.ts
  - pnpm test:e2e -- -g "partial test name"

## Definition of Done
- 재현 → 수정 → 테스트 통과
- 동일 버그를 잡는 회귀 테스트가 존재
- 입력 검증/에러 정규화 규칙 위반 없음

## Output
- 재현 → 원인 → 수정 → 회귀 테스트 결과
- 변경 파일 목록 + 핵심 로직 설명
- 실행한 커맨드 및 결과 요약
- (필수) 에러 해결 기록 문서 1개:
  - docs/errors/YYYY-MM-DD_<slug>.md
  - 예: docs/errors/2026-01-21_prisma-node-version.md
- (권장) 재발 방지 포인트를 `docs/agent-memory/research-log.md`에 추가
