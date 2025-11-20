# Issue #017: Repository Pattern Standardization & Payment/Stock State Management Fix

## Status
- **Branch**: `feature/017`
- **Status**: In Progress
- **Created**: 2025-11-20
- **Priority**: High (Critical state management issue + consistency improvements)

## Overview
This issue addresses critical inconsistencies found in a comprehensive codebase audit:
1. **Critical**: Payment/Stock state management race condition
2. **High**: Repository pattern inconsistencies across Product and Coupon domains
3. **Medium**: Design document alignment issues

## Problems Identified

### 1. Critical: Payment/Stock State Management Race Condition

**Current Flow**:
```
process-payment.use-case.ts:
  1. Payment API called
  2. Payment entity created & saved
  3. order.complete() → status = COMPLETED  ❌
  4. Order saved
  5. PaymentCompletedEvent emitted

payment-completed.handler.ts:
  6. Event received
  7. Stock confirmation (reserved → sold)
  8. Stock saved
```

**Problem**: Order status changes to `COMPLETED` before stock is confirmed. If event handler fails (database error, service crash), we have:
- Order shows `COMPLETED` to customer
- Stock remains `RESERVED` (not converted to `SOLD`)
- **Inconsistent state**

**Design Document Expectation** (`docs/dev/dashboard/payment/sequence-diagrams.md`):
- Order completion should happen in event handler AFTER stock confirmation
- Both operations should be in same transaction boundary

**Solution (Option A - Event-Driven)**:
```
process-payment.use-case.ts:
  1. Payment API called
  2. Payment entity created & saved
  3. PaymentCompletedEvent emitted (order still PENDING) ✅

payment-completed.handler.ts:
  4. Event received
  5. Stock confirmation loop (reserved → sold) ✅
  6. Stock saved
  7. order.complete() → status = COMPLETED ✅
  8. Order saved
```

This ensures order only becomes `COMPLETED` after all stock is successfully confirmed.

### 2. Repository Pattern Inconsistencies

#### Current State by Domain

| Domain | Interface Name | Token Type | Token Location | Status |
|--------|---------------|------------|----------------|---------|
| Order | `OrderRepository` | Symbol | `tokens.ts` | ✅ Correct |
| Order | `PaymentRepository` | Symbol | `tokens.ts` | ✅ Correct |
| Order | `CartRepository` | Symbol | `tokens.ts` | ✅ Correct |
| User | `UserRepository` | Symbol | `tokens.ts` | ✅ Correct |
| **Product** | `IProductRepository` ❌ | Symbol | inline ⚠️ | ❌ Needs fix |
| **Coupon** | `CouponRepository` | **String** ❌ | none ❌ | ❌ Needs fix |
| **Coupon** | `UserCouponRepository` | **String** ❌ | none ❌ | ❌ Needs fix |

#### Product Domain Issues
- Uses `IProductRepository` with "I" prefix (inconsistent with other domains)
- Token `PRODUCT_REPOSITORY` defined inline in repository file (should be in `tokens.ts`)

**Files Affected**:
- `src/product/domain/repositories/product.repository.ts` (interface + token)
- `src/product/product.module.ts` (provider)
- `src/product/application/use-cases/*.ts` (2 files)
- `src/product/domain/services/stock-management.service.ts`
- `src/product/infrastructure/repositories/in-memory-product.repository.ts`
- Test files (~5 files)

#### Coupon Domain Issues
- Uses string literals `'CouponRepository'` and `'UserCouponRepository'` instead of Symbols
- No `tokens.ts` file exists
- Less type-safe, prone to typos

**Files Affected**:
- `src/coupon/coupon.module.ts` (providers use strings)
- `src/coupon/application/use-cases/*.ts` (6+ files with `@Inject('CouponRepository')`)
- Test files

**Standard Pattern** (from Order/User domains):
```typescript
// domain/repositories/tokens.ts
export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');

// domain/repositories/order.repository.ts
export interface OrderRepository { ... }  // No "I" prefix

// module.ts
import { OrderRepository } from './domain/repositories/order.repository';
import { ORDER_REPOSITORY } from './domain/repositories/tokens';

@Module({
  providers: [
    {
      provide: ORDER_REPOSITORY,
      useClass: InMemoryOrderRepository,
    },
  ],
})

// use-case.ts
import { OrderRepository } from '@/order/domain/repositories/order.repository';
import { ORDER_REPOSITORY } from '@/order/domain/repositories/tokens';

constructor(
  @Inject(ORDER_REPOSITORY)
  private readonly orderRepository: OrderRepository,
) {}
```

## Objectives

### Primary Objectives
1. ✅ Fix payment/stock state management to prevent race condition
2. ✅ Standardize Product domain repository pattern
3. ✅ Standardize Coupon domain repository pattern
4. ✅ Align implementation with design documents

