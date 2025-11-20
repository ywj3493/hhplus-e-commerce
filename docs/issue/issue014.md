# Issue #014: Product Domain Refactoring - Stock Management Boundary Clarification

## Overview
Refactored Product domain to properly manage stock-related business logic and clarified domain boundaries between Product and Order domains.

## Problem Statement

### Before Refactoring
- **Repository Naming Inconsistency**: User domain used string-based repository token (`'USER_REPOSITORY'`) while Product and Order used Symbol-based tokens
- **Domain Boundary Violation**: Stock management logic was scattered across Order domain services, violating Product aggregate encapsulation
- **Responsibility Confusion**: Stock Entity belonged to Product domain, but stock manipulation logic resided in Order domain services
- **Tight Coupling**: Order domain directly accessed and modified Product aggregate internals

### Issues Identified
1. `StockReservationService` in Order domain manipulated Product's Stock Entity directly
2. `CartStockValidationService` in Order domain performed Product domain validation
3. User domain used different repository token pattern than other domains
4. Domain boundaries were unclear, making maintenance difficult

## Solution

### 1. Repository Token Standardization
**Changed**: User domain repository token from string to Symbol

**Files Modified**:
- Created: `src/user/domain/repositories/tokens.ts`
- Updated: `src/user/user.module.ts`
- Updated: `src/user/application/use-cases/get-user-profile.use-case.ts`
- Updated: `src/user/application/use-cases/get-user-profile.use-case.spec.ts`

**Before**:
```typescript
provide: 'USER_REPOSITORY'
```

**After**:
```typescript
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
provide: USER_REPOSITORY
```

### 2. Stock Management Service Migration
**Created**: New Product domain service for stock management

**New File**: `src/product/domain/services/stock-management.service.ts`

**Methods**:
- `reserveStock(productId, optionId, quantity)` - Reserve stock for order creation
- `releaseStock(productId, optionId, quantity)` - Release reserved stock on cancellation/expiration
- `confirmSale(productId, optionId, quantity)` - Convert reserved to sold on payment completion
- `validateStockAvailability(productId, optionId, quantity)` - Validate stock availability for cart operations

**Deleted Files**:
- `src/order/domain/services/stock-reservation.service.ts`
- `src/order/domain/services/cart-stock-validation.service.ts`
- `src/order/domain/services/stock-reservation.service.spec.ts`
- `src/order/domain/services/cart-stock-validation.service.spec.ts`

### 3. Exception Standardization
**Modified**: `InsufficientStockException` signature in Product domain

**Before**:
```typescript
constructor(requestedQuantity: number, availableQuantity: number)
```

**After**:
```typescript
constructor(message: string = '재고가 부족합니다.')
```

This aligns with the pattern used in Order domain and provides more flexibility.

### 4. Updated Use Cases and Handlers

**Modified Files**:
- `src/order/application/use-cases/add-cart-item.use-case.ts`
- `src/order/application/use-cases/update-cart-item.use-case.ts`
- `src/order/application/use-cases/create-order.use-case.ts`
- `src/order/application/event-handlers/payment-completed.handler.ts`
- `src/order/application/jobs/release-expired-reservation.job.ts`

**Key Changes**:
- Replaced `CartStockValidationService` → `StockManagementService`
- Replaced `StockReservationService` → `StockManagementService`
- Changed method calls to use individual parameters instead of CartItem/OrderItem arrays
- Payment handler now queries Order repository to get items before calling stock service

**Example - Before**:
```typescript
await this.stockReservationService.reserveStockForCart(cartItems);
```

**Example - After**:
```typescript
for (const cartItem of cartItems) {
  await this.stockManagementService.reserveStock(
    cartItem.productId,
    cartItem.productOptionId,
    cartItem.quantity,
  );
}
```

### 5. Module Configuration Updates

**ProductModule** (`src/product/product.module.ts`):
- Added `StockManagementService` to providers
- Exported `StockManagementService` for use by Order module

**OrderModule** (`src/order/order.module.ts`):
- Removed `CartStockValidationService` from providers
- Removed `StockReservationService` from providers
- Already imports `ProductModule` (no change needed)

## Architecture Improvement

### Before
```
┌─────────────────┐
│  Order Domain   │
├─────────────────┤
│ StockReservation│──┐
│ Service         │  │
└─────────────────┘  │
                     │ Direct Access
                     ↓
┌─────────────────┐
│ Product Domain  │
├─────────────────┤
│ Stock Entity    │ ← Encapsulation Violated
└─────────────────┘
```

### After
```
┌─────────────────┐
│  Order Domain   │
├─────────────────┤
│ Use Cases       │
└────────┬────────┘
         │ Uses
         ↓
┌─────────────────┐
│ Product Domain  │
├─────────────────┤
│ StockManagement │
│ Service         │
├─────────────────┤
│ Stock Entity    │ ← Properly Encapsulated
└─────────────────┘
```

## Benefits

### 1. Clear Domain Boundaries
- **Product Domain**: Product catalog + Stock management
- **Order Domain**: Cart, Order, Payment management (uses Product services)

### 2. Proper Encapsulation
- Stock Entity can only be modified through Product domain service
- Product aggregate invariants are protected

### 3. Single Responsibility
- Stock management logic consolidated in one place
- Easier to modify stock-related business rules

### 4. Better Testability
- `StockManagementService` can be tested independently
- Mock dependencies are simpler

