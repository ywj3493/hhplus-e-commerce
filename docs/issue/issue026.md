# Issue 026: Payment-Stock-Order Facade Compensation Transaction Implementation

**Status**: In Progress
**Priority**: Medium
**Related Branch**: `feature/026`
**Reference**: `/docs/reports/step08/concurrency-control-review.md`

## Problem Statement

The `OrderFacade.completeOrder()` process currently executes three sequential steps:
1. Payment Processing
2. Stock Confirmation (reserved → sold)
3. Order Completion (PENDING → COMPLETED)

**Current Issue**: No rollback mechanism exists for intermediate step failures, leading to potential data inconsistencies:
- **Scenario 1**: Payment succeeds → Stock confirmation fails → Payment remains processed, stock stays reserved
- **Scenario 2**: Payment succeeds → Stock succeeds → Order completion fails → Payment processed, stock sold, but order still PENDING

## Objective

Implement compensation transaction logic in `OrderFacade.completeOrder()` to handle failures at each step with proper rollback mechanisms.

## Requirements

### 1. Payment Refund Capability
- Add `refund()` method to Payment domain layer
  - `PaymentRepository.refund(paymentId: string): Promise<void>`
  - `PaymentPort.refund(transactionId: string): Promise<void>`
- Implement in infrastructure layer
  - `PaymentPrismaRepository.refund()`
  - `FakePaymentAdapter.refund()`
- Update Payment entity status if needed (e.g., add REFUNDED status)

### 2. Compensation Transaction Logic
Implement try-catch pattern in `OrderFacade.completeOrder()`:

```typescript
Step 1: Process Payment (Critical Point)
├─ If fails → Throw error (no compensation needed, nothing to rollback)

Step 2: Confirm Stock
├─ If fails → Compensate: Refund Payment
└─ Throw error

Step 3: Complete Order
├─ If fails → Compensate: Release Stock + Refund Payment
└─ Throw error
```

### 3. State Tracking
Track completion status for each step:
- `paymentCompleted: boolean`
- `stockConfirmed: boolean`

### 4. Logging
- Log each step start/completion
- Log compensation actions
- Log compensation failures (critical alert)

### 5. Testing
Integration tests for failure scenarios:
- Payment succeeds + Stock confirmation fails → Verify payment refunded
- Payment succeeds + Stock succeeds + Order completion fails → Verify stock released AND payment refunded
- Verify compensation failure handling and logging

## Implementation Approach

### Phase 1: Payment Refund Infrastructure
1. Define `refund()` in Payment domain interfaces
2. Implement in Prisma repository (update payment status)
3. Implement in Fake Payment Adapter (simulate refund)
4. Write unit tests for refund logic

### Phase 2: Facade Compensation Logic
1. Wrap `completeOrder()` in try-catch block
2. Track step completion status
3. Implement compensation in reverse order on failure
4. Add comprehensive logging
5. Ensure existing functionality remains intact

### Phase 3: Integration Testing
1. Test normal flow (no failures)
2. Test stock confirmation failure scenario
3. Test order completion failure scenario
4. Test compensation failure scenarios
5. Verify logging output

## Files to Modify

### Domain Layer
- `src/order/domain/repositories/payment.repository.ts` - Add refund method
- `src/order/domain/ports/payment.port.ts` - Add refund method
- `src/order/domain/entities/payment.entity.ts` - Add refund status (if needed)

### Infrastructure Layer
- `src/order/infrastructure/repositories/payment-prisma.repository.ts` - Implement refund
- `src/order/infrastructure/gateways/fake-payment.adapter.ts` - Implement refund

### Application Layer
- `src/order/application/facades/order.facade.ts` - Add compensation transaction logic

### Test Files
- New integration test file for compensation scenarios
- Update existing facade tests

## Out of Scope

The following are explicitly **NOT** included in this issue (for future issues):
- ❌ Saga Orchestration Pattern (full saga with coordinator)
- ❌ Outbox Pattern for event-based compensation
- ❌ Idempotency Key mechanism for retry safety
- ❌ Intermediate order states (PAYMENT_COMPLETED, STOCK_CONFIRMED, etc.)
- ❌ Distributed transaction management

This issue focuses on **simple try-catch based compensation** only.

## Success Criteria

- [ ] Payment refund methods implemented in domain and infrastructure layers
- [ ] OrderFacade.completeOrder() has proper try-catch compensation logic
- [ ] All compensation scenarios are covered with integration tests
- [ ] All existing tests continue to pass
- [ ] Proper logging is in place for debugging
- [ ] Documentation updated in code comments

## Risk Assessment

**Low Risk**:
- Adding new methods to existing interfaces (backward compatible)
- Try-catch wrapper doesn't change happy path logic
- Stock release method already exists and tested

**Medium Risk**:
- Payment refund implementation needs careful testing
- Compensation failure handling (what if compensation itself fails?)

**Mitigation**:
- Comprehensive integration tests
- Detailed logging for compensation failures
- Manual testing of edge cases

## References

- [Concurrency Control Review Report](/docs/reports/step08/concurrency-control-review.md) - Lines 118-144
- [Existing Stock Release Logic](/src/product/domain/services/stock-management.service.ts) - Lines 71-97
- [Existing Order Cancellation Pattern](/src/order/application/jobs/release-expired-reservation.job.ts)

## Timeline

1. **Phase 1**: Payment Refund Infrastructure (~40% effort)
2. **Phase 2**: Facade Compensation Logic (~30% effort)
3. **Phase 3**: Integration Testing (~30% effort)

---

**Created**: 2025-01-21
**Last Updated**: 2025-01-21
