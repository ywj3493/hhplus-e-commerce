# Step08 동시성 제어 점검 리포트

## 개요

이 문서는 E-Commerce 백엔드 서비스의 동시성 제어 구현 상태를 점검한 결과입니다.
주요 경합 시나리오인 **쿠폰 발급**과 **재고 예약**을 중심으로 점검했으며, 추가로 동시성 제어가 필요한 영역을 발견했습니다.

---

## 1. 동시성 제어 구현 현황

### ✅ 쿠폰 발급 경합

**구현 메커니즘**: Pessimistic Lock + Transaction

**위치**: [IssueCouponUseCase](../../../src/coupon/application/use-cases/issue-coupon.use-case.ts:51-86)

**의도**:

- 단기간에 많은 사용자가 몰릴 것 예상

**보호 장치**:

- `SELECT ... FOR UPDATE` 비관적 락으로 행 수준 잠금
- 전체 프로세스를 트랜잭션으로 래핑
- 중복 발급 체크 (DB Unique Constraint: `userId + couponId`)
- 수량 및 유효기간 검증 (도메인 엔티티)

**테스트 커버리지**:

- 100 concurrent requests (10 수량 쿠폰)
- 동일 사용자 중복 발급 방지
- 통합 테스트: [issue-coupon.concurrency.integration.spec.ts](../../../test/coupon/integration/issue-coupon.concurrency.integration.spec.ts)

---

### ✅ 재고 예약 경합 (LOW RISK) - 낙관락으로 전환 완료

**구현 메커니즘**: Optimistic Lock (Version 기반) + Retry Logic

**위치**: [ProductPrismaRepository](../../../src/product/infrastructure/repositories/product-prisma.repository.ts:153-195)

**의도**:

- 재고 구매는 우선 핫딜 등 인기 상품이 아닌 상품이라는 가정 및 예약 로직이 존재한다는 점 고려

**구현 내용** ([Issue #025](../../../docs/issue/issue025.md)):

- Version 필드 기반 낙관적 락 (Prisma `updateMany` with version check)
- 동시성 충돌 시 `OptimisticLockException` 발생
- 불변식 검증: `available + reserved + sold ≤ total`
- 재시도 로직: 최대 3회, 지수 백오프 (50ms → 100ms → 200ms)

**마이그레이션**: `20251121022611_add_stock_version_for_optimistic_lock`

**성능 개선**:

- 순차 처리 → 병렬 처리로 전환
- 충돌 시에만 재시도, 대부분의 경우 1회 성공

**테스트 커버리지**:

- 100 concurrent requests (50 재고) - 정확히 50 성공/50 실패
- 낙관적 락 충돌 시나리오 검증
- 통합 테스트: [stock-reservation-concurrency.integration.spec.ts](../../../test/product/integration/stock-reservation-concurrency.integration.spec.ts)

---

## 2. 구현 완료된 동시성 제어 개선 사항

### ✅ 결제 중복 처리 방지 - Idempotency Key 패턴 적용 완료

**위치**: [ProcessPaymentUseCase](../../../src/order/application/use-cases/process-payment.use-case.ts)

**의도**:

- 결제 중복 처리는 락 처리를 해야한다 생각 했으나 생각해보니 외부 PG API 연동을 가정했기 때문에 외부 시스템 중복 호출 하지 않게 하는게 더 방법이라 생각했음

**구현 내용** ([Issue #027](../../../docs/issue/issue027.md)):

- Payment 엔티티에 `idempotencyKey` 필드 추가 (unique constraint)
- `findByIdempotencyKey()` repository 메서드 구현
- 동일 idempotency key 요청 시 기존 결제 결과 반환 (멱등성 보장)
- 클라이언트가 UUID 기반 idempotency key 제공

**마이그레이션**: `20251121032318_add_payment_idempotency_key`

**보호 장치**:

- Database unique constraint로 동시 요청 차단
- 네트워크 재시도 안전성 확보
- PG 중복 결제 방지

**현재 해결**:

```
Time    요청 A (key: abc-123)         요청 B (key: abc-123)
T1      idempotency key 체크 (없음)
T2                                     idempotency key 체크 (없음)
T3      PG 결제 요청 + 저장
T4                                     DB unique constraint 위반 → 재조회
결과: A는 새 결제 생성, B는 A의 결과 반환 (멱등성) ✓
```

---

### ✅ Payment-Stock-Order 보상 트랜잭션 구현 완료

**위치**: [OrderFacade.completeOrder](../../../src/order/application/facades/order.facade.ts)

**의도**:

- OrderFacade 하나에 많은 비즈니스 로직을 가지고 있으며, 결제는 외부 API 연동이라 파사드 전체를 한 트랜잭션에 묶는 것이 애초에 불가능함

**구현 내용** ([Issue #026](../../../docs/issue/issue026.md)):

- Payment refund 메커니즘 추가
  - `PaymentRepository.refund()` 메서드 구현
  - `PaymentPrismaRepository.refund()` 구현 완료
- OrderFacade에 보상 트랜잭션 로직 추가
- 단계별 완료 상태 추적 (`paymentId`, `orderItems`, `stockConfirmed`)
- 실패 시 역순으로 롤백

**마이그레이션**: `20251121025659_add_payment_status_and_refunded_at`

**보상 트랜잭션 플로우**:

```
Try:
  Step 1: Process Payment (결제 처리)
  ├─ 성공 → paymentId 저장
  └─ 실패 → 예외 발생 (롤백 불필요)

  Step 2: Confirm Stock (재고 확정)
  ├─ 성공 → stockConfirmed = true
  └─ 실패 → Compensate: Refund Payment → 예외 발생

  Step 3: Complete Order (주문 완료)
  ├─ 성공 → 전체 프로세스 완료
  └─ 실패 → Compensate: Release Stock + Refund Payment → 예외 발생
```

**이전 문제점**:

```
1. 결제 성공 (Payment 저장됨)
2. 재고 확정 실패 (네트워크 오류)
3. 주문 완료 호출 안 됨
결과: 결제는 되었으나 재고는 reserved 상태로 남음 💥
```

**현재 해결**:

```
1. 결제 성공 (paymentId 저장)
2. 재고 확정 실패
3. Compensation: Payment refund 실행
4. 예외 발생으로 트랜잭션 중단
결과: 결제 환불, 재고 원복, 일관성 유지 ✓
```

**로깅**:

- 각 단계 시작/완료 로그
- 보상 트랜잭션 실행 로그
- 보상 실패 시 Critical 로그 (모니터링 필요)

---

**작성일**: 2025-11-21
**점검 범위**: Coupon, Product, Order, Payment 도메인
