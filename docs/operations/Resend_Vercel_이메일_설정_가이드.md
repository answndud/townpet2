# Resend 도메인 인증 + Vercel 연결 가이드 (TownPet)

최종 업데이트: 2026-02-25

이 문서는 아래를 한 번에 다룹니다.
- 도메인 미보유 상태에서 시작하는 절차(구매 -> DNS)
- Resend 도메인 인증(SPF/DKIM/MX)
- API Key 발급 및 Vercel 환경변수 연결
- TownPet 회원가입 이메일 인증 실동작 점검
- Resend 과금 체계 요약과 운영 팁

## 0) TownPet에서 이메일 인증이 동작하는 방식

코드 기준 핵심 흐름:
- 회원가입 API: `app/src/app/api/auth/register/route.ts`
- 인증 토큰 생성/검증: `app/src/server/services/auth.service.ts`
- 인증 메일 발송: `app/src/server/email.ts`

중요 조건:
- production 배포는 `RESEND_API_KEY`가 없으면 strict security env preflight와 runtime env 검증에서 실패합니다.
- 비밀번호 재설정/이메일 인증 메일은 production에서 설정 누락 또는 전송 실패 시 `503`으로 fail-fast 합니다.
- `welcome email`만 best-effort 전송입니다.
- `APP_BASE_URL`이 올바르지 않으면 메일 링크가 잘못된 도메인으로 생성됩니다.

---

## 1) Resend 과금 체계(요약)

출처: https://resend.com/pricing

가격/한도는 변경될 수 있으므로 결제 전 공식 페이지 재확인하세요.

### 플랜 요약(기준일 스냅샷)

| 플랜 | 월 기본요금 | 포함 메일 | 초과 단가 | 일일 제한 | 도메인 수 |
|---|---:|---:|---:|---:|---:|
| Free | $0 | 3,000/mo | - | 100/day | 1 |
| Pro | $20 | 50,000/mo | $0.90 / 1,000 | 없음 | 10 |
| Scale | $90 | 100,000/mo | $0.90 / 1,000 | 없음 | 1,000 |
| Enterprise | 커스텀 | 커스텀 | 커스텀 | 없음 | 유연 |

추가 항목:
- Dedicated IP Add-on: 월 $30 (Scale 이상, 고볼륨/평판 관리 시)

운영 권장:
- 초기에는 Free 또는 Pro로 시작
- 인증/비밀번호 재설정 같은 트랜잭션 메일 우선
- 발송량/스팸률 안정화 후 필요 시 Dedicated IP 검토

---

## 2) 시작 전 체크리스트

- [ ] 도메인 구매 여부 확인
- [ ] DNS를 실제로 제어하는 곳 확인(중요)
- [ ] Vercel 프로젝트 관리자 권한
- [ ] Resend 계정 생성

DNS 제어 위치가 가장 중요합니다.
- 가비아/후이즈/Cloudflare/Route53 중 "네임서버가 실제 가리키는 곳"에서 레코드를 수정해야 합니다.
- 헷갈리면 `https://dns.email`로 nameserver를 먼저 확인하세요.

---

## 3) 도메인이 없는 경우: 도메인 구매부터

### 3-1. 도메인 구매
1. 원하는 도메인 구매(예: `townpet.dev`)
2. 구매 직후 도메인 DNS 관리 페이지 접근 가능 여부 확인

### 3-2. 보낼 주소 정책 먼저 정하기
권장:
- 루트 도메인보다 서브도메인 사용
- 예: `mail.townpet.dev` 또는 `notify.townpet.dev`

이유:
- 발송 평판 격리(문제 시 전체 도메인 리스크 감소)
- 용도 분리(인증/알림 vs 마케팅)

참고: https://resend.com/docs/knowledge-base/is-it-better-to-send-emails-from-a-subdomain-or-the-root-domain

---

## 4) Resend 도메인 인증 단계

### 4-1. 도메인 추가
1. Resend 로그인
2. `Domains` -> `Add Domain`
3. 사용할 도메인 입력(예: `mail.townpet.dev` 또는 `townpet.dev`)

### 4-2. DNS 레코드 등록
Resend 화면에 표시된 레코드를 DNS에 그대로 추가합니다.
일반적으로 아래가 필요합니다.
- SPF(TXT)
- DKIM(TXT)
- MX(반송/피드백 경로)

주의:
- 일부 DNS 공급자는 MX 값 뒤에 도메인을 자동 덧붙입니다.
- 이때 Resend 값과 달라지면 실패할 수 있으므로, 필요 시 끝에 `.`(trailing dot)를 붙입니다.

