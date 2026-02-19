# Feed Scroll Performance Report

- 생성 시각: 2026-02-19T10:08:53.443Z
- 실행 환경: Playwright Chromium (headless), /feed?scope=GLOBAL&mode=ALL&limit=20&sort=LATEST
- 시드 데이터: 140개 ([PERF] feed-scroll)
- 판정: PASS

## 측정 결과
- 로드된 게시글 수: 159
- 프레임 샘플 수: 187
- 평균 프레임 간격: 19.25ms
- p95 프레임 간격: 33.3ms
- p99 프레임 간격: 83.1ms
- 50ms 초과 프레임: 6회 (3.21%)
- 100ms 초과 프레임: 0회
- JS Heap 사용량(종료 시점): 29.75MB

## 기준값
- 목표 로드 게시글: >= 100
- p95 프레임 간격 PASS 기준: <= 42ms
- Jank 비율 PASS 기준: <= 8%

## 병목/메모
- 특이 병목 없음
