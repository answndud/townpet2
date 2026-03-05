# OAuth2 외부 로그인/회원가입 운영 가이드 (Kakao/Naver)

기준일: 2026-03-04  
대상: TownPet 운영자/개발자(1인 운영 포함)  
범위: Kakao/Naver OAuth2 로그인/회원가입의 설정, 운영, 모니터링, 장애 대응, 팔로우업

---

## 1) 목적과 성공 기준

이 문서의 목적은 다음 2가지를 고정하는 것입니다.

1. 외부 OAuth2 로그인/회원가입이 "한 번 붙이고 끝"이 아니라, 운영 가능한 상태로 유지된다.
2. 계정/시크릿/리다이렉트/워크플로우/장애 대응이 사람이 바뀌어도 같은 품질로 수행된다.

성공 기준(DoD):
- `oauth-real-e2e` 워크플로우를 수동 재실행했을 때 최신 run이 `success`를 유지한다.
- 카카오/네이버 실계정 수동 점검(로그인 -> 온보딩 -> 피드)이 월 1회 이상 기록된다.
- 시크릿 회전/만료/권한 이슈 발생 시 24시간 내 원인 식별 및 재검증 기록이 남는다.

---

## 2) 현재 아키텍처(운영 기준)

- 인증 라이브러리: `NextAuth v5` (`app/src/lib/auth.ts`)
- Provider:
  - Kakao (`next-auth/providers/kakao`)
  - Naver (`next-auth/providers/naver`)
  - Dev fallback: `social-dev` (non-prod 전용)
- 세션:
  - JWT strategy
  - session cookie: `townpet.session-token`
- 품질 게이트:
  - 실공급자 리다이렉트 검증: `.github/workflows/oauth-real-e2e.yml`
  - 앱 플로우 회귀: `social-onboarding-flow` E2E 포함

핵심 원칙:
- "리다이렉트 스모크 통과"와 "실계정 온보딩 완료"를 별개로 관리한다.
- 자동화는 빠른 감지, 수동 점검은 실제 전환(가입/온보딩) 검증에 사용한다.

---

## 3) 책임 분리 (RACI-lite)

- 운영 책임(Owner): `plan-coordinator` 역할(또는 운영 담당자)
- 구현/수정 책임: `delivery-engineer` 역할
- 검증 책임: `safety-verifier` 역할

분리 기준:
- 공급자 콘솔 변경(redirect URI, app 상태, 권한/동의항목)은 운영 책임.
- 앱 코드/워크플로우 변경은 구현 책임.
- 머지 전 실패경로 검증과 회귀 확인은 검증 책임.

---

## 4) 환경/시크릿 매트릭스

### 4.1 필수 키

- 공통:
  - `AUTH_SECRET` 또는 `NEXTAUTH_SECRET`
- Kakao:
  - `KAKAO_CLIENT_ID`
  - `KAKAO_CLIENT_SECRET`
- Naver:
  - `NAVER_CLIENT_ID`
  - `NAVER_CLIENT_SECRET`

### 4.2 저장 위치

- 런타임(앱 배포): Vercel Environment Variables
- CI 검증: GitHub Actions Repository Secrets
- 로컬 개발: `.env.local` (운영 값 복사 금지)

### 4.3 금지 규칙

- 운영용 시크릿을 개인 메신저/문서에 평문 저장 금지
- 공급자 콘솔 스크린샷에 비밀값 노출 금지
- 만료/폐기된 시크릿 재사용 금지

---

## 5) 공급자 콘솔 설정 표준

## 5.1 Redirect URI 표준

- 로컬:
  - `http://localhost:3000/api/auth/callback/kakao`
  - `http://localhost:3000/api/auth/callback/naver`
- 운영:
  - `https://<운영도메인>/api/auth/callback/kakao`
  - `https://<운영도메인>/api/auth/callback/naver`

주의:
- 프로토콜(`http/https`)까지 완전 일치해야 함
- trailing slash, 대소문자, 서브도메인 불일치 모두 실패 원인

## 5.2 동의항목/정책

- Kakao/Naver에서 이메일 제공 정책이 바뀌면 로그인 성공 후 가입/연동에서 실패 가능
- 공급자에서 이메일 비공개 계정 처리 정책을 분기해야 함
  - 예: 로그인 성공 + 이메일 미제공 -> 사용자 안내 코드/문구

---

## 6) 릴리즈 전/후 체크리스트

## 6.1 릴리즈 전 (Pre-flight)

1. GitHub secrets 존재 확인 (`oauth-real-e2e` 기준)
2. Vercel env 값 존재 확인 (운영 런타임 기준)
3. 공급자 콘솔 Redirect URI 재확인
4. `oauth-real-e2e` 수동 실행
5. 실패 시 즉시 원인 분류:
   - 시크릿 누락
   - redirect mismatch
   - 공급자 장애/정책 변경

## 6.2 릴리즈 후 (Post-flight)

1. 운영 URL에서 실제 카카오/네이버 버튼 진입 확인
2. 실계정 1회 수동 점검:
   - `/login?next=/onboarding` -> 공급자 로그인 -> `/onboarding` -> `/feed`
3. 증적 저장:
   - 실행 시각
   - 계정 종류(카카오/네이버)
   - 캡처/짧은 녹화
4. `PROGRESS.md`에 결과 append

---

## 7) 모니터링/팔로우업 루틴

## 7.1 주간(필수)

