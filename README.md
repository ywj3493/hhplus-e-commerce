# E-Commerce Backend Service

항해플러스 백엔드 과제 프로젝트

## 과제 리포트

### Step 08: 동시성 제어

- [동시성 제어 점검 및 구현 리포트](docs/reports/step08/concurrency-control-review.md)

**구현 내용**:

- 재고 예약 동시성 제어 (비관락 → 낙관락 전환)
- 결제 중복 방지 (Idempotency Key 패턴)
- 보상 트랜잭션 구현
