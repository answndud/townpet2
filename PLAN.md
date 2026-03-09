# PLAN.md

기준일: 2026-03-09
목표: TownPet를 기능/운영/품질 기준에서 "완성도 높은 커뮤니티" 상태로 끌어올린다.

## 운영 규칙
- 세션 시작: `PLAN.md` + `PROGRESS.md` 먼저 확인
- 읽기 순서: `pending`/`in_progress`/`blocked` 사이클 먼저 확인
- 작업 시작: 대상 항목 상태를 `in_progress`로 변경
- 작업 종료: `PROGRESS.md`에 결과/검증/블로커 기록 후 `PLAN.md` 상태 갱신
- 사이클 내 모든 작업이 `done`이면 제목에 `(완료)` 표시
- 블로커 발생: 두 파일 모두 즉시 반영 (`PLAN=계획 수정`, `PROGRESS=이슈 기록`)

## 범위 원칙
- 우선순위: `서비스 안정성 -> 커뮤니티 핵심 기능 -> 재방문/유입 -> 운영 자동화`
- Phase 2 보류: 마켓/케어/결제/공동구매/카카오맵은 Phase 1 완료 후 착수

## 현재 우선순위
1. 런치 준비 갭 정리: 공개 SEO/metadata/sitemap, 로딩/빈상태 polish, 보안 헤더/coverage 증거 보강
2. 운영 안정화: 무료 주간 10분 루틴 정착(health/log/manual smoke)
3. 운영 문서 유지: Vercel/OAuth/Secrets/데이터 관리 가이드 최신 상태 유지
4. `oauth-real-e2e` 워크플로우 실시크릿 1회 PASS 기록 완료
5. `ops-smoke-checks` 워크플로우 실배포 URL health PASS 기록 완료 (Sentry 검증은 선택)
6. 품종 기반 개인화/광고/커뮤니티 기능 PRD 확정 및 구현 사이클 착수
7. 보안 하드닝 트랙 분리 운영: `docs/security/*` 백로그/리스크/진행 로그 상시 동기화

## Active Plan

### Cycle 241: 병원후기 구조화 moderation 하드닝 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 병원후기 구조화 필드에 금칙어/연락처 정책 적용 | Codex | P0 | `done` | `hospitalName`, `treatmentType`가 게시글 본문과 동일하게 금칙어/연락처 정책 적용을 받고, 회귀 테스트가 추가된다 | `PLAN.md`, `PROGRESS.md`, `app/src/server/services/post.service.ts`, `app/src/server/services/post-create-policy.test.ts` |
| 실종/목격 구조화/비회원 제보 과장 claim 저장소 내 live copy 감사 | Codex | P1 | `done` | live 문서/코드에서 실제 구현 범위를 넘는 구조화/비회원 제보 claims 존재 여부를 확인하고 필요한 수정 또는 `no live change` 결론을 `PROGRESS.md`에 남긴다 | `PLAN.md`, `PROGRESS.md`, `docs/**`, `app/src/**` |

### Cycle 240: external naming cutover 실배포 검증 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `townpet.vercel.app` cutover와 old domain redirect를 실배포 응답으로 확인 | Codex | P0 | `done` | 새 운영 URL이 200으로 응답하고 `/api/health`가 `ok`, old `townpet2.vercel.app`는 새 도메인으로 redirect되며 제공된 Vercel deployment 링크도 접근 가능함 | `PLAN.md`, `PROGRESS.md`, Vercel production, `/api/health` |

### Cycle 239: 프로젝트 식별자 잔존 문자열 감사 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `townpet` 메인 repo 기준 legacy 식별자 잔존 여부를 감사하고 예외를 명시 | Codex | P0 | `done` | repo 전체에서 `townpet2`, `townpet-springboot`, old GitHub/path 식별자를 스캔해 live 코드/문서/워크플로우에 남은 오염이 없음을 확인하고, 유일한 historical record 예외는 문서에 명시됨 | `PLAN.md`, `PROGRESS.md`, `docs/operations/캐시_성능_적용_기록.md` |

### Cycle 238: Legacy Spring Boot 식별자 분리 + Next.js 메인 repo를 `townpet`으로 복원 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| Next.js 메인 workspace/repo를 `townpet`으로 확정하고 legacy Spring Boot 이름과 분리 | Codex | P0 | `done` | GitHub repo remote가 `answndud/townpet`를 가리키고, 로컬 workspace 경로와 운영 문서의 절대 경로/Actions repo 예시가 `townpet` 기준으로 정리되며 공개 도메인 `townpet.vercel.app`은 그대로 유지되고 이 repo 안에 `townpet-springboot` 참조가 남지 않음 | `PLAN.md`, `PROGRESS.md`, `.git/config`, `docs/**`, `app/scripts/generate-oauth-manual-check-report.ts` |

### Cycle 237: `townpet2` -> `townpet` 식별자 정리 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 기본 배포 URL/운영 문서/자동 생성 스크립트의 `townpet2` 식별자 제거 | Codex | P0 | `done` | repo 내부 기본 배포 URL, ops workflow fallback, growth/oauth handoff 스크립트, 주요 운영 문서가 `townpet.vercel.app` 기준으로 정리되고 검증 산출물도 새 이름을 사용함 | `.github/workflows/*`, `app/scripts/*`, `docs/business/*`, `docs/operations/*`, `PROGRESS.md` |

### Cycle 236: 실배포 health/ops 직접 검증 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| production runtime health와 최근 ops smoke 직접 확인 | Codex | P0 | `done` | 실배포 `https://townpet2.vercel.app` 기준 `/api/health`와 루트 응답 헤더를 직접 확인하고, 최신 `ops-smoke-checks` run에서 deployment health/internal token/pg_trgm/Sentry 검증 성공 여부를 교차 확인함 | `PROGRESS.md`, `docs/operations/manual-checks/배포_보안_체크리스트.md`, GitHub Actions `ops-smoke-checks` |

### Cycle 235: 배포 전 preflight 검증 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| production env strict preflight/build/health 검증 | Codex | P0 | `done` | local `.env` 누락과 무관하게 production placeholder env 기준 `ops:check:security-env:strict`, `build`, 가능하면 built app health까지 재현해 코드 레벨 배포 가능 여부와 실제 시크릿 미설정 항목을 분리 기록함 | `app/scripts/check-security-env.ts`, `app/scripts/vercel-build.ts`, `app/src/lib/env.ts`, `docs/operations/manual-checks/배포_보안_체크리스트.md`, `PROGRESS.md` |

### Cycle 234: 런치 smoke 재검증 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 로컬 E2E smoke 환경 복구 및 재실행 | Codex | P1 | `done` | Playwright Chromium/browser prerequisite와 로컬 Postgres를 맞춘 뒤 `pnpm -C app test:e2e:smoke`가 통과하고, flaky하던 feed loading smoke는 현재 streaming 완료 시간을 반영해 안정화됨 | `docker-compose.yml`, `app/e2e/feed-loading-skeleton.spec.ts`, `PROGRESS.md` |

### Cycle 233: 런치 준비 갭 재정렬 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 공개 SEO 경로/메타데이터 정합화 | Codex | P0 | `done` | `/posts/[id]`와 `/posts/[id]/guest` 메타 전략이 public route 기준으로 일관되고, guest indexable 경로만 sitemap에 포함되며 `/bookmarks`, `/notifications`, `/profile`, `/lounges/breeds/[breedCode]` 메타가 추가됨 | `app/src/app/posts/[id]/page.tsx`, `app/src/app/posts/[id]/guest/page.tsx`, `app/src/app/sitemap.ts`, `app/src/app/bookmarks/page.tsx`, `app/src/app/notifications/page.tsx`, `app/src/app/profile/page.tsx`, `app/src/app/lounges/breeds/[breedCode]/page.tsx` |
| 페이지 로딩/빈상태/공유 UX 마감 | Codex | P1 | `done` | 텍스트 placeholder(`EMPTY`, `NO IMG`)가 아이콘/일러스트 기반으로 교체되고, `search`/`notifications`/`bookmarks`/품종 라운지 계열 라우트에 필요한 `loading.tsx`가 추가되며 공유 드롭다운이 외부 클릭/포커스 이탈 시 닫힘 | `app/src/components/ui/empty-state.tsx`, `app/src/app/profile/page.tsx`, `app/src/components/posts/post-share-controls.tsx`, `app/src/app/search`, `app/src/app/notifications`, `app/src/app/bookmarks`, `app/src/app/lounges/breeds` |
| 런치 하드닝 증거 보강 | Codex | P1 | `done` | `HSTS`/최소 `Permissions-Policy`가 코드에 추가되고, coverage 실행 경로가 `package.json`/CI에 반영되며, 기존 런북은 중복 작성 대신 rollback/backup/email 대응 드릴 결과 중심으로 보강됨 | `app/src/lib/security-headers.ts`, `app/package.json`, `.github/workflows/quality-gate.yml`, `docs/operations/장애 대응 런북.md`, `docs/operations/Resend_Vercel_이메일_설정_가이드.md`, `PROGRESS.md` |

### Cycle 232: 소셜 로그인 프로필 비밀번호 버튼 숨김 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 카카오/네이버 로그인 세션의 비밀번호 관리 비노출 정책 추가 | Codex | P1 | `done` | `/profile`에서 현재 로그인 방식이 카카오/네이버인 경우 비밀번호 변경/설정 버튼이 숨겨지고 안내 문구가 노출됨 | `app/src/app/profile/page.tsx`, `app/src/lib/password-management.ts`, `app/src/server/queries/user.queries.ts` |
| `/password/setup` 직접 접근 가드 및 세션 provider 전달 정리 | Codex | P1 | `done` | JWT/session에 현재 auth provider가 유지되고, 카카오/네이버 세션이 `/password/setup`에 직접 접근하면 `/profile`로 되돌아가며 notice가 표시됨 | `app/src/lib/auth.ts`, `app/src/types/next-auth.d.ts`, `app/src/app/password/setup/page.tsx` |

### Cycle 231: 회원가입 name 제거 + User.name 컬럼 삭제 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 이메일 회원가입에서 이름 입력 제거 | Codex | P1 | `done` | `/register` 폼과 validation/service/API가 `email + nickname + password`만 사용하고 관련 회귀 테스트가 존재함 | `app/src/components/auth/register-form.tsx`, `app/src/lib/validations/auth.ts`, `app/src/server/services/auth.service.ts`, `app/src/app/api/auth/register/route.test.ts` |
| User.name 컬럼 및 fallback/search 의존성 제거 | Codex | P1 | `done` | `User.name`이 Prisma schema/adapter/query/UI/search에서 제거되고 OAuth/Auth.js 흐름과 공개 프로필/알림/검색이 nickname 중심으로 동작함 | `app/prisma/schema.prisma`, `app/src/lib/auth.ts`, `app/src/server/**/*.ts`, `app/src/app/**/*.tsx` |

### Cycle 230: 공개 프로필 로그인 게이트 + 공개 범위 설정 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 비회원 공개 프로필 접근 차단과 로그인 안내 추가 | Codex | P1 | `done` | 비회원이 `/users/{id}` 접근 시 로그인 페이지로 리다이렉트되고 `프로필을 보려면 로그인` 안내가 노출됨 | `app/src/app/users/[id]/page.tsx`, `app/src/components/auth/login-form.tsx`, `app/src/lib/public-profile.ts` |
| 프로필 공개 범위 설정 저장/반영 | Codex | P1 | `done` | `/profile`에서 게시글/댓글/반려동물 공개 여부를 각각 저장할 수 있고, `/users/{id}`에서 각 섹션과 활동 탭이 설정에 맞게 노출/비공개 처리됨 | `app/prisma/schema.prisma`, `app/src/components/profile/profile-info-form.tsx`, `app/src/server/services/user.service.ts`, `app/src/server/queries/user.queries.ts` |

### Cycle 229: 피드 카드 메타 우측 정렬 + 피드 북마크 제거 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 피드 카드 메타를 우측 컬럼으로 재배치 | Codex | P1 | `done` | 모바일/피드형 목록에서 작성자, 작성일, 조회, 반응 메타가 제목 아래가 아니라 우측 컬럼에 정렬되어 카드 높이가 더 낮아짐 | `app/src/components/posts/feed-infinite-list.tsx`, `app/src/lib/feed-list-presenter.ts` |
| 피드 목록 북마크 CTA 제거 및 관련 안내 문구 정리 | Codex | P1 | `done` | `/feed`와 라운지/게스트 피드형 목록에서 북마크 버튼이 사라지고 북마크 목록 안내 문구가 `상세에서 북마크` 기준으로 정리됨 | `app/src/components/posts/feed-infinite-list.tsx`, `app/src/app/feed/page.tsx`, `app/src/components/posts/guest-feed-page-client.tsx`, `app/src/app/lounges/breeds/[breedCode]/page.tsx`, `app/src/app/bookmarks/page.tsx` |

### Cycle 228: 모바일 피드 카드 밀도 재정리 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 모바일 게시글 카드 메타/액션 압축 | Codex | P1 | `done` | 모바일 `/feed` 목록에서 게시글 카드가 제목 중심 밀도로 재정리되고, 날짜/조회/반응은 한 줄 메타로 합쳐지며 북마크 액션은 같은 행의 소형 토글로 축소됨 | `app/src/components/posts/feed-infinite-list.tsx`, `app/src/components/posts/post-bookmark-button.tsx`, `app/src/lib/feed-list-presenter.ts` |
| 모바일 피드 상단 빠른 이동 영역 높이 축소 | Codex | P2 | `done` | 모바일 `/feed` 첫 화면에서 게시판 빠른 이동이 기본 접힘형으로 바뀌고 현재 피드 경로에서는 중복 링크가 사라져 첫 뷰포트에 게시글이 더 빨리 노출됨 | `app/src/components/navigation/feed-hover-menu.tsx`, `app/src/components/navigation/app-shell-header.tsx` |

### Cycle 227: 비로그인 피드 CSP hydration 장애 복구 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| production CSP를 hydration-safe fallback으로 조정 | Codex | P1 | `done` | production에서 nonce 기반 enforce CSP가 Next inline bootstrap을 막지 않도록 enforce는 static fallback, strict nonce 정책은 report-only로 분리됨 | `app/src/lib/security-headers.ts`, `app/middleware.ts`, `app/next.config.ts` |
| CSP 회귀 테스트와 실배포 비로그인 검증 | Codex | P1 | `done` | `security-headers`/`middleware` 테스트가 현재 정책을 고정하고, 실배포 `/feed` 비로그인 desktop/mobile에서 blank screen의 원인이던 CSP console error가 재현되지 않음 | `app/src/lib/security-headers.test.ts`, `app/src/middleware.test.ts`, `PROGRESS.md` |

### Cycle 226: 프로필 활동 카드 링크 정렬 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 프로필 상단 활동 요약을 카드 클릭형 진입으로 정리 | Codex | P1 | `done` | `/profile` 상단의 북마크/내 작성글 요약이 별도 `tp-btn-soft` 버튼 없이 카드 전체 클릭으로 `/bookmarks`, `/my-posts`에 진입함 | `app/src/app/profile/page.tsx`, `app/src/components/profile/profile-summary-link-card.tsx` |
| 계정 정보 카드의 작성글 CTA 제거 및 운영 문서 동기화 | Codex | P2 | `done` | 계정 정보 카드에서는 작성글 링크가 제거되고 운영 문서가 `/my-posts`, `/bookmarks` 진입점을 현재 UI 기준으로 안내함 | `app/src/app/profile/page.tsx`, `docs/개발_운영_가이드.md`, `docs/operations/운영_문서_안내.md`, `PLAN.md`, `PROGRESS.md` |

### Cycle 225: 북마크 네이밍/진입 경로 정렬 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 게시글 북마크 기능 사용자 노출 네이밍 정렬 | Codex | P1 | `done` | 버튼/빈상태/피드 설명/관리 정책 화면에서 `저장` 표현이 bookmark 기능 문맥에선 `북마크`로 통일됨 | `app/src/components/posts/post-bookmark-button.tsx`, `app/src/lib/feed-personalization.ts`, `app/src/app/admin/policies/page.tsx`, `app/src/components/admin/feed-personalization-policy-form.tsx` |
| 기본 진입 경로를 `/bookmarks`로 전환하고 `/saved` 호환 리다이렉트 추가 | Codex | P1 | `done` | 북마크 목록의 기본 경로가 `/bookmarks`가 되고, 기존 `/saved` 접근은 쿼리를 유지한 채 `/bookmarks`로 이동하며 관련 테스트가 존재함 | `app/src/app/bookmarks/page.tsx`, `app/src/app/saved/page.tsx`, `app/src/app/saved/page.test.tsx`, `app/src/server/actions/post.ts` |
| 프로필 북마크 CTA 위치/문서 정합화 | Codex | P2 | `done` | 프로필 계정 정보 카드에서 북마크 링크가 제거되고 활동 요약 카드/운영 문서/PLAN/PROGRESS가 새 네이밍과 경로를 반영함 | `app/src/app/profile/page.tsx`, `docs/개발_운영_가이드.md`, `docs/operations/*`, `PLAN.md`, `PROGRESS.md` |

### Cycle 224: 운영 문서 drift sync (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| production env/email/upload 운영 문서 기준선 동기화 | Codex | P1 | `done` | `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `UPSTASH_REDIS_REST_*`의 production 필수 여부와 메일 fail-fast 동작이 운영 문서와 모순되지 않음 | `docs/개발_운영_가이드.md`, `docs/operations/Resend_Vercel_이메일_설정_가이드.md`, `docs/operations/Vercel_OAuth_초기설정_가이드.md` |
| migration 장애 복구 + Neon 검증 절차 문서화 | Codex | P1 | `done` | `P3005`, `P3009`, `_prisma_migrations`, enum 확인 절차를 운영자가 `docs/`만 보고 재현할 수 있음 | `docs/개발_운영_가이드.md` |
| 사이클 종료 루틴/targeted test/운영 화면 안내 보강 | Codex | P2 | `done` | cycle close 루틴, changed-file 기준 검증 명령, `/admin/*` 및 `/bookmarks` 운영 화면 안내가 `docs/operations`와 공용 기술 문서에 반영됨 | `docs/operations/에이전트_운영_가이드.md`, `docs/operations/운영_문서_안내.md`, `docs/제품_기술_개요.md` |

### Cycle 223: 개인화 튜닝 정책 설정화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| feed personalization tuning policy 모델/validation/query/service 추가 | Codex | P1 | `done` | `SiteSetting` 기반으로 recent signal decay, personalized ratio/threshold, click/ad/dwell/bookmark multiplier+cap을 저장/조회할 수 있고 validation/query 테스트가 존재함 | `app/src/lib/feed-personalization-policy.ts`, `app/src/lib/validations/policy.ts`, `app/src/server/queries/policy.queries.ts`, `app/src/server/services/policy.service.ts` |
| 관리자 정책 화면에 개인화 튜닝 편집 UI 추가 | Codex | P1 | `done` | `/admin/policies`에서 운영자가 개인화 튜닝 정책을 수정할 수 있고 성공/실패 메시지가 노출됨 | `app/src/app/admin/policies/page.tsx`, `app/src/components/admin/feed-personalization-policy-form.tsx`, `app/src/server/actions/policy.ts` |
| personalized feed ranking에 tuning policy 적용 | Codex | P1 | `done` | recent click/ad/dwell/bookmark boost와 personalized/explore blend가 정책값을 사용하고 회귀 테스트/제품 문서가 동기화됨 | `app/src/server/queries/post.queries.ts`, `app/src/server/queries/post.queries.test.ts`, `docs/product/품종_개인화_기획서.md` |

### Cycle 222: 북마크(bookmark) 기반 7차 개인화 신호 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| PostBookmark 스키마 + 북마크/해제 UI/액션 추가 | Codex | P1 | `done` | 인증 사용자가 피드/상세에서 게시글을 북마크/해제할 수 있고 `PostBookmark` 스키마, 서비스, 액션, 회귀 테스트가 존재함 | `app/prisma/schema.prisma`, `app/src/server/services/post.service.ts`, `app/src/server/actions/post.ts`, `app/src/components/posts/*` |
| 북마크 목록 페이지 추가 | Codex | P2 | `done` | `/bookmarks`에서 북마크한 글을 페이지네이션/검색/카테고리 필터와 함께 조회할 수 있고 프로필에서 진입 가능함 | `app/src/server/queries/post.queries.ts`, `app/src/app/bookmarks/page.tsx`, `app/src/app/profile/page.tsx` |
| recent bookmark signal을 personalized ranking 7차 가중치와 피드 설명에 연결 | Codex | P1 | `done` | personalized feed가 최근 북마크한 글의 커뮤니티/관심 태그를 7차 신호로 약하게 반영하고 `/feed` 설명/제품 문서가 동기화됨 | `app/src/server/queries/post.queries.ts`, `app/src/lib/feed-personalization.ts`, `app/src/app/feed/page.tsx`, `docs/product/품종_개인화_기획서.md` |

### Cycle 221: 상세 체류시간 기반 6차 개인화 신호 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| personalized event log에 post dwell 신호 추가 | Codex | P1 | `done` | 게시글 상세에서 일정 체류시간 이상 머문 authenticated viewer에 대해 `POST_DWELL` 이벤트가 기록되고 schema/route/service 테스트가 존재함 | `app/prisma/schema.prisma`, `app/src/app/api/feed/personalization/route.ts`, `app/src/server/services/feed-personalization-metrics.service.ts`, `app/src/components/posts/*` |
| recent dwell signal을 personalized ranking 6차 가중치와 피드 설명에 연결 | Codex | P1 | `done` | personalized feed가 최근 오래 읽은 게시글의 petType/관심 태그를 6차 신호로 약하게 반영하고 `/feed` 설명/제품 문서가 동기화됨 | `app/src/server/queries/post.queries.ts`, `app/src/lib/feed-personalization.ts`, `app/src/app/feed/page.tsx`, `docs/product/품종_개인화_기획서.md` |

### Cycle 220: 최근 클릭/광고 반응 기반 5차 개인화 신호 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| personalized feed 계측에 user-level click/ad log 저장소 추가 | Codex | P1 | `done` | `/api/feed/personalization`가 aggregate 통계와 별도로 최근 게시글 클릭/광고 클릭 로그를 사용자 단위로 저장하고 스키마/route/service 테스트가 존재함 | `app/prisma/schema.prisma`, `app/src/app/api/feed/personalization/route.ts`, `app/src/server/services/feed-personalization-metrics.service.ts` |
| recent click/ad response를 personalized ranking 5차 신호와 피드 설명에 연결 | Codex | P1 | `done` | personalized feed가 최근 클릭/광고 반응 로그를 recency-weighted 5차 신호로 약하게 반영하고 `/feed` 설명/제품 문서가 동기화됨 | `app/src/server/queries/post.queries.ts`, `app/src/lib/feed-personalization.ts`, `app/src/app/feed/page.tsx`, `docs/product/품종_개인화_기획서.md` |

### Cycle 219: 최근 반응 기반 4차 개인화 신호 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 최근 좋아요/싫어요 반응을 personalized ranking 4차 가중치로 연결 | Codex | P1 | `done` | 최근 post reaction에서 추출한 커뮤니티/관심 태그 신호가 personalized feed에 약한 4차 boost 또는 suppress로 반영되고 회귀 테스트가 존재함 | `app/src/server/queries/post.queries.ts`, `app/src/server/queries/post.queries.test.ts`, `app/prisma/schema.prisma` |
| 피드 개인화 설명에 최근 반응 신호 노출 | Codex | P2 | `done` | `/feed` 맞춤 추천 설명이 최근 반응 기반 4차 신호를 함께 안내하고 문서가 동기화됨 | `app/src/lib/feed-personalization.ts`, `app/src/lib/feed-personalization.test.ts`, `app/src/app/feed/page.tsx`, `docs/product/품종_개인화_기획서.md` |

### Cycle 218: 활동 태그/콘텐츠 카테고리 3차 개인화 신호 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 선호 커뮤니티 태그를 personalized ranking 3차 가중치로 연결 | Codex | P1 | `done` | preferred community의 `tags`와 post `type/reviewCategory/petType.tags` 기반 콘텐츠 신호가 personalized feed에 약한 3차 boost로 반영되고 회귀 테스트가 존재함 | `app/src/server/queries/post.queries.ts`, `app/src/server/queries/post.queries.test.ts`, `app/src/server/queries/community.queries.ts` |
| 피드 개인화 설명에 관심 태그/콘텐츠 카테고리 신호 노출 | Codex | P2 | `done` | `/feed` 맞춤 추천 설명이 선호 커뮤니티뿐 아니라 관심 태그/콘텐츠 카테고리 3차 신호를 함께 안내하고 문서가 동기화됨 | `app/src/lib/feed-personalization.ts`, `app/src/lib/feed-personalization.test.ts`, `app/src/app/feed/page.tsx`, `docs/product/품종_개인화_기획서.md` |