- `oauth-real-e2e` 최근 run 상태 확인(최소 1회)
- 실패한 경우 즉시 재실행 + 실패 단계 캡처
- OAuth 관련 support 이슈(로그인 실패 문의) 건수 기록

## 7.2 월간(필수)

- 카카오/네이버 실계정 수동 점검 각각 1회
- Redirect URI/도메인 정합성 재검토
- 시크릿 회전 필요 여부 판단(권한/만료/유출 의심)

## 7.3 분기(권장)

- 시크릿 사전 회전 리허설
- 공급자 콘솔 권한 최소화 점검(누가 앱 설정을 바꿀 수 있는지)
- 장애 대응 템플릿 최신화

---

## 8) 장애 대응 플레이북

## 8.1 대표 장애 시나리오

1. `Validate OAuth secrets` 실패
- 원인: GitHub Secrets 누락/오타
- 조치: 누락 키 추가 -> 워크플로우 재실행 -> run URL 기록

2. 리다이렉트 단계 실패(카카오/네이버 로그인 페이지 미진입)
- 원인: Redirect URI 불일치, 공급자 앱 상태 비활성
- 조치: 콘솔 URI 재등록 -> 캐시 제거 후 재검증

3. 로그인 후 콜백 오류(`/api/auth/error?error=Configuration`)
- 원인: 런타임 env 누락 또는 provider 설정 불일치
- 조치: Vercel env 점검 -> 재배포 -> 재검증

4. 로그인 성공했으나 온보딩/피드 진입 실패
- 원인: 앱 내부 회귀(온보딩 정책/폼 검증/세션 처리)
- 조치: `social-onboarding` E2E + 관련 route 로그 점검

## 8.2 사고 기록 템플릿

- 발생시각:
- 영향범위(카카오/네이버/둘다):
- 증상:
- 1차 원인:
- 조치:
- 재발방지:
- 검증 run URL:

---

## 9) 회원가입/로그인 팔로우업 지표

최소 지표:
- Provider별 로그인 시도 수
- Provider별 로그인 성공률
- 온보딩 진입률(로그인 성공 대비)
- `/feed` 도달률(온보딩 진입 대비)
- OAuth 실패 코드 분포(`Configuration`, `Callback`, `AccessDenied` 등)

운영 권장:
- 주간 단위로 Kakao/Naver 비교
- 2주 연속 특정 provider 실패율 급증 시 콘솔 설정/정책 변경 우선 점검

---

## 10) 수동 점검 운영 절차 (실무형)

1. 점검 전
- 시크릿 브라우저 준비
- 이전 세션 쿠키 삭제
- 점검 계정 상태 확인(차단/휴면 여부)

2. 카카오 점검
- `https://townpet2.vercel.app/login?next=%2Fonboarding` 접속
- 카카오 로그인 버튼 클릭 -> 인증 완료
- `/onboarding` 진입 확인
- 닉네임/대표동네 저장 후 `/feed` 도달

3. 네이버 점검
- 위 절차 동일

4. 증적 저장
- 각 provider별 URL/시각/스크린샷
- 실패 시 에러 문구/경로 캡처

5. 기록 반영
- `pnpm -C app ops:oauth:preflight`로 Base URL sanity(ERROR/WARN) 먼저 확인
- `pnpm -C app ops:oauth:manual-report --date <YYYY-MM-DD> --run-url <RUN_URL> --out ../docs/ops/manual-checks/oauth-manual-check-<YYYY-MM-DD>.md`로 기록 템플릿 생성
- 생성된 markdown을 기준으로 `PROGRESS.md`에 결과 append
- `PLAN.md`의 `blocked` 상태 갱신(조건 충족 시 `done`)
- `docs/ops/manual-checks/README.md` 기준으로 PII 없이 증적 링크만 기록

---

## 11) 문서/계획 동기화 규칙

- 운영 실행 결과는 항상 `PROGRESS.md` 먼저 기록
- 상태 변화(`blocked -> done`)는 `PLAN.md` 즉시 동기화
- 본 가이드 수정 시 관련 문서도 함께 점검:
  - `docs/ops/차단 해소 체크리스트.md`
  - `docs/ops/Vercel OAuth 부트스트랩 가이드.md`
  - `.github/workflows/oauth-real-e2e.yml`

---

## 12) 즉시 실행 명령 모음

```bash
# OAuth 워크플로우 최근 5개 조회
gh run list --workflow oauth-real-e2e.yml --limit 5 --repo answndud/townpet2

# 특정 run 상세 확인
gh run view <RUN_ID> --repo answndud/townpet2

# 워크플로우 수동 실행
gh workflow run oauth-real-e2e.yml --repo answndud/townpet2

# Base URL sanity 사전 점검(strict)
pnpm -C app ops:oauth:preflight

# 실계정 수동 점검 리포트 템플릿 생성
pnpm -C app ops:oauth:manual-report --date 2026-03-05 --run-url https://github.com/answndud/townpet2/actions/runs/22705265766 --out ../docs/ops/manual-checks/oauth-manual-check-2026-03-05.md

# Cycle 23 해소 조건 검증(strict)
pnpm -C app ops:oauth:verify-manual --report ../docs/ops/manual-checks/oauth-manual-check-2026-03-05.md --strict 1
```

Day1 핸드오프 템플릿 생성:

```bash
pnpm -C app growth:day1:handoff --date 2026-03-04 --out /tmp/day1-growth-handoff.md
```
