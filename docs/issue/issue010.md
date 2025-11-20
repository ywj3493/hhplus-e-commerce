# Issue #010: Order Domain Implementation

## Overview
Implement the Order domain following the 4-Layer Architecture pattern established in Product, Cart, and Coupon domains. This implementation includes order creation with stock reservation, coupon application, order inquiry, and batch processing for expired reservations.

## Business Requirements

### Order Creation (UC-ORDER-01)
- **BR-ORDER-01**: Stock Reservation Period - Stock is reserved for 10 minutes from order creation
- **BR-ORDER-02**: Snapshot Storage - Save product information (name, price, options) at order time
- **BR-ORDER-03**: Coupon Usage Limit - Each coupon can only be used once per user
- **BR-ORDER-04**: Coupon Discount Calculation
  - Percentage: totalAmount × (discountRate/100)
  - Fixed: min(discountAmount, totalAmount)
- **BR-ORDER-05**: Minimum Order Amount - Final amount must be greater than 0

### Order Inquiry (UC-ORDER-02)
- **BR-ORDER-06**: Ownership Validation - Users can only view their own orders
- **BR-ORDER-07**: Snapshot Display - Show product info at order time (may differ from current price)
- **BR-ORDER-08**: Reservation Time Display - Show remaining reservation time for PENDING orders

### Order List Inquiry (UC-ORDER-03)
- **BR-ORDER-09**: Default Sorting - Display latest orders first (created_at DESC)
- **BR-ORDER-10**: Default Page Size - Apply default page size of 10 if not specified
- **BR-ORDER-11**: Maximum Page Size - Maximum 100 items per page
- **BR-ORDER-12**: User-Specific Display - Show only logged-in user's orders

### Stock Reservation Timeout (UC-ORDER-04)
- **BR-ORDER-13**: Expiration Time - Automatically cancel after 10 minutes from order creation
- **BR-ORDER-14**: Stock Release - Restore reserved stock to available stock (reserved → available)
- **BR-ORDER-15**: Batch Cycle - Run every 1 minute to ensure real-time processing
- **BR-ORDER-16**: Transaction Processing - Handle stock release and order cancellation atomically per order

## API Specifications

### POST /orders - Create Order
**Request:**
```json
{
  "couponId": "string (optional)"
}
```

**Response:** 201 Created
```json
{
  "orderId": "string",
  "status": "PENDING",
  "totalAmount": 50000,
  "discountAmount": 5000,
  "finalAmount": 45000,
  "reservationExpiresAt": "2025-11-18T12:10:00Z"
}
```

### GET /orders/:id - Get Order Details
**Response:** 200 OK
```json
{
  "orderId": "string",
  "status": "PENDING | COMPLETED | CANCELED",
  "items": [
    {
      "productId": "string",
      "productName": "string (snapshot)",
      "productOptionId": "string | null",
      "productOptionName": "string | null (snapshot)",
      "price": 25000,
      "quantity": 2,
      "subtotal": 50000
    }
  ],
  "totalAmount": 50000,
  "discountAmount": 5000,
  "finalAmount": 45000,
  "createdAt": "2025-11-18T12:00:00Z",
  "reservationExpiresAt": "2025-11-18T12:10:00Z"
}
```

### GET /orders - Get Order List
**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10, max: 100)

