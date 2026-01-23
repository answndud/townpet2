# 2026-01-23 docker-daemon

## 요약
- 증상: `docker compose up -d` 실행 시 Docker daemon 연결 실패
- 영향 범위: 로컬 Postgres 실행 불가
- 심각도: 중간 (DB 마이그레이션/테스트 진행 차단)

## 재현 조건
- 단계: `docker compose up -d`
- 환경: Docker Desktop 미실행

## 원인 분석
- 직접 원인: Docker daemon 소켓에 연결 불가
- 근본 원인: Docker Desktop이 실행되지 않음

## 해결 방법
- 수정 내용: Docker Desktop 실행 후 재시도
- 관련 파일: 없음
- 관련 PR/커밋: 없음

## 대응 구분
- 임시 대응(워크어라운드): 외부 Postgres 사용
- 영구 대응(근본 수정): 로컬 Docker daemon 실행

## 재발 방지
- 테스트/모니터링 보강: 개발 시작 전 Docker 상태 확인
- 정책/문서 업데이트: 로컬 DB 실행 체크리스트 추가