### Cycle 217: 선호 커뮤니티 기반 2차 개인화 신호 연결 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| preferredPetTypes를 personalized ranking 2차 가중치로 연결 | Codex | P1 | `done` | personalized feed가 viewer의 `preferredPetTypes`와 post `petTypeId` 매치를 추가 신호로 사용하고 회귀 테스트가 존재함 | `app/src/server/queries/post.queries.ts`, `app/src/server/queries/post.queries.test.ts`, `app/src/server/queries/user.queries.ts` |
| 피드 개인화 설명에 선호 커뮤니티 신호 노출 | Codex | P2 | `done` | `/feed` 맞춤 추천 설명이 품종/프로필 신호 외에 선호 커뮤니티 2차 신호를 함께 안내하고 문서가 동기화됨 | `app/src/lib/feed-personalization.ts`, `app/src/lib/feed-personalization.test.ts`, `app/src/app/feed/page.tsx`, `docs/product/품종_개인화_기획서.md` |

### Cycle 216: 혼종/품종 미상 개인화 fallback 고도화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| MIXED/UNKNOWN 세그먼트 신뢰도 및 audience key 보정 | Codex | P1 | `done` | `MIXED`/`UNKNOWN`이 specific breed와 동일한 confidence/target key로 취급되지 않고, 종/체급/생애단계 중심 fallback key와 설명 문구가 반영됨 | `app/src/lib/pet-profile.ts`, `app/src/lib/feed-personalization.ts`, `docs/product/품종_개인화_기획서.md` |
| personalized feed 점수의 generic breed 오인 매치 제거 | Codex | P1 | `done` | personalized feed가 `MIXED`/`UNKNOWN` 동일 code만으로 +0.45를 주지 않고, breed label/size/lifeStage fallback 기반으로 정렬하며 회귀 테스트가 존재함 | `app/src/server/queries/post.queries.ts`, `app/src/server/queries/post.queries.test.ts` |

### Cycle 215: 품종 사전 운영 관리 경로 정착 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| BreedCatalog effective merge semantics 보정 | Codex | P1 | `done` | DB override가 일부만 있어도 default catalog가 species 단위로 사라지지 않고, inactive override는 default/custom entry를 명시적으로 숨길 수 있으며 회귀 테스트가 존재함 | `app/src/lib/breed-catalog.ts`, `app/src/server/queries/breed-catalog.queries.ts`, `app/src/server/queries/breed-catalog.queries.test.ts` |
| moderator용 품종 사전 관리 화면/액션 추가 | Codex | P1 | `done` | `/admin/breeds`에서 품종 사전 entry를 추가/수정/비활성화/삭제할 수 있고 운영 네비게이션/문서가 동기화됨 | `app/src/app/admin/breeds/page.tsx`, `app/src/components/admin/*`, `app/src/server/actions/*`, `app/src/server/services/*`, `docs/product/품종_개인화_기획서.md` |

### Cycle 214: 품종 사전 기반 프로필 입력 정규화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| BreedCatalog fallback/query와 pet service 품종 정규화 연결 | Codex | P1 | `done` | pet create/update가 품종 사전으로 `breedCode`를 검증하고 catalog label을 자동 보정하며 invalid code 실패 테스트가 존재함 | `app/src/lib/breed-catalog.ts`, `app/src/server/queries/breed-catalog.queries.ts`, `app/src/server/services/pet.service.ts`, `app/prisma/seed.ts` |
| 프로필 폼을 품종 선택형 UX로 전환 | Codex | P1 | `done` | `/profile` 반려동물 폼이 species별 품종 옵션을 표시하고 manual breed code 타이핑 없이 선택/직접입력 흐름을 제공함 | `app/src/app/profile/page.tsx`, `app/src/components/profile/pet-profile-manager.tsx`, `docs/product/품종_개인화_기획서.md` |

### Cycle 213: 개인화/광고 반응 지표 계측 정착 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| personalized feed/ad 반응 집계 저장소와 수집 route 추가 | Codex | P1 | `done` | 개인화 피드 조회/포스트 클릭/광고 노출/광고 클릭이 일별 집계 테이블에 저장되고 route/service/query 테스트가 존재함 | `app/prisma/schema.prisma`, `app/src/app/api/feed/personalization/route.ts`, `app/src/server/services/*`, `app/src/server/queries/*` |
| 관리자 개인화 CTR 요약 화면 추가 | Codex | P1 | `done` | `/admin/personalization`에서 최근 개인화 피드/광고 CTR과 상위 audience key를 확인할 수 있고 기존 admin 페이지에서 진입 가능함 | `app/src/app/admin/personalization/page.tsx`, `app/src/app/admin/*.tsx`, `docs/product/품종_개인화_기획서.md` |

### Cycle 212: 맞춤 추천 모드 노출 및 세그먼트 소비 고도화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 피드/라운지에 맞춤 추천 토글과 세그먼트 설명 노출 | Codex | P1 | `done` | `/feed`와 품종 라운지에서 `personalized=1`을 켜는 명시적 UI가 생기고, 맞춤 추천 사용 시 현재 적용 세그먼트 설명이 노출됨 | `app/src/app/feed/page.tsx`, `app/src/app/lounges/breeds/[breedCode]/page.tsx`, `app/src/components/posts/feed-infinite-list.tsx` |
| UserAudienceSegment를 피드 개인화/광고 audience key에 연결 | Codex | P1 | `done` | 피드 개인화와 광고 audience key가 `UserAudienceSegment`를 우선 사용하고 pet fallback만 보조로 남으며 회귀 테스트가 존재함 | `app/src/server/queries/post.queries.ts`, `app/src/server/queries/post.queries.test.ts`, `app/src/server/queries/audience-segment.queries.ts` |

### Cycle 211: 프로필 기반 개인화 신호 활성화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 반려동물 프로필에 품종 코드/체급/생애단계 입력 활성화 | Codex | P1 | `done` | 반려동물 create/update 경로가 `breedCode`, `sizeClass`, `lifeStage`를 저장하고 `/profile`, `/users/[id]`에 동일 정보가 노출됨 | `app/src/lib/validations/pet.ts`, `app/src/server/services/pet.service.ts`, `app/src/components/profile/pet-profile-manager.tsx`, `app/src/app/profile/page.tsx`, `app/src/app/users/[id]/page.tsx` |
| UserAudienceSegment 동기화 + 개인화 세그먼트 조회 경로 추가 | Codex | P1 | `done` | pet 변경 시 `UserAudienceSegment`가 재생성되고 `/api/profile/audience-segments`와 프로필 UI에서 세그먼트 요약을 확인할 수 있음 | `app/src/server/**/*.ts`, `app/src/app/api/profile/audience-segments/route.ts`, `app/src/lib/pet-profile.ts` |

### Cycle 210: 인증 감사 로그 retention 정착 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| auth audit retention helper + cleanup script 정리 | Codex | P1 | `done` | 인증 감사 로그 cleanup이 공용 retention helper를 사용하고 cutoff/입력 검증 테스트가 존재함 | `app/src/server/auth-audit-retention.ts`, `app/scripts/cleanup-auth-audits.ts` |
| auth audit cleanup 운영 workflow/문서 추가 | Codex | P1 | `done` | GitHub Actions로 일일 auth audit cleanup이 실행되고 운영/보안 문서에 180일 보존 기준이 반영됨 | `.github/workflows/auth-audit-cleanup.yml`, `docs/개발_운영_가이드.md`, `docs/security/*` |

### Cycle 209: 배포 보안 pre-deploy gate 완결 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| Vercel production build에 strict security preflight 편입 | Codex | P1 | `done` | `build:vercel`가 production 타깃 배포에서 `ops:check:security-env:strict`를 먼저 실행하고 실패 시 마이그레이션/빌드 전에 종료됨 | `app/scripts/vercel-build.ts`, `app/vercel.json`, `app/package.json` |
| 배포 운영 문서/보안 리스크 상태 동기화 | Codex | P1 | `done` | 운영 가이드와 Vercel 설정 문서가 pre-deploy gate를 설명하고 `R-009`가 mitigated로 닫힘 | `docs/개발_운영_가이드.md`, `docs/operations/*`, `docs/security/*` |

### Cycle 208: 회원가입 abuse defense 현실화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 회원가입 다축 rate-limit + fingerprint 방어 도입 | Codex | P1 | `done` | 회원가입 경로가 IP/fingerprint/email+IP/email 기준 throttling을 적용하고 malformed JSON/중복/요청 제한을 정상 응답으로 surface함 | `app/src/app/api/auth/register/route.ts`, `app/src/server/auth-register-rate-limit.ts`, `app/src/components/auth/register-form.tsx` |
| 회원가입 성공/거절/제한 auth audit 가시화 | Codex | P1 | `done` | 등록 흐름이 auth audit에 `REGISTER_SUCCESS/REJECTED/RATE_LIMITED`를 남기고 관리자 화면/검색에서 운영자가 추적 가능함 | `app/prisma/schema.prisma`, `app/src/server/auth-audit-log.ts`, `app/src/app/admin/auth-audits/page.tsx` |

### Cycle 207: middleware incident defense-in-depth (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 정적 security header fallback 추가 | Codex | P1 | `done` | middleware 미실행 상황에서도 `next.config` 정적 헤더로 최소 CSP/XFO/nosniff/referrer-policy가 유지되고 공용 helper 테스트가 존재함 | `app/next.config.ts`, `app/middleware.ts`, `app/src/lib/security-headers.ts` |
| 닉네임 미설정 사용자 가드의 서버 페이지 이관 | Codex | P1 | `done` | 핵심 authenticated 페이지가 middleware 없이도 `/profile`로 리다이렉트되고 순수 guard helper 테스트가 존재함 | `app/src/lib/nickname-guard.ts`, `app/src/server/nickname-guard.ts`, `app/src/app/**/*.tsx` |

### Cycle 206: guest 상세 작성자 유형 정합화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| guest 작성자 메타 판별 공용 helper 도입 | Codex | P1 | `done` | guest 작성자 여부/이름/IP 표시 규칙이 helper로 통일되고 guest 상세/편집/클라이언트 상세가 같은 기준을 사용함 | `app/src/lib/post-guest-meta.ts`, `app/src/app/posts/[id]/guest/page.tsx`, `app/src/components/posts/post-detail-client.tsx`, `app/src/app/posts/[id]/edit/page.tsx` |
| 회원 작성 글의 guest detail 제어 UI 비노출 | Codex | P1 | `done` | 비로그인 guest 상세 페이지에서도 실제 guest 글에만 비회원 수정/삭제 UI가 노출되고 회귀 테스트가 존재함 | `app/src/app/posts/[id]/guest/page.tsx`, `app/src/components/posts/guest-post-detail-actions.tsx`, `app/src/lib/post-guest-meta.test.ts` |

### Cycle 205: 비회원 abuse defense 현실화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| guest 쓰기 CAPTCHA/step-up trust 도입 | Codex | P1 | `done` | 비회원 글/댓글/업로드 경로에 CAPTCHA 또는 동급 step-up 검증과 프록시/평판 기반 추가 방어가 적용되고 운영 정책 문서가 동기화됨 | `app/src/app/api/posts/route.ts`, `app/src/app/api/posts/[id]/comments/route.ts`, `app/src/app/api/upload/*.ts`, `docs/policies/*` |
| 긴급/사기/개인정보 우선순위 운영 큐 설계 | Codex | P1 | `done` | 긴급/사기/개인정보 노출 유형이 신고 사유/우선순위에 반영되고 관리자 큐에서 별도 triage 기준을 제공함 | `app/prisma/schema.prisma`, `app/src/app/admin/reports/page.tsx`, `docs/policies/모더레이션_운영규칙.md` |

### Cycle 204: 알림/운영 이력 retention 강화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 읽음 처리와 보관/삭제 의미 분리 | Codex | P1 | `done` | 읽음은 inbox에서 유지되고 archive/delete가 분리되어 3일 자동 삭제 의존이 제거됨 | `app/src/server/queries/notification.queries.ts`, `app/scripts/cleanup-notifications.ts`, `.github/workflows/notification-cleanup.yml` |
| 운영/CS용 durable notification history 기준 수립 | Codex | P2 | `done` | 알림 보존 기간과 지원용 이력 정책이 문서화되고 최소 1개 운영 확인 경로가 제공됨 | `docs/개발_운영_가이드.md`, `docs/operations/*` |

### Cycle 203: 검색 로그 privacy/retention hardening (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 검색 로그 fire-and-forget/PII 필터링 보강 | Codex | P1 | `done` | 검색어 기록이 서버리스 환경에서도 유실되지 않도록 보강되고 이메일/전화번호 등 민감 패턴은 통계 저장에서 제외됨 | `app/src/app/api/search/log/route.ts`, `app/src/server/queries/search.queries.ts` |
| 검색 통계 retention/cleanup 운영 경로 추가 | Codex | P2 | `done` | `SearchTermStat` 보존 기간과 정리 작업이 운영 스크립트/문서로 고정되고 회귀 테스트가 존재함 | `app/scripts/*`, `.github/workflows/*`, `docs/operations/검색 통계 전환 가이드.md` |

### Cycle 202: 운영 보호장치 fail-open 제거 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| moderation/policy control plane missing schema fail-closed 전환 | Codex | P1 | `done` | sanction/policy/block/mute/notification/guest-safety 핵심 모델 누락 시 기능 비활성화 대신 health/preflight FAIL 또는 명시 5xx로 surface됨 | `app/src/server/services/sanction.service.ts`, `app/src/server/queries/policy.queries.ts`, `app/src/server/queries/user-relation.queries.ts`, `app/src/server/queries/notification.queries.ts`, `app/src/server/services/guest-safety.service.ts` |
| 운영 health/preflight를 moderation control plane까지 확장 | Codex | P1 | `done` | health/security-env/ops 체크가 moderation 관련 스키마 drift를 조기에 감지하고 문서에 반영됨 | `app/src/app/api/health/route.ts`, `app/scripts/check-security-env.ts`, `docs/operations/*` |

### Cycle 201: 신고/제재 운영 현실화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| bulk 신고 처리의 sanction parity 복구 | Codex | P1 | `done` | 일괄 승인 경로도 단건 승인과 동일하게 제재 적용 옵션/감사 이력을 제공하고 회귀 테스트가 존재함 | `app/src/server/services/report.service.ts`, `app/src/components/admin/report-queue-table.tsx` |
| trust-weighted auto-hide + severity queue 도입 | Codex | P1 | `done` | 신고 3건 고정 규칙을 대체할 reporter trust/계정연령/속도 기반 자동 숨김 또는 우선 검토 모델이 도입되고 운영 정책과 정렬됨 | `app/src/server/services/report.service.ts`, `docs/policies/신고_운영정책.md`, `docs/policies/모더레이션_운영규칙.md` |

### Cycle 200: 신고 대상 모델/운영 정합화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| Report target 스키마와 API/UI 범위 일치화 | Codex | P1 | `done` | Post-only로 축소하거나 Comment/User까지 정식 지원하도록 schema/API/UI/docs가 하나의 기준으로 정렬됨 | `app/prisma/schema.prisma`, `app/src/lib/validations/report.ts`, `app/src/server/services/report.service.ts`, `app/src/components/posts/post-comment-thread.tsx`, `docs/policies/신고_운영정책.md` |
| 관리자 신고 큐의 target type 운영 기준 정리 | Codex | P2 | `done` | 관리자 페이지/통계/감사 로그가 실제 지원 target만 노출하고 운영 문서와 모순이 없음 | `app/src/app/admin/reports/page.tsx`, `app/src/server/queries/report.queries.ts`, `docs/policies/*` |

### Cycle 199: 로그인 abuse hardening 2차 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| failed login 운영 가시성 확대 | Codex | P1 | `done` | 로그인 성공/실패/락아웃 이벤트가 운영 감사 경로에서 조회 가능하거나 동급 수준의 구조화 로그/알림으로 남고 테스트가 존재함 | `app/src/lib/auth.ts`, `app/src/server/queries/auth-audit.queries.ts`, `app/src/app/admin/auth-audits/page.tsx` |
| step-up 방어(backoff/CAPTCHA/lockout) 설계 및 1차 구현 | Codex | P1 | `done` | rate-limit 외에 backoff/CAPTCHA/락아웃 중 최소 1개가 credentials 로그인 경로에 추가되고 운영 문서에 반영됨 | `app/src/lib/auth.ts`, `app/src/server/auth-login-rate-limit.ts`, `docs/security/*` |

### Cycle 198: 비밀번호 변경/재설정 세션 즉시 무효화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| credential change용 session version 도입 | Codex | P1 | `done` | `User.sessionVersion` 기반으로 JWT 세션이 현재 버전과 동기화되고 이전 비밀번호 기반 세션은 자동 무효화됨 | `app/prisma/schema.prisma`, `app/prisma/migrations/20260306120000_add_user_session_version/migration.sql`, `app/src/lib/auth.ts`, `app/src/lib/session-version.ts` |
| 비밀번호 변경/재설정 시 세션 버전 증가 + 회귀 테스트 | Codex | P1 | `done` | 기존 비밀번호 변경/이메일 reset 확정 시 session version이 증가하고 서비스/헬퍼 테스트로 고정됨 | `app/src/server/services/auth.service.ts`, `app/src/server/services/auth.service.test.ts`, `app/src/lib/session-version.test.ts` |

### Cycle 197: 정지 계정 write-path enforcement parity (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 글/댓글/반응 서비스에 active sanction 가드 적용 | Codex | P1 | `done` | 글/댓글 작성·수정·삭제 및 반응 서비스가 active sanction에서 일관되게 403을 반환하고 helper/서비스 테스트가 존재함 | `app/src/server/services/sanction.service.ts`, `app/src/server/services/post.service.ts`, `app/src/server/services/comment.service.ts` |
| 인증 사용자 업로드 경로 sanction enforcement 추가 | Codex | P1 | `done` | 인증 사용자의 업로드 API가 active sanction을 존중하고 route 테스트로 고정됨 | `app/src/app/api/upload/route.ts`, `app/src/app/api/upload/client/route.ts`, `app/src/app/api/upload/*.test.ts` |

### Cycle 196: 비밀번호 변경/설정 UX 정합화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 계정 비밀번호 보유 여부 기반 copy/폼 분기 | Codex | P1 | `done` | `/password/setup`과 프로필 진입 링크가 계정의 비밀번호 보유 여부에 따라 `비밀번호 변경`/`비밀번호 설정`을 정확히 노출하고, 기존 비밀번호 보유 계정에는 현재 비밀번호가 필수로 표시됨 | `app/src/app/password/setup/page.tsx`, `app/src/components/auth/set-password-form.tsx`, `app/src/app/profile/page.tsx`, `app/src/server/queries/user.queries.ts` |
| 클라이언트 검증/회귀 테스트 추가 | Codex | P1 | `done` | 기존 비밀번호 필요 여부와 확인 비밀번호 불일치 분기가 순수 helper 테스트로 고정됨 | `app/src/lib/password-setup.ts`, `app/src/lib/password-setup.test.ts` |

### Cycle 195: production email/upload env fail-fast 보강 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| transactional email misconfig fail-fast 처리 | Codex | P1 | `done` | 비밀번호 재설정/이메일 인증 메일은 production에서 발송 설정 누락 또는 전송 실패 시 503으로 surface되고 회귀 테스트로 고정됨 | `app/src/server/email.ts`, `app/src/app/api/auth/register/route.ts`, `app/src/app/api/auth/password/reset/request/route.ts`, `app/src/app/api/auth/verify/request/route.ts` |
| production env/ops check에 email/blob 필수값 반영 | Codex | P1 | `done` | production env 검증과 `ops:check:security-env`가 `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN` 누락을 FAIL로 판정하고 테스트로 고정됨 | `app/src/lib/env.ts`, `app/scripts/check-security-env.ts`, `app/src/lib/env.test.ts` |

### Cycle 194: guest API prewarm/snapshot 자동화 확장 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| prewarm 대상에 guest API 추가 | Codex | P1 | `done` | `ops:prewarm`이 `/api/feed/guest`, `/api/search/guest`까지 2회 호출하고 실배포에서 2차 `HIT` 전환을 확인 | `app/scripts/prewarm-deployment.ts` |
| latency snapshot 대상/threshold에 guest API 추가 | Codex | P1 | `done` | `ops:perf:snapshot`이 guest API 두 경로를 함께 측정하고 steady-state p95 PASS를 기록 | `app/scripts/collect-latency-snapshot.ts`, `PROGRESS.md` |

### Cycle 193: guest 공개 API 배포 검증 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `/api/feed/guest`, `/api/search/guest` 실배포 캐시 헤더 확인 | Codex | P1 | `done` | 실배포 응답에서 두 guest API가 `cache-control: public`과 `x-vercel-cache: STALE` 상태로 캐시 재사용되는 것을 확인 | `app/src/app/api/feed/guest/route.ts`, `app/src/app/api/search/guest/route.ts` |
| latency snapshot 재측정 | Codex | P1 | `done` | 운영 URL 기준 steady-state p95가 모두 threshold 통과하고 결과가 진행 로그에 기록됨 | `app/scripts/collect-latency-snapshot.ts`, `PROGRESS.md` |

### Cycle 192: guest 피드 API/클라이언트 전환 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| guest 피드 초기 상태용 공개 API 추가 | Codex | P1 | `done` | guest 피드의 gate/feed 초기 상태를 public cache 헤더와 함께 반환하는 `/api/feed/guest`가 추가되고 route 테스트로 고정됨 | `app/src/app/api/feed/guest/route.ts`, `app/src/app/api/feed/guest/route.test.ts` |
| guest `/feed`를 클라이언트 로더 기반으로 전환 | Codex | P1 | `done` | `feed/guest` 서버 페이지가 DB를 직접 읽지 않고 클라이언트에서 `/api/feed/guest`를 통해 초기 상태를 불러오며 Suspense fallback을 제공 | `app/src/components/posts/guest-feed-page-client.tsx`, `app/src/app/feed/guest/page.tsx` |

### Cycle 191: guest 검색 API/클라이언트 전환 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| guest 검색 결과용 공개 API 추가 | Codex | P1 | `done` | guest 검색 결과/인기 검색어를 public cache 헤더와 함께 반환하는 `/api/search/guest`가 추가되고 route 테스트로 고정됨 | `app/src/app/api/search/guest/route.ts`, `app/src/app/api/search/guest/route.test.ts` |
| guest `/search`를 클라이언트 로더 기반으로 전환 | Codex | P1 | `done` | `search/guest` 서버 페이지가 DB를 직접 읽지 않고 클라이언트에서 `/api/search/guest`를 통해 결과를 불러오며 Suspense fallback을 제공 | `app/src/components/posts/guest-search-page-client.tsx`, `app/src/app/search/guest/page.tsx` |

### Cycle 190: HTML CDN 캐시 제약 분석 및 방향 전환 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 실배포 guest HTML 헤더 재검증 | Codex | P1 | `done` | `/feed`, `/search`, `/feed/guest`, `/search/guest`, `/posts/:id/guest`가 모두 `private, no-store`임을 확인하고 rewrite 누락과 구분 | `app/middleware.ts`, `docs/operations/캐시_성능_적용_기록.md` |
| CSP nonce 기반 HTML 비공개 캐시 제약 기록 | Codex | P1 | `done` | 요청별 CSP nonce가 Next HTML 응답을 매번 달라지게 만들어 CDN public cache를 구조적으로 막는다는 점과 다음 최적화 방향(API/클라이언트 중심)을 기록 | `app/middleware.ts`, `app/src/lib/csp-nonce.ts`, `docs/operations/캐시_성능_적용_기록.md`, `PROGRESS.md` |

### Cycle 189: Vercel build 회귀 복구 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| header search params CSR bailout 제거 | Codex | P1 | `done` | `FeedHoverMenu`가 `useSearchParams()` 없이 현재 URL 쿼리를 처리해 `/admin/auth-audits` prerender가 다시 가능해짐 | `app/src/components/navigation/feed-hover-menu.tsx` |
| build phase Upstash fetch 우회 + 회귀 테스트 추가 | Codex | P1 | `done` | `phase-production-build`에서는 query cache가 Upstash REST를 호출하지 않고 메모리 fallback을 사용하며 단위 테스트로 고정됨 | `app/src/server/cache/query-cache.ts`, `app/src/server/cache/query-cache.test.ts` |

### Cycle 188: 정적 shell + guest search 캐시 분리 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| root layout의 서버 auth/cookie 의존 제거 | Codex | P1 | `done` | 최상위 layout이 서버에서 `auth()`/`cookies()`를 읽지 않고 viewer shell은 client fetch로 보강됨 | `app/src/app/layout.tsx`, `app/src/components/navigation/app-shell-header.tsx`, `app/src/app/api/viewer-shell/route.ts` |
| guest /search 정적 분리 + rewrite 캐시 적용 | Codex | P1 | `done` | guest `/search`가 전용 경로로 rewrite되고 public cache-control이 적용됨. 코드/테스트 기준 검증 완료 | `app/src/app/search/page.tsx`, `app/src/app/search/guest/page.tsx`, `app/middleware.ts` |
| guest /feed 정적 분리 + rewrite 캐시 적용 | Codex | P1 | `done` | 실배포 `https://townpet2.vercel.app/feed`가 `/feed/guest`로 rewrite된 상태에서 `cache-control: public, s-maxage=60, stale-while-revalidate=300`과 `x-vercel-cache: HIT`를 반환하고, `/api/feed/guest` 재요청도 `x-vercel-cache: STALE`로 캐시 재사용됨 | `app/src/app/feed/guest/page.tsx`, `app/src/components/navigation/feed-hover-menu.tsx`, `app/middleware.ts`, `app/src/app/api/feed/guest/route.ts`, `PROGRESS.md` |

