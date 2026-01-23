# 2026-01-23 prisma7-datasource-url

## 요약
- 증상: Prisma migrate 실행 시 schema의 `url` 필드 오류 발생
- 영향 범위: 마이그레이션 실행 불가
- 심각도: 중간 (DB 초기화 차단)

## 재현 조건
- 단계: `pnpm prisma migrate dev --name init`
- 환경: Prisma 7.x

## 원인 분석
- 직접 원인: Prisma 7에서 schema의 `datasource.url` 사용 중단
- 근본 원인: 신규 Prisma config 규칙 미반영

## 해결 방법
- 수정 내용: `prisma/schema.prisma`에서 `url` 제거, `prisma.config.ts`의 datasource 사용
- 관련 파일: `app/prisma/schema.prisma`, `app/prisma.config.ts`
- 관련 PR/커밋: 없음

## 대응 구분
- 임시 대응(워크어라운드): Prisma 6으로 다운그레이드
- 영구 대응(근본 수정): Prisma 7 config 규칙 적용

## 재발 방지
- 테스트/모니터링 보강: Prisma 업그레이드 시 schema 규칙 확인
- 정책/문서 업데이트: 초기 셋업 문서에 Prisma 7 config 규칙 명시
