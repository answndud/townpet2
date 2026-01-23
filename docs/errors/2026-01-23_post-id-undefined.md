# 2026-01-23 post-id-undefined

## 요약
- 증상: 게시물 상세 진입 시 Prisma findUnique에 id가 undefined로 전달됨
- 영향 범위: `/posts/[id]` 렌더링 실패
- 심각도: 중간 (상세 페이지 진입 차단)

## 재현 조건
- 단계: `/posts/[id]` 접근 시 params 미해결
- 환경: Next.js 16 (searchParams/params Promise 처리)

## 원인 분석
- 직접 원인: params가 Promise인데 동기 접근하여 id가 undefined
- 근본 원인: 동적 라우트 params 처리 규칙 미적용

## 해결 방법
- 수정 내용: params를 `await` 처리하고 id 미존재 시 null 반환
- 관련 파일: `app/src/app/posts/[id]/page.tsx`, `app/src/server/queries/post.queries.ts`
- 관련 PR/커밋: 없음

## 대응 구분
- 임시 대응(워크어라운드): 잘못된 링크 접근 차단
- 영구 대응(근본 수정): params를 Promise로 처리

## 재발 방지
- 테스트/모니터링 보강: 상세 라우트 params 검증 테스트 추가
- 정책/문서 업데이트: Next.js 16의 params/searchParams 처리 규칙 문서화