### Cycle 187: 배포 prewarm 자동화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 공개 GET 경로 prewarm 스크립트 추가 | Codex | P1 | `done` | 배포 URL 기준 공개 feed/search/API 경로를 2회 호출하는 ops 스크립트가 추가됨 | `app/scripts/prewarm-deployment.ts`, `app/package.json` |
| ops-smoke-checks에 prewarm 단계 연결 | Codex | P1 | `done` | smoke workflow에서 health 뒤 prewarm을 자동 실행하고 운영 문서에 반영됨 | `.github/workflows/ops-smoke-checks.yml`, `docs/operations/*` |

### Cycle 186: 게시글 액션 캐시 무효화 축소 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 게시글 액션의 불필요한 root/feed revalidation 축소 | Codex | P1 | `done` | 게시글 생성/수정/삭제/반응 액션이 실제로 필요한 경로만 revalidate하고 `"/"` 무효화가 제거됨 | `app/src/server/actions/post.ts` |
| 게시글 액션 revalidation 회귀 테스트 추가 | Codex | P1 | `done` | create/update/delete/reaction 경로의 revalidate 범위를 검증하는 단위 테스트 추가 | `app/src/server/actions/post.test.ts` |

### Cycle 182: 배포 보안 체크리스트 정리/재배치 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| manual-checks 경로로 배포 보안 체크리스트 재배치 | Codex | P1 | `done` | 실사용 체크리스트가 `docs/ops/manual-checks/` 아래로 이동하고 기존 경로는 안내 링크로 유지 | `docs/operations/manual-checks/배포_보안_체크리스트.md`, `docs/operations/manual-checks/배포_보안_체크리스트.md` |
| Vercel/GitHub Actions 현황 + 슬롯 확인 순서 문서화 | Codex | P1 | `done` | 현재 공유된 설정값, final required list, strict fail=5 기준 슬롯 확인 순서가 한 문서에 정리됨 | `docs/operations/manual-checks/배포_보안_체크리스트.md` |

### Cycle 181: production env 템플릿 정리 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| production env example 추가 | Codex | P1 | `done` | Vercel 반영용 production env 템플릿 파일이 저장소에 추가됨 | `app/.env.production.example` |
| 운영 문서에 템플릿 경로 연결 | Codex | P2 | `done` | checklist/GUIDE에서 템플릿 파일 위치를 바로 찾을 수 있음 | `docs/operations/manual-checks/배포_보안_체크리스트.md`, `docs/개발_운영_가이드.md` |

### Cycle 180: 배포 보안 프리플라이트 정착 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| strict preflight 실행 명령 고정 | Codex | P1 | `done` | production strict 보안 점검 명령이 package script로 고정됨 | `app/package.json` |
| 배포 보안 체크리스트 문서화 | Codex | P1 | `done` | 필수 env, strict 결과 해석, 배포 후 smoke 항목 문서화 | `docs/operations/manual-checks/배포_보안_체크리스트.md`, `docs/개발_운영_가이드.md` |

### Cycle 179: 배포 전 보안 하드닝 2차 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 외부 이미지/업로드 URL 제한으로 추적 픽셀 차단 | Codex | P0 | `done` | 게시글 본문/첨부에 1st-party 업로드 URL만 허용되고 외부 이미지가 렌더링되지 않음. 회귀 테스트 포함 | `app/src/lib/validations/post.ts`, `app/src/lib/markdown-lite.ts`, `app/src/components/posts/*` |
| 관리자 auth audit CSV formula injection 방어 | Codex | P1 | `done` | CSV export에서 수식 시작 문자 sanitize 적용, 회귀 테스트 포함 | `app/src/app/api/admin/auth-audits/export/route.ts` |
| CSP script-src 실질 강화 | Codex | P1 | `done` | strict/report-only 정책에서 `https:` 광역 허용 제거, 테스트 갱신 | `app/middleware.ts`, `app/src/middleware.test.ts` |
| 운영 보안 env 강제 + dev social login 기본 비활성화 | Codex | P1 | `done` | production에서 핵심 보안 env 미설정 시 startup fail, dev social login은 명시 opt-in일 때만 노출/동작 | `app/src/lib/env.ts`, `app/src/lib/auth.ts`, `app/src/app/login/page.tsx`, `app/src/app/register/page.tsx` |

### Cycle 68: 코드 점검 후속 조치(접근제어/안전/정합) (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 게시글 상세 공개 조회 제한(상태/LOCAL 스코프 검증) | Codex | P0 | `done` | 공개 GET에서 `ACTIVE`만 노출되고 LOCAL은 viewer 동네 검증 또는 차단됨. 실패 경로 테스트 1개 이상 | `app/src/app/api/posts/[id]/route.ts`, `app/src/server/queries/post.queries.ts` |
| 숨김 글 일반 목록 노출 제거(모더레이터 전용 분리) | Codex | P1 | `done` | 공용 목록/공통 게시판에서 `HIDDEN`이 제외되고 UI에 숨김 배지 노출이 사라짐 | `app/src/server/queries/post.queries.ts`, `app/src/server/queries/community.queries.ts`, `app/src/components/posts/feed-infinite-list.tsx` |
| 비회원 수정/삭제 rate limit 보강(게시글/댓글) | Codex | P1 | `done` | guest 수정/삭제 경로에 다중 윈도우 제한이 적용되고 계약 테스트 통과 | `app/src/app/api/posts/[id]/route.ts`, `app/src/app/api/comments/[id]/route.ts`, `app/src/server/rate-limit.ts` |
| 업로드 MIME 스푸핑 방어(시그니처 검사) | Codex | P1 | `done` | 허용 이미지 타입은 magic bytes 검증 후 저장, 불일치 시 400 | `app/src/server/upload.ts` |
| 공개 프로필 활동 탭 GLOBAL 필터 적용 | Codex | P2 | `done` | 공개 프로필 활동 쿼리가 GLOBAL만 반환, 회귀 테스트 1개 이상 | `app/src/server/queries/user.queries.ts` |
| guestAuthor 생성 service 이관 + 댓글 라우트 dead 분기 제거 | Codex | P2 | `done` | route에서 Prisma 직접 write 제거, 댓글 수정/삭제 흐름 단순화 | `app/src/app/api/posts/[id]/comments/route.ts`, `app/src/app/api/comments/[id]/route.ts`, `app/src/server/services/*` |
| 로그 PII 최소화(IP/URL 마스킹) | Codex | P2 | `done` | error/csp 로그에서 IP/URL query가 마스킹되어 저장 | `app/src/server/error-monitor.ts`, `app/src/app/api/security/csp-report/route.ts` |
| Prisma 내부 메타 의존 제거 + non-null assertion 제거 | Codex | P3 | `done` | `_runtimeDataModel` 의존 제거, `resolvedAt!` 제거 | `app/src/server/queries/post.queries.ts`, `app/src/server/queries/report.queries.ts` |
| FORcodex 문서 경로 정합 | Codex | P3 | `done` | `docs/plan/todo.md` 참조가 실제 경로와 일치하도록 수정 | `FORcodex.md` |

### Cycle 69: 피드/검색 캐시 레이어 적용 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 공용 읽기 경로 캐시(피드/검색/자동완성/인기어) | Codex | P1 | `done` | 비로그인 GLOBAL 경로에 TTL 캐시 + SWR 헤더가 적용되고 작성/반응 시 캐시 버전이 갱신됨 | `app/src/server/cache/query-cache.ts`, `app/src/server/queries/post.queries.ts`, `app/src/server/queries/search.queries.ts`, `app/src/app/api/posts/route.ts`, `app/src/app/api/posts/suggestions/route.ts` |

### Cycle 70: 꼬리 지연 완화 1차 개선 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| SSR 병렬화 + 정책/커뮤니티 캐시 + 검색 후보 축소 | Codex | P1 | `done` | feed/search SSR 직렬 await 제거, 정책/커뮤니티 캐시 적용, 검색 후보 상한 축소 | `app/src/app/feed/page.tsx`, `app/src/app/search/page.tsx`, `app/src/server/queries/policy.queries.ts`, `app/src/server/queries/community.queries.ts`, `app/src/server/queries/post.queries.ts` |

### Cycle 71: 꼬리 지연 완화 2차 개선 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| guest 컨텍스트 캐시 + read rate-limit 캐시 | Codex | P1 | `done` | 비로그인 SSR 컨텍스트 캐시 + read rate-limit cacheMs 적용 | `app/src/app/feed/page.tsx`, `app/src/app/search/page.tsx`, `app/src/server/rate-limit.ts`, `app/src/app/api/posts/route.ts`, `app/src/app/api/posts/suggestions/route.ts` |

### Cycle 72: 비로그인 피드 CDN 캐시 분리 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| guest /feed cache-control 분리 | Codex | P1 | `done` | 비로그인 /feed에 CDN 캐시 헤더 적용, LOCAL/개인화 제외 | `app/middleware.ts` |

### Cycle 73: 리전 정합/연결 경로 점검 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 리전/풀링 체크리스트 작성 | Codex | P1 | `done` | 리전 정합/연결 경로 점검 체크리스트 문서화 | `docs/operations/리전_지연시간_체크리스트.md` |

### Cycle 74: 게시글 상세 guest 캐시 적용 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| post/detail/comments guest 캐시 | Codex | P1 | `done` | 게시글 상세/메타/댓글 캐시 적용 + 무효화 버전 갱신 | `app/src/server/queries/post.queries.ts`, `app/src/server/queries/comment.queries.ts`, `app/src/server/cache/query-cache.ts` |

### Cycle 75: 게시글 상세 스트리밍 분리 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 댓글 섹션 Suspense 분리 | Codex | P1 | `done` | 상세 페이지 댓글 로딩을 스트리밍으로 분리 | `app/src/app/posts/[id]/page.tsx` |

### Cycle 76: 상세 페이지 오류 완화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 댓글/정책 조회 오류 fallback | Codex | P1 | `done` | 댓글 로딩 실패 시 페이지 오류 대신 fallback 렌더 | `app/src/app/posts/[id]/page.tsx` |

### Cycle 77: 상세 페이지 guest 캐시 헤더 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| guest /posts 캐시 헤더 부여 | Codex | P1 | `done` | guest /posts/[id] CDN 캐시 헤더 적용 | `app/middleware.ts` |

### Cycle 78: 상세 관계 조회 오류 fallback (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 관계 조회 오류 기본값 | Codex | P1 | `done` | 관계 조회 실패 시 기본 상태로 렌더 | `app/src/app/posts/[id]/page.tsx` |

### Cycle 79: 상세/댓글 날짜 파싱 오류 수정 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| createdAt 문자열 대응 | Codex | P1 | `done` | 날짜 문자열도 안전하게 파싱 | `app/src/app/posts/[id]/page.tsx`, `app/src/components/posts/post-comment-thread.tsx` |

### Cycle 80: guest 상세/댓글 쿼리 경량화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| reactions 조인 제외 | Codex | P1 | `done` | guest 상세/댓글에서 reactions 조회 제거 | `app/src/server/queries/post.queries.ts`, `app/src/server/queries/comment.queries.ts` |

### Cycle 81: 상세 댓글 클라이언트 로딩 전환 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 댓글 SSR 제거 | Codex | P1 | `done` | 댓글을 API로 가져와 상세 SSR 경량화 | `app/src/app/posts/[id]/page.tsx`, `app/src/app/api/posts/[id]/comments/route.ts` |

### Cycle 82: guest 상세 정적 분리 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| guest /posts rewrite | Codex | P1 | `done` | 비로그인 상세 페이지를 정적 guest 페이지로 rewrite | `app/middleware.ts`, `app/src/app/posts/[id]/guest/page.tsx` |

### Cycle 83: 게스트 상세 링크 전환 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| feed/search 링크 업데이트 | Codex | P1 | `done` | 게스트는 /posts/[id]/guest로 이동 | `app/src/components/posts/feed-infinite-list.tsx`, `app/src/app/search/page.tsx` |

### Cycle 84: guest 상세 캐시 헤더 강화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 캐시 TTL/헤더 보정 | Codex | P1 | `done` | guest 상세 CDN 캐시 헤더 적용 + 댓글 TTL 상향 | `app/middleware.ts`, `app/src/app/api/posts/[id]/comments/route.ts` |

### Cycle 85: guest 상세 캐시 강제화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| fetchCache 적용 | Codex | P1 | `done` | guest 상세 fetchCache force-cache 적용 | `app/src/app/posts/[id]/guest/page.tsx` |

### Cycle 86: guest 상세 헤더 강제 설정 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| next.config headers | Codex | P1 | `done` | guest 상세 캐시 헤더 강제 | `app/next.config.ts` |

### Cycle 87: 게스트 상세 프리페치 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| feed 상단 prefetch | Codex | P1 | `done` | 게스트 피드 상위 3개 상세 프리페치 | `app/src/components/posts/feed-infinite-list.tsx` |

### Cycle 88: 상세 페이지 API 전환 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| client detail loader | Codex | P1 | `done` | 상세 페이지를 API 기반 클라이언트 로딩으로 전환 | `app/src/app/api/posts/[id]/detail/route.ts`, `app/src/components/posts/post-detail-client.tsx` |

### Cycle 89: neighborhood sync 안정화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| seed skip + retry | Codex | P1 | `done` | 시드 존재 시 스킵, chunk 재시도 | `app/scripts/sync-neighborhoods.ts` |

### Cycle 90: 상세 API 로딩 안정화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 재시도/응답 검증 | Codex | P1 | `done` | 상세 API 로딩 재시도 및 비JSON 처리 | `app/src/components/posts/post-detail-client.tsx` |

### Cycle 91: 게스트 상세 리다이렉트 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 비로그인 guest 이동 | Codex | P1 | `done` | 비로그인 상세 접근은 guest 페이지로 이동 | `app/src/app/posts/[id]/page.tsx` |

### Cycle 92: 게스트 판별 쿠키 보강 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| next-auth 쿠키 포함 | Codex | P1 | `done` | 미들웨어 게스트 판별에 NextAuth 쿠키 포함 | `app/middleware.ts` |

### Cycle 93: 상세 API 실패 guest fallback (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 401/403/404 redirect | Codex | P1 | `done` | 상세 API 실패 시 guest 상세로 이동 | `app/src/components/posts/post-detail-client.tsx` |

### Cycle 94: 상세 클라이언트 훅 오류 수정 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| useMemo 제거 | Codex | P1 | `done` | 조건부 hook 제거 | `app/src/components/posts/post-detail-client.tsx` |

### Cycle 95: 상세 API 마크다운 선계산 + 캐시 헤더 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 상세 API 응답 최적화 | Codex | P1 | `done` | 상세 API에서 마크다운 HTML/텍스트를 선계산하고 guest 응답에 캐시 헤더를 적용 | `app/src/app/api/posts/[id]/detail/route.ts`, `app/src/components/posts/post-detail-client.tsx` |

### Cycle 96: API Cache-Control 헤더 보강 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| jsonOk 헤더 적용 보강 | Codex | P1 | `done` | jsonOk 응답에서 캐시 헤더가 누락되지 않도록 명시 적용 | `app/src/server/response.ts` |

### Cycle 97: 상세 진입 프리페치(로그인) (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 상단 글 상세 prefetch | Codex | P1 | `done` | 로그인 사용자에게 상단 2개 상세 페이지를 사전 prefetch해 클릭 지연을 완화 | `app/src/components/posts/feed-infinite-list.tsx` |

### Cycle 98: API 캐시 헤더 강제화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| Next headers 추가 | Codex | P1 | `done` | `/api/posts`와 `/api/posts/:id/detail`에 Cache-Control 헤더를 강제 설정 | `app/next.config.ts` |

### Cycle 99: 상세 payload 관계 축소 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 타입별 상세 관계 조회 | Codex | P1 | `done` | 상세 조회에서 hospital/place/walk 관계를 타입에 따라 선택적으로 로드 | `app/src/server/queries/post.queries.ts` |

### Cycle 100: 상세 타입 정합 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 상세 extras 타입 보강 | Codex | P1 | `done` | 상세 조회 결과 타입에 hospital/place/walk 필드가 포함되도록 타입 보강 | `app/src/server/queries/post.queries.ts` |

### Cycle 101: 상세 이미지 payload 축소 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 이미지 id 제거 | Codex | P1 | `done` | 상세 응답 이미지에서 id를 제거해 payload를 축소 | `app/src/server/queries/post.queries.ts`, `app/src/components/posts/post-detail-client.tsx`, `app/src/app/posts/[id]/guest/page.tsx` |

### Cycle 102: 상세 이미지 정렬 클라이언트 이관 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| image orderBy 제거 | Codex | P1 | `done` | 상세 조회에서 image orderBy를 제거하고 클라이언트에서 정렬 | `app/src/server/queries/post.queries.ts`, `app/src/components/posts/post-detail-client.tsx`, `app/src/app/posts/[id]/guest/page.tsx` |

### Cycle 103: 상세 author 이미지 제거 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 상세 author 필드 축소 | Codex | P1 | `done` | 상세 조회에서 author.image를 제거해 payload를 축소 | `app/src/server/queries/post.queries.ts` |

### Cycle 104: 댓글 lazy-load (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 댓글 지연 로딩 | Codex | P1 | `done` | 댓글 섹션이 뷰포트에 들어오면 API를 호출 | `app/src/components/posts/post-comment-section-client.tsx` |

### Cycle 105: 상세 neighborhood payload 축소 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| district 제거 | Codex | P1 | `done` | 상세 조회에서 neighborhood.district를 제거해 payload를 축소 | `app/src/server/queries/post.queries.ts`, `app/src/components/posts/post-detail-client.tsx` |

### Cycle 106: 상세 reactions 분리 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| reactions API 분리 | Codex | P1 | `done` | 상세 조회에서 reactions를 제거하고 별도 API로 로드 | `app/src/server/queries/post.queries.ts`, `app/src/components/posts/post-detail-client.tsx`, `app/src/components/posts/post-reaction-controls.tsx`, `app/src/app/api/posts/[id]/reaction/route.ts` |

### Cycle 107: 게스트 상세 reactions 타입 보정 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 게스트 currentReaction 정리 | Codex | P1 | `done` | 게스트 상세에서 reactions 참조 제거 | `app/src/app/posts/[id]/guest/page.tsx` |

### Cycle 108: 상세 stats 분리 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| stats API 분리 | Codex | P1 | `done` | 상세 API에서 카운트 필드를 제거하고 별도 stats API로 로드 | `app/src/app/api/posts/[id]/detail/route.ts`, `app/src/app/api/posts/[id]/stats/route.ts`, `app/src/components/posts/post-detail-client.tsx`, `app/src/server/queries/post.queries.ts` |

### Cycle 109: stats 캐시 TTL 상향 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| stats 캐시 헤더/TTL | Codex | P1 | `done` | stats API에 cache-control 강화 및 query cache TTL 60s 적용 | `app/src/app/api/posts/[id]/stats/route.ts`, `app/src/server/queries/post.queries.ts` |

### Cycle 110: 상세 content lazy 분리 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| content API 분리 | Codex | P1 | `done` | 상세 API에서 rendered content를 제거하고 별도 content API로 로드 | `app/src/app/api/posts/[id]/detail/route.ts`, `app/src/app/api/posts/[id]/content/route.ts`, `app/src/components/posts/post-detail-client.tsx`, `app/src/server/queries/post.queries.ts` |

### Cycle 111: petType 명칭 통일 + 레거시 URL 정규화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `communityId` 외부 계약 제거 및 `petType`/`petTypeId` 통일 | Codex | P1 | `done` | `/feed`가 레거시 `communityId` 유입을 `petType`으로 정규화 redirect하고, 공개/API/문서 용어가 `petType` 중심으로 동기화됨 | `app/src/app/feed/page.tsx`, `app/src/app/api/posts/route.ts`, `app/src/lib/validations/post.ts`, `app/src/server/queries/post.queries.ts`, `docs/api/posts-feed-query.md`, `docs/product/*` |

### Cycle 112: 프로필 정책 정리 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 닉네임 30일 변경 제한 + 프로필 문구 정리 | Codex | P1 | `done` | 닉네임 변경이 30일 쿨다운으로 제한되고, `/profile` 계정정보에서 대표 동네 라벨이 일반 표기로 정리됨 | `app/src/server/services/user.service.ts`, `app/prisma/schema.prisma`, `app/prisma/migrations/20260302160000_add_user_nickname_updated_at/migration.sql`, `app/src/app/profile/page.tsx` |

### Cycle 113: 글쓰기 동물 라벨/자유게시판 선택 정책 정리 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 글쓰기 `관련 동물` 라벨 변경 + 자유게시판 선택 안함 허용 + 자유게시판 피드 동물필터 무시 | Codex | P1 | `done` | 글쓰기 폼에서 라벨이 `관련 동물`로 표시되고 자유게시판 계열은 `선택 안함`으로 작성 가능하며, 자유게시판 피드는 `petType` 조건 없이 전체 노출됨 | `app/src/components/posts/post-create-form.tsx`, `app/src/lib/validations/post.ts`, `app/src/server/services/post.service.ts`, `app/src/app/feed/page.tsx`, `app/src/server/queries/post.queries.ts` |

### Cycle 114: 글쓰기 분류/범위 UX 최신화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `/posts/new` 분류 목록에서 산책코스 제거 + 범위/동네 노출 조건 정리 | Codex | P1 | `done` | 글쓰기 분류 목록에서 `동네 산책코스`가 제거되고, 범위/동네 입력은 동네 선택이 필요한 게시판에서만 노출되며 동네 select 스타일이 다른 입력과 일관됨 | `app/src/components/navigation/feed-hover-menu.tsx`, `app/src/components/posts/post-create-form.tsx` |

### Cycle 115: 게시판 분류/스코프/태그 정책 재정렬 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 병원후기 온동네 고정 + 동네모임 동네 고정 + 실종/목격 동물태그 optional + 반려동물 자랑 명칭/메뉴 반영 | Codex | P1 | `done` | 병원후기 scope는 GLOBAL로 고정되고 동네모임 scope는 LOCAL로 고정되며, 실종/목격 제보는 동물 태그 없이 작성 가능하고 `반려자랑` 명칭이 `반려동물 자랑`으로 통일/상단 게시판 메뉴에 표시됨 | `app/src/components/posts/post-create-form.tsx`, `app/src/lib/validations/post.ts`, `app/src/server/services/post.service.ts`, `app/src/components/navigation/feed-hover-menu.tsx`, `app/src/lib/post-presenter.ts` |

### Cycle 116: 공용보드 동물태그 정책 미세조정 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 중고/공동구매 동물 태그 optional 전환 | Codex | P1 | `done` | `MARKET_LISTING` 작성 시 동물 태그 없이도 통과하고, 병원후기만 동물 태그 필수로 유지됨 | `app/src/lib/community-board.ts`, `app/src/lib/validations/post.ts`, `app/src/server/services/post.service.ts` |

### Cycle 117: 동네모임 동네 설정 CTA 강화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 동네모임 작성 시 동네 미설정 사용자 안내 + 설정 페이지 이동 제공 | Codex | P1 | `done` | 동네모임 작성에서 동네 미선택/미설정 시 명확한 오류 메시지가 노출되고, 폼 내에서 `/profile` 설정 페이지 이동 링크가 제공됨 | `app/src/components/posts/post-create-form.tsx` |

### Cycle 118: 동네 데이터 동기화 보강 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 기존 데이터가 있어도 전국 동네 데이터가 누락 없이 동기화되도록 스크립트 수정 | Codex | P1 | `done` | `db:sync:neighborhoods`가 기존 row 존재 여부와 무관하게 누락 동네를 `skipDuplicates`로 보충하고, 실행 로그에 before/inserted/after 수치가 출력됨 | `app/scripts/sync-neighborhoods.ts` |

### Cycle 119: 시/도 목록 표준화 및 동네 옵션 정제 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 내 동네 설정 시/도 옵션을 표준 광역 행정구역으로 통일하고 출장소/중복 표기를 제거 | Codex | P1 | `done` | 시/도 목록이 17개 표준 광역 행정구역으로 정규화되고(`서울`→`서울특별시`), 지역/동네 리스트에서 `출장소`와 시/도 자기참조 항목이 노출되지 않음 | `app/src/lib/neighborhood-region.ts`, `app/src/server/queries/neighborhood.queries.ts`, `app/src/components/profile/neighborhood-preference-form.tsx`, `app/src/components/onboarding/onboarding-form.tsx`, `app/src/server/services/user.service.ts` |

### Cycle 120: 모바일 반응형 가독성/접근성 보강 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 피드/상세/댓글/글쓰기 모바일 오버플로우 보정 + 모바일 내비게이션 접근성 보강 | Codex | P1 | `done` | 390px 기준에서 필터/페이지네이션/액션 버튼/긴 텍스트가 가로 스크롤 없이 표시되고, 모바일에서도 게시판/관심동물 설정 접근이 가능 | `app/src/components/navigation/feed-hover-menu.tsx`, `app/src/app/feed/page.tsx`, `app/src/components/posts/post-detail-client.tsx`, `app/src/components/posts/post-comment-thread.tsx`, `app/src/components/posts/post-create-form.tsx`, `app/src/components/posts/post-reaction-controls.tsx`, `app/src/app/profile/page.tsx` |