**Response:** 200 OK
```json
{
  "orders": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

## Data Model

### Order Entity
```typescript
{
  id: string (PK)
  userId: string (FK)
  status: OrderStatus (PENDING | COMPLETED | CANCELED)
  totalAmount: number
  discountAmount: number
  finalAmount: number
  userCouponId: string | null (FK)
  reservationExpiresAt: Date
  createdAt: Date
  paidAt: Date | null
  updatedAt: Date
}
```

### OrderItem Entity
```typescript
{
  id: string (PK)
  orderId: string (FK)
  productId: string (FK)
  productName: string (Snapshot)
  productOptionId: string | null (FK)
  productOptionName: string | null (Snapshot)
  price: number (Snapshot)
  quantity: number
  subtotal: number
  createdAt: Date
}
```

## Implementation Checklist

### Phase 1: Domain Layer ✅
- [ ] **Entities**
  - [ ] `Order` Entity ([src/order/domain/entities/order.entity.ts](src/order/domain/entities/order.entity.ts))
    - Private constructor pattern
    - `create()` factory method (order creation)
    - `reconstitute()` factory method (from persistence)
    - `complete()` method (payment completion)
    - `cancel()` method (order cancellation)
    - `isExpired()` method (check reservation expiration)
    - `calculateTotalAmount()` method
    - `calculateDiscount()` method
    - Property getters (`get id()`, `get status()`, etc.)
    - Immutability guarantee (`readonly` fields)
  - [ ] `OrderItem` Entity ([src/order/domain/entities/order-item.entity.ts](src/order/domain/entities/order-item.entity.ts))
    - Private constructor pattern
    - `fromCartItem()` factory method (snapshot creation)
    - `reconstitute()` factory method
    - `getSubtotal()` method
    - Property getters
  - [ ] `OrderStatus` Enum ([src/order/domain/entities/order-status.enum.ts](src/order/domain/entities/order-status.enum.ts))

- [ ] **Domain Services**
  - [ ] `StockReservationService` ([src/order/domain/services/stock-reservation.service.ts](src/order/domain/services/stock-reservation.service.ts))
    - `reserveStockForCart()` - Reserve stock for cart items
    - `releaseReservedStock()` - Release reserved stock
    - Call Stock Entity's `reserve()` and `release()` methods
    - Transaction support (EntityManager)

- [ ] **Repository Interfaces**
  - [ ] `OrderRepository` ([src/order/domain/repositories/order.repository.ts](src/order/domain/repositories/order.repository.ts))

- [ ] **Domain Exceptions**
  - [ ] [src/order/domain/order.exceptions.ts](src/order/domain/order.exceptions.ts)
    - `OrderNotFoundException`
    - `EmptyCartException`
    - `OrderAlreadyCompletedException`
    - `OrderExpiredException`
    - `InvalidOrderStateException`

- [ ] **Unit Tests**
  - [ ] `order.entity.spec.ts` - 100% coverage
  - [ ] `order-item.entity.spec.ts` - 100% coverage
  - [ ] `stock-reservation.service.spec.ts` - 100% coverage

### Phase 2: Infrastructure Layer ✅
- [ ] **Repositories**
  - [ ] `InMemoryOrderRepository` ([src/order/infrastructure/repositories/in-memory-order.repository.ts](src/order/infrastructure/repositories/in-memory-order.repository.ts))
    - `findById()`, `findByUserId()`, `countByUserId()`
    - `findExpiredPendingOrders()`
    - `save()`
    - Deep copy for immutability
    - Test methods: `clear()`, `seed()`

- [ ] **Test Fixtures**
  - [ ] [src/order/infrastructure/fixtures/order.fixtures.ts](src/order/infrastructure/fixtures/order.fixtures.ts)
    - `createTestOrder()`
    - `createTestOrderItem()`

- [ ] **Unit Tests**
  - [ ] `in-memory-order.repository.spec.ts` - >80% coverage

### Phase 3: Application Layer ✅
- [ ] **Use Cases**
  - [ ] `CreateOrderUseCase` ([src/order/application/use-cases/create-order.use-case.ts](src/order/application/use-cases/create-order.use-case.ts))
    - Retrieve and validate cart
    - Reserve stock (StockReservationService)
    - Validate and use coupon (CouponService)
    - Call Order.create()
    - Clear cart
    - Transaction management
  - [ ] `GetOrderUseCase` ([src/order/application/use-cases/get-order.use-case.ts](src/order/application/use-cases/get-order.use-case.ts))
    - Retrieve order
    - Ownership validation (BR-ORDER-06)
    - Generate output DTO
  - [ ] `GetOrdersUseCase` ([src/order/application/use-cases/get-orders.use-case.ts](src/order/application/use-cases/get-orders.use-case.ts))
    - Retrieve user's order list
    - Pagination handling
    - Latest-first sorting (BR-ORDER-09)
  - [ ] `ReleaseExpiredReservationJob` ([src/order/application/jobs/release-expired-reservation.job.ts](src/order/application/jobs/release-expired-reservation.job.ts))
    - Batch job (every 1 minute)
    - Retrieve expired orders
    - Release stock
    - Cancel orders
    - Logging

- [ ] **DTOs (Use Case Integration)**
  - [ ] `create-order.dto.ts` - Input + Output
  - [ ] `get-order.dto.ts` - Input + Output + OrderItemData
  - [ ] `get-orders.dto.ts` - Input + Output + PaginationData

- [ ] **Integration Tests**
  - [ ] `create-order.use-case.spec.ts` - >90% coverage
  - [ ] `get-order.use-case.spec.ts` - >90% coverage
  - [ ] `get-orders.use-case.spec.ts` - >90% coverage
  - [ ] `release-expired-reservation.job.spec.ts` - >90% coverage

### Phase 4: Presentation Layer ✅
- [ ] **Controllers**
  - [ ] `OrderController` ([src/order/presentation/controllers/order.controller.ts](src/order/presentation/controllers/order.controller.ts))
    - POST /orders (Create order)
    - GET /orders/:id (Get order details)
    - GET /orders (Get order list)
    - Authentication check (@CurrentUser decorator)
    - Request/Response DTO conversion

- [ ] **Request/Response DTOs**
  - [ ] `create-order-request.dto.ts`
  - [ ] `order-response.dto.ts`
  - [ ] `order-list-response.dto.ts`
  - [ ] `pagination-query.dto.ts`

- [ ] **E2E Tests**
  - [ ] `order.controller.spec.ts`
    - POST /orders (201 Created)
    - GET /orders/:id (200 OK)
    - GET /orders (200 OK with pagination)
    - Error cases (400, 403, 404, 409)

### Phase 5: Module Configuration ✅
- [ ] `order.module.ts`
  - Import: CartModule, CouponModule, ProductModule
  - Providers: StockReservationService, Use Cases, InMemoryOrderRepository
  - Controllers: OrderController
  - Exports: OrderRepository

- [ ] Update `app.module.ts`
  - Import OrderModule

- [ ] Integration Tests
  - Full flow testing
  - Error case testing
  - Concurrency testing

## Architecture Patterns

### Entity Pattern (from Product, Cart, Coupon)
1. **Private Constructor + Factory Method**
   ```typescript
   export class Order {
     private readonly _id: string;
     private readonly _userId: string;

     private constructor(id: string, userId: string, ...) {
       this._id = id;
       this._userId = userId;
       this.validate();
     }

     static create(...): Order { ... }
     static reconstitute(...): Order { ... }
   }
   ```

2. **Property Getters**
   ```typescript
   get id(): string {
     return this._id;
   }
   ```

3. **Immutability**
   - Use `readonly` fields
   - Return copies for arrays/objects (`[...this._items]`)

4. **Business Logic in Entity**
   - Implement business rules as Entity methods
   - Application Layer only orchestrates

### DTO Pattern (from Issue #007 Refactoring)
- **File Naming**: `{use-case-name}.dto.ts`
- **Structure**:
  ```typescript
  // Input DTO
  export class CreateOrderInput {
    constructor(data) { ... }
    private validate() { ... }
  }

  // Output DTO
  export class CreateOrderOutput {
    static from(order: Order): CreateOrderOutput { ... }
  }
  ```

### Test Pattern (from Issue #007)
- `describe` blocks: Korean
- `it` blocks: Korean with "해야 함" ending
- Given-When-Then comments: English
- Domain Layer: 100% coverage
- Application Layer: >90% coverage

## Key Considerations

### 1. Transaction Management
- **CreateOrderUseCase**: Entire flow in one transaction
- **ReleaseExpiredReservationJob**: Transaction per order
- In-Memory: Sequential processing simulation
- Prisma: Use `this.dataSource.transaction()`

### 2. Concurrency Control
- **Stock Reservation**: SELECT FOR UPDATE (lock simulation in In-Memory)
- **Coupon Usage**: Already handled in CouponService
- **Cart Retrieval**: Prevent concurrent orders

### 3. Snapshot Pattern
- Copy product name, option name, price when creating OrderItem
- Not affected by subsequent product changes
- Use `OrderItem.fromCartItem()` factory method

### 4. Dependencies
- **Cart Domain**: Retrieve and clear cart
- **Coupon Domain**: Validate and use coupon (CouponService)
- **Product Domain**: Reserve stock (Stock Entity, StockRepository)

### 5. Modifications to Existing Domains
- **Product Domain**: Add `reserve()` and `release()` methods to Stock Entity
- **Cart Domain**: Use existing cart retrieval and clear methods
- **Coupon Domain**: Use existing CouponService

## Commit Strategy

### Commit 1: Documentation
```
docs: Order 도메인 구현 계획 수립 (Issue #010)

Order 도메인 구현을 위한 상세 계획을 수립했습니다.
- 비즈니스 룰 정리 (BR-ORDER-01~16)
- API 명세 및 데이터 모델 정의
- Phase별 구현 체크리스트
- 아키텍처 패턴 및 주의사항 정리

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Commit 2: Domain Layer
```
feat: Order 도메인 엔티티 및 도메인 서비스 구현

Order와 OrderItem 엔티티, StockReservationService를 구현했습니다.
- BR-ORDER-01: 재고 예약 기간 (10분)
- BR-ORDER-02: 스냅샷 저장 (상품 정보 불변)
- BR-ORDER-04: 쿠폰 할인 계산
- BR-ORDER-05: 최소 주문 금액 검증
- BR-ORDER-13~16: 재고 예약 타임아웃 처리
- 단위 테스트 100% 커버리지

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Commit 3: Infrastructure Layer
```
feat: Order 인프라 레이어 구현

InMemoryOrderRepository와 테스트 픽스처를 구현했습니다.
- 주문 CRUD 기능
- 만료된 주문 조회 기능
- Deep copy를 통한 불변성 보장
- 테스트 데이터 생성 헬퍼
- 단위 테스트 >80% 커버리지

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Commit 4: Application Layer
```
feat: Order 애플리케이션 레이어 구현

주문 생성, 조회, 목록 조회 및 배치 작업을 구현했습니다.
- UC-ORDER-01: CreateOrderUseCase (재고 예약 + 쿠폰 적용)
- UC-ORDER-02: GetOrderUseCase (소유권 검증)
- UC-ORDER-03: GetOrdersUseCase (페이지네이션)
- UC-ORDER-04: ReleaseExpiredReservationJob (자동 취소)
- Use Case별 통합 DTO 구조
- 통합 테스트 >90% 커버리지

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Commit 5: Presentation Layer
```
feat: Order 프레젠테이션 레이어 구현

OrderController와 API 레벨 DTO를 구현했습니다.
- POST /orders - 주문 생성
- GET /orders/:id - 주문 상세 조회
- GET /orders - 주문 목록 조회
- 인증 확인 및 소유권 검증
- Request/Response DTO 변환
- E2E 테스트

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Commit 6: Integration
```
feat: Order 모듈 설정 및 통합

OrderModule 설정과 앱 통합을 완료했습니다.
- OrderModule 의존성 주입 설정
- app.module.ts에 OrderModule 추가
- 전체 플로우 통합 테스트
- Issue #010 완료

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Estimated Effort
- **Phase 1**: 3-4 hours
- **Phase 2**: 2-3 hours
- **Phase 3**: 4-5 hours
- **Phase 4**: 2-3 hours
- **Phase 5**: 1-2 hours
- **Total**: 18-26 hours (including tests)

## References
- Product Domain: [src/product](../../src/product)
- Cart Domain: [src/cart](../../src/cart)
- Coupon Domain: [src/coupon](../../src/coupon)
- Issue #007: Architecture Restructure
- Issue #008: Cart Domain
- Issue #009: Coupon Domain
- Dev Specs: [docs/dev/dashboard/order](../dev/dashboard/order)
