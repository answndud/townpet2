# 2026-01-23 prisma-client-options

## 요약
- 증상: Prisma 7에서 PrismaClient 옵션 요구 오류 발생
- 영향 범위: seed 실행 불가
- 심각도: 중간 (로컬 개발 데이터 준비 지연)

## 재현 조건
- 단계: `pnpm db:seed`
- 환경: Prisma 7.x

## 원인 분석
- 직접 원인: Prisma 7에서 PrismaClient 생성 시 datasources 옵션 필요
- 근본 원인: PrismaClient 생성에 datasource 설정을 전달하지 않음

## 해결 방법
- 수정 내용: Prisma 5.22.0으로 다운그레이드
- 관련 파일: `app/package.json`
- 관련 PR/커밋: 없음

## 대응 구분
- 임시 대응(워크어라운드): Prisma 7 adapter 설정
- 영구 대응(근본 수정): Prisma 5.x 유지

## 재발 방지
- 테스트/모니터링 보강: seed 실행 전 환경 변수 확인
- 정책/문서 업데이트: Prisma 7 client 옵션 가이드 추가