### Success Criteria
- [ ] Order status only changes to `COMPLETED` after stock is confirmed
- [ ] Product domain uses `ProductRepository` interface (no "I" prefix)
- [ ] Product domain has `tokens.ts` file with Symbol token
- [ ] Coupon domain has `tokens.ts` file with Symbol tokens
- [ ] Coupon domain uses Symbol tokens instead of strings
- [ ] All imports updated across affected files
- [ ] All tests passing
- [ ] No type errors

## Implementation Plan

### Phase 1: Product Repository Standardization

#### 1.1 Create Token File
**New File**: `src/product/domain/repositories/tokens.ts`
```typescript
/**
 * Injection Tokens for Product Domain Repositories
 */

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');
```

#### 1.2 Update Repository Interface
**File**: `src/product/domain/repositories/product.repository.ts`

**Changes**:
- Remove inline token definition
- Rename `IProductRepository` → `ProductRepository`

#### 1.3 Update Product Module
**File**: `src/product/product.module.ts`

**Changes**:
- Import token from `tokens.ts`
- Update type references

#### 1.4 Update Product Use Cases
**Files**:
- `src/product/application/use-cases/get-products.use-case.ts`
- `src/product/application/use-cases/get-product-detail.use-case.ts`

**Changes**:
- Import `ProductRepository` from repository file
- Import `PRODUCT_REPOSITORY` from tokens file
- Update type annotations

#### 1.5 Update Product Services
**File**: `src/product/domain/services/stock-management.service.ts`

**Changes**: Same as use cases

#### 1.6 Update Product Infrastructure
**File**: `src/product/infrastructure/repositories/in-memory-product.repository.ts`

**Changes**: Update implements clause

#### 1.7 Update Product Tests
**Files**: All `*.spec.ts` files in product domain

**Changes**: Update imports and type references

### Phase 2: Coupon Repository Standardization

#### 2.1 Create Token File
**New File**: `src/coupon/domain/repositories/tokens.ts`
```typescript
/**
 * Injection Tokens for Coupon Domain Repositories
 */

export const COUPON_REPOSITORY = Symbol('COUPON_REPOSITORY');
export const USER_COUPON_REPOSITORY = Symbol('USER_COUPON_REPOSITORY');
```

#### 2.2 Update Coupon Module
**File**: `src/coupon/coupon.module.ts`

**Changes**:
- Import tokens from `tokens.ts`
- Replace string literals with Symbol tokens in providers

**Before**:
```typescript
{
  provide: 'CouponRepository',
  useClass: InMemoryCouponRepository,
}
```

**After**:
```typescript
{
  provide: COUPON_REPOSITORY,
  useClass: InMemoryCouponRepository,
}
```

#### 2.3 Update Coupon Use Cases
**Files** (6+ files):
- `src/coupon/application/use-cases/create-coupon.use-case.ts`
- `src/coupon/application/use-cases/issue-coupon.use-case.ts`
- `src/coupon/application/use-cases/get-user-coupons.use-case.ts`
- `src/coupon/application/use-cases/get-available-coupons.use-case.ts`
- And potentially more...

**Changes**:
- Import tokens from `tokens.ts`
- Replace `@Inject('CouponRepository')` with `@Inject(COUPON_REPOSITORY)`
- Replace `@Inject('UserCouponRepository')` with `@Inject(USER_COUPON_REPOSITORY)`

#### 2.4 Update Coupon Tests
**Files**: All `*.spec.ts` files in coupon domain

**Changes**: Update mock providers to use Symbol tokens

### Phase 3: Fix Payment/Stock State Management

#### 3.1 Modify Payment Processing Use Case
**File**: `src/order/application/use-cases/process-payment.use-case.ts`

**Current Code** (lines ~114-116):
```typescript
// 9. Order 상태 변경 (COMPLETED)
order.complete();
await this.orderRepository.save(order);
```

**New Code**:
```typescript
// 9. Order는 event handler에서 완료 처리
// Payment 성공했지만 재고 확정 전이므로 PENDING 유지
// await this.orderRepository.save(order); // 제거 - 불필요한 저장
```

**Rationale**: Order status should only change after stock is confirmed. Event handler will handle order completion.

#### 3.2 Modify Payment Completed Event Handler
**File**: `src/order/application/event-handlers/payment-completed.handler.ts`

**Current Code** (approximate):
```typescript
async handle(event: PaymentCompletedEvent): Promise<void> {
  const order = await this.orderRepository.findById(event.orderId);

  // Stock confirmation loop
  for (const orderItem of order.items) {
    await this.stockManagementService.confirmSale(
      orderItem.productId,
      orderItem.productOptionId,
      orderItem.quantity,
    );
  }
}
```

**New Code**:
```typescript
async handle(event: PaymentCompletedEvent): Promise<void> {
  // TODO: Production에서는 FOR UPDATE로 Order 조회 필요
  const order = await this.orderRepository.findById(event.orderId);

  if (!order) {
    throw new OrderNotFoundException(event.orderId);
  }

  // Stock confirmation loop
  for (const orderItem of order.items) {
    await this.stockManagementService.confirmSale(
      orderItem.productId,
      orderItem.productOptionId,
      orderItem.quantity,
    );
  }

  // 모든 재고 확정 후 Order 완료 처리
  order.complete();
  await this.orderRepository.save(order);
}
```

