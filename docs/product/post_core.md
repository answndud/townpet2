# post_core.md
# 게시물 코어(Phase 1) 구현 기록

목적
- Phase 1의 게시물 코어 API/데이터 흐름을 문서화한다
- 로컬 피드와 병원 리뷰 템플릿 구현을 기준으로 삼는다

범위
- Post 기본 작성/조회
- 병원 리뷰 템플릿 데이터
- Server Action/Route Handler 연결

주요 파일
- `app/src/server/services/post.service.ts`
- `app/src/server/queries/post.queries.ts`
- `app/src/server/actions/post.ts`
- `app/src/app/api/posts/route.ts`
- `app/src/components/posts/post-create-form.tsx`
- `app/src/components/posts/post-detail-actions.tsx`
- `app/src/components/posts/post-detail-edit-form.tsx`
- `app/src/app/page.tsx`
- `app/src/app/posts/[id]/page.tsx`

데이터 모델
- Post: 다형성 기본 엔티티 (`type`, `scope`, `status` 포함)
- HospitalReview: Post와 1:1 연결

추가 카테고리
- `FREE_BOARD`: 자유게시판
- `DAILY_SHARE`: 일상공유
- `PRODUCT_REVIEW`: 제품리뷰
- `PET_SHOWCASE`: 내 반려동물 자랑

작성 플로우
1. 사용자 입력 → `postCreateSchema` 검증
2. 타입별 추가 검증(병원 리뷰는 `hospitalReviewSchema`)
3. Service에서 DB 트랜잭션 생성
4. Server Action에서 결과 처리 + `revalidatePath("/")`

수정 플로우
1. 상세 화면에서 수정 폼 작성
2. `updatePostAction` 호출
3. Service에서 검증 후 업데이트

삭제 플로우
1. 상세 화면에서 삭제 버튼
2. `deletePostAction` 호출
3. Service에서 `status=DELETED` 처리

API

GET `/api/posts`
- Query: `cursor` (optional), `limit` (optional, default 20), `type`, `scope`, `q`
- Response: `{ ok: true, data: { items, nextCursor } }`

POST `/api/posts`
- Body:
  - `title`: string
  - `content`: string
  - `type`: PostType
  - `scope`: PostScope
  - `neighborhoodId`: string (Local일 때 필수)
- `hospitalReview`: HospitalReview input (HOSPITAL_REVIEW일 때 필수)

PATCH `/api/posts/{id}`
- Body: 업데이트할 필드만 전달
- Response: `{ ok: true, data: Post }`

DELETE `/api/posts/{id}`
- Response: `{ ok: true, data: { id, status } }`

POST `/api/reports`
- Body: `targetType`, `targetId`, `reason`, `description`
- Report 생성 후 POST 신고 누적 3건 이상이면 `status=HIDDEN`

병원 리뷰 템플릿 필드
- `hospitalName`: 병원명
- `visitDate`: 방문일 (YYYY-MM-DD)
- `treatmentType`: 진료 항목
- `totalCost`: 비용(선택)
- `waitTime`: 대기시간(선택)
- `rating`: 1-5

장소 리뷰 템플릿 필드
- `placeName`: 장소명
- `placeType`: 장소 유형
- `address`: 주소(선택)
- `isPetAllowed`: 동반 가능 여부
- `rating`: 1-5

산책로 템플릿 필드
- `routeName`: 코스 이름
- `distance`: 거리(km)
- `duration`: 소요시간(분)
- `difficulty`: EASY/MODERATE/HARD
- `hasStreetLights`: 가로등 여부
- `hasRestroom`: 화장실 여부
- `hasParkingLot`: 주차장 여부
- `safetyTags`: 안전 태그 배열

UI 구성
- 홈 화면은 테이블형 피드 중심
- 작성은 `/posts/new`에서 진행
- 피드 테이블에서 병원/장소 요약 메타 노출
- 상세 페이지에서 병원/장소 리뷰 상세 노출
- 산책로 타입은 피드/상세에 별도 메타 노출
- 숨김(HIDDEN) 상태는 배지/안내 문구로 표시
- 범위 표기: 동네(Local), 온동네(Global)
- 피드/프로필에 범위 컬럼 표시
- 내 작성글 페이지: `/my-posts`
- 내 작성글 페이지에서도 카테고리/범위/검색 필터 제공
- 홈 피드는 cursor 기반 “더 보기” 링크 제공
- 게시물 상세에 댓글 리스트/작성 폼 제공
- 수정은 `/posts/[id]/edit`에서 수행
- 댓글 수정/삭제는 작성자만 가능
- 대댓글이 있으면 상위 댓글 수정/삭제 불가
- 댓글 신고 버튼 제공(작성자 외 노출)

운영/정책 메모
- 현재는 데모 유저(`DEMO_USER_EMAIL`)로 작성
- 인증 도입 시 작성자 로직을 대체
- `prisma/seed.ts`에 병원/장소 샘플 게시물 포함
- 작성/신고는 메모리 기반 레이트리밋(분당 제한) 적용
- `vitest`로 검증 스키마 기본 테스트 추가
- 신고 검증 스키마 테스트 추가
- 댓글 작성은 분당 10회 제한
- 댓글 검증 스키마 테스트 추가
- 레이트리밋 유틸 테스트 추가