### 5. Maintainability
- Changes to stock logic require modification in only one service
- Clear ownership of stock-related features

### 6. Extensibility
- Easy to add Domain Events in the future
- Prepared for async processing if needed

## Testing

### Test Updates
All affected test files were updated to use the new `StockManagementService`:

**Modified Test Files**:
- `src/order/application/use-cases/add-cart-item.use-case.spec.ts`
- `src/order/application/use-cases/update-cart-item.use-case.spec.ts`
- `src/order/application/use-cases/create-order.use-case.spec.ts`
- `src/order/application/event-handlers/payment-completed.handler.spec.ts`
- `src/order/application/jobs/release-expired-reservation.job.spec.ts`

**Test Results**:
- ✅ All 421 tests passing
- ✅ No breaking changes to business logic
- ✅ All Business Requirements (BR-*) still satisfied

## Business Requirements Validation

All business requirements remain satisfied:

### Stock Management (Product Domain)
- **BR-PROD-04**: Stock status display - ✅ Maintained
- **BR-PROD-06**: Stock status per option - ✅ Maintained
- **BR-PROD-08**: Out-of-stock options not selectable - ✅ Maintained

### Cart Operations (Order Domain)
- **BR-CART-02**: Stock validation on cart add - ✅ Now uses `StockManagementService.validateStockAvailability()`
- **BR-CART-08**: Stock validation on quantity increase - ✅ Now uses `StockManagementService.validateStockAvailability()`

### Order Creation (Order Domain)
- **BR-ORDER-02**: Stock reservation on order creation - ✅ Now uses `StockManagementService.reserveStock()`
- **BR-ORDER-13**: Auto-cancel expired orders - ✅ Now uses `StockManagementService.releaseStock()`
- **BR-ORDER-14**: Release reserved stock - ✅ Now uses `StockManagementService.releaseStock()`

### Payment (Order Domain)
- **BR-PAYMENT-02**: Convert reserved to sold on payment - ✅ Now uses `StockManagementService.confirmSale()`
- **BR-PAYMENT-03**: Release stock on payment failure - ✅ Now uses `StockManagementService.releaseStock()`

## Migration Guide

### For Future Development

When working with stock-related features:

1. **DO**: Use `StockManagementService` from Product domain
   ```typescript
   constructor(
     private readonly stockManagementService: StockManagementService,
   ) {}
   ```

2. **DON'T**: Directly access or modify Stock Entity from outside Product domain
   ```typescript
   // ❌ Wrong
   const product = await productRepository.findById(id);
   product.options[0].stock.reserve(quantity);
   ```

3. **DO**: Call appropriate service method
   ```typescript
   // ✅ Correct
   await this.stockManagementService.reserveStock(
     productId,
     optionId,
     quantity,
   );
   ```

## Future Considerations

### Domain Events (Optional Enhancement)
For further decoupling, consider implementing Domain Events:

```typescript
// Order Domain
class Order {
  create() {
    // ... order creation logic
    this.addDomainEvent(new OrderCreatedEvent(this));
  }
}

// Product Domain
@OnEvent('order.created')
async handleOrderCreated(event: OrderCreatedEvent) {
  for (const item of event.order.items) {
    await this.stockManagementService.reserveStock(...);
  }
}
```

**Pros**:
- Complete decoupling between domains
- Supports async processing
- Event sourcing ready

**Cons**:
- Increased complexity
- Eventually consistent (not immediate)
- Requires robust error handling

**Recommendation**: Current synchronous approach is appropriate for in-memory implementation. Consider events when moving to persistent storage.

## Commit Message

```
refactor: Product 도메인 재고 관리 리팩터링 및 도메인 경계 명확화 (Issue #014)

재고 관리 책임을 Order 도메인에서 Product 도메인으로 이동하여 도메인 경계를 명확히 했습니다.

주요 변경사항:
- Repository 토큰을 Symbol로 통일 (User 도메인)
- StockManagementService를 Product 도메인에 신규 생성
- Order 도메인 서비스 2개 제거 (StockReservationService, CartStockValidationService)
- 모든 재고 관련 로직을 Product 도메인 서비스로 통합
- 영향받는 Use Case, Event Handler, Batch Job 수정
- 모든 테스트 수정 및 검증 (421개 테스트 통과)

도메인 책임 분리:
- Product: 상품 조회 + 재고 관리
- Order: 주문/장바구니/결제 (Product 서비스 사용)

장점:
- 도메인 경계 명확화 및 캡슐화
- 단일 책임 원칙 준수
- 유지보수성 및 테스트 용이성 향상
- 추후 Domain Event 패턴 전환 용이

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Related Issues
- Issue #013: User Domain and Master Token Authentication

## Checklist
- [x] Repository token standardization (User domain)
- [x] Create StockManagementService in Product domain
- [x] Move InsufficientStockException to Product domain
- [x] Export StockManagementService from ProductModule
- [x] Update add-cart-item.use-case.ts
- [x] Update update-cart-item.use-case.ts
- [x] Update create-order.use-case.ts
- [x] Update payment-completed.handler.ts
- [x] Update release-expired-reservation.job.ts
- [x] Remove Order domain services (2 files)
- [x] Update OrderModule configuration
- [x] Update all affected test files
- [x] All tests passing (421/421)
- [x] Documentation complete