**Rationale**: Order completion happens AFTER all stock is confirmed, preventing inconsistent state.

#### 3.3 Update Related Tests
**Files**:
- `src/order/application/use-cases/process-payment.use-case.spec.ts`
- `src/order/application/event-handlers/payment-completed.handler.spec.ts`

**Changes**:
- Update expectations: Order should remain `PENDING` after payment processing
- Update event handler tests: Order should be `COMPLETED` after handler execution
- Fix any broken assertions

### Phase 4: Testing & Verification

#### 4.1 Run All Tests
```bash
pnpm test
```

#### 4.2 Verify Repository Injection
- Check that all Symbol tokens work correctly
- No runtime injection errors

#### 4.3 Verify Payment Flow
- Mock test: Payment success → Event emitted → Order stays PENDING
- Mock test: Event handler → Stock confirmed → Order becomes COMPLETED
- Mock test: Event handler failure → Order remains PENDING (stock may be partially confirmed, needs investigation)

#### 4.4 Check Type Safety
```bash
pnpm run build
```

No TypeScript errors should occur.

## Technical Considerations

### Transaction Boundaries (Future Work)
Current in-memory implementation doesn't support transactions. When moving to persistent storage (PostgreSQL + Prisma):

1. **Payment Processing** should wrap in transaction:
   - Payment entity save
   - Event emission (or use outbox pattern)

2. **Event Handler** should wrap in transaction:
   - Stock confirmations (all items)
   - Order completion
   - If any step fails, rollback all changes

### Idempotency (Future Work)
Event handler should be idempotent:
- Check if order is already COMPLETED before processing
- Handle duplicate events gracefully

### Error Scenarios to Consider
1. **Payment succeeds but event handler fails**: Order stays PENDING, stock stays RESERVED
   - Requires manual intervention or retry mechanism
   - Better than showing COMPLETED when stock not confirmed

2. **Partial stock confirmation failure**: Some items confirmed, some fail
   - Current implementation: throws exception, no rollback (in-memory)
   - Future: wrap in transaction for atomic operation

3. **Event handler processes twice**: Idempotency check prevents issues

## Files Changed

### New Files
- [ ] `docs/issue/issue017.md` (this file)
- [ ] `src/product/domain/repositories/tokens.ts`
- [ ] `src/coupon/domain/repositories/tokens.ts`

### Modified Files - Product Domain
- [ ] `src/product/domain/repositories/product.repository.ts`
- [ ] `src/product/product.module.ts`
- [ ] `src/product/application/use-cases/get-products.use-case.ts`
- [ ] `src/product/application/use-cases/get-product-detail.use-case.ts`
- [ ] `src/product/domain/services/stock-management.service.ts`
- [ ] `src/product/infrastructure/repositories/in-memory-product.repository.ts`
- [ ] `test/product/domain/repositories/in-memory-product.repository.spec.ts`
- [ ] `test/product/domain/services/stock-management.service.spec.ts`
- [ ] `test/product/application/use-cases/get-products.use-case.spec.ts`
- [ ] `test/product/application/use-cases/get-product-detail.use-case.spec.ts`
- [ ] `test/product/infrastructure/repositories/in-memory-product.repository.spec.ts`

### Modified Files - Coupon Domain
- [ ] `src/coupon/coupon.module.ts`
- [ ] `src/coupon/application/use-cases/create-coupon.use-case.ts`
- [ ] `src/coupon/application/use-cases/issue-coupon.use-case.ts`
- [ ] `src/coupon/application/use-cases/get-user-coupons.use-case.ts`
- [ ] `src/coupon/application/use-cases/get-available-coupons.use-case.ts`
- [ ] (Additional use-case files as discovered)
- [ ] (Test files in coupon domain)

### Modified Files - Order Domain (Payment/Stock State Management)
- [ ] `src/order/application/use-cases/process-payment.use-case.ts`
- [ ] `src/order/application/event-handlers/payment-completed.handler.ts`
- [ ] `test/order/application/use-cases/process-payment.use-case.spec.ts`
- [ ] `test/order/application/event-handlers/payment-completed.handler.spec.ts`

## Related Issues
- Issue #014: Product 도메인 재고 관리 리팩터링 (established Stock entity encapsulation)
- Issue #016: Test failures (may be resolved by state management fix)

## References
- Design Doc: `docs/dev/dashboard/payment/sequence-diagrams.md` (lines 537-629)
- Design Doc: `docs/dev/dashboard/order/sequence-diagrams.md`
- Project Guidelines: `CLAUDE.md` (Repository Pattern section to be added)

## Notes
- This issue combines critical bug fix (payment/stock race condition) with technical debt cleanup (repository patterns)
- Priority given to state management fix due to data consistency risks
- Repository standardization improves code maintainability and type safety
- All changes are backwards compatible (no breaking API changes)