### Cycle 121: 피드 모바일 컴팩트 레이아웃 2차 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 모바일 피드 상단을 요약+접기 구조로 전환하고 목록 카드 밀도를 높여 첫 화면에서 목록 진입을 빠르게 개선 | Codex | P1 | `done` | 모바일에서 정렬/기간/리뷰 필터가 요약 배지 + `필터 자세히` 접기 패널로 동작하고, 피드 카드 제목 2줄/본문 1줄 프리뷰와 축소 간격으로 표시되어 첫 화면 정보 밀도가 향상됨 | `app/src/app/feed/page.tsx`, `app/src/components/posts/feed-infinite-list.tsx` |

### Cycle 122: 피드 상단 초경량 컴팩트 3차 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 모바일에서 상단 정보를 더 줄이고 정렬 우선/기간·리뷰 2차 노출 구조로 재배치 | Codex | P1 | `done` | 모바일에서 hero와 목록바로가기가 숨겨지고, 상단은 `정렬` 중심 요약으로 노출되며 `기간/리뷰`는 접기 패널 2차 옵션으로 접근됨 | `app/src/app/feed/page.tsx` |

### Cycle 123: 피드 카드 메타 초경량 4차 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 모바일 피드 카드의 작성자/시간/조회/반응 메타를 2줄로 압축해 한 화면 노출량을 추가 개선 | Codex | P1 | `done` | 모바일(`md` 미만)에서 메타가 `작성자` + `시간·조회·반응` 2줄로 표시되고, 데스크톱(`md` 이상) 메타 레이아웃은 기존 우측 정렬을 유지함 | `app/src/components/posts/feed-infinite-list.tsx` |

### Cycle 124: 모바일 게시판 목록 상시 노출 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 모바일 내비게이션에서 게시판 목록을 접기 없이 상시 노출해 FMKorea 스타일의 즉시 탐색성을 강화 | Codex | P1 | `done` | 모바일 `게시판 빠른 이동`이 `details` 접기 없이 칩형 목록으로 항상 보이고, 탭 1회 추가 없이 게시판 전환 가능 | `app/src/components/navigation/feed-hover-menu.tsx` |

### Cycle 125: 게시글/댓글 읽기 접근제어 정합성 보강 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 상세/콘텐츠/통계/댓글 API 공통 읽기 권한 가드 적용 | Codex | P0 | `done` | `/api/posts/[id]/detail|stats|content`, `/api/posts/[id]/comments`가 `ACTIVE` 상태와 LOCAL 동네 일치 규칙을 동일하게 강제하고 위반 시 401/403/404를 일관 반환 | `app/src/server/services/post-read-access.service.ts`, `app/src/app/api/posts/[id]/*` |
| 댓글 작성 서비스 방어심화(게스트 ban + LOCAL 제한) | Codex | P0 | `done` | `createComment`가 guest 작성 시 ban 상태를 확인하고, 비활성 글(`HIDDEN/DELETED`) 및 LOCAL 범위 권한 불일치 댓글 작성을 차단 | `app/src/server/services/comment.service.ts` |
| 접근제어 회귀 테스트 보강 | Codex | P1 | `done` | 공통 읽기 가드 단위 테스트와 posts/comments 라우트 계약 테스트에 실패 경로가 추가되어 회귀를 고정 | `app/src/server/services/post-read-access.service.test.ts`, `app/src/app/api/posts/[id]/route.test.ts`, `app/src/app/api/posts/[id]/comments/route.test.ts`, `app/src/server/services/comment.service.test.ts` |

### Cycle 126: 품질게이트 소셜 스모크 안정화 + 운영 문서 경로 복구 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| Playwright 재사용 전략 제어 + non-prod 소셜 dev 로그인 기본화 | Codex | P1 | `done` | `PLAYWRIGHT_REUSE_EXISTING_SERVER=1|0` 오버라이드가 config에 반영되고, non-prod에서 `social-dev` provider가 기본 활성화되어 기존 dev 서버 재사용 시에도 소셜 온보딩 스모크가 `Configuration` 오류 없이 통과 | `app/playwright.config.ts`, `app/src/lib/auth.ts`, `app/src/app/login/page.tsx`, `app/src/app/register/page.tsx` |
| 운영 체크리스트 경로 정합 복구 | Codex | P2 | `done` | GUIDE의 blocked/주간 루틴 링크가 실제 추적 문서 경로(`docs/operations/차단 해소 체크리스트.md`, `app/README.md`)를 가리키도록 정리됨 | `docs/개발_운영_가이드.md`, `docs/operations/차단 해소 체크리스트.md`, `app/README.md` |

### Cycle 67: 보안 하드닝 트랙 운영 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 보안 후속조치 전용 트래킹 파일 운영(PLAN/PROGRESS 연동) | Codex | P1 | `done` | `docs/security/` 하위에서 보안 백로그/진행/리스크/의사결정이 추적되고, 루트 `PLAN/PROGRESS`에 링크/상태가 동기화됨 | `docs/security/SECURITY_*.md`, `AGENTS.md` |
| SEC-001 `/api/health` 공개 응답 민감정보 최소화 + 내부 토큰 게이트 | Codex | P1 | `done` | 공개 응답에서 env/db/rate-limit 상세가 숨겨지고 내부 토큰 인증 시에만 상세 진단이 노출되며 계약 테스트가 통과 | `app/src/app/api/health/route.ts`, `app/src/app/api/health/route.test.ts`, `app/src/lib/env.ts` |
| SEC-005 신뢰 프록시 기준 client IP 파싱 정책화 | Codex | P1 | `done` | `getClientIp`가 프록시 신뢰 체인 기준으로 동작하고 관련 계약 테스트가 추가됨 | `app/src/server/request-context.ts`, 인프라 헤더 정책 |
| SEC-004 로그인 락아웃 에스컬레이션(account+IP) | Codex | P1 | `done` | credentials 로그인에 `ip/account+ip/account` 다중 윈도우 제한이 적용되고 키가 이메일 해시 기반으로 생성됨 | `app/src/lib/auth.ts`, `app/src/server/auth-login-rate-limit.ts` |
| SEC-002 CSP 하드닝(`unsafe-inline` 제거 경로) | Codex | P1 | `done` | `CSP_ENFORCE_STRICT=1` 강제 모드에서 nonce 기반 script 허용이 유지되고 `quality:gate`/`build` 회귀가 통과 | `app/middleware.ts`, `app/src/lib/csp-nonce.ts`, `app/src/app/posts/[id]/guest/page.tsx` |
| SEC-003 비밀번호 정책 강화 + 유출 비밀번호 차단 | Codex | P1 | `done` | 회원가입/비밀번호 설정/리셋에서 강화 정책과 유출 비밀번호 deny 경로가 통합되고 테스트가 통과 | `app/src/lib/validations/auth.ts`, `app/src/server/services/auth.service.ts` |
| SEC-007 인증 응답 enumeration 완화 + 회귀테스트 | Codex | P1 | `done` | 계정 존재 유추 가능한 메시지/코드를 완화하고 계약 테스트로 고정 | `app/src/server/services/auth.service.ts`, `app/src/app/api/auth/*` |
| SEC-006 비회원 식별 해시 HMAC(pepper) 전환 | Codex | P1 | `done` | guest identity hash가 pepper 기반 HMAC으로 전환되고 legacy hash와 호환 경로가 유지됨 | `app/src/server/services/guest-safety.service.ts`, 시크릿 설정 |

### Cycle 127: Vercel 배포 안정화(동네 동기화 실패 허용) (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `build:vercel` 동네 동기화 실패를 기본 non-fatal로 완화 | Codex | P1 | `done` | `db:sync:neighborhoods` 실패 시 기본은 경고 후 빌드 계속 진행하고, `NEIGHBORHOOD_SYNC_STRICT=1`일 때만 기존처럼 배포 실패 | `app/scripts/vercel-build.ts` |

### Cycle 128: Vercel Prisma Client 초기화 오류 방지 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `prisma generate` 실행 순서 조정(`db:sync:neighborhoods` 이전) | Codex | P0 | `done` | Vercel 의존성 캐시 환경에서도 `sync-neighborhoods.ts` 실행 전에 Prisma Client가 생성되어 `Prisma has detected that this project was built on Vercel` 초기화 오류가 재발하지 않음 | `app/scripts/vercel-build.ts` |

### Cycle 129: 운영 루틴 자동화 + 실OAuth 수동 점검 고정 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `ops-smoke-checks` 주간 자동 실행(health only) | Codex | P1 | `done` | `ops-smoke-checks`가 스케줄로 주 1회 자동 실행되고(`verify_sentry=false`), 대상 URL은 `OPS_BASE_URL` 변수 또는 기본 URL fallback으로 점검됨 | `.github/workflows/ops-smoke-checks.yml`, GitHub Actions Variables |
| 실계정 로그인 완료 수동 점검 체크리스트 고정 | Codex | P1 | `done` | 카카오/네이버 각각 `/onboarding -> /feed` 완료 수동 검증 절차와 증적 기록 규칙이 운영 문서에 명시됨 | `docs/operations/차단 해소 체크리스트.md`, `docs/개발_운영_가이드.md` |

### Cycle 130: Agent Tool Governance 재설계 적용 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 도구 선택 거버넌스 매트릭스 문서화(10개 카테고리) | Codex | P1 | `done` | ORM/Auth/Cache/Real-time/Observability 등 10개 카테고리에 기본값/허용 대안/금지선/재검토 트리거가 정의됨 | `docs/operations/에이전트_도구_거버넌스.md`, `AGENTS.md` |
| 에이전트 작업 지시 템플릿 표준화 | Codex | P1 | `done` | 공통 헤더/입력 템플릿/출력 계약/금지 패턴이 고정되어 프롬프트 편차를 줄임 | `docs/operations/에이전트_프롬프트_템플릿.md`, `AGENTS.md` |
| 운영 가이드에 신규 표준 문서 링크 반영 | Codex | P2 | `done` | agent-only 운영 가이드에서 거버넌스/템플릿 문서를 바로 참조 가능 | `docs/ops/에이전트 운영 가이드 (한국어).md` |

### Cycle 131: Agent Prompt 자동화 + docs 추적 보정 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| docs 추적 규칙 최소 보정(핵심 운영 문서 3종) | Codex | P1 | `done` | `.gitignore`에서 `docs` 전부를 풀지 않고 `agent-tool-governance`, `agent-prompt-template`, `에이전트 운영 가이드`만 추적 예외로 설정 | `.gitignore` |
| 프롬프트 자동 생성 스크립트 추가 | Codex | P1 | `done` | `pnpm -C app agent:prompt` 실행으로 표준 프롬프트 블록을 stdout/file로 생성 가능 | `app/scripts/generate-agent-prompt.ts`, `app/package.json` |
| 템플릿 문서에 CLI 사용법 반영 | Codex | P2 | `done` | 운영자가 템플릿 문서만 보고 자동 생성기를 실행할 수 있음 | `docs/operations/에이전트_프롬프트_템플릿.md` |

### Cycle 132: plan-coordinator 연계 운영 루틴 고정 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| agent-only 운영 가이드에 자동 생성 루틴 반영 | Codex | P1 | `done` | `agent:prompt -> @plan-coordinator -> 실행 -> 검증 -> 동기화` 순서가 명시됨 | `docs/ops/에이전트 운영 가이드 (한국어).md` |
| 프롬프트 템플릿 문서에 plan-coordinator 연계 절차 추가 | Codex | P1 | `done` | 템플릿 문서만으로 생성/계획반영/실행/검증/기록 순서를 재현 가능 | `docs/operations/에이전트_프롬프트_템플릿.md` |

### Cycle 133: Guest 상세 접근제어 + posts rewrite 정합성 보강 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| guest `/posts/*` rewrite 대상을 게시글 ID 상세 경로로 제한 | Codex | P0 | `done` | `/posts/new` 같은 작성 경로는 rewrite되지 않고, 게시글 상세 ID 경로만 guest rewrite/cache 헤더가 적용됨 | `app/middleware.ts`, `app/src/middleware.test.ts` |
| guest 상세 페이지에 공통 읽기 정책 가드 적용 | Codex | P0 | `done` | guest 상세 렌더에서 `assertPostReadable`를 사용해 `HIDDEN/DELETED` 및 로그인 필요 게시글 노출을 차단 | `app/src/app/posts/[id]/guest/page.tsx`, `app/src/server/services/post-read-access.service.ts` |
| rewrite 경계 회귀 테스트 추가 | Codex | P1 | `done` | `middleware.test`에 `/posts/new`, `/posts/:id/edit`, `/posts/:id/guest` 경계 케이스가 포함되어 실패 경로 회귀를 방지 | `app/src/middleware.test.ts` |

### Cycle 134: guest post management E2E 안정화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| flaky 의존(UI 비밀번호 입력 필드 nth 인덱스) 제거 | Codex | P1 | `done` | 화면 DOM/반응형 상태에 따라 실패하던 `nth(1)` 선택자 의존을 제거하고, 비밀번호 기반 작성/수정/삭제 플로우가 안정적으로 통과 | `app/e2e/guest-post-management.spec.ts` |
| guest 관리 E2E 단건 재검증 | Codex | P1 | `done` | `pnpm -C app test:e2e -- e2e/guest-post-management.spec.ts --project=chromium`가 PASS | Playwright local env |

### Cycle 135: OAuth 재검증 + Day1 handoff 자동화 보강 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `oauth-real-e2e` 최신 재실행 성공 증적 갱신 | Codex | P1 | `done` | GitHub Actions `oauth-real-e2e` 최신 run이 success로 확인되고 run URL이 실행 로그에 기록됨 | `.github/workflows/oauth-real-e2e.yml`, GitHub Actions |
| Day1 채널/UTM/24h 점검표 자동 생성 스크립트 추가 | Codex | P1 | `done` | `pnpm -C app growth:day1:handoff`로 Day1 실행표(채널별 UTM, keep/fix/kill, 실행 체크리스트)를 stdout/file로 생성 가능 | `app/scripts/generate-day1-growth-handoff.ts`, `app/package.json` |
| Day1 in-progress 항목 실행 준비 상태 고정 | Codex | P2 | `done` | Day1 게시/증적/UTM 로그를 즉시 입력 가능한 템플릿이 생성되어 수동 실행 항목을 바로 수행 가능 | `docs/business/*`, `PLAN.md`, `PROGRESS.md` |

### Cycle 136: 외부 OAuth2 운영/팔로우업 가이드 정식화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| Kakao/Naver OAuth2 장기 운영 플레이북 작성 | Codex | P1 | `done` | 시크릿/리다이렉트/릴리즈 체크/장애 대응/주기적 팔로우업까지 포함한 운영 가이드 문서가 `docs/ops` 하위에 추가됨 | `docs/operations/OAuth_외부로그인_운영_가이드.md` |
| docs 추적 예외에 신규 OAuth2 운영 가이드 추가 | Codex | P2 | `done` | `.gitignore`에서 신규 가이드 파일이 추적 가능 상태로 관리됨 | `.gitignore` |
| 기존 OAuth 문서와 동기화 규칙 명시 | Codex | P2 | `done` | 신규 가이드에 `차단 해소 체크리스트`, `Vercel OAuth 부트스트랩 가이드`, 워크플로우 동기화 규칙이 명시됨 | `docs/operations/OAuth_외부로그인_운영_가이드.md` |

### Cycle 137: OAuth 실계정 수동 증적 자동화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| OAuth 수동 점검 리포트 템플릿 생성 스크립트 추가 | Codex | P1 | `done` | `pnpm -C app ops:oauth:manual-report`로 Kakao/Naver 상태/증적/후속조치를 포함한 markdown 리포트를 생성 가능 | `app/scripts/generate-oauth-manual-check-report.ts`, `app/package.json` |
| OAuth 운영 가이드에 템플릿 생성 명령 반영 | Codex | P2 | `done` | 수동 점검 절차에서 PROGRESS 기록 직전에 템플릿 생성 명령을 실행하도록 명시됨 | `docs/operations/OAuth_외부로그인_운영_가이드.md` |

### Cycle 138: 닉네임 미설정 사용자 가드 + 프로필 규칙 UX 보강 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 닉네임 미설정 로그인 사용자 `/profile` 강제 가드 | Codex | P0 | `done` | 로그인 사용자의 세션 닉네임이 비어 있으면 `/profile` 외 경로 접근 시 `/profile`로 리다이렉트되어 피드 진입이 차단됨 | `app/middleware.ts`, `app/src/middleware.test.ts` |
| 프로필 저장 시 세션 닉네임 즉시 동기화 | Codex | P1 | `done` | 닉네임 저장 직후 `unstable_update`로 세션이 갱신되어 재로그인 없이 가드 해제가 가능함 | `app/src/lib/auth.ts`, `app/src/server/actions/user.ts`, `app/src/server/actions/user.test.ts` |
| 닉네임 중복/30일 변경 제한 UX 경고 보강 | Codex | P1 | `done` | 온보딩/프로필 폼에 “중복 불가 + 30일 변경 제한” 경고가 노출되고, 서비스 테스트로 중복/쿨다운 실패 경로가 검증됨 | `app/src/components/onboarding/onboarding-form.tsx`, `app/src/components/profile/profile-info-form.tsx`, `app/src/server/services/user.service.test.ts` |

### Cycle 139: 닉네임 미설정 가드 안내 문구 보강 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `/profile` 상단에 닉네임 미설정 차단 사유/해제 방법 안내 노출 | Codex | P1 | `done` | 닉네임 미설정 사용자가 `/profile`로 강제 이동되었을 때 "왜 이동되었는지"와 "닉네임 저장 시 즉시 해제"가 명확히 표시됨 | `app/src/app/profile/page.tsx` |

### Cycle 140: 프로필 저장 후 세션 닉네임 동기화 정합 보정 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `unstable_update` 이후 JWT 닉네임 반영 로직 보강 | Codex | P0 | `done` | `updateProfileAction`에서 `unstable_update` 호출 후 JWT callback(`trigger=update`)이 `token.nickname`을 갱신해 미들웨어 가드가 즉시 해제됨 | `app/src/lib/auth.ts`, `app/src/server/actions/user.ts`, `app/middleware.ts` |

### Cycle 141: 닉네임 가드 체감 성능 개선 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 미들웨어 `getToken` 호출 조건 최적화 | Codex | P1 | `done` | 세션 쿠키가 없거나 `/profile`/`/api` 경로인 경우 토큰 복호화를 건너뛰어 요청당 오버헤드를 줄임 | `app/middleware.ts` |
| `/profile` 요약 조회 경량화(전체 목록 -> count) | Codex | P1 | `done` | 프로필 페이지의 총 작성글 표시가 `findMany` 전체 조회 대신 `count` 단일 쿼리로 동작 | `app/src/server/queries/post.queries.ts`, `app/src/app/profile/page.tsx` |
| 닉네임 미설정 단계에서 비핵심 섹션 lazy 처리 | Codex | P2 | `done` | 닉네임 미설정 상태에서는 관계관리/펫/동네 설정 섹션 조회를 생략해 초기 프로필 진입 지연을 완화 | `app/src/app/profile/page.tsx` |

### Cycle 142: 요청 경로 병목 제거 1차 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 전역 레이아웃 인증/유저 조회 중복 제거 + 병렬화 | Codex | P0 | `done` | `layout`에서 `auth()` 1회 기준으로 사용자/알림/선호 조회를 병렬화해 기본 요청 워터폴을 단축 | `app/src/app/layout.tsx` |
| 상세 페이지 다중 API 호출 제거(1회 응답 통합) | Codex | P0 | `done` | 상세 클라이언트가 `detail/content/stats/relation` 분리 호출 대신 `detail` 1회 응답으로 렌더 | `app/src/app/api/posts/[id]/detail/route.ts`, `app/src/components/posts/post-detail-client.tsx` |
| 피드 SSR 선행 조회 병렬화 | Codex | P1 | `done` | 피드 초반 `auth/user/communities/cookies/preference/policy` 경로를 병렬화해 TTFB 꼬리 지연 완화 | `app/src/app/feed/page.tsx` |
| 캐시 버전 조회 로컬 스냅샷 적용 | Codex | P1 | `done` | 캐시 키 생성 시 원격 version 조회를 매번 수행하지 않도록 짧은 TTL 메모 스냅샷을 적용 | `app/src/server/cache/query-cache.ts` |
| 숨김 작성자 목록 조회 short-TTL 캐시 + 변경 시 무효화 | Codex | P1 | `done` | 로그인 피드/검색에서 반복되는 hidden author 조회를 short cache로 완화하고 block/mute 변경 시 즉시 무효화 | `app/src/server/queries/user-relation.queries.ts`, `app/src/server/services/user-relation.service.ts` |
| 미들웨어 정적 자원 경로 제외 강화 | Codex | P1 | `done` | `_next/data` 및 정적 확장자 요청이 미들웨어를 타지 않도록 matcher를 축소 | `app/middleware.ts` |

### Cycle 143: 목록/알림 체감 성능 개선 2차 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `my-posts` 무제한 조회 제거 + 페이지네이션 적용 | Codex | P1 | `done` | `my-posts`가 페이지 단위 조회(`limit+1`)로 동작하고 다음/이전 페이지 이동이 가능 | `app/src/server/queries/post.queries.ts`, `app/src/app/my-posts/page.tsx` |
| `my-posts` 목록 쿼리 경량 선택(select) 경로 추가 | Codex | P1 | `done` | 작성글 목록 렌더에 필요한 필드만 조회하는 `listUserPostsPage`가 추가되어 과도 relation 로드를 피함 | `app/src/server/queries/post.queries.ts` |
| 알림센터 액션 후 불필요한 `router.refresh()` 제거 | Codex | P1 | `done` | 읽음/이동/모두읽음/보관 액션에서 즉시 전체 RSC refresh를 제거해 인터랙션 지연을 완화 | `app/src/components/notifications/notification-center.tsx` |
| 페이지네이션 쿼리 회귀 테스트 추가 | Codex | P2 | `done` | `listUserPostsPage`의 `limit+1` 및 페이지 정규화 동작이 단위 테스트로 검증됨 | `app/src/server/queries/post.queries.test.ts` |

### Cycle 144: 상세 구경로/알림 배지 동기화 정리 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 댓글 API의 post 조회를 read-access 경량 경로로 전환 | Codex | P1 | `done` | `/api/posts/[id]/comments`에서 카운트 필드를 포함한 `getPostStatsById` 대신 권한검사용 최소 필드 조회를 사용 | `app/src/server/queries/post.queries.ts`, `app/src/app/api/posts/[id]/comments/route.ts` |
| 알림 배지 실시간 동기화 이벤트 추가 | Codex | P1 | `done` | 알림센터/벨 액션 후 unread 증감이 layout refresh 없이도 즉시 배지에 반영 | `app/src/lib/notification-unread-sync.ts`, `app/src/components/notifications/notification-bell.tsx`, `app/src/components/notifications/notification-center.tsx` |
| 댓글 API 테스트 mock/경로 정합 보정 | Codex | P2 | `done` | post 조회 함수 교체에 맞춰 route 테스트가 회귀 없이 통과 | `app/src/app/api/posts/[id]/comments/route.test.ts` |

### Cycle 145: 공통 조회 중복/프리패치 가드 최적화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `layout/feed` 선호 품종 중복 조회 제거 | Codex | P1 | `done` | `listPreferredPetTypeIdsByUserId` 별도 쿼리를 제거하고 기존 사용자 조회 결과(`preferredPetTypes`)에서 파생해 요청당 DB read를 축소 | `app/src/app/layout.tsx`, `app/src/app/feed/page.tsx` |
| 미들웨어 프리패치 요청 토큰 복호화 스킵 | Codex | P1 | `done` | `purpose/next-router-prefetch/x-middleware-prefetch` 요청에서는 `getToken` 복호화를 건너뛰어 링크 프리패치 지연을 완화 | `app/middleware.ts` |
| 프리패치 감지 유닛 테스트 추가 | Codex | P2 | `done` | 프리패치 헤더 감지/비감지 케이스가 테스트로 검증됨 | `app/src/middleware.test.ts` |

### Cycle 146: 커뮤니티 네비 조회 경량화 + 요청 단위 중복 완화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 커뮤니티 네비 전용 경량 조회 함수 추가 | Codex | P1 | `done` | `id/slug/labelKo`만 조회하는 `listCommunityNavItems`를 추가하고 short TTL 캐시를 적용 | `app/src/server/queries/community.queries.ts` |
| `layout` 커뮤니티 조회를 경량 경로로 전환 | Codex | P1 | `done` | 전역 레이아웃이 `listCommunities` 대신 네비 전용 조회를 사용해 payload를 축소 | `app/src/app/layout.tsx` |
| `/feed` 커뮤니티 조회를 경량 경로로 전환 | Codex | P1 | `done` | 피드 초기 로딩에서 커뮤니티 전체 필드 조회 대신 경량 경로를 사용해 초기 조회 비용을 줄임 | `app/src/app/feed/page.tsx` |

### Cycle 147: 알림 unread 카운트 캐시 + 즉시 무효화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| unread 카운트 short-TTL 캐시 적용 | Codex | P1 | `done` | `countUnreadNotifications`가 5초 캐시 키로 조회되어 레이아웃 SSR에서 반복 count 부담을 줄임 | `app/src/server/queries/notification.queries.ts` |
| 알림 상태 변경 시 unread 캐시 버전 무효화 | Codex | P1 | `done` | `mark/read-all/archive/create` 성공 경로에서 user 단위 unread 캐시 버전이 즉시 bump되어 stale 배지를 방지 | `app/src/server/queries/notification.queries.ts`, `app/src/server/cache/query-cache.ts` |
| unread 캐시 무효화 회귀 테스트 추가 | Codex | P2 | `done` | 알림 상태 변경/생성 시 cache bump 호출 여부가 단위 테스트로 검증됨 | `app/src/server/queries/notification.queries.test.ts` |

