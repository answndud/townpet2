# TownPet Vercel + OAuth 연결 가이드 (처음부터)

이 문서는 "Vercel 계정 없음" 상태에서 시작해 아래를 끝내는 목적의 운영 가이드입니다.

- Vercel 배포 URL 확정
- 카카오/네이버 OAuth 앱 생성 및 콜백 연결
- GitHub Actions(`oauth-real-e2e`, `ops-smoke-checks`) PASS

---

## 0) 준비물

- GitHub 계정 (이미 보유)
- Vercel 계정 (신규 생성)
- 카카오 디벨로퍼스 계정
- 네이버 개발자센터 계정
- (권장) 운영용 도메인 1개 (`townpet.example.com` 형태)

주의:
- OAuth는 콜백 URL이 1글자라도 다르면 실패합니다.
- 먼저 "배포 URL 확정"을 하고, 그 URL로 카카오/네이버 콜백을 등록하세요.

---

## 1) Vercel 계정 생성 + 프로젝트 연결

1. `https://vercel.com/signup` 접속
2. `Continue with GitHub`로 가입/로그인
3. `Add New...` -> `Project` -> `answndud/townpet2` 저장소 Import
4. 프로젝트 설정
   - Framework Preset: `Next.js`
   - Root Directory: `app`
   - Build/Install command는 기본값 유지 (pnpm 자동 감지)
5. 우선 빈 환경변수로는 실패할 수 있으니, 아래 2단계까지 진행 후 Deploy

---

## 2) 배포 필수 환경변수 먼저 설정

Vercel 프로젝트 -> `Settings` -> `Environment Variables`에서 입력:

필수(최소):
- `DATABASE_URL`
- `AUTH_SECRET` (또는 `NEXTAUTH_SECRET`)
- `APP_BASE_URL` (초기에는 임시 Vercel 도메인)
- `NEXTAUTH_URL` (동일하게 `APP_BASE_URL` 값)

OAuth 연결 전 임시로 비워도 되는 값:
- `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`
- `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`

선택(운영 고도화):
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `SENTRY_DSN`
- `RESEND_API_KEY`

생성 팁:
- `AUTH_SECRET`는 32바이트 이상 랜덤 문자열 권장
- 예: `openssl rand -base64 32`

---

## 3) 첫 배포 후 "배포 URL" 확정

1. Vercel `Deployments`에서 최신 배포 열기
2. 배포 URL 확인 (예: `https://townpet2-xxxx.vercel.app`)
3. URL로 health 확인:

```bash
curl -sS -i https://<배포URL>/api/health
```

정상 기준:
- HTTP `200`
- JSON `status: "ok"`

4. 운영 URL 전략 결정
   - 빠른 시작: `*.vercel.app`를 운영 URL로 사용
   - 권장: 커스텀 도메인 연결 후 그 도메인을 운영 URL로 고정

5. 최종 운영 URL이 정해지면 Vercel 환경변수 갱신
   - `APP_BASE_URL=https://<최종운영URL>`
   - `NEXTAUTH_URL=https://<최종운영URL>`
   - 갱신 후 재배포

---

## 4) 카카오 OAuth 앱 생성/연결

1. `https://developers.kakao.com` 로그인
2. `내 애플리케이션` -> `애플리케이션 추가하기`
3. 생성 후 설정
   - 제품 설정 -> `카카오 로그인` 활성화
   - 앱 키에서 `REST API 키` 확인 (이 값이 `KAKAO_CLIENT_ID`)
   - 보안 -> `Client Secret` 사용 설정 + 발급 (`KAKAO_CLIENT_SECRET`)
4. Redirect URI 등록
   - `https://<최종운영URL>/api/auth/callback/kakao`
   - (선택) `https://<stagingURL>/api/auth/callback/kakao`
5. 동의항목 설정
   - 이메일 필수 사용이면 `카카오계정(이메일)` 동의항목 활성화

Vercel 환경변수 반영:
- `KAKAO_CLIENT_ID=<REST API 키>`
- `KAKAO_CLIENT_SECRET=<Client Secret>`

