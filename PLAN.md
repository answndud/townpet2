# PLAN.md

기준일: 2026-02-26
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
- Phase 2 보류: 마켓/케어/채팅/결제/공동구매/카카오맵은 Phase 1 완료 후 착수

## 현재 우선순위
1. Cycle 23 잔여(외부 의존): 카카오/네이버 실계정 로그인 -> 온보딩 -> 피드 진입 E2E
2. 운영 안정화: 무료 주간 10분 루틴 정착(health/log/manual smoke)
3. 운영 문서 유지: Vercel/OAuth/Secrets/데이터 관리 가이드 최신 상태 유지
4. `oauth-real-e2e` 워크플로우 실시크릿 1회 PASS 기록 완료
5. `ops-smoke-checks` 워크플로우 실배포 URL health PASS 기록 완료 (Sentry 검증은 선택)
6. 품종 기반 개인화/광고/커뮤니티 기능 PRD 확정 및 구현 사이클 착수
7. 보안 하드닝 트랙 분리 운영: `docs/security/*` 백로그/리스크/진행 로그 상시 동기화

## Active Plan

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
| 리전/풀링 체크리스트 작성 | Codex | P1 | `done` | 리전 정합/연결 경로 점검 체크리스트 문서화 | `docs/ops/region-latency-checklist.md` |

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

### Cycle 67: 보안 하드닝 트랙 운영
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 보안 후속조치 전용 트래킹 파일 운영(PLAN/PROGRESS 연동) | Codex | P1 | `done` | `docs/security/` 하위에서 보안 백로그/진행/리스크/의사결정이 추적되고, 루트 `PLAN/PROGRESS`에 링크/상태가 동기화됨 | `docs/security/SECURITY_*.md`, `AGENTS.md` |
| SEC-001 `/api/health` 공개 응답 민감정보 최소화 + 내부 토큰 게이트 | Codex | P1 | `done` | 공개 응답에서 env/db/rate-limit 상세가 숨겨지고 내부 토큰 인증 시에만 상세 진단이 노출되며 계약 테스트가 통과 | `app/src/app/api/health/route.ts`, `app/src/app/api/health/route.test.ts`, `app/src/lib/env.ts` |
| SEC-005 신뢰 프록시 기준 client IP 파싱 정책화 | Codex | P1 | `done` | `getClientIp`가 프록시 신뢰 체인 기준으로 동작하고 관련 계약 테스트가 추가됨 | `app/src/server/request-context.ts`, 인프라 헤더 정책 |
| SEC-004 로그인 락아웃 에스컬레이션(account+IP) | Codex | P1 | `done` | credentials 로그인에 `ip/account+ip/account` 다중 윈도우 제한이 적용되고 키가 이메일 해시 기반으로 생성됨 | `app/src/lib/auth.ts`, `app/src/server/auth-login-rate-limit.ts` |
| SEC-002 CSP 하드닝(`unsafe-inline` 제거 경로) | Codex | P1 | `in_progress` | `Content-Security-Policy-Report-Only` 기반 위반 수집 후 enforce 정책 적용과 회귀 점검 완료 | `app/middleware.ts`, 운영 모니터링 |
| SEC-003 비밀번호 정책 강화 + 유출 비밀번호 차단 | Codex | P1 | `done` | 회원가입/비밀번호 설정/리셋에서 강화 정책과 유출 비밀번호 deny 경로가 통합되고 테스트가 통과 | `app/src/lib/validations/auth.ts`, `app/src/server/services/auth.service.ts` |
| SEC-007 인증 응답 enumeration 완화 + 회귀테스트 | Codex | P1 | `done` | 계정 존재 유추 가능한 메시지/코드를 완화하고 계약 테스트로 고정 | `app/src/server/services/auth.service.ts`, `app/src/app/api/auth/*` |
| SEC-006 비회원 식별 해시 HMAC(pepper) 전환 | Codex | P1 | `done` | guest identity hash가 pepper 기반 HMAC으로 전환되고 legacy hash와 호환 경로가 유지됨 | `app/src/server/services/guest-safety.service.ts`, 시크릿 설정 |

### Cycle 24: 피드 체류 개선 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 100+ 게시글 스크롤 성능 점검(메모리/프레임) | Codex | P1 | `done` | 무한스크롤 시 체감 프레임 드랍 없음, 주요 병목 기록 완료 | `/feed` 무한스크롤 반영 완료 |

