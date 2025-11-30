# E-Commerce Backend Service

항해플러스 백엔드 과제 프로젝트

## 과제 리포트

### Step 08: 동시성 제어

- [동시성 제어 점검 및 구현 리포트](docs/reports/step08/concurrency-control-review.md)

**구현 내용**:

- 재고 예약 동시성 제어 (비관락 → 낙관락 전환)
- 결제 중복 방지 (Idempotency Key 패턴)
- 보상 트랜잭션 구현

### Step 12: 캐시 전략

- [캐시 전략 적용 보고서](docs/reports/step12/cache-applicatioin-report.md)

**구현 내용**:

- Redis 기반 Cache Aside 패턴 적용
- 상품 목록/상세 조회 캐싱
- Cache Stampede 대응 전략 분석
