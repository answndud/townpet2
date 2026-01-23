# security_basic.md — 보안 기본 체크리스트 (TownPet, Next.js/TypeScript 기반)

> 목적: TownPet(Next.js + Auth.js/NextAuth + Prisma + Postgres + Upstash Redis + R2/S3)의 **MVP~확장 단계**에서 반드시 지켜야 할 보안 기본을 “실행 가능한 체크리스트”로 정리한다.
> 원칙: **세션 우선(단순/안전)** → 필요할 때만 토큰 확장, 그리고 “기능보다 운영/어뷰징 방어가 먼저”.

---

## 0) 결론(짧게)

* MVP는 **세션 기반(Auth.js/NextAuth) + 안전한 쿠키 설정 + CSRF 기본값**으로 간다.
* 리스크가 큰 축은 **어뷰징(스팸/스크래핑/사기/도배)**과 **파일 업로드/링크/연락처 노출**이다.
* “보안 기능”보다 더 중요한 건 **정책(가입/활동/동네 인증/제재) + 레이트리밋 + 감사로그**다.

---

## 1) 인증/인가 (Authentication & Authorization)

### 1.1 권장 기본(MVP)

* **Auth.js/NextAuth 세션 기반**(DB 세션 또는 JWT 세션 중 하나를 명확히 선택)

  * 쿠키: `HttpOnly`, `Secure`, `SameSite=Lax` 기본
  * 운영 환경에서 `NEXTAUTH_URL`, `NEXTAUTH_SECRET` 필수
* OAuth 로그인(카카오/구글 등)

  * **callback/redirect URL 고정**(동적 redirect 금지)
  * 계정 연결(Account linking) 정책 명확화(이메일 충돌/동일인 문제)

### 1.2 인가(권한) 설계(필수)

* **RBAC(역할)**: `USER / MODERATOR / ADMIN` (스키마에 이미 존재)
* **리소스 기반 권한 체크**: “작성자 본인만 수정/삭제”, “관리자만 제재/복구”
* Next.js Route Handler / Server Action에서 권한을 “중앙 함수”로 강제:

  * `requireAuth()`, `requireRole()`, `requireOwnership(resource)`

### 1.3 민감 액션 추가 정책(필수)

아래는 기능 자체보다 “악용 방지”가 1순위다.

* 실종 알림 생성, Care 요청/수락, Market 등록/거래 상태 변경, 신고 남용 등
* 추천 정책(조합 가능)

  * 가입 후 경과 시간(예: 72시간) 또는 활동 기준(게시/댓글/인증)
  * 동네 인증(선택) 또는 신뢰 점수
  * 전화번호/이메일 검증(필요 시) — 단, 개인정보 처리 문서와 연동

---

## 2) 세션/쿠키/CSRF

### 2.1 쿠키 보안 기본값

* `Secure`(HTTPS only), `HttpOnly`, `SameSite=Lax` 권장
* 세션 수명(예: 7~30일)과 갱신 정책 문서화
* 로그아웃 시 세션 무효화(서버/DB 기준) 확인

### 2.2 CSRF

* **SameSite=Lax + CSRF 토큰** 조합 유지(프레임워크 기본 동작 확인)
* “상태 변경”은 POST/PUT/DELETE만 허용
* 외부 도메인에서 오는 요청(Origin/Referer) 검사(특히 Route Handler)

### 2.3 CORS

* 기본은 **동일 출처만 허용**
* API 공개가 필요해지면:

  * 허용 Origin 화이트리스트
  * `GET`만 공개, 쓰기 요청은 인증+CSRF+Origin 검증

---

## 3) 입력 검증 & XSS/Injection

### 3.1 서버 검증이 기준

* Zod 스키마로 **Route Handler/Server Action** 입력 검증 강제
* “클라이언트 검증”은 UX일 뿐 보안 수단이 아님

### 3.2 XSS 방지

* React의 기본 escaping에 의존하되,
* 사용자 본문에 HTML/마크다운을 허용할 경우:

  * **서버에서 sanitize**(허용 태그/속성 화이트리스트)
  * 링크는 `rel="noopener noreferrer"` 강제
  * 이미지/iframe 임베드는 기본 금지(MVP)

