# Feed Scroll Performance Report

- 생성 시각: 2026-02-26T09:11:35.849Z
- 실행 환경: Playwright Chromium (headless), /feed?scope=GLOBAL&mode=ALL&sort=LATEST
- 시드 데이터: 140개 ([PERF] feed-scroll)
- 판정: PASS

## 측정 결과
- 로드된 게시글 수: 167
- 프레임 샘플 수: 267
- 평균 프레임 간격: 17.91ms
- p95 프레임 간격: 17.5ms
- p99 프레임 간격: 66.7ms
- 50ms 초과 프레임: 3회 (1.12%)
- 100ms 초과 프레임: 0회
- JS Heap 사용량(종료 시점): 37.77MB

## 기준값
- 목표 로드 게시글: >= 100
- p95 프레임 간격 PASS 기준: <= 42ms
- Jank 비율 PASS 기준: <= 8%

## 병목/메모
- 특이 병목 없음