### 4-3. 검증 상태 확인
1. Resend 도메인 상세 페이지에서 `Verify` 또는 재검증 실행
2. 상태가 `verified`가 될 때까지 대기

상태 의미(요약):
- `pending`: 전파/검증 중
- `verified`: 정상 인증
- `failed` / `temporary_failure`: 레코드 불일치 또는 DNS 변경 이슈

문제 해결 가이드:
- https://resend.com/docs/knowledge-base/what-if-my-domain-is-not-verifying

---

## 5) Resend API Key 발급

1. Resend `API Keys` -> `Create API Key`
2. 이름 입력(예: `townpet-prod`)
3. 권한 선택
   - 추천: `Sending access`
   - 필요 시 특정 도메인으로 제한
4. 생성 직후 키 복사(재노출 불가)

참고: https://resend.com/docs/dashboard/api-keys/introduction

---

## 6) Vercel 환경변수 설정

Vercel 문서: https://vercel.com/docs/environment-variables

프로젝트 -> Settings -> Environment Variables

필수:
- `RESEND_API_KEY` = Resend에서 발급한 키
- `APP_BASE_URL` = 실제 배포 URL (예: `https://townpet2.vercel.app` 또는 커스텀 도메인)

권장 적용 환경:
- Production: 필수
- Preview: 선택(스테이징 검증용)
- Development: 로컬 `vercel env pull` 쓸 때 유용

중요:
- 환경변수 변경은 기존 배포에 소급되지 않습니다.
- 변경 후 재배포(Redeploy) 하세요.

---

## 7) TownPet 코드와 발신 주소 정합 맞추기

현재 발신자 포맷:
- `TownPet <no-reply@townpet.dev>`
- 위치: `app/src/server/email.ts`

의미:
- Resend에서 `townpet.dev`(또는 해당 From 주소 도메인)가 인증되어 있어야 합니다.
- 다른 도메인만 인증한 상태면 발송 실패/거부될 수 있습니다.

운영 권장:
- 트랜잭션 메일용 주소 분리
  - 예: `no-reply@mail.townpet.dev`

---

## 8) 실제 동작 테스트(회원가입 이메일 인증)

### 8-1. 가입 테스트
1. 배포 사이트에서 신규 이메일로 회원가입
2. 인증 메일 수신 확인
3. 메일의 `/verify-email?token=...` 링크 클릭

### 8-2. 기대 결과
- 인증 전: 로그인 불가(이메일 미인증)
- 인증 후: 로그인 가능
- DB: `User.emailVerified`가 null -> timestamp로 변경
- production에서 `RESEND_API_KEY` 누락 또는 Resend 전송 실패가 있으면 비밀번호 재설정/이메일 인증 요청은 `503`으로 종료

### 8-3. 문제 발생 시 점검 순서
1. `RESEND_API_KEY`가 Production에 설정됐는지
2. `APP_BASE_URL`이 실도메인인지
3. Resend 도메인 상태가 `verified`인지
4. 스팸함/프로모션함 확인
5. Vercel 함수 로그에서 메일 발송 예외 확인

---

## 9) 자주 나는 이슈와 해결

### 9-1. 가입은 되는데 메일이 안 옴
원인 후보:
- `RESEND_API_KEY` 미설정
- 도메인 미인증
- From 도메인 불일치

해결:
- production이면 배포가 먼저 실패하거나 인증/재설정 API가 `503`을 반환해야 정상입니다.
- welcome email만 누락될 때는 경고 로그만 남을 수 있으므로 Vercel env + Resend domain 상태를 함께 확인하세요.

### 9-2. 링크가 localhost로 감
원인:
- `APP_BASE_URL` 미설정 또는 오설정

해결:
- Production env에 실제 URL 설정 후 재배포

### 9-3. DNS 넣었는데 verify 실패
원인:
- 레코드 host/value 오타
- 잘못된 DNS 공급자에 입력
- MX 자동 덧붙임 이슈

해결:
- nameserver 확인 -> 올바른 DNS에서 재입력
- 필요 시 MX 끝에 `.` 추가
- `dns.email`/`nslookup`으로 공개 전파 확인

---

## 10) 보안/운영 권장사항

- API Key는 `Sending access` 최소권한으로 생성
- 키 노출 시 즉시 revoke + 신규 발급 + Vercel 교체
- 30일 이상 미사용 키 삭제
- 발송량 급증/반송률 상승 모니터링
- 민감한 인증 메일은 open/click tracking 최소화 검토