### 3.3 SQL/ORM 관련

* Prisma를 사용하더라도 `queryRaw` 사용은 최소화
* `queryRaw` 사용 시 파라미터 바인딩만 허용(문자열 결합 금지)

### 3.4 SSRF/URL 입력

* 사용자가 URL을 넣는 기능(링크 첨부/미리보기)이 있으면:

  * 서버에서 URL fetch 금지(또는 allowlist)
  * 내부망/메타데이터 IP 차단(169.254.169.254 등)

---

## 4) 업로드/첨부파일 보안 (R2/S3/UploadThing)

### 4.1 업로드 정책(필수)

* 파일 크기 제한(예: 이미지 5~10MB)
* MIME/확장자 이중 검사
* 파일명은 서버에서 랜덤 키로 재발급(사용자 원본명 그대로 저장 금지)
* 이미지 EXIF 제거(privacy 문서와 일관)

### 4.2 저장소 권한

* 버킷은 기본 **private**
* 다운로드는 **서명 URL(만료 1~10분)** 또는 인증된 프록시 엔드포인트
* 업로드는 presigned URL 사용 시:

  * 만료 짧게
  * content-type, size 조건을 서명에 포함

### 4.3 콘텐츠 악용 방지

* 공개 이미지 핫링크/대량 다운로드 방지(레이트리밋)
* 신고된 이미지 즉시 비노출/접근 차단(soft delete + CDN purge 고려)

---

## 5) 어뷰징 방지 (Rate Limit / Abuse Controls)

### 5.1 레이트리밋(Upstash Ratelimit 권장)

* 기준 키: `userId` 우선 + 보조로 `IP` (로그인 전은 IP 중심)
* 엔드포인트별 제한(초안)

| 구분     | 엔드포인트 예       | 제한(권장 시작점) |
| ------ | ------------- | ---------- |
| 인증     | 로그인/콜백 실패     | 5회/분/IP    |
| 글쓰기    | 게시물 생성        | 10회/시간/유저  |
| 댓글     | 댓글 생성         | 30회/시간/유저  |
| 검색     | 검색 API        | 60회/분/IP   |
| 신고     | 신고 생성         | 10회/일/유저   |
| 실종 알림  | Lost&Found 생성 | 3회/일/유저    |
| Care   | 요청 생성         | 5회/일/유저    |
| Market | 등록 생성         | 10회/일/유저   |
| 파일 업로드 | 업로드 요청        | 20회/시간/유저  |

> 운영하면서 조정. MVP는 “느슨하게 시작”하면 바로 스팸에 잠식된다.

### 5.2 콘텐츠 정책 기반 방어(필수)

* 연락처/외부 링크 도배 방지:

  * 본문에서 전화번호/카톡ID 패턴 탐지 → 경고/마스킹/제한
  * 신규 계정은 링크 금지(또는 1개 이하)
* 스크래핑 방지:

  * 무한 스크롤 API에 커서 기반 + 레이트리밋
  * “동일 IP로 페이지네이션 폭주” 탐지 시 차단
* 신고 남용:

  * 동일 타겟 반복 신고 제한
  * 허위 신고 누적 시 제재(쿨다운)

---

## 6) 로깅/감사(Audit) & 모니터링

### 6.1 반드시 남길 보안 이벤트

* 로그인 실패/과도 시도/계정 잠금
* 권한 없는 접근 시도(403) 빈도
* 제재(차단/정지/해제) 및 사유
* 신고 처리(접수/조치/기각)
* 실종 알림 생성/종료
* Market 거래 상태 변경(분쟁 핵심)
* Care 요청/수락/취소(분쟁 핵심)

### 6.2 감사로그 원칙

* 관리자 조치는 **누가/언제/무엇을/왜** 했는지 기록
* L2~L3 데이터 접근(증빙 이미지 등)은 사유/티켓 기반 접근 + 로그

### 6.3 모니터링

* Sentry:

  * PII 마스킹(요청 바디/헤더 민감값 수집 금지)
* Uptime 체크(헬스 엔드포인트는 민감정보 없이)

---

## 7) 보안 헤더 & 브라우저 방어

권장 보안 헤더(Next.js에서 적용):

