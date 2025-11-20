# Issue #018: DB 설계 문서와 구현체 일관성 개선

## 📋 Overview

**Type**: Refactoring + Feature Enhancement
**Priority**: High
**Estimated Effort**: 12-17 hours
**Branch**: step7
**Related Documents**: `/docs/dev/dashboard/data-model.md`

## 🎯 Objectives

설계 문서(data-model.md)와 실제 구현체 간의 불일치를 해결하고, 인덱스 전략을 보완하여 향후 실제 데이터베이스 전환 시 일관성을 확보합니다.

## 🔍 Background

### 현재 상황
- In-Memory Repository 패턴 사용 중
- 설계 문서와 구현체 간 여러 불일치 발견
- 일부 엔티티 누락, 구조적 차이, 필드 누락 등 존재

### 일관성 분석 결과
**일관성 점수**: 75/100

**주요 불일치 사항**:
1. 🔴 Category 엔티티 완전 누락
2. 🔴 Stock 구조 차이 (productOptionId vs productId + optionId)
3. 🟡 Coupon minAmount 필드 누락
4. 🟡 타임스탬프 필드 일부 누락
5. ✅ 일부 기능 확장 (쿠폰 타입, 스냅샷 필드)

## 📝 Requirements

### 1. Category 엔티티 추가

**설계 문서 정의** (data-model.md 라인 461-487):
```
Category:
- id: VARCHAR(36) - PRIMARY KEY
- name: VARCHAR(100) - NOT NULL
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP

Relationship:
- Product.categoryId -> Category.id (FOREIGN KEY)
```

**구현 범위**:
- Category Entity 생성
- CategoryRepository 인터페이스 및 In-Memory 구현
- Product Entity에 categoryId 필드 추가
- 관련 테스트 작성

### 2. Stock 구조 변경

**현재 구현**:
```typescript
class Stock {
  private readonly _productOptionId: string; // 항상 필수
}
```

**설계 문서 기준**:
```typescript
class Stock {
  private readonly _productId: string;        // 필수
  private readonly _productOptionId: string | null;  // 옵션 있을 때만
}
```

**변경 이유**:
- 옵션이 없는 상품도 재고 관리 가능하도록
- 비즈니스 의미 정확히 반영
- 설계 문서의 ERD와 일치

**영향 범위**:
- Stock Entity 리팩토링
- StockManagementService 시그니처 변경
- 모든 Stock 관련 Use Case 수정
- Event Handler 수정
- 15-20개 테스트 파일 수정

### 3. Coupon minAmount 필드 추가

**설계 문서 정의** (data-model.md 라인 966-1022):
```
Coupon:
- minAmount: DECIMAL(10, 2) - NULL
  최소 주문 금액 제약 조건
```

**비즈니스 로직**:
- minAmount가 설정된 경우, 주문 금액이 minAmount 이상이어야 쿠폰 사용 가능
- minAmount가 NULL인 경우, 제약 없음

**구현 범위**:
- Coupon Entity에 minAmount 필드 추가
- 검증 메서드 구현: `canBeAppliedTo(orderAmount: number): boolean`
- CreateOrderUseCase에서 검증 로직 적용
- CouponMinAmountNotMetException 추가
- 관련 테스트 추가

### 4. 타임스탬프 필드 표준화

**추가 필요한 필드**:

| Entity | 추가 필드 | 설계 문서 위치 |
|--------|----------|---------------|
| ProductOption | createdAt, updatedAt | 라인 541-575 |
| OrderItem | createdAt | 라인 868-926 |
| CartItem | createdAt, updatedAt | 라인 727-769 |

### 5. 설계 문서 업데이트

**기능 확장 사항 반영**:
- Coupon: discountType (PERCENTAGE \| FIXED) 추가
- Coupon: description 필드 추가
- CartItem: productName, price (스냅샷) 필드 추가
- Payment: userId, transactionId 필드 추가