### Cycle 148: 알림 목록 1페이지 캐시 + list/unread 이중 무효화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 알림 목록 첫 페이지 short-TTL 캐시 적용 | Codex | P1 | `done` | `listNotificationsByUser`가 `cursor` 없는 경우에만 5초 캐시를 사용하고, 커서 페이지는 실시간 조회를 유지 | `app/src/server/queries/notification.queries.ts` |
| 알림 변경 시 list/unread 캐시 동시 무효화 | Codex | P1 | `done` | `mark/read-all/archive/create` 성공 시 `notification-list`와 `notification-unread` 버킷이 함께 bump되어 목록/배지 stale을 방지 | `app/src/server/queries/notification.queries.ts`, `app/src/server/cache/query-cache.ts` |
| 알림 목록 캐시 경로 회귀 테스트 보강 | Codex | P2 | `done` | 첫 페이지 캐시 사용/커서 페이지 캐시 제외, 변경 시 list/unread bump 동작이 단위 테스트로 검증됨 | `app/src/server/queries/notification.queries.test.ts` |

### Cycle 149: Notifications SSR 인증 경량화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `userId` 전용 인증 헬퍼 추가 | Codex | P1 | `done` | `getCurrentUserId`를 도입해 사용자 전체 조회 없이 세션 기반 id를 가져오고, dev demo fallback도 유지 | `app/src/server/auth.ts` |
| `/notifications` 페이지 인증 경로 DB 조회 제거 | Codex | P1 | `done` | 알림 페이지가 `getCurrentUser` 대신 `getCurrentUserId`를 사용해 불필요한 `getUserById` 쿼리를 피함 | `app/src/app/notifications/page.tsx` |
| 인증 헬퍼 회귀 테스트 추가 | Codex | P2 | `done` | 세션/데모/production fallback에서 `getCurrentUserId` 동작이 테스트로 검증됨 | `app/src/server/auth.test.ts` |

### Cycle 150: 알림 API/액션 인증 경량화 + rate-limit 짧은 허용 캐시 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 인증 id 강제 헬퍼(`requireAuthenticatedUserId`) 추가 | Codex | P1 | `done` | 로그인 강제(`AUTH_REQUIRED`)는 유지하면서 user id만 반환하는 경량 인증 경로가 제공됨 | `app/src/server/auth.ts` |
| `/api/notifications` 경로 인증/제한 비용 경량화 | Codex | P1 | `done` | 알림 API가 user 전체 조회 없이 id 기반 인증을 사용하고, rate limit에 짧은 `cacheMs`를 적용해 연속 조회 시 Redis 왕복을 줄임 | `app/src/app/api/notifications/route.ts` |
| 알림 액션(읽음/모두읽음/보관) 인증 경량화 | Codex | P1 | `done` | 알림 액션이 user 전체 조회 없이 id 기반 인증으로 동작해 액션당 불필요한 DB read를 줄임 | `app/src/server/actions/notification.ts` |
| 인증 헬퍼 단위 테스트 보강 | Codex | P2 | `done` | `requireAuthenticatedUserId`의 성공/실패 경로가 테스트로 검증됨 | `app/src/server/auth.test.ts` |

### Cycle 151: 알림 API 계약 테스트 고정 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `/api/notifications` 라우트 테스트 추가 | Codex | P1 | `done` | `AUTH_REQUIRED`, `INVALID_QUERY`, 정상 응답 매핑, 내부 오류 500 경로가 자동 검증됨 | `app/src/app/api/notifications/route.test.ts` |
| rate-limit 파라미터 계약 검증 | Codex | P2 | `done` | notifications key/limit/window/cacheMs가 기대값으로 호출되는지 테스트로 고정됨 | `app/src/app/api/notifications/route.test.ts` |
| 필터 전달 계약 검증(kind/unreadOnly/limit) | Codex | P2 | `done` | querystring 필터가 `listNotificationsByUser` 인자에 정확히 전달되는지 회귀 테스트로 검증됨 | `app/src/app/api/notifications/route.test.ts` |

### Cycle 152: 알림 서버 액션 계약 테스트 고정 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 알림 액션 테스트 추가(`mark/read-all/archive`) | Codex | P1 | `done` | 각 액션의 성공/실패 계약(`ok/updated`)이 테스트로 검증됨 | `app/src/server/actions/notification.test.ts` |
| revalidate 호출 조건 계약 고정 | Codex | P2 | `done` | 변경 발생 시에만 `/notifications`, `("/", "layout")` revalidate가 호출되는지 자동 검증됨 | `app/src/server/actions/notification.test.ts` |
| 예외 매핑 계약 고정(ServiceError/Unexpected) | Codex | P2 | `done` | ServiceError는 코드/메시지 그대로 반환, 예상치 못한 오류는 500 + monitor 호출이 보장됨 | `app/src/server/actions/notification.test.ts` |

### Cycle 153: 커뮤니티 캐시 버전 조회 제거 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 정적 캐시 키 헬퍼 추가 | Codex | P1 | `done` | 버전 bump가 필요 없는 조회 버킷에서 version GET 없이 캐시 키 생성 가능 | `app/src/server/cache/query-cache.ts` |
| 커뮤니티 조회 캐시 키를 정적 키로 전환 | Codex | P1 | `done` | `listCommunities`, `listCommunityNavItems`가 `createQueryCacheKey` 대신 정적 키를 사용해 요청당 Redis 왕복을 줄임 | `app/src/server/queries/community.queries.ts` |
| 알림 단위 계약 스위트 재검증 | Codex | P2 | `done` | `test:unit:notifications` 스위트가 pass되어 최근 알림 최적화/계약 회귀가 없음이 확인됨 | `app/package.json`, `app/src/app/api/notifications/route.test.ts`, `app/src/server/actions/notification.test.ts`, `app/src/server/queries/notification.queries.test.ts`, `app/src/server/auth.test.ts` |

### Cycle 154: 피드 로그인 경로 불필요 정책 조회 제거 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `/feed` 로그인 경로에서 guest 정책 조회 제거 | Codex | P1 | `done` | 로그인 사용자 렌더 시 `getGuestReadLoginRequiredPostTypes` 호출을 제거해 요청당 불필요한 DB/설정 조회를 줄임 | `app/src/app/feed/page.tsx` |
| guest 경로 정책 조회 유지 | Codex | P1 | `done` | 비로그인 사용자는 기존 `getGuestFeedContext` 캐시 경로를 그대로 사용해 정책 동작 회귀 없음 | `app/src/app/feed/page.tsx` |
| 타입/회귀 테스트 재검증 | Codex | P2 | `done` | lint/typecheck 및 vitest 스위트가 pass되어 피드 경로 변경 회귀가 없음 | `app/src/app/feed/page.tsx`, `app/src/server/queries/post.queries.test.ts` |

### Cycle 155: Posts API 인증 조회 경량화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| posts API 인증 경로를 id 기반으로 전환 | Codex | P1 | `done` | `GET/POST /api/posts`가 `getCurrentUser` 대신 `getCurrentUserId`를 사용해 요청당 불필요한 user 조회를 줄임 | `app/src/app/api/posts/route.ts` |
| post detail/comments API 인증 경로를 id 기반으로 전환 | Codex | P1 | `done` | `GET/PATCH/DELETE /api/posts/[id]`, `GET/POST /api/posts/[id]/comments`, `GET /api/posts/[id]/detail`가 id 기반 인증으로 동작 | `app/src/app/api/posts/[id]/route.ts`, `app/src/app/api/posts/[id]/comments/route.ts`, `app/src/app/api/posts/[id]/detail/route.ts` |
| guest 정책 조회를 guest 요청에서만 수행 | Codex | P1 | `done` | `/api/posts` GET에서 로그인 사용자 요청은 `getGuestReadLoginRequiredPostTypes`를 건너뛰어 정책 조회 오버헤드를 제거 | `app/src/app/api/posts/route.ts` |
| route 계약 테스트 mock 정합 보정 | Codex | P2 | `done` | posts/posts[id]/comments route 테스트가 `getCurrentUserId` 기준으로 회귀 없이 통과 | `app/src/app/api/posts/route.test.ts`, `app/src/app/api/posts/[id]/route.test.ts`, `app/src/app/api/posts/[id]/comments/route.test.ts` |

### Cycle 156: Posts 보조 API 인증 조회 경량화 + 계약 테스트 보강 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| posts 보조 API 인증 경로를 id 기반으로 전환 | Codex | P1 | `done` | `GET /api/posts/[id]/content`, `GET /api/posts/[id]/stats`, `POST /api/posts/[id]/view`, `GET /api/posts/[id]/reaction`, `GET /api/users/[id]/relation`가 `getCurrentUserId` 기반으로 동작 | `app/src/app/api/posts/[id]/content/route.ts`, `app/src/app/api/posts/[id]/stats/route.ts`, `app/src/app/api/posts/[id]/view/route.ts`, `app/src/app/api/posts/[id]/reaction/route.ts`, `app/src/app/api/users/[id]/relation/route.ts` |
| reaction/view/relation 계약 테스트 추가 | Codex | P1 | `done` | 인증 실패/정상/예외 500 경로가 테스트로 고정되어 인증 헬퍼 전환 회귀를 방지 | `app/src/app/api/posts/[id]/reaction/route.test.ts`, `app/src/app/api/posts/[id]/view/route.test.ts`, `app/src/app/api/users/[id]/relation/route.test.ts` |
| 타입/회귀 테스트 재검증 | Codex | P2 | `done` | lint/typecheck 및 관련 라우트 테스트가 모두 pass되어 변경 회귀가 없음 | `app/src/app/api/posts/[id]/route.test.ts`, `app/src/app/api/posts/[id]/comments/route.test.ts`, `app/src/app/api/posts/route.test.ts` |

### Cycle 157: Suggest/Search/Comment API 인증 조회 경량화 + 계약 테스트 추가 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| suggestions/search/comment 인증 경로를 id 기반으로 전환 | Codex | P1 | `done` | `GET /api/posts/suggestions`, `POST /api/search/log`, `PATCH/DELETE /api/comments/[id]`가 `getCurrentUserId` 기반으로 동작 | `app/src/app/api/posts/suggestions/route.ts`, `app/src/app/api/search/log/route.ts`, `app/src/app/api/comments/[id]/route.ts` |
| guest 전용 정책 조회를 guest 요청으로 제한 | Codex | P1 | `done` | `/api/posts/suggestions`에서 로그인 요청은 `getGuestReadLoginRequiredPostTypes`를 건너뛰어 정책 조회 오버헤드를 줄임 | `app/src/app/api/posts/suggestions/route.ts` |
| suggestions/search 계약 테스트 추가 | Codex | P1 | `done` | 인증/입력검증/예외 500 경로가 테스트로 고정되어 인증 헬퍼 전환 회귀를 방지 | `app/src/app/api/posts/suggestions/route.test.ts`, `app/src/app/api/search/log/route.test.ts` |
| 타입/회귀 테스트 재검증 | Codex | P2 | `done` | lint/typecheck 및 route 테스트 스위트가 pass되어 변경 회귀가 없음 | `app/src/app/api/posts/suggestions/route.test.ts`, `app/src/app/api/search/log/route.test.ts` |

### Cycle 158: Lounge/Upload API 인증 조회 경량화 + 계약 테스트 추가 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| lounge/upload 인증 경로를 id 기반으로 전환 | Codex | P1 | `done` | `GET /api/lounges/breeds/[breedCode]/posts`, `POST /api/lounges/breeds/[breedCode]/groupbuys`, `POST /api/upload`, `POST /api/upload/client`가 `getCurrentUserId` 기반으로 동작 | `app/src/app/api/lounges/breeds/[breedCode]/posts/route.ts`, `app/src/app/api/lounges/breeds/[breedCode]/groupbuys/route.ts`, `app/src/app/api/upload/route.ts`, `app/src/app/api/upload/client/route.ts` |
| lounge posts guest 정책 조회를 guest 요청으로 제한 | Codex | P1 | `done` | 로그인 요청은 `getGuestReadLoginRequiredPostTypes`를 건너뛰어 정책 조회 오버헤드를 줄임 | `app/src/app/api/lounges/breeds/[breedCode]/posts/route.ts` |
| lounge/upload 계약 테스트 추가 | Codex | P1 | `done` | lounge posts/groupbuys, upload/upload-client 경로의 인증/입력검증/예외 500 경로가 테스트로 고정됨 | `app/src/app/api/lounges/breeds/[breedCode]/posts/route.test.ts`, `app/src/app/api/lounges/breeds/[breedCode]/groupbuys/route.test.ts`, `app/src/app/api/upload/route.test.ts`, `app/src/app/api/upload/client/route.test.ts` |
| 타입/회귀 테스트 재검증 | Codex | P2 | `done` | lint/typecheck 및 신규 route 테스트가 pass되어 변경 회귀가 없음 | `app/src/app/api/lounges/breeds/[breedCode]/posts/route.test.ts`, `app/src/app/api/lounges/breeds/[breedCode]/groupbuys/route.test.ts`, `app/src/app/api/upload/route.test.ts`, `app/src/app/api/upload/client/route.test.ts` |

### Cycle 159: Admin 감사로그 API 권한검증 경량화 + 계약 테스트 추가 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| role 전용 인증 헬퍼 추가 | Codex | P1 | `done` | `getCurrentUserRole`, `requireModeratorUserId`가 `id/role` 최소 조회로 동작해 관리자 API 권한검증 오버헤드를 줄임 | `app/src/server/auth.ts`, `app/src/server/queries/user.queries.ts` |
| admin auth-audits API를 경량 권한 헬퍼로 전환 | Codex | P1 | `done` | `GET /api/admin/auth-audits`, `GET /api/admin/auth-audits/export`가 `requireModeratorUserId`를 사용하고 ServiceError를 표준 응답으로 매핑 | `app/src/app/api/admin/auth-audits/route.ts`, `app/src/app/api/admin/auth-audits/export/route.ts` |
| admin auth-audits 계약 테스트 추가 | Codex | P1 | `done` | auth error/입력오류/정상/예외 500 경로가 테스트로 고정됨 | `app/src/app/api/admin/auth-audits/route.test.ts`, `app/src/app/api/admin/auth-audits/export/route.test.ts` |
| auth helper 테스트 보강 | Codex | P2 | `done` | `getCurrentUserRole`, `requireModeratorUserId` 동작이 단위 테스트로 검증됨 | `app/src/server/auth.test.ts` |

### Cycle 160: 배포 API p50/p95 성능 스냅샷 기록 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| API 4종 반복 측정(각 30회) | Codex | P1 | `done` | `/api/posts`, `/api/posts/suggestions`, `/api/search/log`, `/api/lounges/breeds/[breedCode]/posts`에 대해 TTFB/total 샘플 120건 수집 | `curl`, 배포 URL 접근 |
| p50/p95 집계 및 응답코드 검증 | Codex | P1 | `done` | 엔드포인트별 TTFB/total p50/p95(ms)와 status 분포가 집계되어 200 응답 일관성 확인 | `/tmp/townpet_perf_20260304_prod.tsv` |
| PROGRESS 실행 로그 반영 | Codex | P2 | `done` | 측정 조건(날짜/횟수/대상)과 결과 수치를 `PROGRESS.md`에 기록 | `PROGRESS.md` |

### Cycle 161: 읽기 API rate-limit 짧은 허용 캐시 확대 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 고빈도 읽기 API의 rate-limit cacheMs 적용 | Codex | P1 | `done` | `GET /api/lounges/breeds/[breedCode]/posts`, `GET /api/boards/[board]/posts`, `GET /api/neighborhoods`, `GET /api/communities`에 `cacheMs=1000`이 적용되어 Upstash 왕복 오버헤드를 완화 | 각 route 구현 파일 |
| lounge posts 계약 테스트 정합 보강 | Codex | P2 | `done` | `enforceRateLimit` 호출 계약이 `cacheMs` 포함 기대값으로 고정되어 회귀를 방지 | `app/src/app/api/lounges/breeds/[breedCode]/posts/route.test.ts` |
| 타입/회귀 테스트 재검증 | Codex | P2 | `done` | lint/typecheck 및 관련 route 계약 테스트가 통과해 회귀가 없음 | `pnpm -C app lint`, `pnpm -C app typecheck`, `pnpm -C app test -- ...` |

### Cycle 162: Search log 응답 경로 비동기화 + 에러 매핑 보강 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `/api/search/log` DB write 대기 제거 | Codex | P1 | `done` | 요청 응답 경로에서 `recordSearchTerm` await를 제거하고 비동기 후처리로 전환되어 응답 지연을 완화 | `app/src/app/api/search/log/route.ts` |
| `ServiceError` 상태코드 매핑 보강 | Codex | P1 | `done` | rate-limit 등 `ServiceError`가 500으로 뭉개지지 않고 원래 status/code로 반환됨 | `app/src/app/api/search/log/route.ts` |
| search log 계약 테스트 보강 | Codex | P2 | `done` | `ServiceError` 매핑(429) 경로를 포함해 route 계약 테스트가 고정됨 | `app/src/app/api/search/log/route.test.ts` |

### Cycle 163: 배포 API p50/p95 재측정 (2026-03-05) (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 배포 API 4종 반복 측정(각 30회) | Codex | P1 | `done` | `/api/posts`, `/api/posts/suggestions`, `/api/search/log`, `/api/lounges/breeds/[breedCode]/posts` 샘플 120건 재수집 | `curl`, 배포 URL 접근 |
| p50/p95 재집계 + 상태코드 검증 | Codex | P1 | `done` | endpoint별 TTFB/total p50/p95와 status 분포(200 여부)를 재확인 | `/tmp/townpet_perf_20260305_prod.tsv` |
| 재측정 로그 반영 | Codex | P2 | `done` | 2026-03-04 대비 증감/스파이크 관측치를 `PROGRESS.md`에 기록 | `PROGRESS.md` |

### Cycle 164: Search log 인증 조회 실패 guest fallback (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| search log 인증 조회 예외 복원력 보강 | Codex | P1 | `done` | `getCurrentUserId` 예외 시 guest(IP) key로 fallback해 로그 API의 불필요한 500을 줄임 | `app/src/app/api/search/log/route.ts` |
| fallback 계약 테스트 추가 | Codex | P2 | `done` | auth lookup 예외 시 200 응답 + guest rate key 사용이 테스트로 고정됨 | `app/src/app/api/search/log/route.test.ts` |
| 타입/회귀 테스트 재검증 | Codex | P2 | `done` | lint/typecheck 및 route 테스트 스위트가 pass되어 회귀 없음 | `pnpm -C app lint`, `pnpm -C app typecheck`, `pnpm -C app test -- src/app/api/search/log/route.test.ts` |

### Cycle 165: main 배포 반영 + post-deploy 성능/에러 검증 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 품질게이트 실패 원인 분석/복구 | Codex | P1 | `done` | `getCurrentUserId` export 누락으로 실패한 CI를 `auth.ts`/`user.queries.ts` 보강 커밋으로 복구 | GitHub Actions run `22701352904`, `22701395965` |
| main 재배포 성공 확인 | Codex | P1 | `done` | `quality-gate` run `22701395965`가 `success`로 완료되어 배포 파이프라인 정상화 확인 | GitHub Actions |
| post-deploy 성능 스냅샷 재수집 | Codex | P1 | `done` | 배포 반영 후 API 4종 30회 샘플(120건) 재수집 및 p50/p95 재집계 완료 | `/tmp/townpet_perf_20260305_postdeploy_final.tsv` |
| search log burst 에러코드 검증 | Codex | P1 | `done` | 35회 연속 호출에서 `200 x30 + 429 x5` 확인(500 스파이크 소거) | `/tmp/townpet_searchlog_status_postdeploy_20260305.txt` |

### Cycle 166: Breed lounge posts 게스트 캐시 헤더 적용 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| breed lounge posts 응답 캐시 헤더 추가 | Codex | P1 | `done` | `GET /api/lounges/breeds/[breedCode]/posts`가 guest 첫 페이지 요청에 `public, s-maxage=30, stale-while-revalidate=300` 헤더를 반환 | `app/src/app/api/lounges/breeds/[breedCode]/posts/route.ts` |
| 인증/게스트 캐시 계약 테스트 보강 | Codex | P2 | `done` | 인증 요청은 `no-store`, 게스트 요청은 캐시 헤더가 노출되는 계약이 테스트로 고정됨 | `app/src/app/api/lounges/breeds/[breedCode]/posts/route.test.ts` |
| 타입/회귀 테스트 재검증 | Codex | P2 | `done` | lint/typecheck 및 route 계약 테스트가 통과해 회귀 없음 | `pnpm -C app lint`, `pnpm -C app typecheck`, `pnpm -C app test -- ...` |

### Cycle 167: Search log rate-limit 허용 캐시 적용 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| search log rate-limit cacheMs 도입 | Codex | P1 | `done` | `POST /api/search/log`가 `enforceRateLimit` 호출에 `cacheMs=500`을 사용해 연속 입력 구간의 Redis 왕복 지연을 완화 | `app/src/app/api/search/log/route.ts` |
| search log 계약 테스트 정합 보강 | Codex | P2 | `done` | user/ip rate-limit key 기대값에 `cacheMs=500`이 포함되어 회귀 방지 | `app/src/app/api/search/log/route.test.ts` |
| 타입/회귀 테스트 재검증 | Codex | P2 | `done` | lint/typecheck 및 route 테스트가 통과해 회귀 없음 | `pnpm -C app lint`, `pnpm -C app typecheck`, `pnpm -C app test -- ...` |

### Cycle 168: Cycle 166/167 배포 후 성능 재측정 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| quality-gate 성공 확인 | Codex | P1 | `done` | `22702076616` run이 `success`로 완료되어 latest main 반영 확인 | GitHub Actions |
| 배포 API 4종 성능 스냅샷 재수집 | Codex | P1 | `done` | `/api/posts`, `/api/posts/suggestions`, `/api/search/log`, `/api/lounges/breeds/[breedCode]/posts` 각 30회, 총 120건 재측정 | `/tmp/townpet_perf_20260305_after167.tsv` |
| p50/p95 비교 기록 | Codex | P2 | `done` | breed p50 개선 및 p95 아웃라이어 변동성 패턴을 `PROGRESS.md`에 기록 | `PROGRESS.md` |

### Cycle 169: p95 아웃라이어 원인 분리 진단 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 타이밍 계층/헤더 진단 샘플 수집 | Codex | P1 | `done` | `time_connect/time_appconnect/time_starttransfer/time_total` + `x-vercel-cache/x-vercel-id`를 포함한 진단 샘플 수집 완료 | `/tmp/townpet_outlier_diag2_20260305.tsv` |
| 엔드포인트별 p50/p95 원인 분리 | Codex | P1 | `done` | GET/POST별 connect/tls/ttfb 분해 수치와 상태코드를 기반으로 병목층(네트워크 vs 서버)을 구분 | 진단 스크립트 집계 결과 |
| 결과 문서화 | Codex | P2 | `done` | 단발 고지연 패턴이 재현/미재현되는 조건과 현재 안정 스냅샷을 `PROGRESS.md`에 기록 | `PROGRESS.md` |

### Cycle 170: 지연 스냅샷 자동 수집 파이프라인 구축 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| ops 지연 스냅샷 수집 스크립트 추가 | Codex | P1 | `done` | `OPS_BASE_URL` 기준 API 4종 샘플 수집(tsv) + p50/p95 요약(md)을 생성하는 스크립트 제공 | `app/scripts/collect-latency-snapshot.ts` |
| npm 실행 진입점 추가 | Codex | P2 | `done` | `pnpm ops:perf:snapshot`로 스크립트 실행 가능 | `app/package.json` |
| GitHub Actions 정기 수집 워크플로우 추가 | Codex | P1 | `done` | `ops-latency-snapshots`가 workflow_dispatch + 하루 3회 schedule로 동작하고 artifact/step-summary를 남김 | `.github/workflows/ops-latency-snapshots.yml` |
| 운영 가이드 실행 항목 검증 | Codex | P2 | `done` | GUIDE에서 로컬 수동 실행법/환경변수/자동 수집 워크플로우 안내가 유지되고 있는지 확인 | `docs/개발_운영_가이드.md` |