* `Content-Security-Policy` (초기엔 최소 정책이라도)
* `X-Frame-Options: DENY` 또는 CSP frame-ancestors
* `X-Content-Type-Options: nosniff`
* `Referrer-Policy: strict-origin-when-cross-origin`
* `Permissions-Policy` (geolocation 등 필요 최소만)

> CSP는 한번에 강하게 걸면 깨지기 쉬움 → MVP는 “최소 CSP”부터 시작하고 점진 강화.

---

## 8) 비밀값/환경변수/키 관리

* `.env.local`은 로컬 전용, 배포 환경은 Vercel Secrets 사용
* `NEXTAUTH_SECRET`은 충분히 강한 랜덤 값
* 외부 API 키(카카오/Upstash/R2/Resend/Sentry)는 권한 최소화(필요 스코프만)

### 8.1 키 회전(필수 계획)

* OAuth Client Secret/Resend/R2 키 등은 정기 교체 가능하도록 운영 문서화
* 사고 시(유출 의심):

  * 즉시 회전 → 기존 키 폐기 → 영향 범위 점검(로그/사용량)

---

## 9) 의존성/취약점 대응(공급망)

* Dependabot(또는 Renovate) 활성화
* 업데이트 정책:

  * **주 1회** 보안 패치 확인(최소 월 1회는 부족할 수 있음)
* `pnpm lockfile` 커밋 고정
* 고위험 패키지(인증/업로드/마크다운 렌더러)는 도입 전 리스크 검토

---

## 10) 테스트(보안 관점 최소 세트)

* 권한 테스트:

  * 본인/타인 수정·삭제 불가 검증
  * 관리자 전용 API 보호 검증
* 입력 검증 테스트:

  * Zod 스키마 우회 시 400 처리
* 레이트리밋 테스트:

  * 로그인/글쓰기/검색 폭주 차단
* 업로드 테스트:

  * 확장자 위장, 대용량, 잘못된 MIME 차단
* 회귀 테스트:

  * “연락처/링크 마스킹” 규칙이 새 UI에서 깨지지 않는지

---

## 11) MVP 단계 보안 “필수 완료” 체크박스

* [ ] Auth.js/NextAuth 세션 + 쿠키 설정(Secure/HttpOnly/SameSite) 확인
* [ ] Route Handler/Server Action 입력 Zod 검증 강제
* [ ] RBAC + 소유권 체크 중앙화(`requireAuth`, `requireRole`, `requireOwnership`)
* [ ] Upstash Ratelimit 적용(로그인/작성/검색/신고/업로드 최소 세트)
* [ ] 업로드: MIME/크기 제한 + private storage + 서명 URL 만료
* [ ] 연락처/외부링크 도배 탐지/제한(신규 계정 정책 포함)
* [ ] 신고/제재/거래상태/Care 수행 등 감사로그 설계
* [ ] Sentry PII 마스킹 설정 + 민감값 로깅 금지
* [ ] 기본 보안 헤더 적용(최소 CSP 포함)
* [ ] Dependabot + 업데이트 루틴 문서화

---

## 12) 확장 시나리오별 추가 보안

### 12.1 API 분리/모바일 앱 확장

* 세션 기반이 어려워지는 구간에서만 토큰 고려
* Access/Refresh 토큰을 도입한다면:

  * Refresh는 안전 저장(HTTPOnly 쿠키 또는 네이티브 보안 저장소)
  * 토큰 폐기/회전/탈취 대응 플로우 문서화

### 12.2 실시간 기능(채팅/푸시)

* 스팸/피싱/외부 유도 방어가 핵심(링크 제한/신고 UI)
* 대화 로그의 PII 혼입 가능성 → 저장기간/접근통제 필수

---

(이후 이 문서를 **TownPet 코드 구조(Next.js App Router)**에 맞춰
* `middleware.ts`(권한/헤더/리다이렉트),
* `lib/security/*`(레이트리밋/검증/감사로그),
* 업로드 엔드포인트(서명 URL 발급/검증),
* 감사로그 Prisma 모델(예: `AuditLog`)
  까지 “바로 붙여넣을 수 있는” 설계로 내려서 작성.)
