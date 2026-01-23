# reporting.md
# 신고/자동 블라인드 정책

목적
- 신고 접수와 자동 블라인드 규칙을 고정한다
- 운영 대응의 기준을 문서화한다

기본 규칙
- 신고 대상: Post/Comment/User
- 신고 사유: SPAM/HARASSMENT/INAPPROPRIATE/FAKE/OTHER
- 동일 사용자 중복 신고 금지
- 신고 API는 분당 3회 제한(메모리 레이트리밋)

자동 블라인드
- Post 대상 신고 3건 이상 시 `Post.status=HIDDEN`
- 블라인드 후 관리자 검토 큐로 이동(Phase 1 이후 확장)
- 댓글 신고는 운영자 검토 대상(자동 숨김 없음)

관리자 처리
- 신고 큐에서 승인/기각 처리
- 기각 시 게시물 상태를 ACTIVE로 복구
- 처리 메모(resolution)를 남길 수 있음
- 상태 탭으로 PENDING/RESOLVED/DISMISSED 필터링
- 댓글 신고는 큐에서 댓글 스니펫을 표시

데모 환경
- 현재는 `DEMO_USER_EMAIL`로 신고 처리
- 인증 도입 시 신고자/권한 검증으로 대체