**인덱스 전략 추가**:
```sql
-- Payment 거래 추적
UNIQUE INDEX idx_payment_transaction (transactionId)

-- UserCoupon 만료 최적화 (Partial Index)
CREATE INDEX idx_user_coupon_expirable (expiresAt)
WHERE status = 'AVAILABLE';

-- Order 만료 배치 최적화 (Covering Index)
CREATE INDEX idx_order_expire_covering (status, reservationExpiresAt)
INCLUDE (id, userId, totalAmount);
```

**Materialized View 추가**:
```sql
-- 인기 상품 통계 (최근 3일간 판매량 기준)
CREATE MATERIALIZED VIEW popular_products AS
SELECT
  p.id,
  p.name,
  SUM(oi.quantity) AS sales_count,
  SUM(oi.subtotal) AS sales_amount
FROM Product p
JOIN OrderItem oi ON p.id = oi.productId
JOIN Order o ON oi.orderId = o.id
WHERE o.status = 'COMPLETED'
  AND o.paidAt >= NOW() - INTERVAL '3 days'
GROUP BY p.id, p.name
ORDER BY sales_count DESC;

-- 15분마다 갱신
REFRESH MATERIALIZED VIEW popular_products;
```

**DataTransmission TODO 섹션**:
- Outbox Pattern 미구현 명시
- 향후 Phase 2에서 구현 예정 표시

## 🏗️ Implementation Plan

### Phase 1: 타임스탬프 필드 추가 (낮은 위험)

**예상 소요**: 1-2시간

**작업 항목**:
1. ProductOption Entity 수정
   - createdAt, updatedAt 필드 추가
   - 팩토리 메서드 수정
2. OrderItem Entity 수정
   - createdAt 필드 추가
3. CartItem Entity 수정
   - createdAt, updatedAt 필드 추가
4. 관련 Fixture 수정
5. 테스트 수정 (10-15개)

**영향 파일**:
- `/src/product/domain/entities/product-option.entity.ts`
- `/src/product/domain/entities/product-option.entity.spec.ts`
- `/src/order/domain/entities/order-item.entity.ts`
- `/src/order/domain/entities/order-item.entity.spec.ts`
- `/src/order/domain/entities/cart-item.entity.ts`
- `/src/order/domain/entities/cart-item.entity.spec.ts`
- Fixture 파일들

**커밋 메시지**:
```
refactor: 엔티티 타임스탬프 필드 표준화 (Issue #018)

ProductOption, OrderItem, CartItem에 누락된 타임스탬프 필드를 추가하여
설계 문서와 일치시켰습니다.

- ProductOption: createdAt, updatedAt 추가
- OrderItem: createdAt 추가
- CartItem: createdAt, updatedAt 추가
```

### Phase 2: Coupon minAmount 추가 (중간 위험)

**예상 소요**: 2-3시간

**작업 항목**:
1. Coupon Entity에 minAmount 필드 추가
2. 검증 메서드 구현
3. CouponMinAmountNotMetException 추가
4. CreateOrderUseCase 검증 로직 적용
5. 테스트 추가 및 수정 (5-8개)

**영향 파일**:
- `/src/coupon/domain/entities/coupon.entity.ts`
- `/src/coupon/domain/entities/coupon.entity.spec.ts`
- `/src/coupon/domain/coupon.exceptions.ts`
- `/src/order/application/use-cases/create-order.use-case.ts`
- `/src/order/application/use-cases/create-order.use-case.spec.ts`
- `/src/coupon/infrastructure/fixtures/coupon.fixtures.ts`

**커밋 메시지**:
```
feat: 쿠폰 최소 주문 금액 제약 조건 구현 (Issue #018)

쿠폰 사용 시 최소 주문 금액 조건을 검증할 수 있도록 구현했습니다.

- Coupon.minAmount 필드 추가
- canBeAppliedTo() 검증 메서드 구현
- CouponMinAmountNotMetException 추가
- CreateOrderUseCase에서 검증 적용
```

### Phase 3: Category 엔티티 추가 (중간 위험)

**예상 소요**: 3-4시간

**작업 항목**:
1. Category Entity 생성
2. CategoryRepository 인터페이스 및 구현
3. Product Entity에 categoryId 추가
4. Product Module 프로바이더 추가
5. Fixture 수정
6. 테스트 작성 및 수정 (10-15개)