---

## 5) 네이버 OAuth 앱 생성/연결

1. `https://developers.naver.com` 로그인
2. `Application` -> `애플리케이션 등록`
3. API 선택
   - `네이버 로그인` 사용
4. 서비스 환경 등록
   - 서비스 URL: `https://<최종운영URL>`
   - Callback URL: `https://<최종운영URL>/api/auth/callback/naver`
5. 생성 후 Client 정보 확인
   - `Client ID` -> `NAVER_CLIENT_ID`
   - `Client Secret` -> `NAVER_CLIENT_SECRET`

Vercel 환경변수 반영:
- `NAVER_CLIENT_ID=<Client ID>`
- `NAVER_CLIENT_SECRET=<Client Secret>`

주의:
- 네이버는 앱 상태/검수 조건에 따라 테스트 계정 범위가 제한될 수 있습니다.
- 콜백 URL은 프로토콜(`https`) 포함 정확히 일치해야 합니다.

---

## 6) GitHub Actions 시크릿 설정 (워크플로우용)

GitHub 저장소 -> `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`

`oauth-real-e2e`용:
- `AUTH_SECRET` (또는 `NEXTAUTH_SECRET`)
- `KAKAO_CLIENT_ID`
- `KAKAO_CLIENT_SECRET`
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`

`ops-smoke-checks`용:
- `SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG_SLUG`
- `SENTRY_PROJECT_SLUG`

팁:
- 앱 런타임(Vercel env)과 CI(GitHub Secrets)는 별개입니다. 둘 다 넣어야 합니다.

---

## 7) 워크플로우 실행 순서 (권장)

1. `oauth-real-e2e` 실행
   - GitHub -> Actions -> `oauth-real-e2e` -> `Run workflow`
   - 기대 결과: 카카오/네이버 리다이렉트 스모크 PASS

2. `ops-smoke-checks` 실행
   - GitHub -> Actions -> `ops-smoke-checks` -> `Run workflow`
   - 입력값:
     - `target_base_url=https://<최종운영URL>`
     - `verify_sentry=true` (Sentry도 함께 검증할 때)
   - 기대 결과:
     - health 체크 PASS
     - Sentry 이벤트 전송/조회 PASS

---

## 8) 실패 원인 빠른 진단표

`oauth-real-e2e`가 `Validate OAuth secrets`에서 실패
- 원인: GitHub repository secrets 누락
- 조치: 누락된 키 추가 후 재실행

`oauth-real-e2e`가 리다이렉트 단계에서 실패
- 원인: 카카오/네이버 콘솔 콜백 URL 불일치
- 조치: `/api/auth/callback/kakao`, `/api/auth/callback/naver` 정확히 등록

`ops-smoke-checks`가 health 404로 실패
- 원인: 잘못된 배포 URL (deployment not found)
- 조치: Vercel에서 실제 배포 URL 재확인 후 재실행

health 503(degraded)
- 원인: 런타임 env 누락 또는 DB/Redis 상태 이슈
- 조치: `/api/health` 응답 JSON의 `missing`, `checks` 필드 확인

Sentry 검증 실패
- 원인: `SENTRY_AUTH_TOKEN` 권한(scope) 부족 또는 org/project slug 오타
- 조치: 토큰 권한/슬러그 재확인

---

## 9) 최종 체크리스트

- [ ] Vercel 프로젝트 생성 + `app` 루트 배포 완료
- [ ] `APP_BASE_URL`, `NEXTAUTH_URL`를 최종 운영 URL로 고정
- [ ] 카카오 콜백 `.../api/auth/callback/kakao` 등록 완료
- [ ] 네이버 콜백 `.../api/auth/callback/naver` 등록 완료
- [ ] Vercel env에 OAuth 키 반영 완료
- [ ] GitHub Secrets에 OAuth/Sentry 키 반영 완료
- [ ] `oauth-real-e2e` PASS run URL 확보
- [ ] `ops-smoke-checks` PASS run URL 확보