### Cycle 25: 검색 고도화 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 검색 대표 케이스 수동 실행/기록 | Codex | P1 | `done` | 체크리스트 기준 PASS/WARN/FAIL 기록 완료 | `docs/plan/search-manual-checklist.md`, `docs/plan/search-manual-check-results.md` |
| 검색 로그 저장 구조 고도화(`SiteSetting` -> 전용 테이블) | Codex | P2 | `done` | 고트래픽에서도 집계 안정성 보장 가능한 구조 전환 | Prisma schema 변경 |

### Cycle 22: 이미지/UX 잔여 (완료)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 업로드 실패 시 재시도 가능한 에러 UX 보강 | Codex | P2 | `done` | 사용자 행동 가능한 오류/재시도 동선 제공 | 업로드 API/폼 컴포넌트 |
| 업로드 핵심 E2E(업로드/조회/삭제) 1개 이상 | Codex | P2 | `done` | CI 또는 로컬에서 반복 실행 가능 | Playwright 시나리오 구성 |
| 느린 네트워크 skeleton 확인 | Codex | P3 | `done` | 지연 환경에서 로딩 UX 저하 없음 | 로딩 컴포넌트 배치 완료 |

### Cycle 23: 소셜 로그인 잔여
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| 카카오 로그인 진입 스모크 E2E(버튼/진입요청) | Codex | P2 | `done` | 카카오 버튼 노출 및 `/api/auth/signin/kakao` 요청 시작 자동 검증 | Playwright 환경 |
| 네이버 로그인 진입 스모크 E2E(버튼/진입요청) | Codex | P2 | `done` | 네이버 버튼 노출 및 `/api/auth/signin/naver` 요청 시작 자동 검증 | Playwright 환경 |
| 실OAuth 리다이렉트 스모크 E2E + 수동 워크플로우 | Codex | P2 | `done` | 실환경 시크릿이 있을 때 카카오/네이버 OAuth 호스트로 리다이렉트되는지 자동 검증 가능 | GitHub Actions `workflow_dispatch` + OAuth 시크릿 |
| OAuth 키 갱신/운영 절차 문서화 | Codex | P3 | `done` | 운영 문서만 보고 키 로테이션 가능 | GUIDE 업데이트 |
| 개발용 소셜 전체 플로우 E2E(`social-dev`) | Codex | P2 | `done` | 소셜 버튼 -> 온보딩 -> 피드 진입 자동 검증 | `ENABLE_SOCIAL_DEV_LOGIN=1` |
| 카카오 로그인 -> 온보딩 -> 피드 진입 E2E | Codex | P2 | `blocked` | 핵심 전환 시나리오 자동화 통과 | 카카오 테스트 앱 설정/테스트 계정 |
| 네이버 로그인 -> 온보딩 -> 피드 진입 E2E | Codex | P2 | `blocked` | 핵심 전환 시나리오 자동화 통과 | 네이버 테스트 앱 설정/테스트 계정 |

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
| 품종 기반 개인화/광고/커뮤니티 PRD 작성 | Codex | P1 | `done` | 문서 1개에 목표/범위/수용기준/스키마/추천 의사코드가 포함됨 | `docs/product/품종_개인화_PRD.md` |
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
| business 폴더 읽기 순서/목적별 맵 정리 | Codex | P1 | `done` | 초기유저 런칭 실행용 문서 우선순위를 로컬 기준으로 정리 완료 | `docs/business/README.md` |

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

### Cycle 61: 다중 탭 에이전트 확인 커맨드 추가
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
| 솔로 창업자 즉시 실행 Day1 핸드오프(채널 3개 게시 + 지표 기록 시작) | `growth-operator`, `plan-coordinator` | P1 | `in_progress` | Naver/Kakao/Instagram Day1 게시 1회, UTM 포함 유입 로그 시작, keep/fix/kill 기준으로 24h 점검 항목이 기록됨 | `docs/business/*`, `PLAN.md`, `PROGRESS.md` |
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

## Blocked (환경 의존)
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| Sentry 실수신 검증(의도적 에러, 선택) | Codex | P3 | `blocked` | 실제 Sentry 프로젝트에서 이벤트 수신 확인(선택 운영) | DSN/프로젝트 설정 |
