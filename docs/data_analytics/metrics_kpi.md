# 01. 지표/KPI 설계

## 1) MVP 핵심 지표
### Local
- 7일 리텐션(동네 기준 코호트)
- 템플릿 완성률(방문일/항목/비용/대기 입력률)
- 저장률(저장/조회)
- 검색 사용률(검색/DAU)

### Market/돌봄
- 문의율(조회 대비 문의)
- 성사율(문의 대비 완료)
- 분쟁/신고율(거래/요청 단위)

### Lost&Found
- 알림 도달→제보 전환율
- 평균 제보 발생 시간(골든타임)
- 허위 신고율

### Global
- 질문당 답변 수
- 답변 채택률
- 검색 유입(자연 검색)

## 2) 이벤트 트래킹(예시)
- `signup_completed`
- `neighborhood_set`
- `post_created`(type/scope)
- `template_completed`(rate)
- `search_executed`
- `post_saved`
- `report_filed`
- `market_inquiry_sent`
- `care_request_created`
- `lost_alert_created` / `lost_sighting_created`
- `qa_answer_accepted`