**새 파일**:
- `/src/product/domain/entities/category.entity.ts`
- `/src/product/domain/entities/category.entity.spec.ts`
- `/src/product/domain/repositories/category.repository.ts`
- `/src/product/infrastructure/repositories/in-memory-category.repository.ts`
- `/src/product/infrastructure/repositories/in-memory-category.repository.spec.ts`
- `/src/product/infrastructure/fixtures/category.fixtures.ts`

**수정 파일**:
- `/src/product/domain/entities/product.entity.ts`
- `/src/product/domain/entities/product.entity.spec.ts`
- `/src/product/domain/repositories/tokens.ts`
- `/src/product/product.module.ts`
- `/src/product/infrastructure/fixtures/product.fixtures.ts`
- 모든 Product 생성 테스트 파일

**커밋 메시지**:
```
feat: Category 엔티티 추가 및 Product 관계 설정 (Issue #018)

상품 카테고리 분류를 위한 Category 엔티티를 구현했습니다.

- Category Entity 및 Repository 구현
- Product.categoryId 필드 추가
- In-Memory Repository 구현
- 관련 테스트 작성
```

### Phase 4: Stock 구조 변경 (높은 위험) ⚠️

**예상 소요**: 5-6시간

**작업 항목**:
1. Stock Entity 리팩토링
   - productId 필드 추가 (필수)
   - productOptionId nullable로 변경
2. StockManagementService 시그니처 변경
3. Repository 메서드 수정
4. 모든 Use Case 수정
   - CreateOrderUseCase
   - ProcessPaymentUseCase
5. Event Handler 수정
   - PaymentCompletedHandler
   - OrderExpiredHandler (존재 시)
6. 테스트 전면 수정 (15-20개)

**영향 파일**:
- `/src/product/domain/entities/stock.entity.ts`
- `/src/product/domain/entities/stock.entity.spec.ts`
- `/src/product/domain/entities/product.entity.ts`
- `/src/product/domain/entities/product-option.entity.ts`
- `/src/product/domain/services/stock-management.service.ts`
- `/src/product/domain/services/stock-management.service.spec.ts`
- `/src/product/domain/repositories/product.repository.ts`
- `/src/product/infrastructure/repositories/in-memory-product.repository.ts`
- `/src/order/application/use-cases/create-order.use-case.ts`
- `/src/order/application/use-cases/create-order.use-case.spec.ts`
- `/src/order/application/use-cases/process-payment.use-case.ts`
- `/src/order/application/use-cases/process-payment.use-case.spec.ts`
- `/src/order/application/event-handlers/payment-completed.handler.ts`
- `/src/order/application/event-handlers/payment-completed.handler.spec.ts`
- 모든 Stock 관련 테스트 파일

**커밋 메시지**:
```
refactor: Stock 구조 변경 - 옵션 없는 상품 재고 지원 (Issue #018)

설계 문서의 ERD에 맞춰 Stock 구조를 변경했습니다.

AS-IS:
- productOptionId (필수)

TO-BE:
- productId (필수)
- productOptionId (선택)

이를 통해 옵션이 없는 상품도 재고 관리가 가능하며,
비즈니스 의미를 정확히 반영하게 되었습니다.

주요 변경:
- Stock Entity 리팩토링
- StockManagementService 시그니처 변경
- 모든 Use Case 및 Event Handler 수정
- 15-20개 테스트 파일 수정
```

### Phase 5: 설계 문서 업데이트

**예상 소요**: 1-2시간

**작업 항목**:
1. data-model.md 업데이트
   - Coupon 필드 추가 (discountType, description, minAmount)
   - CartItem 스냅샷 필드 추가
   - Payment 필드 추가 (userId, transactionId)
   - 타임스탬프 필드 추가
2. 인덱스 전략 섹션 추가
   - Partial Index, Covering Index
3. Materialized View 섹션 추가
4. TODO 섹션 추가 (DataTransmission)
5. ERD 다이어그램 수정 (필요 시)

**영향 파일**:
- `/docs/dev/dashboard/data-model.md`