### Cycle 171: 핫패스 API 경량화/계약테스트 확장 + 성능 임계치 평가 보강 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 읽기 API rate-limit 짧은 허용 캐시 확대 | Codex | P1 | `done` | posts/suggestions/communities/neighborhoods/notifications/breed-lounge 등 조회 경로가 `cacheMs=1000` 기반으로 연속 요청 구간 Redis 왕복을 완화 | `app/src/app/api/**/route.ts` |
| query cache Upstash 왕복 최적화/스냅샷 보강 | Codex | P1 | `done` | Upstash REST 호출을 pipeline 경로로 통합하고 버전 snapshot TTL/메모리 fallback로 버전 조회 오버헤드를 완화 | `app/src/server/cache/query-cache.ts` |
| 알림 unread 동기화/조회 체감 개선 | Codex | P1 | `done` | unread 동기화 이벤트 유틸과 알림 액션/쿼리 보강으로 벨/센터/페이지 간 unread 반영 지연을 축소 | `app/src/lib/notification-unread-sync.ts`, `app/src/server/actions/notification.ts`, `app/src/server/queries/notification.queries.ts` |
| API/액션 계약 테스트 대폭 확장 | Codex | P1 | `done` | admin-audit, notification, upload, relation, post suggestion/reaction/view 등 회귀 지점을 테스트로 고정 | `app/src/app/api/**/*.test.ts`, `app/src/server/actions/notification.test.ts`, `app/src/server/queries/notification.queries.test.ts` |
| 성능 스냅샷 임계치 평가 옵션 추가 | Codex | P2 | `done` | `OPS_PERF_FAIL_ON_THRESHOLD_BREACH`로 p95/slow/non200 임계 초과 시 실패 처리 가능 | `app/scripts/collect-latency-snapshot.ts` |
| 품질게이트 검증 | Codex | P1 | `done` | push run `22704731250`이 `success`로 완료 | GitHub Actions |

### Cycle 172: OAuth Base URL 사전검증 가드 추가 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| OAuth 수동 리포트 스크립트 Base URL sanity 평가 추가 | Codex | P1 | `done` | `ops:oauth:manual-report` 출력에 Base URL 위험도(OK/WARN/ERROR)와 provider callback URL이 포함되고 `strict-base-url` 옵션으로 실패 처리 가능 | `app/scripts/generate-oauth-manual-check-report.ts` |
| OAuth 사전점검 명령 추가 | Codex | P2 | `done` | `pnpm -C app ops:oauth:preflight` 한 번으로 strict Base URL 점검 + 리포트 생성이 가능 | `app/package.json` |
| 운영 문서/체크리스트 동기화 | Codex | P2 | `done` | OAuth 운영 가이드/GUIDE/차단 해소 체크리스트에 preflight 단계와 금지 도메인(`vercel.com`, `*-projects.vercel.app`) 기준이 반영 | `docs/operations/OAuth_외부로그인_운영_가이드.md`, `docs/operations/차단 해소 체크리스트.md`, `docs/개발_운영_가이드.md` |
| 검증 | Codex | P1 | `done` | lint/typecheck/preflight 스모크가 모두 통과 | `pnpm -C app lint ...`, `pnpm -C app typecheck`, `pnpm -C app ops:oauth:preflight` |

### Cycle 173: OAuth 실검증 run 갱신 + 수동 점검 템플릿 최신화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `oauth-real-e2e` 최신 run 재실행/성공 확인 | Codex | P1 | `done` | workflow_dispatch run `22705265766`이 `success`로 완료되고 실OAuth 리다이렉트/앱 온보딩 회귀 단계가 모두 통과 | GitHub Actions `.github/workflows/oauth-real-e2e.yml` |
| 운영 URL 기준 수동 점검 리포트 템플릿 생성 | Codex | P1 | `done` | `ops:oauth:manual-report --strict-base-url 1` 실행으로 Base URL sanity + callback URL이 포함된 템플릿 파일 생성 완료 | `/tmp/oauth-manual-check-2026-03-05.md` |
| blocked 상태 유지 기준 명시 | Codex | P2 | `done` | 카카오/네이버 실계정 온보딩 수동 증적 미입력 상태에서는 Cycle 23 blocked를 유지한다는 기준을 실행로그에 반영 | `PROGRESS.md`, `PLAN.md` |

### Cycle 174: OAuth 수동 증적 저장 경로 고정 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| OAuth 수동 점검 템플릿을 저장소 경로에 생성 | Codex | P1 | `done` | `docs/operations/manual-checks/OAuth_수동점검_기록_2026-03-05.md` 파일이 생성되어 즉시 증적 입력이 가능한 상태 | `pnpm -C app ops:oauth:manual-report ...` |
| 운영 가이드 출력 경로 표준화 | Codex | P2 | `done` | OAuth 운영 가이드의 수동 리포트 생성 명령이 `/tmp`가 아닌 `docs/ops/manual-checks/` 경로를 기본으로 안내 | `docs/operations/OAuth_외부로그인_운영_가이드.md` |

### Cycle 175: OAuth 수동 증적 추적 가능화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| manual-checks 디렉터리 git 추적 허용 | Codex | P1 | `done` | `.gitignore`에서 `docs/ops/manual-checks/*.md`가 추적 가능하도록 allowlist가 추가됨 | `.gitignore` |
| 수동 증적 운영 README 추가 | Codex | P2 | `done` | 생성 명령/PII 금지/완료 처리 규칙이 `docs/operations/manual-checks/수동점검_안내.md`에 문서화됨 | `docs/operations/manual-checks/수동점검_안내.md` |
| 오늘자 OAuth 수동 점검 템플릿 저장 | Codex | P1 | `done` | run `22705265766` 기준 템플릿 파일이 저장소 경로에 생성되어 바로 상태/evidence 입력 가능 | `docs/operations/manual-checks/OAuth_수동점검_기록_2026-03-05.md` |

### Cycle 176: OAuth 수동 증적 충족 자동판정 도입 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 수동 증적 검증 스크립트 추가 | Codex | P1 | `done` | 보고서 markdown에서 Kakao/Naver 상태와 evidence 칸을 파싱해 Cycle 23 해소 가능 여부(`readyToCloseCycle23`)를 출력 | `app/scripts/verify-oauth-manual-check.ts` |
| npm 검증 명령 추가 | Codex | P2 | `done` | `pnpm -C app ops:oauth:verify-manual --report <path> --strict 1`로 기준 미충족 시 non-zero 종료 가능 | `app/package.json` |
| 운영 문서 명령 동기화 | Codex | P2 | `done` | OAuth 운영 가이드 및 manual-check README에 verify 명령이 반영됨 | `docs/operations/OAuth_외부로그인_운영_가이드.md`, `docs/operations/manual-checks/수동점검_안내.md` |
| 동작 검증 | Codex | P1 | `done` | lint/typecheck/verify 실행 결과가 기록되고, 현재 보고서(pending)에서 `readyToCloseCycle23: no`가 확인됨 | `pnpm -C app lint ...`, `pnpm -C app typecheck`, `pnpm -C app ops:oauth:verify-manual ...` |

### Cycle 177: OAuth 수동 점검 결과 입력 자동화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| Provider 결과 업데이트 스크립트 추가 | Codex | P1 | `done` | report markdown의 Kakao/Naver 행과 PROGRESS snippet 상태를 CLI로 안전하게 갱신 가능 | `app/scripts/update-oauth-manual-check.ts` |
| npm 실행 명령 추가 | Codex | P2 | `done` | `pnpm -C app ops:oauth:update-manual --report <path> --provider <kakao|naver> --status <pending|pass|fail> --evidence <link>` 제공 | `app/package.json` |
| 운영 문서 명령 반영 | Codex | P2 | `done` | manual-check README와 OAuth 운영 가이드에 update-manual 예시 명령이 반영 | `docs/operations/manual-checks/수동점검_안내.md`, `docs/operations/OAuth_외부로그인_운영_가이드.md` |
| 검증 | Codex | P1 | `done` | lint/typecheck/update/verify 명령이 정상 동작하며 현재 상태가 `readyToCloseCycle23: no`로 유지됨 | `pnpm -C app lint ...`, `pnpm -C app typecheck`, `pnpm -C app ops:oauth:update-manual ...`, `pnpm -C app ops:oauth:verify-manual ...` |

### Cycle 178: Cycle 23 blocked 해소 (수동 증적 반영) (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 카카오/네이버 수동 점검 리포트 pass 반영 | Codex | P1 | `done` | `oauth-manual-check-2026-03-05.md` provider table 및 snippet에서 Kakao/Naver가 모두 `pass` 상태로 갱신 | `docs/operations/manual-checks/OAuth_수동점검_기록_2026-03-05.md` |
| Cycle 23 해소 조건 strict 검증 | Codex | P1 | `done` | `ops:oauth:verify-manual --strict 1` 실행 결과 `readyToCloseCycle23: yes` 확인 | `pnpm -C app ops:oauth:verify-manual --report ../docs/operations/manual-checks/OAuth_수동점검_기록_2026-03-05.md --strict 1` |
| PLAN 내 Cycle 23 상태 동기화 | Codex | P1 | `done` | Cycle 23 heading이 `(완료)`로 갱신되고 기존 `blocked` 2건이 `done`으로 전환 | `PLAN.md` |

### Cycle 24: 피드 체류 개선 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 100+ 게시글 스크롤 성능 점검(메모리/프레임) | Codex | P1 | `done` | 무한스크롤 시 체감 프레임 드랍 없음, 주요 병목 기록 완료 | `/feed` 무한스크롤 반영 완료 |

### Cycle 25: 검색 고도화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 검색 대표 케이스 수동 실행/기록 | Codex | P1 | `done` | 체크리스트 기준 PASS/WARN/FAIL 기록 완료 | `docs/plan/search-manual-checklist.md`, `docs/reports/검색_수동점검_결과.md` |
| 검색 로그 저장 구조 고도화(`SiteSetting` -> 전용 테이블) | Codex | P2 | `done` | 고트래픽에서도 집계 안정성 보장 가능한 구조 전환 | Prisma schema 변경 |

### Cycle 22: 이미지/UX 잔여 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 업로드 실패 시 재시도 가능한 에러 UX 보강 | Codex | P2 | `done` | 사용자 행동 가능한 오류/재시도 동선 제공 | 업로드 API/폼 컴포넌트 |
| 업로드 핵심 E2E(업로드/조회/삭제) 1개 이상 | Codex | P2 | `done` | CI 또는 로컬에서 반복 실행 가능 | Playwright 시나리오 구성 |
| 느린 네트워크 skeleton 확인 | Codex | P3 | `done` | 지연 환경에서 로딩 UX 저하 없음 | 로딩 컴포넌트 배치 완료 |

### Cycle 23: 소셜 로그인 잔여 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 카카오 로그인 진입 스모크 E2E(버튼/진입요청) | Codex | P2 | `done` | 카카오 버튼 노출 및 `/api/auth/signin/kakao` 요청 시작 자동 검증 | Playwright 환경 |
| 네이버 로그인 진입 스모크 E2E(버튼/진입요청) | Codex | P2 | `done` | 네이버 버튼 노출 및 `/api/auth/signin/naver` 요청 시작 자동 검증 | Playwright 환경 |
| 실OAuth 리다이렉트 스모크 E2E + 수동 워크플로우 | Codex | P2 | `done` | 실환경 시크릿이 있을 때 카카오/네이버 OAuth 호스트로 리다이렉트되는지 자동 검증 가능 | GitHub Actions `workflow_dispatch` + OAuth 시크릿 |
| `oauth-real-e2e` 하이브리드 검증(리다이렉트 + 온보딩/피드) | Codex | P2 | `done` | 단일 워크플로우에서 실OAuth 리다이렉트 스모크 후 `social-dev` 기반 온보딩->피드 진입 회귀까지 연속 검증 | `.github/workflows/oauth-real-e2e.yml`, `app/e2e/social-onboarding-flow.spec.ts` |
| OAuth 키 갱신/운영 절차 문서화 | Codex | P3 | `done` | 운영 문서만 보고 키 로테이션 가능 | GUIDE 업데이트 |
| 개발용 소셜 전체 플로우 E2E(`social-dev`) | Codex | P2 | `done` | 소셜 버튼 -> 온보딩 -> 피드 진입 자동 검증 | `ENABLE_SOCIAL_DEV_LOGIN=1` |
| 카카오 로그인 -> 온보딩 -> 피드 진입 E2E | Codex | P2 | `done` | 수동 점검 리포트에서 Kakao가 `pass` + evidence로 확인되고 strict 검증 통과 | `docs/operations/manual-checks/OAuth_수동점검_기록_2026-03-05.md`, `pnpm -C app ops:oauth:verify-manual --strict 1` |
| 네이버 로그인 -> 온보딩 -> 피드 진입 E2E | Codex | P2 | `done` | 수동 점검 리포트에서 Naver가 `pass` + evidence로 확인되고 strict 검증 통과 | `docs/operations/manual-checks/OAuth_수동점검_기록_2026-03-05.md`, `pnpm -C app ops:oauth:verify-manual --strict 1` |

### Cycle 26: 재방문 장치 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 댓글 수정/정렬/접기/반응 고도화 | Codex | P1 | `done` | 댓글 기능 완결(작성~반응) | 기존 댓글 액션 |
| 알림 읽음 처리 UX 개선(이동 시 자동 읽음/낙관적 UI) | Codex | P1 | `done` | 알림 클릭만으로 읽음 반영, 새로고침 없이 배지 동기화 | Notification 모델/쿼리 |
| 알림/댓글 서비스 플로우 통합 테스트 | Codex | P1 | `done` | 댓글/반응 이벤트 -> 알림 생성 플로우 자동 검증 | Vitest mock 기반 |
| 알림/댓글 DB 기반 E2E 플로우 러너 | Codex | P1 | `done` | 실DB에서 생성->알림->읽음->정리 플로우 1회 실행 검증 | seed 사용자/DB 연결 |
| 알림/댓글 브라우저 E2E 시나리오 | Codex | P2 | `done` | 작성->알림->이동 플로우 브라우저 자동 검증 | Playwright 환경 구성 |

### Cycle 27: 신뢰/안전 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 신규 계정 제한(24h 고위험 카테고리 제한) | Codex | P1 | `done` | 정책 없는 고위험 작성 차단 | 정책 유틸 |
| 링크/연락처 탐지(마스킹/차단) | Codex | P1 | `done` | 스팸성 노출/유도 최소화 | 본문 파서 |
| 금칙어 + 단계적 제재 | Codex | P1 | `done` | 경고->정지->영구 제재 흐름 추적 가능 | 제재 모델/관리자 UI |
| 유저 차단/뮤트 | Codex | P2 | `done` | 개인화 차단 동작 일관성 보장 | 사용자 관계 모델 |

### Cycle 28: 유입 확장 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `generateMetadata`/OG/JSON-LD | Codex | P2 | `done` | 공유/검색 결과 메타 정상 노출 | 페이지별 메타 함수 |
| `sitemap.ts`/`robots.ts` | Codex | P2 | `done` | 인덱싱 기본 구성 완료 | 운영 도메인 설정 |
| 공유 버튼(카카오/링크복사/X) | Codex | P2 | `done` | 공유 동선 실제 사용 가능 | UI + URL 정책 |

### Cycle 29: 프로필/글쓰기 품질 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 프로필 완성(닉네임/소개/아바타) | Codex | P2 | `done` | 사용자 신뢰정보 일관 노출 | 사용자 스키마 |
| 반려동물 프로필(Pet) CRUD | Codex | P2 | `done` | 등록/수정/조회/삭제 가능 | Prisma schema |
| 공개 프로필(`/users/[id]`) + 활동 탭 | Codex | P2 | `done` | 타 사용자 신뢰/활동 확인 가능 | 쿼리/페이지 |
| 리치 텍스트 에디터 + 임시저장 + 미리보기 | Codex | P1 | `done` | 작성 품질/완성도 개선 | 에디터 라이브러리, sanitize |

### Cycle 30: 릴리스 하드닝 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| CI 품질게이트(`lint+test+e2e`) 고정 | Codex | P1 | `done` | 머지 전 자동 검증 강제 | 테스트 안정성 |
| 백업/복구/장애 런북 정비 | Codex | P1 | `done` | 장애 시 대응 순서 명확 | 운영 문서 |
| SLO/알람 기준 수립 | Codex | P2 | `done` | 가용성/응답시간/에러율 기준 확정 | 모니터링 데이터 |

### Cycle 31: 알림 경험 완성 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 알림 센터 커서 기반 추가 로딩(자동 + 수동 fallback) | Codex | P1 | `done` | `nextCursor`가 실제 추가 로딩으로 연결되고, 페이지 끝/오류 상태가 사용자에게 명확히 안내됨 | Notification 쿼리/알림 UI |
| 공개 프로필 활동 탭 커서 기반 페이지네이션 | Codex | P1 | `done` | 활동 탭(`posts/comments/reactions`)에서 20개 이후 `더 보기` 동선으로 다음 페이지 조회 가능 | 공개 프로필/유저 활동 쿼리 |
| 알림 센터 유형 필터/탭 + 읽지 않음만 보기 | Codex | P2 | `done` | 알림 밀도 증가 상황에서 필요한 알림만 즉시 탐색 가능 | Notification 쿼리/API 확장 |
| 알림 센터 필터 상태 E2E(탭/읽지 않음/URL 유지) | Codex | P2 | `done` | 필터 변경 -> 목록 반영 -> URL 동기화가 회귀 없이 검증됨 | Playwright 환경 |

### Cycle 32: 기술부채 정리 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 검색 로그 구형 fallback(`SiteSetting`) 제거 + 운영 마이그레이션 가이드 | Codex | P2 | `done` | `SearchTermStat` 단일 경로로 정리되고 운영 전환 절차 문서화 완료 | 검색 쿼리/운영 가이드 |
| 구형 `SiteSetting(popular_search_terms_v1)` 키 정리 실행 | Codex | P3 | `done` | 스크립트 기반 드라이런/실행 경로와 운영 문서가 준비되고, 운영 DB에서 미사용 키 정리가 가능해짐 | 운영 배포 권한 |

### Cycle 33: 운영 정책 파라미터화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 신규 계정 안전 정책(카테고리/연락처 제한) 관리자 설정화 | Codex | P2 | `done` | 하드코딩된 24h 정책을 관리자 화면에서 조정하고 게시글/댓글 서비스에 즉시 반영 | SiteSetting 정책 저장 |
| 신규 계정 안전 정책 E2E(시간/카테고리 변경 반영) | Codex | P2 | `done` | 정책 변경 후 차단/허용 동작이 자동 검증됨 | DB flow runner + seed 사용자 |
| 관리자 정책 변경 UI Playwright E2E | Codex | P2 | `done` | 관리자 화면에서 정책 변경/저장/새로고침 유지가 자동 검증됨 | Playwright + admin demo user |

### Cycle 34: Rate limit 보안/정책 하드닝 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 피드 조회 rate key 스푸핑 제거 (`x-user-id` 미신뢰) | Codex | P1 | `done` | 인증 사용자는 세션 user id, 비로그인은 client IP만으로 key 생성 | `/api/posts` GET 라우트 |
| Upstash rate limit 윈도우 고정 (`SET NX PX + INCR`) | Codex | P1 | `done` | 요청마다 TTL이 갱신되지 않고 최초 요청 기준 윈도우로 동작 | `src/server/rate-limit.ts` |
| Upstash 경로 단위 테스트 보강 | Codex | P1 | `done` | 고정 윈도우 동작/TTL 복구 시나리오가 자동 검증됨 | `src/server/rate-limit.test.ts` |

### Cycle 35: 운영 스모크 자동화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 배포 health endpoint 점검 스크립트 + CI 수동 워크플로우 | Codex | P2 | `done` | 배포 URL 입력만으로 `/api/health` 200 + `status=ok` 자동 검증 가능 | 배포 URL |
| Sentry 실수신 점검 스크립트 + CI 수동 워크플로우 | Codex | P2 | `done` | 이벤트 전송 후 Sentry API에서 event id 확인까지 자동 검증 가능 | SENTRY 시크릿/토큰 |

### Cycle 36: 품종 기반 개인화 설계 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 품종 기반 개인화/광고/커뮤니티 PRD 작성 | Codex | P1 | `done` | 문서 1개에 목표/범위/수용기준/스키마/추천 의사코드가 포함됨 | `docs/product/품종_개인화_기획서.md` |
| Pet/추천/광고 스키마 상세 설계(Prisma/Zod) | Codex | P1 | `done` | 마이그레이션 가능 단위의 schema diff + validation schema 초안 | `app/prisma/schema.prisma`, `app/src/lib/validations/pet.ts` |
| 피드 개인화 가중치 MVP 구현 + 계측 | Codex | P1 | `done` | 품종/체급 가중치 + 다양성 guardrail + 로그 계측 반영 | `app/src/server/queries/post.queries.ts`, `app/src/app/feed/page.tsx` |
| 품종 라운지/공동구매 템플릿 정책 연동 | Codex | P2 | `done` | 라운지 글쓰기 경로에 신규유저 제한/연락처 제한/신고 자동숨김 연결 | `app/src/app/api/lounges/breeds/[breedCode]/posts/route.ts`, `app/src/app/api/lounges/breeds/[breedCode]/groupbuys/route.ts`, `app/src/lib/validations/lounge.ts`, `app/src/server/queries/post.queries.ts` |
| 품종 타겟 광고 슬롯 + 빈도 캡 | Codex | P2 | `done` | 광고 라벨 노출, 세션/일 단위 빈도 캡 동작, 실험 플래그 구성 | `app/src/app/feed/page.tsx`, `app/src/components/posts/feed-infinite-list.tsx` |

### Cycle 37: 비용 검증/운영 전략 문서화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| Next.js+Vercel 비용 팩트체크 + 3안 시뮬레이터 문서화 | Codex | P1 | `done` | 비용 급증 원인, 계산식, 3개 시나리오, 대안 아키텍처, 즉시 실행안이 문서 1개로 정리됨 | `docs/business/비용_팩트체크_및_3안_시뮬레이터.md` |

### Cycle 38: 경쟁/벤치마크 정리 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 반려 커뮤니티/플랫폼 벤치마크 표 작성 | Codex | P1 | `done` | 유사 서비스 5개 관점(문제/기능/수익/신뢰장치)과 TownPet 적용 우선순위가 문서 1개로 정리됨 | `docs/business/경쟁_대체재_분석.md` |

### Cycle 38: 인증/피드/알림/상세 UX 정리 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 로그인/회원가입 화면 문구/접근성/동선 정리 + 로컬 소셜 노출 통일 | Codex | P1 | `done` | 로그인/회원가입 카피/버튼/폼 상태/접근성 일관화, 로컬에서 소셜 버튼 항상 노출(비프로덕션) | `app/src/app/login`, `app/src/app/register`, `app/src/components/auth/*` |
| 헤더 알림 UX 개선(팝오버 미리보기/읽음 처리/필터) | Codex | P1 | `done` | 첫 클릭 팝오버, 알림 페이지 이동 CTA, 개별/전체 읽음 처리, 전체/안읽음 필터 제공 | `app/src/components/notifications/notification-bell.tsx` |
| 피드 필터/카드 정리 + 모바일 목록 우선 동선 확보 | Codex | P1 | `done` | 피드 카드 스캔성 개선, 반응 안내 중복 제거, 모바일에서 필터 접힘 기본 + 목록 빠른 진입 가능 | `app/src/app/feed/page.tsx`, `app/src/components/posts/feed-*` |
| 게시글 상세 액션/댓글 밀도 개선 | Codex | P2 | `done` | 상세 상단 액션 위계 정리, 공유 드롭다운화, 댓글 액션 과밀 완화/가독성 개선 | `app/src/app/posts/[id]/page.tsx`, `app/src/components/posts/post-comment-thread.tsx` |
| 모바일 게시글 상세 압축(제목/메타/액션/비회원 관리 접기) | Codex | P1 | `done` | 제목/메타 높이 축소, 반응+공유 1행 배치, 비회원/댓글 관리 액션을 접기 구조로 전환 | `app/src/app/posts/[id]/page.tsx`, `app/src/components/posts/guest-post-detail-actions.tsx`, `app/src/components/posts/post-reaction-controls.tsx` |
| 모바일 댓글 반응 기본 접기 | Codex | P2 | `done` | 댓글 반응(`추천/비추천`)은 모바일에서 필요 시 펼쳐 사용, 데스크탑은 기존 상시 노출 유지 | `app/src/components/posts/post-comment-thread.tsx` |

### Cycle 39: 비회원 즉시 공개 작성 정책 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 비회원 글쓰기 허용 + 고위험 카테고리/링크/연락처 제한 | Codex | P1 | `done` | 비회원이 로그인 없이 글 작성 가능하며, 병원리뷰/모임/공동구매/실종 등 제한 카테고리 및 외부 링크/연락처가 차단됨 | `app/src/server/services/post.service.ts`, `app/src/app/api/posts/route.ts` |
| 비회원 레이트리밋/위반 누적 제재(IP+디바이스) | Codex | P1 | `done` | 비회원 작성에 다중 윈도우 제한이 적용되고, 반복 위반 시 자동 임시 차단이 동작함 | `app/src/server/services/guest-safety.service.ts`, `app/prisma/schema.prisma` |
| 비회원 작성 UI(닉네임/비밀번호) + 이미지 제한 반영 | Codex | P1 | `done` | `/posts/new`에서 비회원 작성 폼이 보이고 비회원 정책(온동네 고정, 이미지 1장 2MB)이 안내/강제됨 | `app/src/app/posts/new/page.tsx`, `app/src/components/posts/post-create-form.tsx` |

