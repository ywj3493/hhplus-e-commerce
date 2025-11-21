# Issue #025: Change Stock Reservation Concurrency Control from Pessimistic to Optimistic Locking

**Status**: In Progress
**Priority**: High
**Labels**: refactoring, performance, concurrency
**Created**: 2025-11-21
**Branch**: feature/025

## Problem Statement

The current stock reservation system uses pessimistic locking (`SELECT FOR UPDATE`) to ensure data consistency. While this guarantees 100% accuracy and prevents overselling, it creates unnecessary bottlenecks when inventory is sufficient.

### Current Issues

1. **Sequential Processing Bottleneck**
   - All concurrent purchase attempts wait in queue even when stock is abundant
   - User 1: 100ms, User 2: 200ms, User 3: 300ms... User 100: 10 seconds
   - Multi-item orders accumulate delays across all items

2. **Poor User Experience with Soft Reservations**
   - Stock reservations are temporary (10 minutes expiration)
   - Failed purchases might succeed if retried after reservation expiration
   - Hard failure ("out of stock") feels too harsh for soft locks

3. **Mismatch with Business Model**
   - Reserved stock auto-releases after 10 minutes (ReleaseExpiredReservationJob runs every 1 minute)
   - Actual available stock fluctuates as reservations expire
   - Pessimistic lock treats temporary reservations like permanent locks

## Analysis

### Current Implementation (Pessimistic Locking)

**Location**: [product-prisma.repository.ts](../src/product/infrastructure/repositories/product-prisma.repository.ts)

```typescript
async reserveStock(stockId: string, quantity: number): Promise<void> {
  await this.prisma.$transaction(async (tx) => {
    // SELECT FOR UPDATE - blocks all concurrent access
    const stockModel = await tx.$queryRaw<Array<Stock>>`
      SELECT * FROM stocks WHERE id = ${stockId} FOR UPDATE
    `;

    // Stock validation
    if (stock.availableQuantity < quantity) {
      throw new Error('Insufficient stock');
    }

    // Update stock
    await tx.stock.update({
      where: { id: stockId },
      data: {
        availableQuantity: stock.availableQuantity - quantity,
        reservedQuantity: stock.reservedQuantity + quantity,
      }
    });
  });
}
```

**Characteristics**:
- ✅ 100% data consistency
- ✅ Prevents overselling
- ❌ Sequential processing (lock queue)
- ❌ Unnecessary waits even with sufficient stock
- ❌ Response time degrades linearly with concurrent users

### Stock Reservation Flow

```
1. Order Creation:
   available: 100, reserved: 0
   → User reserves 10 items
   → available: 90, reserved: 10

2. Payment Completion:
   available: 90, reserved: 10, sold: 0
   → Payment succeeds
   → available: 90, reserved: 0, sold: 10

3. Reservation Expiration (10 minutes later):
   available: 90, reserved: 10
   → Auto-release by ReleaseExpiredReservationJob
   → available: 100, reserved: 0
```

**Key Insight**: Stock reservations are **soft locks** that auto-release, not permanent inventory reduction.

### Pessimistic vs Optimistic Locking Comparison

| Aspect | Pessimistic Lock (Current) | Optimistic Lock (Proposed) |
|--------|---------------------------|---------------------------|
| **Consistency** | 100% guaranteed | 99.9%+ in normal scenarios |
| **Throughput** | Sequential (low) | Parallel (high) |
| **Response Time** | Linear degradation | Constant (with retry) |
| **User Experience** | Hard failure, no retry | Auto-retry, better success rate |
| **Conflict Scenario** | Always waits | Only retries on actual conflict |
| **Best For** | Limited stock, flash sales | Normal products, sufficient stock |

### Performance Impact Analysis

**Scenario 1: Normal Product (100 stock, 10 concurrent users)**
- Pessimistic: 10 sequential operations, total ~1 second
- Optimistic: 10 parallel operations, total ~100ms (10x faster)

**Scenario 2: Limited Stock (10 stock, 100 concurrent users)**
- Pessimistic: 10 succeed immediately, 90 fail after waiting
- Optimistic: 10 succeed after 1-2 retries, 90 fail quickly with retry attempts

