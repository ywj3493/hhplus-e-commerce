# Issue 030: Distributed Lock Extension and Transaction Verification

**Status**: In Progress
**Priority**: Medium
**Created**: 2025-11-28
**Branch**: `step11`

## Overview

This issue extends the distributed lock implementation from Issue #028 to additional modules and verifies the lock-transaction ordering guarantee.

### Goals

1. Apply distributed lock pattern to Coupon and Order modules
2. Refactor stock management into dedicated Use Cases
3. Verify that locks are released only after transaction completion
4. Add DEBUG logging for lock lifecycle monitoring

## Changes Summary

### 1. Coupon Module

**File**: `src/coupon/application/use-cases/issue-coupon.use-case.ts`

Applied `lockService.withLockExtended()` pattern for concurrent coupon issuance:

```typescript
async execute(input: IssueCouponInput): Promise<IssueCouponOutput> {
  const lockKey = `coupon:issue:${input.couponId}`;

  return await this.lockService.withLockExtended(
    lockKey,
    async () => {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Find coupon with pessimistic lock (FOR UPDATE)
        const coupon = await this.couponRepository.findByIdForUpdate(
          input.couponId,
          tx,
        );

        // 2. Check duplicate issuance
        const alreadyIssued = await this.userCouponRepository
          .existsByUserIdAndCouponId(input.userId, input.couponId, tx);

        // 3. Issue coupon (domain logic)
        const userCoupon = this.couponService.issueCoupon(coupon, input.userId);

        // 4. Persist changes
        await this.couponRepository.save(coupon, tx);
        await this.userCouponRepository.save(userCoupon, tx);

        return new IssueCouponOutput(userCoupon.id);
      });
    },
    { waitTimeoutMs: 5000, autoExtend: true },
  );
}
```

### 2. Order Module

**File**: `src/order/application/facades/order.facade.ts`

Structured Saga pattern with compensation transactions:

```typescript
async completeOrder(input: CompleteOrderInput): Promise<CompleteOrderOutput> {
  // Phase 1: Create order with stock reservation
  const createOrderOutput = await this.createOrderUseCase.execute(...);

  try {
    // Phase 2: Process payment
    const payment = await this.processPaymentUseCase.execute(...);

    // Phase 3: Confirm stock (reserved → sold)
    await this.confirmStockUseCase.execute(...);

    return new CompleteOrderOutput(order, payment);
  } catch (error) {
    // Compensation: Release reserved stock on failure
    await this.releaseStockForItems(createOrderOutput.order.items);
    throw error;
  }
}
```

**File**: `src/order/application/use-cases/create-order.use-case.ts`

Calls `ReserveStockUseCase` for each cart item with built-in compensation:

```typescript
for (const item of cartItems) {
  try {
    await this.reserveStockUseCase.execute({
      productId: item.productId,
      optionId: item.optionId,
      quantity: item.quantity,
    });
    reservedItems.push(item);
  } catch (error) {
    // Compensation: Release already reserved items
    for (const reserved of reservedItems) {
      await this.releaseStockUseCase.execute(...);
    }
    throw error;
  }
}
```

**Files**: `add-cart-item.use-case.ts`, `update-cart-item.use-case.ts`

Use `ValidateStockUseCase` for read-only stock validation (no locks needed).

### 3. Product Module - New Use Cases

Four new Use Cases created for clear separation of concerns:

#### ReserveStockUseCase

**File**: `src/product/application/use-cases/reserve-stock.use-case.ts`

```typescript
@Injectable()
export class ReserveStockUseCase {
  async execute(input: ReserveStockInput): Promise<void> {
    const lockKey = `stock:${input.productId}:${input.optionId}`;

    await this.lockService.withLockExtended(
      lockKey,
      async () => {
        await this.prisma.$transaction(async (tx) => {
          const product = await this.productRepository.findByIdForUpdate(
            input.productId,
            tx,
          );
          this.stockManagementService.reserveStock(
            product,
            input.optionId,
            input.quantity,
          );
          await this.productRepository.saveWithTx(product, tx);
        });
      },
      { waitTimeoutMs: 5000, autoExtend: true },
    );
  }
}
```

#### ConfirmSaleUseCase

**File**: `src/product/application/use-cases/confirm-sale.use-case.ts`

Converts reserved stock to sold after successful payment.

#### ReleaseStockUseCase

**File**: `src/product/application/use-cases/release-stock.use-case.ts`

Releases reserved stock on order cancellation. Errors are logged but not propagated (non-critical).

#### ValidateStockUseCase

**File**: `src/product/application/use-cases/validate-stock.use-case.ts`

Read-only validation for shopping cart operations (no locks required).

## Architecture

### Lock-Transaction Flow

