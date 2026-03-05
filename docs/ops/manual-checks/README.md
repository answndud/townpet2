# OAuth Manual Checks

이 디렉터리는 실OAuth 수동 점검 증적 파일을 날짜별로 보관합니다.

## 파일 규칙
- 파일명: `oauth-manual-check-YYYY-MM-DD.md`
- 생성 명령:
  - `pnpm -C app ops:oauth:manual-report --base-url https://townpet2.vercel.app --strict-base-url 1 --date YYYY-MM-DD --run-url <RUN_URL> --out ../docs/ops/manual-checks/oauth-manual-check-YYYY-MM-DD.md`

## 기록 기준
- Kakao/Naver 각각 상태(`pass`/`fail`)를 채웁니다.
- Evidence 칸에 캡처 링크(또는 파일 경로)를 남깁니다.
- 개인정보(실명, 이메일 전체, 전화번호)는 기록하지 않습니다.

## 완료 처리
- 검증 명령:
  - `pnpm -C app ops:oauth:verify-manual --report ../docs/ops/manual-checks/oauth-manual-check-YYYY-MM-DD.md --strict 1`
- 두 provider 모두 `pass`면 `PLAN.md` Cycle 23 blocked 항목을 `done`으로 갱신합니다.
- 결과 요약은 `PROGRESS.md` 최신 실행 로그에 동기화합니다.