**Scenario 3: Flash Sale (100 stock, 1000 concurrent users)**
- Pessimistic: 100 succeed, 900 wait then fail (poor but predictable)
- Optimistic: 100 succeed after retries, 900 fail after 3 retry attempts (similar outcome, better for winners)

**Conclusion**: Optimistic locking provides better performance for the majority case (normal products with sufficient stock) while maintaining acceptable behavior for high-contention scenarios.

## Proposed Solution

### Option A: Full Optimistic Locking (Recommended ✅)

**Rationale**:
1. E-commerce platforms normally have sufficient stock
2. Even for limited editions, "first to pay wins" is the fair model
3. Lower implementation complexity
4. Consistent strategy across all products

**Implementation**:

```typescript
// 1. Add version field to Stock Entity
class Stock {
  private _version: number = 0;

  reserve(quantity: number): void {
    if (quantity > this._availableQuantity) {
      throw new InsufficientStockException();
    }
    this._availableQuantity -= quantity;
    this._reservedQuantity += quantity;
    this._version++; // Increment version
  }
}

// 2. Repository with optimistic lock
async reserveStock(stock: Stock): Promise<void> {
  const result = await this.prisma.stock.updateMany({
    where: {
      id: stock.id,
      version: stock.version, // Optimistic lock condition
      availableQuantity: { gte: quantity }
    },
    data: {
      availableQuantity: stock.availableQuantity,
      reservedQuantity: stock.reservedQuantity,
      version: { increment: 1 }
    }
  });

  if (result.count === 0) {
    throw new OptimisticLockException('Stock has been modified');
  }
}

// 3. Retry logic in Use Case
async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Reserve stock for all items
      for (const cartItem of cartItems) {
        await this.stockManagementService.reserveStock(
          cartItem.productId,
          cartItem.productOptionId,
          cartItem.quantity
        );
      }

      // Create order
      return await this.createOrder(cartItems);

    } catch (error) {
      if (error instanceof OptimisticLockException && attempt < maxRetries - 1) {
        // Exponential backoff: 50ms, 100ms, 200ms
        await this.sleep(50 * Math.pow(2, attempt));
        continue;
      }
      throw error; // Final failure
    }
  }
}
```

**Retry Configuration**:
- Maximum retries: 3 attempts
- Base delay: 50ms
- Backoff multiplier: 2x (exponential)
- Retry intervals: 50ms → 100ms → 200ms
- Total max delay: ~350ms (acceptable for user experience)

### Option B: Hybrid Approach (Not Recommended)

**Concept**: Use pessimistic lock for limited products, optimistic for normal products

**Why Not**:
- Increased implementation complexity
- Double testing scenarios
- Unclear boundaries (when is stock "limited"?)
- Over-engineering for uncertain edge cases

## Implementation Plan

### Phase 1: Schema and Domain Changes

1. **Update Prisma Schema**
   ```prisma
   model Stock {
     // ... existing fields
     version Int @default(0)
   }
   ```

2. **Create Migration**
   ```bash
   pnpm prisma migrate dev --name add_stock_version_for_optimistic_lock
   ```

3. **Add Exception Class**
   ```typescript
   // src/product/domain/exceptions/optimistic-lock.exception.ts
   export class OptimisticLockException extends DomainException {
     constructor(message = 'Resource has been modified by another transaction') {
       super(message);
     }
   }
   ```

4. **Update Stock Entity**
   - Add `_version: number` field
   - Include version in domain invariants
   - Increment version on state changes

### Phase 2: Repository Implementation

1. **Modify ProductPrismaRepository**
   - Remove `SELECT FOR UPDATE` query
   - Implement version-based `updateMany()`
   - Throw `OptimisticLockException` when update count is 0

2. **Update fromModel/toModel Methods**
   - Include version field in mapping

### Phase 3: Application Layer Retry Logic

1. **Update CreateOrderUseCase**
   - Add retry loop with exponential backoff
   - Catch `OptimisticLockException` specifically
   - Log retry attempts for monitoring

2. **Add Retry Configuration**
   - Extract retry config as constants
   - Make configurable via environment variables if needed

### Phase 4: Testing

1. **Update Existing Tests**
   - Modify integration tests to expect version field
   - Update concurrency test expectations

2. **Add New Test Cases**
   - Optimistic lock conflict scenario
   - Retry logic validation
   - Multi-item order with partial conflicts
   - Performance comparison test

