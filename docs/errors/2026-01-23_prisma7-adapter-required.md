# 2026-01-23 prisma7-adapter-required

## 요약
- 증상: Prisma 7에서 PrismaClient 생성 시 adapter/accelerateUrl 요구 오류
- 영향 범위: seed 및 서버 코드 실행 불가
- 심각도: 중간 (로컬 개발 차단)

## 재현 조건
- 단계: `pnpm db:seed` 실행
- 환경: Prisma 7.x

## 원인 분석
- 직접 원인: Prisma 7의 기본 엔진이 adapter 또는 Accelerate 설정 필요
- 근본 원인: 로컬 개발 환경에서 driver adapter 미설정

## 해결 방법
- 수정 내용: Prisma 5.22.0으로 다운그레이드
- 관련 파일: `app/package.json`
- 관련 PR/커밋: 없음

## 대응 구분
- 임시 대응(워크어라운드): Prisma 7 adapter 설정
- 영구 대응(근본 수정): Prisma 5.x 유지(스펙 정합)

## 재발 방지
- 테스트/모니터링 보강: Prisma 업그레이드 시 adapter 정책 확인
- 정책/문서 업데이트: Prisma 버전 정책 명시