---

## 11) 배포 전 최종 체크리스트

- [ ] Resend 도메인 `verified`
- [ ] `RESEND_API_KEY`(Production) 설정
- [ ] `APP_BASE_URL`(Production) 설정
- [ ] 재배포 완료
- [ ] 회원가입 -> 메일 수신 -> 인증 -> 로그인까지 1회 실검증 완료
- [ ] 비밀번호 재설정 요청 -> 메일 수신 -> reset 완료까지 1회 실검증 완료
- [ ] 키/도메인 운영자 계정 2FA 활성화

---

## 12) 참고 링크 모음

- Resend Pricing: https://resend.com/pricing
- Resend Domains Intro: https://resend.com/docs/dashboard/domains/introduction
- Resend API Keys Intro: https://resend.com/docs/dashboard/api-keys/introduction
- Resend Domain Verify Troubleshooting: https://resend.com/docs/knowledge-base/what-if-my-domain-is-not-verifying
- Resend Subdomain Recommendation: https://resend.com/docs/knowledge-base/is-it-better-to-send-emails-from-a-subdomain-or-the-root-domain
- Vercel Environment Variables: https://vercel.com/docs/environment-variables

---

## 13) DNS 공급자별 입력 가이드(실전)

아래는 Resend가 준 레코드를 각 DNS 콘솔에 넣는 순서입니다.
실제 `Name/Host`, `Type`, `Value`, `Priority`는 Resend 화면 값을 그대로 사용하세요.

### 13-1) Cloudflare

1. Cloudflare -> 해당 도메인 선택 -> `DNS` -> `Records`
2. Resend에서 제공한 레코드 각각 `Add record`
   - Type: TXT/MX/CNAME(Resend 안내값 기준)
   - Name/Content: Resend 값 그대로
   - TTL: Auto
3. CNAME 레코드는 `Proxy status`를 `DNS only`(회색 구름)로 설정
4. 저장 후 Resend 도메인 화면에서 `Verify`

체크 포인트:
- MX/CNAME가 프록시(주황 구름)로 켜져 있으면 인증 실패 가능

### 13-2) AWS Route53

1. AWS Console -> Route53 -> `Hosted zones` -> 도메인 선택
2. `Create record`로 Resend 레코드 추가
   - TXT는 값 전체를 정확히 붙여넣기
   - MX는 `priority value` 형식 확인
3. 모든 레코드 저장 후 Resend에서 `Verify`

체크 포인트:
- 같은 이름의 SPF TXT를 중복 생성하지 않도록 주의

### 13-3) 가비아(또는 국내 등록업체 기본 DNS)

1. 도메인 관리 -> DNS 관리(레코드 관리)
2. Resend 레코드 1개씩 추가
   - 호스트/타입/값/우선순위를 그대로 입력
3. 저장 후 10~30분 대기 후 Resend `Verify`

체크 포인트:
- MX 값이 자동으로 도메인 suffix가 붙으면 끝에 `.`을 붙여 재입력
- 실제 네임서버가 가비아가 아닐 수 있으니 먼저 nameserver 확인

---

## 14) 실제 입력용 워크시트(복붙 템플릿)

아래 표를 먼저 채운 뒤 DNS 콘솔 입력하면 실수율이 크게 줄어듭니다.

| 항목 | 값 |
|---|---|
| 발송 도메인 | (예: `mail.townpet.dev`) |
| DNS 공급자 | (Cloudflare/Route53/가비아/기타) |
| 네임서버 실제 관리 위치 | |
| Resend SPF(TXT) Name | |
| Resend SPF(TXT) Value | |
| Resend DKIM(TXT) Name | |
| Resend DKIM(TXT) Value | |
| Resend MX Name | |
| Resend MX Value/Priority | |
| Vercel `RESEND_API_KEY` 반영 여부 | |
| Vercel `APP_BASE_URL` 반영 여부 | |
| 재배포 완료 여부 | |

---

## 15) DNS 전파/정합 확인 명령어

아래는 터미널에서 공개 DNS 반영 상태를 확인할 때 사용합니다.

```bash
nslookup -type=TXT resend._domainkey.<your-domain>
nslookup -type=TXT send.<your-domain>
nslookup -type=MX send.<your-domain>
```

예시:

```bash
nslookup -type=TXT resend._domainkey.mail.townpet.dev
nslookup -type=TXT send.mail.townpet.dev
nslookup -type=MX send.mail.townpet.dev
```

또는 브라우저에서 `https://dns.email` 사용.