## Migration Strategy

### Database Migration

```sql
-- Migration: add_stock_version_for_optimistic_lock
ALTER TABLE stocks ADD COLUMN version INT NOT NULL DEFAULT 0;
```

**Impact**: Non-breaking, default value allows existing data to work immediately.

### Rollback Plan

If issues arise:
1. Revert code changes to use `SELECT FOR UPDATE`
2. Keep `version` column for future use (no need to drop)
3. Monitor for any regression in overselling

## Testing Strategy

### Unit Tests

```typescript
describe('Stock Entity', () => {
  it('버전을 증가시키며 재고를 예약해야 함', () => {
    // Given
    const stock = Stock.create({ availableQuantity: 100, version: 0 });

    // When
    stock.reserve(10);

    // Then
    expect(stock.version).toBe(1);
    expect(stock.availableQuantity).toBe(90);
  });
});
```

### Integration Tests

```typescript
describe('ProductPrismaRepository', () => {
  it('낙관락 충돌 시 OptimisticLockException을 발생시켜야 함', async () => {
    // Given
    const stock = await repository.findById(stockId);

    // When: 동시에 두 번 업데이트 시도
    await repository.reserveStock(stock.id, 10);

    // Then: 두 번째 시도는 실패
    await expect(
      repository.reserveStock(stock.id, 10)
    ).rejects.toThrow(OptimisticLockException);
  });
});
```

### Concurrency Tests

```typescript
it('100개 동시 요청 처리 시 재고 정합성을 유지해야 함', async () => {
  // Given
  const initialStock = 100;

  // When: 100 concurrent requests
  const promises = Array(100).fill(null).map(() =>
    createOrder(cartWithOneItem)
  );

  const results = await Promise.allSettled(promises);

  // Then: Success + Failure = Total
  const successCount = results.filter(r => r.status === 'fulfilled').length;
  const finalStock = await getStock(stockId);

  expect(finalStock.reservedQuantity).toBe(successCount);
  expect(finalStock.availableQuantity + finalStock.reservedQuantity).toBe(initialStock);
});
```

## Expected Outcomes

### Performance Improvements

1. **Average Response Time**
   - Before: 100ms + (n * 50ms) where n = queue position
   - After: 100ms + (retry_count * 50ms) ≈ constant time

2. **Throughput**
   - Before: ~20 orders/second (sequential)
   - After: ~200 orders/second (parallel, estimated)

3. **User Experience**
   - Fewer "out of stock" failures due to retry mechanism
   - Faster order completion in normal scenarios

### Monitoring Metrics

Post-deployment, track:
- Optimistic lock conflict rate
- Average retry count per order
- Order creation success rate
- P50/P95/P99 response times

## Business Requirements Validation

- ✅ **BR-ORDER-02**: Stock reservation still mandatory for order creation
- ✅ **BR-ORDER-15**: No impact on reservation expiration (10 minutes)
- ✅ **BR-ORDER-16**: Expired reservations still auto-released every 1 minute
- ✅ **BR-PROD-XX**: No overselling (maintained by atomic updateMany with version check)

## Related Issues

- Issue #020: Concurrency Control Implementation (original pessimistic lock)
- Issue #023: Payment Gateway Refactoring (uses similar transactional patterns)

## References

- Martin Fowler: [Optimistic Offline Lock](https://martinfowler.com/eaaCatalog/optimisticOfflineLock.html)
- Prisma Docs: [Optimistic Concurrency Control](https://www.prisma.io/docs/guides/performance-and-optimization/prisma-client-transactions-guide#optimistic-concurrency-control)
- Analysis Report: [step08/concurrency-control-review.md](../reports/step08/concurrency-control-review.md)

## Acceptance Criteria

- [ ] Stock entity has version field
- [ ] Prisma schema updated with version column
- [ ] Migration applied successfully
- [ ] OptimisticLockException implemented
- [ ] Repository uses version-based updateMany()
- [ ] CreateOrderUseCase has retry logic (max 3 attempts)
- [ ] All existing tests pass
- [ ] New concurrency tests added and passing
- [ ] No overselling in 100 concurrent requests test
- [ ] Performance improvement measurable

---

**Assignee**: Claude
**Estimated Effort**: 4-6 hours
**Target Branch**: `feature/025`
