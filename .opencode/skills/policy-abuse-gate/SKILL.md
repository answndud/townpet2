---
name: policy-abuse-gate
description: 악용 가능 플로우(로그인/검색/작성/신고/거래 등)에 레이트리밋·신규유저 제한·신고 자동숨김·링크/연락처 제한을 설계/검증한다.
compatibility: opencode
metadata:
  workflow: policy
  risk: high
---

## What I do
- 기능 구현 전에 “운영 정책/보안 체크리스트”를 먼저 확정한다.
- Local/Global 경계, 신고 자동숨김(HIDDEN), 관리자 감사, 레이트리밋/신규유저 제한을 강제한다.
- 입력 검증(Zod) + 에러 정규화 + PII 비노출을 확인한다.

## When to use me
- Market/Care/Lost&Found 같은 고위험 기능
- 로그인/검색/작성/신고/댓글/DM 등 스팸 타겟이 되는 엔드포인트
- 첨부파일/링크/연락처 입력이 들어가는 모든 기능

## Checklist (must pass)
- Local vs Global 분리 위반 없음
- 신고 → 자동숨김(HIDDEN) + 관리자 감사 로그/상태 추적 가능
- 레이트리밋 + 신규유저 제한 적용 (로그인/검색/작성/신고 포함)
- 외부 입력은 전부 Zod 검증(unknown → validate)
- 에러 응답 정규화(401/403 포함), raw error throw 없음
- 링크/연락처 공유 제한(스팸 억제)
- 의료/건강 관련 표현은 “진단” 톤 회피

## Output
- 정책 적용 지점(서비스/액션/API) 목록
- 정책 테스트(가능하면) 또는 검증 시나리오
