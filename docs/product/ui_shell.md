# ui_shell.md
# UI Shell 구성 기록

목적
- TownPet의 기본 레이아웃과 톤앤매너를 문서화한다
- Local 피드 중심의 시각 언어를 고정한다

구성 요소
- 상단 헤더: 브랜드/섹션 상태 표시
- 배경: 따뜻한 크림 톤 + 라디얼 그라디언트
- 피드: 테이블형 리스트(타입/제목/동네/작성자/작성일)
- 카드: 작성/상세 섹션은 라운드 카드 유지

네비게이션 동선
- 카테고리/필터는 상단 헤더에 배치
- 글쓰기 버튼 → `/posts/new`
- 내 작성글 → `/my-posts`
- 내 프로필 → `/profile`
- 신고 큐 → `/admin/reports`

색상/타이포
- 배경: `#f6f1e8`
- 포인트 텍스트: `#2a241c`
- 보조 텍스트: `#6f6046`, `#9a8462`
- 폰트: Space Grotesk + IBM Plex Mono

적용 파일
- `app/src/app/layout.tsx`
- `app/src/app/globals.css`
- `app/src/app/page.tsx`
- `app/src/app/posts/[id]/page.tsx`