**커밋 메시지**:
```
docs: 설계 문서 업데이트 - 구현 사항 및 인덱스 전략 반영 (Issue #018)

구현된 기능 확장과 인덱스 최적화 전략을 설계 문서에 반영했습니다.

주요 변경:
- Coupon, CartItem, Payment 필드 추가 반영
- 타임스탬프 필드 표준화 반영
- 추가 인덱스 전략 문서화 (Partial, Covering Index)
- Materialized View 설계 추가 (인기 상품 통계)
- DataTransmission TODO 섹션 명시 (향후 구현)
```

## ✅ Acceptance Criteria

### Phase 1
- [ ] ProductOption, OrderItem, CartItem에 타임스탬프 필드 추가
- [ ] 모든 관련 테스트 통과
- [ ] `pnpm test` 성공

### Phase 2
- [ ] Coupon.minAmount 필드 추가
- [ ] 검증 로직 구현 및 테스트
- [ ] CreateOrderUseCase에서 검증 적용
- [ ] `pnpm test` 성공

### Phase 3
- [ ] Category Entity 및 Repository 구현
- [ ] Product.categoryId 필드 추가
- [ ] 모든 Product 생성 코드 수정
- [ ] `pnpm test` 성공

### Phase 4
- [ ] Stock Entity 리팩토링 완료
- [ ] StockManagementService 수정
- [ ] 모든 Use Case 및 Event Handler 수정
- [ ] 15-20개 테스트 수정 및 통과
- [ ] `pnpm test` 성공
- [ ] `pnpm run build` 성공 (타입 에러 없음)

### Phase 5
- [ ] data-model.md 업데이트 완료
- [ ] 인덱스 전략 문서화
- [ ] Materialized View 설계 추가
- [ ] TODO 섹션 추가

### 최종 검증
- [ ] 전체 테스트 통과 (29개 이상)
- [ ] TypeScript 빌드 성공
- [ ] ESLint 통과
- [ ] 설계 문서와 코드 일관성 확보

## 🔄 Rollback Strategy

### Phase별 독립 실행
- 각 Phase는 독립적으로 커밋
- Phase 실패 시 해당 커밋만 revert
- 다른 Phase는 영향 없음

### Critical Failure (Phase 4)
- Stock 구조 변경이 가장 위험도 높음
- 실패 시 해당 커밋 revert 후 재설계
- 필요 시 Issue #018 전체 재검토

## 📊 Impact Analysis

### Breaking Changes Summary

| 구분 | 영향 파일 수 | 위험도 | 롤백 난이도 |
|------|-------------|--------|------------|
| Phase 1 | 10-15개 | 🟢 낮음 | 쉬움 |
| Phase 2 | 5-8개 | 🟡 중간 | 쉬움 |
| Phase 3 | 10-15개 | 🟡 중간 | 보통 |
| Phase 4 | 15-20개 | 🔴 높음 | 어려움 |
| Phase 5 | 1개 | 🟢 낮음 | 쉬움 |

### Test Coverage
- 기존 테스트: 29개
- 예상 추가 테스트: 5-10개
- 예상 수정 테스트: 25-30개

## 📚 References

- [Data Model 설계 문서](/docs/dev/dashboard/data-model.md)
- [User Stories](/docs/dev/user-stories.md)
- [Issue #017](/docs/issue/issue017.md) (Repository 패턴 표준화)

## 📝 Notes

### DataTransmission 제외 사유
- Outbox Pattern 구현은 복잡도가 높음
- 현재 In-Memory 환경에서는 불필요
- 실제 DB 전환 후 Phase 2에서 구현 예정

### Stock 구조 변경 중요성
- 가장 영향도 높은 변경
- 신중한 테스트 필요
- 실패 시 즉시 롤백 결정

### 인덱스 전략
- 현재는 In-Memory로 적용 불가
- 실제 DB 전환 시 참고용 문서화
- Partial Index, Covering Index 등 고급 최적화 포함

## ✍️ Author
- **Created**: 2025-11-20
- **Updated**: 2025-11-20
- **Status**: In Progress