### Cycle 40: 상세/댓글 UX 폴리싱 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 게시글 상세 2단 레이아웃 단순화 + 메타 정보 통합 | Codex | P1 | `done` | 우측 정보 박스 제거, 작성일/범위/위치를 메인 카드 메타 라인으로 통합, 상태 표기 제거 | `app/src/app/posts/[id]/page.tsx` |
| 댓글 인터랙션 개선(답글 취소/비회원 비밀번호 입력 흐름) | Codex | P1 | `done` | 답글 취소 가능, 답글 폼에서 비회원 닉네임/비밀번호 입력 가능, 수정/삭제 시 액션 시점 비밀번호 입력 | `app/src/components/posts/post-comment-thread.tsx`, `app/src/app/api/comments/[id]/route.ts` |
| 비회원 반응 로그인 유도 UX 개선(버튼별 툴팁) | Codex | P2 | `done` | 기본 숨김, 클릭 시 좋아요/싫어요 버튼 아래 개별 로그인 유도 툴팁 노출(모바일 clamp 포함) | `app/src/components/posts/post-reaction-controls.tsx` |

### Cycle 41: 카테고리 체계 정리 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 카테고리 라벨 통일(피드/상세/내 글/정책 메시지) | Codex | P1 | `done` | 병원후기/장소후기/산책코스/동네모임/중고공동구매/실종목격/질문답변/자유게시판/용품리뷰/반려자랑 표기가 주요 화면에서 일관됨 | `app/src/lib/post-presenter.ts`, `app/src/app/posts/[id]/page.tsx`, `app/src/app/my-posts/page.tsx` |
| 피드 카테고리 그룹 재정의(주요/추가) + 중복 분류 제거 | Codex | P1 | `done` | 피드 필터가 주요 게시판/추가 게시판으로 노출되고, 레거시 중복 타입(자유/QA/일상 파생)은 필터에서 제거됨 | `app/src/app/feed/page.tsx` |
| 글쓰기 카테고리 옵션 재구성 + 중고/공동구매 노출 | Codex | P1 | `done` | 글쓰기 타입 목록에 중고/공동구매가 명시 노출되고 최신 분류 체계 순서로 정렬됨 | `app/src/components/posts/post-create-form.tsx` |

### Cycle 42: 피드↔상세 전환 성능 개선 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 상세 진입/복귀 체감 속도 개선(중복 조회/블로킹 제거/복귀 UX) | Codex | P1 | `done` | 상세 진입 TTFB 저하 요인(조회수 집계 await, 메타/페이지 중복 조회)을 완화하고, 목록 복귀가 히스토리 기반으로 동작 | `app/src/app/posts/[id]/page.tsx`, `app/src/components/posts/feed-infinite-list.tsx`, `app/src/components/posts/back-to-feed-button.tsx` |
| 피드 페이지 count 제거 + 커서 무한스크롤 복원 | Codex | P1 | `done` | ALL 모드에서 `countPosts`/페이지네이션 의존을 제거하고 `nextCursor` 기반 더보기로 전환해 DB 카운트 쿼리를 제거 | `app/src/app/feed/page.tsx`, `app/src/server/queries/post.queries.ts` |
| 상세 메타데이터 경량 조회 분리 | Codex | P1 | `done` | `generateMetadata`가 상세 본문 쿼리와 분리된 최소 select 경로를 사용해 메타 계산용 DB payload를 축소 | `app/src/server/queries/post.queries.ts`, `app/src/app/posts/[id]/page.tsx` |
| 피드 목록 relation 경량화(리스트 미사용 상세필드 제외) | Codex | P1 | `done` | 목록/베스트 쿼리에서 카드에 쓰지 않는 `hospitalReview/placeReview/walkRoute` select를 제거해 응답 payload를 축소 | `app/src/server/queries/post.queries.ts` |
| 피드 이미지 payload 경량화(카드 미사용 필드 제거) | Codex | P1 | `done` | 목록/베스트 쿼리 이미지 select를 `id`만 남기고 `url/order` 및 이미지 정렬쿼리를 제거해 응답 payload/정렬비용을 축소 | `app/src/server/queries/post.queries.ts`, `app/src/app/feed/page.tsx`, `app/src/components/posts/feed-infinite-list.tsx` |
| 배포 환경 p50/p95 성능 계측 자동 반복 측정 | Codex | P1 | `done` | feed/post/api/back 시나리오를 15회 반복 측정해 p50/p95 숫자를 기록하고, 이후 릴리스 검증 기준으로 재사용 가능 | `PROGRESS.md` |
| 기간 필터 무한스크롤 일관성 복구(SSR/API 파라미터 정합) | Codex | P1 | `done` | `period(3/7/30)` 선택 시 초기 SSR 목록과 추가 로딩 API가 동일 기간 조건으로 조회되어 결과 드리프트가 발생하지 않음 | `app/src/components/posts/feed-infinite-list.tsx`, `app/src/app/api/posts/route.ts`, `app/src/lib/validations/post.ts`, `app/src/app/feed/page.tsx` |

### Cycle 43: 품종 라운지 UI/동선 완성 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 품종 라운지 페이지(필터/검색/무한스크롤) 구현 | Codex | P1 | `done` | `/lounges/breeds/[breedCode]`에서 정렬/기간/카테고리 필터와 커서 기반 추가 로딩이 동작 | `app/src/app/lounges/breeds/[breedCode]/page.tsx`, `app/src/components/posts/feed-infinite-list.tsx` |
| 품종 공동구매 템플릿 작성 UI 구현 | Codex | P1 | `done` | `/lounges/breeds/[breedCode]/groupbuys/new`에서 템플릿 입력 후 라운지 API로 저장되고 상세로 이동 | `app/src/app/lounges/breeds/[breedCode]/groupbuys/new/page.tsx`, `app/src/components/lounges/breed-groupbuy-form.tsx` |
| 피드 광고 CTA를 라운지 진입 경로로 전환 | Codex | P2 | `done` | 품종 타겟 광고 슬롯 CTA가 `/lounges/breeds/:breedCode`로 이동해 커뮤니티 진입 동선을 일치 | `app/src/app/feed/page.tsx` |

### Cycle 44: 모바일 밀도/위계 리파인 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 피드 모바일 헤더/필터 1화면 점유 축소 | Codex | P1 | `done` | 모바일에서 제목/요약/필터 높이를 압축해 목록 도달 스크롤을 단축 | `app/src/app/feed/page.tsx`, `app/src/components/posts/feed-search-form.tsx` |
| 게시글 상세 모바일 메타/액션 컴팩트화 | Codex | P1 | `done` | 제목/메타를 축약하고 반응/공유/관리 액션을 계층화해 화면 길이를 줄임 | `app/src/app/posts/[id]/page.tsx`, `app/src/components/posts/post-share-controls.tsx`, `app/src/components/posts/guest-post-detail-actions.tsx` |
| 글쓰기 모바일 툴바 최소화 | Codex | P2 | `done` | 모바일은 핵심 툴바만 기본 노출하고 고급 서식은 접기 패널로 이동 | `app/src/components/posts/post-create-form.tsx`, `app/src/app/posts/new/page.tsx` |

### Cycle 45: 업로드 체감 성능/정합 하드닝 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| Vercel Blob 직업로드 + 서버 토큰 라우트 전환 | Codex | P1 | `done` | 브라우저 직접 업로드 기본 경로로 전환되고 서버는 토큰 발급만 수행 | `app/src/app/api/upload/client/route.ts`, `app/src/components/ui/image-upload-field.tsx` |
| 업로드 전 클라이언트 압축/리사이즈 + 제한 병렬 업로드 | Codex | P1 | `done` | 다중 첨부 시 전송 바이트 축소 및 병렬(동시 3개)로 업로드 시간 단축 | `app/src/components/ui/image-upload-field.tsx` |
| 비회원 링크/연락처 정책의 이미지 URL 오탐 방지 | Codex | P1 | `done` | 이미지 마크다운 URL은 외부링크 차단 대상으로 오탐되지 않음 | `app/src/server/services/post.service.ts` |
| 파일 입력 연속 선택 안정화(2번째 선택 무반응 개선) | Codex | P1 | `done` | 배포 환경에서 연속 `choose file` 동작이 안정적으로 재현 | `app/src/components/ui/image-upload-field.tsx` |

### Cycle 46: 보안/운영 안정화 하드닝 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `DEMO_USER_EMAIL` 프로덕션 우회 로그인 차단 + 회귀 테스트 | Codex | P1 | `done` | 프로덕션에서는 세션 없는 `DEMO_USER_EMAIL` fallback이 절대 동작하지 않고, 테스트가 이를 보장 | `app/src/server/auth.ts`, `app/src/server/auth.test.ts`, `app/playwright.config.ts` |
| 소셜 계정 위험 링크 옵션(`allowDangerousEmailAccountLinking`) 기본 비활성화 | Codex | P1 | `done` | 카카오/네이버 provider에서 위험 옵션 제거 후 로그인 회귀 테스트 통과 | `app/src/lib/auth.ts`, `app/src/server/auth.test.ts` |
| API 에러 모니터링 누락 라우트 정리(공통 핸들링 규칙 고정) | Codex | P1 | `done` | `/api/posts/[id]`, `/api/reports/[id]`, `/api/reports/bulk`, `/api/admin/auth-audits*`에서 unhandled error가 동일 포맷으로 로깅/Sentry 전송 | `app/src/app/api/**/*.ts`, `app/src/server/error-monitor.ts` |
| API 계약 테스트 1차(고위험 엔드포인트 상태코드/에러코드) | Codex | P1 | `done` | `/api/posts`, `/api/posts/[id]`, `/api/reports`, `/api/auth/register` 핵심 실패경로가 자동 검증 | `app/src/app/api/**`, `app/src/server/**`, `app/vitest.config.ts` |
| 비회원 작성자 모델 분리 설계(`GuestAuthor`) + 마이그레이션 초안 | Codex | P2 | `done` | User 오염 없이 guest identity를 별도 모델로 관리하는 Prisma schema/이관 계획 문서 완료 | `app/prisma/schema.prisma`, `docs/ops/*` |
| 피드 개인화 쿼리 예산 절감(뷰어 펫 신호 조회 조건화/캐시) | Codex | P2 | `done` | 비개인화 피드에서 불필요 조회 제거, 개인화 경로 p95 악화 없이 동작 | `app/src/app/feed/page.tsx`, `app/src/server/queries/post.queries.ts` |
| 작성/수정 에디터 직렬화 로직 공통화 | Codex | P2 | `done` | `post-create-form`/`post-detail-edit-form` 중복 직렬화 코드 제거, 회귀 테스트 유지 | `app/src/components/posts/post-create-form.tsx`, `app/src/components/posts/post-detail-edit-form.tsx`, `app/src/lib/*` |
| 감사로그 export limit 정합화(요청/쿼리 clamp 일치) | Codex | P3 | `done` | export API 파라미터와 query limit 정책이 일치하고 운영 문서와 동일 | `app/src/app/api/admin/auth-audits/export/route.ts`, `app/src/server/queries/auth-audit.queries.ts` |

### Cycle 47: GuestAuthor 이관 후속 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| GuestAuthor 백필 스크립트 추가 및 실행 커맨드 노출 | Codex | P2 | `done` | 기존 guest post/comment에 대해 `guestAuthorId`를 채울 수 있는 스크립트와 npm script가 제공 | `app/scripts/backfill-guest-authors.ts`, `app/package.json` |
| 누락 Prisma migration 추적 복원(guest policy/comment/ip display) | Codex | P1 | `done` | 기존에 ignore로 누락되던 guest 관련 migration SQL 3개가 저장소에 반영되어 배포/재현 가능 | `app/prisma/migrations/20260224153000_add_guest_post_policy/migration.sql`, `app/prisma/migrations/20260224173000_add_guest_comment_policy/migration.sql`, `app/prisma/migrations/20260224181500_add_guest_ip_display_fields/migration.sql` |

### Cycle 48: 사업화 제출 자료 패키징 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 지원사업 제출용 1페이지 문서 작성 | Codex | P1 | `done` | 문제/해결/차별화/시장성/수익화/요청항목/KPI를 1페이지 제출 형식으로 바로 활용 가능하게 정리 | `docs/business/지원사업_제출용_1페이지.md` |

### Cycle 49: 1인 수익화 실험 설계 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 유저 거부감 낮은 첫 유료실험 3가지 설계 | Codex | P1 | `done` | 무료 핵심경험 유지 원칙 하에 B2B/선택형 실험 3개(상품/가격/KPI/중단규칙)가 문서 1개로 정리됨 | `docs/business/수익화_실험_전략.md` |
| 스폰서 카드 실험 실전 패키지(판매 문구/영업 템플릿/운영 체크리스트) 작성 | Codex | P1 | `done` | 실험 1을 7일 내 실행할 수 있도록 가격표/메시지/KPI/리스크 대응이 문서 1개로 정리됨 | `docs/business/수익화_실험_전략.md` |
| 파트너 발굴/접촉 관리용 30개 리스트 템플릿 작성 | Codex | P1 | `done` | 상태코드/점수/접촉일정/전환률 계산 기준을 포함한 30개 템플릿이 즉시 사용 가능 | `docs/business/파트너_리스트_템플릿_30개.md` |
| 성동구 기준 파트너 리스트 샘플 10개 작성 | Codex | P1 | `done` | 템플릿 즉시 활용을 위한 샘플 입력 10개(상태/점수/일정/결과)가 문서로 제공됨 | `docs/business/수익화_실험_전략.md` |
| 성동구 기준 실전 30개 1차 아웃바운드 초안 작성 | Codex | P1 | `done` | Day1 발송 가능한 상위 10개 포함 30개 후보군과 일정/금액/목표가 문서로 고정됨 | `docs/business/수익화_실험_전략.md` |

### Cycle 50: GuestAuthor 전환 안정화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| CI GuestAuthor backfill dry-run + verify 게이트 추가 | Codex | P1 | `done` | quality gate에서 스키마 동기화 후 backfill dry-run/verify가 자동 실행 | `.github/workflows/quality-gate.yml` |
| 읽기 경로 GuestAuthor 우선 표시 전환(상세/피드/검색/라운지) | Codex | P1 | `done` | guest 작성자 표시가 `guestAuthor.displayName` fallback을 포함하도록 통일 | `app/src/server/queries/post.queries.ts`, `app/src/server/queries/comment.queries.ts`, `app/src/app/posts/[id]/page.tsx`, `app/src/app/feed/page.tsx`, `app/src/app/search/page.tsx`, `app/src/app/lounges/breeds/[breedCode]/page.tsx` |
| 비회원 댓글 API 계약 테스트 보강 | Codex | P2 | `done` | guest 댓글 생성 시 guestAuthor 생성/연결과 에러 분기(400/500)가 테스트로 고정 | `app/src/app/api/posts/[id]/comments/route.test.ts` |

### Cycle 51: 익명성 우선 온동네 초기유저 성장 전략 문서화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 친구초대 없는 온동네 14일 초기유저 성장 플랜 작성 | Codex | P1 | `done` | 온동네 우선 퍼널(읽기->참여->재방문), 동네 확장 트리거, 운영 템플릿까지 포함한 문서 1개가 정리됨 | `docs/business/온동네_초기유저_30일_실행플레이북.md` |

### Cycle 52: GuestAuthor cleanup 사전 안전장치 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| quality gate에 Guest legacy cleanup rollback rehearsal 추가 | Codex | P1 | `done` | CI에서 backfill verify 이후 cleanup 롤백 리허설이 자동 실행되어 cleanup 준비도를 상시 검증 | `.github/workflows/quality-gate.yml`, `app/scripts/rehearse-guest-legacy-cleanup.ts` |

### Cycle 53: 한국 채널 실사 기반 초기유저 전략 재작성 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 한국 커뮤니티/SNS 생태계 팩트 문서 작성 | Codex | P1 | `done` | 채널별 모수/역할/운영방식/주의점을 수치와 출처 기반으로 문서화 | `docs/business/국내_커뮤니티_SNS_생태계_조사.md` |
| 온동네 30일 실행 플레이북 작성(채널 3개 고정) | Codex | P1 | `done` | 네이버+카카오오픈채팅+인스타 기준 주차별 실행/루틴/KPI 컷오프가 실행형으로 정리됨 | `docs/business/온동네_초기유저_30일_실행플레이북.md` |
| 초기 기능축소/법적리스크 회피안 작성 | Codex | P1 | `done` | 병원/개인 비방형 리스크 대응을 위한 30일 기능 제한, 운영조치, 재오픈 조건이 문서화됨 | `docs/business/초기_기능축소_및_법적리스크_회피안.md` |

### Cycle 54: 필수 3채널 계정개설 준비물 고정 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 네이버/카카오/인스타 계정개설 체크리스트 작성 | Codex | P1 | `done` | 채널별 계정명/소개/고정공지/초기 콘텐츠/UTM/7일 점검지표가 문서 1개로 정리됨 | `docs/business/온동네_초기유저_30일_실행플레이북.md` |

### Cycle 55: Day1 문안 + business 읽기순서 정리 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| Day1 채널별 업로드 문안 10개 작성 | Codex | P1 | `done` | 네이버/카카오/인스타에 즉시 게시 가능한 제목/본문/캡션 10개가 문서 1개로 정리됨 | `docs/business/온동네_초기유저_30일_실행플레이북.md` |
| business 폴더 읽기 순서/목적별 맵 정리 | Codex | P1 | `done` | 초기유저 런칭 실행용 문서 우선순위를 로컬 기준으로 정리 완료 | `docs/business/사업_문서_안내.md` |

### Cycle 53: Guest 권한 경로 정리 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 비회원 글 수정/삭제 권한검증을 GuestAuthor 우선으로 통합 | Codex | P1 | `done` | `updateGuestPost`/`deleteGuestPost`가 `guestAuthor.passwordHash/ipHash/fingerprintHash`를 우선 사용하고 legacy fallback 유지 | `app/src/server/services/post.service.ts` |
| 비회원 댓글 수정/삭제 권한검증을 GuestAuthor 우선으로 통합 | Codex | P1 | `done` | `updateGuestComment`/`deleteGuestComment`가 `guestAuthor` credential 우선 + legacy claim fallback 구조로 동작 | `app/src/server/services/comment.service.ts` |
| GuestAuthor 권한 회귀 테스트 확장 | Codex | P1 | `done` | guest management 테스트에 GuestAuthor-only credential 경로(legacy hash null) 수정/삭제 케이스 추가 | `app/src/server/services/guest-post-management.service.test.ts` |

### Cycle 56: 멀티종 커뮤니티 분류 설계 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 커뮤니티 고정 목록(반려동물 종류 기준) 초안 작성 | Codex | P1 | `done` | 대분류(L1), 초기 커뮤니티 12개(L2), 대표 태그, 커뮤니티별 기본 글타입 우선순위가 문서 1개에 고정됨 | `docs/product/커뮤니티_택소노미_v1.md` |
| 공용 보드(병원후기/실종·목격/중고·공동구매) 매핑 정책 확정 | Codex | P1 | `done` | 3개 고위험/공공성 카테고리를 `COMMON` 보드로 분리하고 카테고리-보드 매핑 및 데이터 모델 초안이 문서에 반영됨 | `docs/product/커뮤니티_택소노미_v1.md` |
| 커뮤니티/공용보드 구현 설계 상세화(스키마/API/UI/테스트) | Codex | P1 | `done` | Prisma 확장 초안, API 계약, Zod 규칙, UI 분기, 마이그레이션/테스트 체크리스트가 문서 1개로 정리됨 | `docs/product/커뮤니티_보드_구현_v1.md` |

### Cycle 57: 멀티 세션 자동 라우팅 에이전트 설계 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 오케스트레이터 + 도메인 서브에이전트 추가 | Codex | P1 | `done` | community/performance/growth 세션을 자동 라우팅할 수 있는 에이전트 파일이 `.opencode/agents`에 추가됨 | OpenCode agents config |
| 세션 시작 커맨드 4종 추가 | Codex | P1 | `done` | `/session-community`, `/session-performance`, `/session-growth`, `/session-auto` 커맨드가 `.opencode/commands`에 추가됨 | OpenCode commands config |

### Cycle 58: OpenCode 에이전트 운영 매뉴얼 상세화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 에이전트 초심자용 end-to-end 운영 가이드 작성 | Codex | P1 | `done` | 개념/설정/권한/세션 실행/자동화/트러블슈팅까지 포함한 상세 문서 1개가 `docs/ops`에 추가됨 | `docs/ops/opencode-agent-automation-guide-ko.md` |
| 오케스트레이터 task 권한을 opencode.json에 명시 | Codex | P1 | `done` | markdown frontmatter 해석 차이를 대비해 `opencode.json`에 task allowlist 및 orchestrator task 제한 규칙이 반영됨 | `opencode.json` |

### Cycle 59: 에이전트 단순화(커스텀 5개 체계) (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 커스텀 에이전트를 5개 체계로 통합 | Codex | P1 | `done` | `.opencode/agents`에 `orchestrator`, `plan-coordinator`, `delivery-engineer`, `safety-verifier`, `growth-operator`만 남고 중복 역할 에이전트가 제거됨 | `.opencode/agents/*.md` |
| 세션/검증 커맨드를 신규 5개 체계로 라우팅 수정 | Codex | P1 | `done` | `session-*`, `run-gates`, `policy-check`, `release-readiness`, `triage-bug`가 통합 에이전트를 사용하도록 갱신됨 | `.opencode/commands/*.md` |
| task 권한 allowlist를 5개 체계로 축소 | Codex | P1 | `done` | `opencode.json`의 전역 task 및 orchestrator task 권한이 통합된 에이전트 목록으로 정리됨 | `opencode.json` |

### Cycle 60: 로컬 에러 즉시수정 전용 서브에이전트 추가 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| Next.js 로컬 에러 전용 `local-error-fixer` 추가 | Codex | P1 | `done` | 에러 로그 붙여넣기 기반 parse/repro/minimal-fix/verify 루프를 수행하는 서브에이전트가 추가됨 | `.opencode/agents/local-error-fixer.md` |
| `/fix-local-error` 커맨드 추가 | Codex | P1 | `done` | 에러 로그 입력으로 즉시 로컬 에러 수정 플로우를 실행하는 커맨드가 추가됨 | `.opencode/commands/fix-local-error.md` |
| 오케스트레이터 및 task 권한에 local-error-fixer 연결 | Codex | P1 | `done` | orchestrator 라우팅 규칙과 `opencode.json` task allowlist에 local-error-fixer가 반영됨 | `.opencode/agents/orchestrator.md`, `opencode.json` |

### Cycle 61: 다중 탭 에이전트 확인 커맨드 추가 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 최근 세션별 마지막 에이전트 표시 커맨드 추가 | Codex | P1 | `done` | `/agent-status` 실행 시 최근 세션의 마지막 사용 agent가 표 형태로 출력됨 | `.opencode/commands/agent-status.md` |
| 운영 가이드에 `agent-status` 사용법 반영 | Codex | P2 | `done` | 다중 탭에서 agent 혼선 해소 절차가 가이드에 포함됨 | `docs/ops/agent-guide-ko.md` |

### Cycle 60: Growth-Marketing 세션 킥오프
- 분류: `growth-marketing`
- 범위 경계: 1인 창업자 단독 실행, near-zero budget, no-team(외주/유급채널 미포함)
- 즉시 워크플로우: `evidence collection -> 7/14/30 execution plan -> go/stop thresholds -> handoff`
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 초기 홍보 전략 수립 + business 파일 기반 개선 피드백 우선 세션 시작 | `growth-operator`, `plan-coordinator` | P1 | `done` | growth-operator 결과(근거기반 business 피드백, 7/14/30 실행안+copy pack, Go/Stop 임계값+keep/fix/kill 매트릭스)가 핸드오프 가능한 형태로 고정됨 | `docs/business/*`, `PLAN.md`, `PROGRESS.md` |
| 솔로 창업자 즉시 실행 Day1 핸드오프(네이버 1건 게시 + UTM 기록 시작) | `growth-operator`, `plan-coordinator` | P1 | `blocked` | Naver Blog Day1 게시 1회와 UTM 유입 로그 시작이 기록되고, 24h 뒤 Keep/Fix/Kill 기준으로 네이버 메시지 유지/수정 여부가 판정됨 | `docs/business/*`, `docs/business/Day1_채널_실행팩.md`, `PLAN.md`, `PROGRESS.md`, `/tmp/day1-growth-handoff-2026-03-09.md` |
| Day2 실행팩 + Day3 Fix 카피 문서화 | `growth-operator`, `plan-coordinator` | P1 | `done` | Day2 시간블록 실행안, 블로그/카페/오픈채팅 즉시 사용 카피, Day3 Fix 시나리오 카피가 단일 문서로 정리됨 | `docs/business/온동네_초기유저_30일_실행플레이북.md` |
| Day3 실행팩(반응률 개선) 문서화 | `growth-operator`, `plan-coordinator` | P1 | `done` | 첫 글 24h 댓글률 개선용 블로그 #3, 오픈채팅 3회 후속 스크립트, 카페 미응답 후속 템플릿, EOD 판정표가 단일 문서로 정리됨 | `docs/business/온동네_초기유저_30일_실행플레이북.md` |

