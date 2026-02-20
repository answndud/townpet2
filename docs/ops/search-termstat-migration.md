# SearchTermStat 전환 가이드

목표: 검색어 집계를 `SiteSetting(popular_search_terms_v1)` 구형 경로에서 `SearchTermStat` 단일 경로로 전환한다.

## 전환 대상
- 읽기: `getPopularSearchTerms`
- 쓰기: `recordSearchTerm`
- 저장소: `SearchTermStat` 테이블

## 운영 적용 순서
1. 앱 배포 전 `SearchTermStat`가 포함된 마이그레이션 적용
   - `app/prisma/migrations/20260219184000_add_search_term_stats/migration.sql`
2. 앱 배포 후 검색어 로그 API 정상 동작 확인
   - `POST /api/search/log` 호출 후 `SearchTermStat.count` 증가 확인
3. 인기 검색어 노출 확인
   - 검색 페이지 추천어 섹션이 정상 렌더링되는지 확인

## 롤백 전략
- 코드 롤백 시에도 `SearchTermStat` 테이블은 유지해도 무방하다.
- 데이터 손실 위험이 없으므로 우선 앱 코드만 롤백하고 DB 스키마는 유지한다.

## 구형 데이터 정리
`SiteSetting`의 `popular_search_terms_v1` 키는 더 이상 사용되지 않는다.
운영 반영 시 아래 스크립트 기반으로 정리한다.

```bash
cd /Users/alex/project/townpet2/app && pnpm db:cleanup:legacy-search-setting
```

실제 삭제 실행:

```bash
cd /Users/alex/project/townpet2/app && pnpm db:cleanup:legacy-search-setting -- --apply
```

## 점검 체크리스트
- [ ] `pnpm db:migrate`가 성공한다.
- [ ] 검색 API 호출 후 `SearchTermStat`에 upsert가 발생한다.
- [ ] `/search` 페이지 인기 검색어가 정상 표시된다.
- [ ] `pnpm db:cleanup:legacy-search-setting -- --apply` 실행 후 대상 키가 0건이다.