```
┌─────────────────────────────────────────────────────────┐
│                 withLockExtended() Flow                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Acquire Lock (Redlock)                               │
│     └─ Fail: Pub/Sub wait or throw exception             │
│                                                          │
│  2. try {                                                │
│       Start autoExtend timer (TTL/2 interval)           │
│       └─ Execute callback                                │
│           └─ prisma.$transaction()                       │
│               └─ SELECT FOR UPDATE (pessimistic lock)    │
│               └─ Business logic                          │
│               └─ Commit/Rollback                         │
│     }                                                    │
│                                                          │
│  3. finally {  ← Always executes                         │
│       Clear timer                                        │
│       Release lock + Pub/Sub notify                      │
│     }                                                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Three-Layer Concurrency Control

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Distributed Lock (Redis)                       │
│ - Multi-instance coordination                           │
│ - Lock key: stock:{productId}:{optionId}               │
│ - TTL: 30s with auto-extension                          │
├─────────────────────────────────────────────────────────┤
│ Layer 2: Pessimistic Lock (SELECT FOR UPDATE)           │
│ - Single-instance DB-level locking                      │
│ - Prevents concurrent reads of same row                 │
├─────────────────────────────────────────────────────────┤
│ Layer 3: Transaction (Prisma)                           │
│ - ACID guarantees                                       │
│ - Automatic rollback on error                           │
└─────────────────────────────────────────────────────────┘
```

## Safety Guarantees

### 1. Lock Released After Transaction

The `finally` block ensures lock release happens **after** transaction completion:

```typescript
async withLockExtended<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const lockResult = await this.acquireLockExtended(key, options);
  // ...

  try {
    return await fn();  // Transaction executes here
  } finally {
    // Lock released AFTER fn() completes (success or failure)
    await this.releaseLock(key, lockResult.lockId!, lockResult.lock);
  }
}
```

**No compensation transaction needed** - `finally` guarantees cleanup.

### 2. TTL Auto-Extension

With `autoExtend: true`, TTL is extended every `ttlMs/2`:

```typescript
if (autoExtend) {
  extensionTimer = setInterval(async () => {
    await lockResult.lock!.extend(ttlMs);
  }, ttlMs / 2);  // 15s for 30s TTL
}
```

This prevents lock expiration during long-running transactions.

### 3. Double Protection (Distributed + DB Lock)

Even if Redis lock expires in extreme scenarios (network partition):
- DB-level pessimistic lock (`SELECT FOR UPDATE`) still protects data
- Transaction isolation prevents dirty reads

### 4. TTL Expiration Scenario

| Scenario | Behavior |
|----------|----------|
| Normal operation | `autoExtend` prevents expiration |
| Network partition | DB pessimistic lock maintains consistency |
| Redis failure | `RedisConnectionException` thrown, operation fails safely |

## Testing Strategy

### Lock-Transaction Ordering Test

**File**: `test/common/integration/lock-transaction-ordering.integration.spec.ts`

**Test Results**: All 6 tests passed

| Test Scenario | Status |
|---------------|--------|
| 락은 콜백이 완료된 후에만 해제되어야 함 | PASS |
| 락 해제는 콜백 완료 후에 발생해야 함 | PASS |
| 콜백에서 에러가 발생해도 락이 정상적으로 해제되어야 함 | PASS |
| 중첩된 에러가 발생해도 락이 해제되어야 함 | PASS |
| 대기 중인 요청은 콜백 완료 후에만 락을 획득해야 함 | PASS |
| 여러 대기자가 순차적으로 락을 획득해야 함 | PASS |

Two core scenarios verified:

1. **Lock held during transaction**: Second request is blocked while first transaction is running
2. **Lock released after rollback**: Lock is properly released even when transaction fails

## Files Changed

### New Files

- `/docs/issue/issue030.md` - This document
- `src/product/application/use-cases/reserve-stock.use-case.ts`
- `src/product/application/use-cases/confirm-sale.use-case.ts`
- `src/product/application/use-cases/release-stock.use-case.ts`
- `src/product/application/use-cases/validate-stock.use-case.ts`
- `test/common/integration/lock-transaction-ordering.integration.spec.ts`

### Modified Files

- `src/coupon/application/use-cases/issue-coupon.use-case.ts` - Added distributed lock
- `src/coupon/application/use-cases/issue-coupon.use-case.spec.ts` - Updated tests
- `src/order/application/facades/order.facade.ts` - Saga pattern structure
- `src/order/application/use-cases/create-order.use-case.ts` - Use ReserveStockUseCase
- `src/order/application/use-cases/add-cart-item.use-case.ts` - Use ValidateStockUseCase
- `src/order/application/use-cases/update-cart-item.use-case.ts` - Use ValidateStockUseCase
- `src/product/domain/services/stock-management.service.ts` - Pure domain logic
- `src/product/domain/repositories/product.repository.ts` - Added transaction methods
- `src/common/infrastructure/locks/pubsub-distributed-lock.service.ts` - DEBUG logging

## Success Criteria

- [x] Coupon issuance uses distributed lock
- [x] Stock operations use dedicated Use Cases with locks
- [x] Lock-transaction ordering verified by integration tests
- [x] DEBUG logging added for lock lifecycle
- [ ] All existing tests pass (pending full test run)

## Related Issues

- Issue #028: Redis Distributed Lock for Stock Management
- Issue #029: Coupon Issuance Distributed Lock