### Cycle 61: Community board schema/migration handoff (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| community-board Prisma schema + migration 정합성 검증 및 최소 보정 | Codex | P1 | `done` | `Community/CommunityCategory/Post(boardScope/communityId/commonBoardType/animalTags)` 변경이 schema/migration 간 동일 의미로 반영되고 `prisma generate + lint(대상) + typecheck`가 통과 | `app/prisma/schema.prisma`, `app/prisma/migrations/20260225183000_add_community_boards/migration.sql` |
| safety-verifier blocker 보정(테스트 정합 + common-board backfill + scope 제약) | Codex | P1 | `done` | `post-create-policy` 회귀 테스트 통과, common-board 기존 데이터 backfill SQL 반영, boardScope/communityId/commonBoardType check constraint 반영 | `app/src/server/services/post-create-policy.test.ts`, `app/prisma/migrations/20260225183000_add_community_boards/migration.sql` |
| community-board MVP write/read path + seed + UI 최소 연동 | Codex | P1 | `done` | 글쓰기 검증/서비스 매핑/공용보드·커뮤니티 조회 API/커뮤니티 시드/작성폼 분기가 최소 범위에서 동작하고 타깃 테스트가 통과 | `app/prisma/seed.ts`, `app/src/lib/validations/post.ts`, `app/src/server/services/post.service.ts`, `app/src/server/queries/community.queries.ts`, `app/src/app/api/communities/route.ts`, `app/src/app/api/boards/[board]/posts/route.ts`, `app/src/components/posts/post-create-form.tsx` |
| community-board MVP 검증 로그(2026-02-25) 반영 | Codex | P2 | `done` | `prisma generate/lint/typecheck/target tests` 실행 결과와 리스크 메모가 `PROGRESS.md`에 최신 상태로 기록됨 | `PROGRESS.md` |

### Cycle 62: Agent-only 운영 재설계 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `.opencode/commands` 전량 제거(커맨드 의존 해제) | Codex | P1 | `done` | 커스텀 커맨드 파일이 제거되고 `@agent` 직접 호출만으로 운영 가능 | `.opencode/commands/*.md` |
| 핵심 에이전트 프롬프트 구체화(추상 규칙 제거) | Codex | P1 | `done` | `orchestrator`, `delivery-engineer`, `safety-verifier`, `growth-operator`, `local-error-fixer`가 lane/입출력 계약/검증 기준을 명시 | `.opencode/agents/*.md` |
| 운영 문서 agent-only 기준으로 재작성 | Codex | P2 | `done` | 가이드에서 `/session-*` 기반 절차를 제거하고 `@agent` 호출 템플릿 중심으로 교체 | `docs/ops/agent-guide-ko.md` |
| safety-verifier blocker 보정(신규 read API rate limit + 계약 테스트) | Codex | P1 | `done` | `/api/communities`, `/api/boards/[board]/posts`에 IP 기반 rate limit이 적용되고, 두 라우트의 계약 테스트(400/200/500+monitor)가 통과 | `app/src/app/api/communities/route.ts`, `app/src/app/api/boards/[board]/posts/route.ts`, `app/src/app/api/communities/route.test.ts`, `app/src/app/api/boards/[board]/posts/route.test.ts` |
| 피드 카드 커뮤니티 라벨 노출 개선 | Codex | P1 | `done` | 커뮤니티 글이 피드 목록에서 `카테고리 · 커뮤니티` 배지로 식별되고, list/best/무한스크롤 경로에서 동일하게 표시됨 | `app/src/server/queries/post.queries.ts`, `app/src/app/feed/page.tsx`, `app/src/components/posts/feed-infinite-list.tsx` |
| 피드 카드 카테고리 아이콘 문자 제거 + 비지역 `전체` 라벨 숨김 | Codex | P1 | `done` | 피드 카드 카테고리 칩의 문자 접두(`B`,`P` 등)가 제거되고, `neighborhood` 없는 글에서 `전체` 칩이 노출되지 않음 | `app/src/components/posts/feed-infinite-list.tsx` |

### Cycle 62: Community board UX 후속(작성 라벨/피드 필터) (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 글쓰기 커뮤니티 라벨 자연화 + 피드 커뮤니티 필터(SSR/API/무한스크롤) + 검증 테스트 | Codex | P1 | `done` | `/posts/new` 커뮤니티 옵션에서 중복 라벨이 제거되고, `/feed`가 `communityId` 파라미터로 커뮤니티 필터링(초기조회+추가조회)을 지원하며 `validation/api/query` 타깃 테스트가 통과 | `app/src/components/posts/post-create-form.tsx`, `app/src/app/feed/page.tsx`, `app/src/components/posts/feed-search-form.tsx`, `app/src/components/posts/feed-infinite-list.tsx`, `app/src/lib/validations/post.ts`, `app/src/app/api/posts/route.ts`, `app/src/server/queries/post.queries.ts` |

### Cycle 63: Vercel 배포 복구(Prisma baseline 자동화) (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| Vercel build에서 Prisma `P3005` baseline 자동 복구 스크립트 적용 | Codex | P1 | `done` | `build:vercel`이 `migrate deploy` 실패 시(`P3005`) migration baseline resolve 후 재시도하고, `db push --accept-data-loss` 없이 `generate -> next build`로 이어짐 | `app/scripts/vercel-build.ts`, `app/package.json` |
| 커뮤니티 테이블 미존재(`P2021`) 시 피드 진입 안전 fallback | Codex | P1 | `done` | `Community`/`CommunityCategory` 테이블이 누락된 배포에서도 `listCommunities`가 빈 목록으로 degrade되어 `/feed` 서버 오류가 발생하지 않음 | `app/src/server/queries/community.queries.ts` |
| 커뮤니티 보드 스키마 누락(`P2021/P2022`) 시 게시글 조회 안전 fallback | Codex | P1 | `done` | `Post.boardScope/communityId/commonBoardType/animalTags` 또는 `Community` 테이블이 누락된 배포에서도 `listPosts/listBestPosts/count*`가 legacy where/select로 재시도되어 피드 500이 발생하지 않음 | `app/src/server/queries/post.queries.ts`, `app/src/server/queries/community.queries.ts` |
| 배포 DB community-board 스키마/taxonomy 자동 복구 | Codex | P1 | `done` | Vercel build에서 idempotent SQL repair가 실행되어 `Community`/`CommunityCategory`/`Post.boardScope` 계열 구조와 기본 커뮤니티 taxonomy(12개)가 항상 보정됨 | `app/scripts/sql/community-board-repair.sql`, `app/scripts/vercel-build.ts` |

### Cycle 64: Global-first 온보딩/동네 설정 리팩터 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 회원가입 닉네임 필수화 + 중복 차단 | Codex | P1 | `done` | `/api/auth/register`에서 닉네임 입력이 필수이며, 중복 시 `NICKNAME_TAKEN(409)`으로 응답 | `app/src/lib/validations/auth.ts`, `app/src/server/services/auth.service.ts`, `app/src/components/auth/register-form.tsx` |
| 동네 미설정 계정 Global-first 허용(피드/검색/글쓰기) | Codex | P1 | `done` | 로그인 직후 대표 동네가 없어도 `/feed`, `/search`, `/posts/new`에서 GLOBAL 경로가 정상 동작하고, LOCAL 선택 시에만 동네 게이트가 동작 | `app/src/app/api/posts/route.ts`, `app/src/app/api/posts/suggestions/route.ts`, `app/src/app/search/page.tsx`, `app/src/app/posts/new/page.tsx` |
| 온보딩/프로필 동네 설정 확장(최대 3개 + 기준 동네 1개) | Codex | P1 | `done` | 온보딩/프로필에서 동네 3개 선택 및 기준 동네 1개 지정 가능, 저장 시 `UserNeighborhood`가 선택 목록과 동일하게 동기화 | `app/src/lib/validations/user.ts`, `app/src/server/services/user.service.ts`, `app/src/components/onboarding/onboarding-form.tsx`, `app/src/components/profile/neighborhood-preference-form.tsx` |
| 전국 동네 데이터 동기화 파이프라인 추가 | Codex | P1 | `done` | 전국 단위 동네 seed JSON(20,278건) 기반 동기화 스크립트와 Vercel 빌드 연동으로 배포 시 옵션 비어있음 이슈를 방지 | `app/scripts/data/korean-neighborhoods.json`, `app/scripts/sync-neighborhoods.ts`, `app/scripts/vercel-build.ts`, `app/package.json` |
| 동네 선택 payload 최적화(API 검색형 전환) | Codex | P2 | `done` | 온보딩/프로필 페이지가 동네 전체 목록 preload 없이 동네 검색 API(`/api/neighborhoods`)로 옵션을 조회하고, 초기 전달 데이터가 사용자 선택 동네 중심으로 축소됨 | `app/src/app/api/neighborhoods/route.ts`, `app/src/server/queries/neighborhood.queries.ts`, `app/src/components/onboarding/onboarding-form.tsx`, `app/src/components/profile/neighborhood-preference-form.tsx` |
| Global-first 동네 설정 플로우 e2e 회귀 추가 | Codex | P2 | `done` | 동네 미설정 상태에서 `/posts/new` GLOBAL 진입 가능, 프로필 동네 저장 후 LOCAL 선택 활성화를 검증하는 Playwright spec 통과 | `app/e2e/global-first-neighborhood-flow.spec.ts` |
| 동네 단위를 시/군/구로 조정 + 선택 목록 UX 강화 | Codex | P2 | `done` | 동네 API/저장 로직이 시/군/구 키 기반으로 동작하고, 온보딩/프로필에서 현재 선택 목록을 하단에서 확인/삭제 가능하며 용어를 `대표 동네`로 일원화 | `app/src/server/queries/neighborhood.queries.ts`, `app/src/server/services/user.service.ts`, `app/src/components/onboarding/onboarding-form.tsx`, `app/src/components/profile/neighborhood-preference-form.tsx`, `app/scripts/data/korean-neighborhoods.json` |

### Cycle 65: Vercel 마이그레이션 타임아웃 복구 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `prisma migrate deploy` transient 오류(`P1001/P1002`) 재시도 로직 추가 | Codex | P1 | `done` | Vercel 빌드에서 DB 연결 타임아웃/일시 오류 시 `migrate deploy`를 지수 대기와 함께 재시도하고, `P3005` baseline 경로와 공존하도록 동작 | `app/scripts/vercel-build.ts` |

### Cycle 66: 반려동물 프로필 스키마/폼 개편 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 반려동물 종류 옵션 확장(커뮤니티 카테고리 전체) | Codex | P1 | `done` | DOG/CAT 외 조류/파충류/소동물/어류/양서류/절지류/특수동물 옵션을 반려동물 프로필 등록/수정 UI에서 선택 가능 | `app/prisma/schema.prisma`, `app/src/components/profile/pet-profile-manager.tsx` |
| 반려동물 입력폼 필드 개편(품종코드/체급/생애단계/나이 제거 -> 몸무게/태어난 연도) | Codex | P1 | `done` | 등록/수정 payload에서 `breedCode/sizeClass/lifeStage/age`를 제거하고 `weightKg/birthYear`를 저장하며 공개 프로필 노출도 동일 기준으로 변경 | `app/src/lib/validations/pet.ts`, `app/src/server/services/pet.service.ts`, `app/src/server/queries/user.queries.ts`, `app/src/app/users/[id]/page.tsx` |
| 반려동물 사진 URL 입력 제거 + 업로드 기반(5MB 이하) 전환 | Codex | P1 | `done` | 반려동물 프로필 등록/수정 UI가 URL 텍스트 입력 대신 `ImageUploadField(maxFiles=1)`를 사용하고 업로드 정책(5MB)이 적용됨 | `app/src/components/profile/pet-profile-manager.tsx`, `app/src/app/api/upload/client/route.ts`, `app/src/server/upload.ts` |

### Cycle 67: DB 용량/과금 운영 가이드 보강 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| Neon 5GB 리스크 시나리오 예측 + 초과 대응 런북 문서화 | Codex | P1 | `done` | 시나리오별(일일 활동량) 5GB 도달 예측표와 초과 시 즉시/72h 대응 절차가 운영 문서에 반영 | `docs/ops/db-capacity-pricing-playbook.md` |
| 경쟁 플랫폼 과금 정책 비교(Neon/Supabase/Railway/Render) | Codex | P2 | `done` | 비용 통제 포인트와 대표 단가/정책 차이를 비교표로 정리하고 참고 링크를 명시 | `docs/ops/db-capacity-pricing-playbook.md` |

### Cycle 68: Resend 이메일 인증 운영 가이드 정리 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| Resend 도메인 인증 + Vercel env 연동 절차 문서화 | Codex | P1 | `done` | 도메인 구매 전제부터 DNS 인증(SPF/DKIM/MX), API 키 생성, Vercel env 반영, 실검증 순서가 문서 1개로 정리됨 | `docs/ops/resend-vercel-email-setup-guide.md` |
| Resend 과금 체계 및 운영 체크리스트 정리 | Codex | P2 | `done` | Free/Pro/Scale 요약, 초과 비용, 운영 체크리스트(보안/점검)가 문서에 반영됨 | `docs/ops/resend-vercel-email-setup-guide.md` |

### Cycle 69: SPEC 경량화/정합 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `docs/SPEC-Lite.md` 작성 + `AGENTS.md` 읽기 경로 갱신 | Codex | P1 | `done` | 일상 개발용 압축 스펙이 신설되고 `AGENTS.md`에서 `SPEC-Lite`를 우선 참조하도록 정합화 | `docs/SPEC-Lite.md`, `AGENTS.md` |

### Cycle 70: 알림 숨김/보존 정책(3일) 적용 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 알림 읽음/닫기 즉시 숨김 + 3일 보존 스키마 적용 | Codex | P1 | `done` | 알림 읽음/닫기 시 목록과 배지에서 즉시 사라지고 DB에는 `archivedAt`으로 3일 보존 가능 상태로 저장되며, Prisma migration/repair 경로가 배포 파이프라인에 반영됨 | `app/prisma/schema.prisma`, `app/prisma/migrations/20260302030000_add_notification_archived_at/migration.sql`, `app/scripts/sql/notification-archive-repair.sql`, `app/scripts/vercel-build.ts`, `app/src/server/queries/notification.queries.ts`, `app/src/server/actions/notification.ts` |
| hover 알림창 + `/notifications` X 버튼 및 제거 UX 반영 | Codex | P1 | `done` | hover 알림창과 알림 페이지에서 `읽음 처리`/`X` 동작 후 항목이 즉시 제거되고 실패 시 오류 메시지가 노출됨 | `app/src/components/notifications/notification-bell.tsx`, `app/src/components/notifications/notification-center.tsx` |
| 3일 경과 영구삭제 스크립트 및 회귀 시나리오 보강 | Codex | P2 | `done` | `db:cleanup:notifications` 스크립트와 일간 cleanup 워크플로우가 추가되고 알림 읽음/삭제 후 목록 제거 e2e 시나리오가 반영됨 | `app/scripts/cleanup-notifications.ts`, `app/package.json`, `.github/workflows/notification-cleanup.yml`, `app/e2e/notification-comment-flow.spec.ts`, `app/e2e/notification-filter-controls.spec.ts` |

### Cycle 71: 관심 동물 멀티선택 + 피드 지속 필터 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 상단 `관심 동물` 멀티 체크 UI + 영구 저장 | Codex | P1 | `done` | 상단 메뉴에서 관심 동물을 체크박스로 다중 선택/저장할 수 있고 DB에 사용자별 선호 타입이 저장됨 | `app/src/components/navigation/feed-hover-menu.tsx`, `app/src/server/actions/user.ts`, `app/src/server/services/user.service.ts`, `app/src/lib/validations/user.ts`, `app/prisma/schema.prisma`, `app/prisma/migrations/20260303022000_add_user_pet_type_preferences/migration.sql` |
| 피드/무한스크롤 다중 동물 필터 적용 및 게시판 이동 시 유지 | Codex | P1 | `done` | 사용자 선호 동물 설정이 `/feed` SSR/무한스크롤/API 쿼리에 반영되고 게시판 이동 후에도 동일 필터가 유지됨 | `app/src/app/layout.tsx`, `app/src/app/feed/page.tsx`, `app/src/app/api/posts/route.ts`, `app/src/components/posts/feed-infinite-list.tsx`, `app/src/server/queries/post.queries.ts`, `app/src/server/queries/user.queries.ts` |

### Cycle 72: 피드/검색 API tail-latency 완화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 게스트 조회 경로의 반응(reactions) 조인 제거 | Codex | P1 | `done` | `listPosts/listBestPosts/listRankedSearchPosts`에서 `viewerId` 없는 경우 반응 relation 조회를 생략하고 응답은 빈 reactions 배열 계약을 유지 | `app/src/server/queries/post.queries.ts`, `app/src/server/queries/post.queries.test.ts` |
| 피드/검색 제안 API 선행 대기시간 단축 | Codex | P1 | `done` | `GET /api/posts`, `GET /api/posts/suggestions`에서 게스트 정책 조회를 레이트리밋과 동시 시작해 직렬 대기 시간을 줄임 | `app/src/app/api/posts/route.ts`, `app/src/app/api/posts/suggestions/route.ts` |
| 정량 재측정 및 PASS 재확인 | Codex | P1 | `done` | `ops:perf:snapshot` 2회 측정에서 최신 스냅샷 기준 모든 임계치 PASS를 확인하고, 단발 cold MISS outlier 리스크를 PROGRESS에 기록 | `/tmp/townpet_latency_snapshot_2026-03-05T11-49-19-588Z.tsv.summary.md`, `/tmp/townpet_latency_snapshot_2026-03-05T11-51-18-762Z.tsv.summary.md` |

### Cycle 179: 보안 패치 업그레이드 + 운영 시크릿 점검 자동화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 보안 취약점 대응 의존성 패치(`next`, `@vercel/blob`) | Codex | P0 | `done` | `next/eslint-config-next/@vercel/blob`를 취약점 패치 버전으로 올리고 `pnpm -C app audit --prod` 결과가 clean | `app/package.json`, `app/pnpm-lock.yaml` |
| 운영 보안 env preflight 스크립트 추가 | Codex | P1 | `done` | `ops:check:security-env`로 핵심 보안 변수(CSP strict, guest pepper, internal token, upstash, auth secret)를 자동 점검하고 strict 모드(`SECURITY_ENV_STRICT=1`)를 지원 | `app/scripts/check-security-env.ts`, `app/package.json` |
| CI 품질게이트에 보안 env preflight 단계 추가 | Codex | P1 | `done` | `quality-gate` 워크플로우에서 strict 보안 env 체크가 DB sync 이전에 수행되어 설정 누락을 조기 차단 | `.github/workflows/quality-gate.yml` |
| 운영/보안 문서 동기화 | Codex | P1 | `done` | GUIDE + SECURITY_PLAN/PROGRESS/RISK_REGISTER에 실행 명령/리스크/검증 로그가 반영 | `docs/개발_운영_가이드.md`, `docs/security/*.md`, `PROGRESS.md` |

### Cycle 180: 피드 cold MISS DB 인덱스 보강 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 피드 최신 조회용 `Post` 인덱스 추가 | Codex | P1 | `done` | `scope/status/createdAt DESC`, `type/scope/status/createdAt DESC` 인덱스가 Prisma schema + migration에 반영 | `app/prisma/schema.prisma`, `app/prisma/migrations/20260305143000_add_post_feed_indexes/migration.sql` |
| 인덱스 변경 회귀 검증 | Codex | P1 | `done` | `prisma validate`, `typecheck`, `post queries + posts API` 테스트가 통과 | `app/prisma/schema.prisma`, `app/src/server/queries/post.queries.test.ts`, `app/src/app/api/posts/route.test.ts` |

### Cycle 181: 운영 성능 측정 안정화(cold/steady 분리) (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `ops:perf:snapshot` warm-up 분리 집계 추가 | Codex | P1 | `done` | `OPS_PERF_WARMUP_SAMPLES_PER_ENDPOINT`(기본 1) 설정으로 warm-up 샘플을 임계치 평가에서 제외하고 summary에 `Full/Warm-up/Steady-state` 3개 섹션이 출력됨 | `app/scripts/collect-latency-snapshot.ts` |
| 배포 성능 재측정 및 임계치 PASS 확인 | Codex | P1 | `done` | 운영 URL 기준 110샘플 재측정에서 steady-state 기준 전 엔드포인트 PASS를 확인하고 결과 경로를 PROGRESS에 기록 | `/tmp/townpet_latency_snapshot_2026-03-05T14-30-57-594Z.tsv.summary.md` |

### Cycle 182: 검색 확장(pg_trgm) 운영 점검 가시화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 내부 health 상세에 `pg_trgm` 상태 노출 | Codex | P1 | `done` | `/api/health` 내부 토큰 경로에서 `checks.search.pgTrgm(state/enabled/message)`가 제공되어 운영자가 확장 누락을 즉시 파악 가능 | `app/src/app/api/health/route.ts`, `app/src/app/api/health/route.test.ts` |
| `ops:check:health`에 `pg_trgm` 강제 판정 옵션 추가 | Codex | P1 | `done` | `OPS_HEALTH_INTERNAL_TOKEN` + `OPS_HEALTH_REQUIRE_PG_TRGM=1` 조합으로 확장 누락 시 명시적 FAIL이 발생 | `app/scripts/check-health-endpoint.ts`, `docs/개발_운영_가이드.md` |

### Cycle 183: 배포 스모크에 `pg_trgm` 강제 검증 옵션 추가 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `ops-smoke-checks`에 `verify_pg_trgm` 입력 추가 | Codex | P1 | `done` | 수동 실행 입력에 `verify_pg_trgm`이 추가되고, 활성화 시 `HEALTH_INTERNAL_TOKEN` 검증 후 `OPS_HEALTH_REQUIRE_PG_TRGM=1 pnpm ops:check:health`가 실행됨 | `.github/workflows/ops-smoke-checks.yml` |
| 운영 가이드에 신규 입력/시크릿 반영 | Codex | P1 | `done` | GUIDE의 ops-smoke-checks 사용법/Secrets/실행기준에 `verify_pg_trgm` + `HEALTH_INTERNAL_TOKEN`이 반영됨 | `docs/개발_운영_가이드.md` |

### Cycle 184: Docs 구조 압축 및 명확화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `docs/` 최상위 분류 재편 | Codex | P1 | `done` | 추상적/중복 폴더(`ops`, `plan`, `data_analytics`, `policy_ops`, `사업계획`)가 목적 중심 구조(`operations`, `reports`, `analytics`, `policies`, `business`)로 정리됨 | `docs/*` |
| 아카이브 분리 및 진입점 추가 | Codex | P1 | `done` | 초안/v1/과거 운영 리포트가 `docs/archive/`로 이동하고, `docs/문서_안내.md`와 핵심 안내 문서(`사업_문서_안내.md`, `운영_문서_안내.md`, `보관_문서_안내.md`)가 정리됨 | `docs/archive/*`, `docs/*` |
| 코드/문서 참조 경로 정합화 | Codex | P1 | `done` | GUIDE, 운영/보안 문서, 스크립트, E2E 산출물 경로가 새 구조 기준으로 갱신되고 활성 경로에 오래된 `docs/ops`/`docs/plan` 참조가 남지 않음 | `docs/개발_운영_가이드.md`, `README.md`, `app/scripts/*`, `app/e2e/*` |

### Cycle 185: 운영 env 템플릿 실제 키 목록 정렬 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| Vercel runtime 템플릿 키 정렬 | Codex | P1 | `done` | `.env.production.example`이 현재 실제 Vercel runtime 키(`NEXTAUTH_URL`, `DIRECT_URL`, `RESEND_API_KEY`, OAuth 키 포함) 기준으로 정리됨 | `app/.env.production.example` |
| Vercel/GitHub Actions 실제 키 목록 문서 반영 | Codex | P1 | `done` | 운영 체크리스트와 Vercel 가이드가 사용자가 공유한 실제 key 목록과 현재 판단을 반영함 | `docs/operations/manual-checks/배포_보안_체크리스트.md`, `docs/operations/Vercel_OAuth_초기설정_가이드.md` |

### Cycle 186: guest 피드 무한스크롤 hot path 축소 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| guest `/feed` 추가 페이지 로드를 guest API로 일원화 | Codex | P1 | `done` | guest `/feed` 무한스크롤이 더 이상 기본 `/api/posts`를 타지 않고 `/api/feed/guest` cursor 경로를 사용함 | `app/src/components/posts/guest-feed-page-client.tsx`, `app/src/components/posts/feed-infinite-list.tsx` |
| `/api/feed/guest` cursor 전용 경량 응답 추가 | Codex | P1 | `done` | `cursor` 요청 시 커뮤니티 네비/페이지 메타 계산 없이 `items + nextCursor`만 반환하는 compact payload를 제공함 | `app/src/app/api/feed/guest/route.ts` |
| 회귀 테스트/기록 반영 | Codex | P1 | `done` | guest feed route test가 cursor 경로를 검증하고, 성능 기록/PROGRESS에 hot path 축소 내용을 남김 | `app/src/app/api/feed/guest/route.test.ts`, `docs/operations/캐시_성능_적용_기록.md`, `PROGRESS.md` |

## Blocked (환경 의존)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `ops-smoke-checks` `verify_pg_trgm` 경로 활성화 | Codex | P2 | `done` | workflow_dispatch에서 `verify_pg_trgm=true` 실행이 PASS(`OPS_HEALTH_REQUIRE_PG_TRGM=1` 기준) | 실행 증적: `https://github.com/answndud/townpet/actions/runs/22747534552` |
| Sentry 실수신 검증(의도적 에러, 선택) | Codex | P3 | `done` | 실제 Sentry 프로젝트에서 이벤트 수신 확인(선택 운영, 미연동 시 deferred 유지) | `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`(유효 토큰/만료·권한 확인), `SENTRY_ORG_SLUG`, `SENTRY_PROJECT_SLUG` 저장소 시크릿 설정 |
