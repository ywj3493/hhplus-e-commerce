# Issue 016: Fix Failing PaymentCompletedHandler Tests

## Issue Type
Bug / Test Failure

## Priority
High

## Status
Open

---

## Problem Statement

7 tests in `PaymentCompletedHandler` test suite are failing due to implementation changes introduced in Issue #014 (Product domain stock management refactoring). The tests were not updated to reflect the new handler behavior and service method signatures.

**Test Results:**
- Total Tests: 417
- Passed: 410
- **Failed: 7** (all in PaymentCompletedHandler)
- Test Suites: 43 (1 failed, 42 passed)

**Impact:**
- Test suite is not passing
- False negative test results hide potential regressions
- Tests don't reflect current implementation behavior

---

## Failing Tests

All 7 failures are in:
**File:** `src/order/application/event-handlers/payment-completed.handler.spec.ts`

### List of Failing Tests

1. **Line 101-145:** `"이벤트 수신 시 로그를 기록해야 함"`
   - Missing `orderRepository.findById()` mock

2. **Line 147-162:** `"재고 확정 완료 시 성공 로그를 기록해야 함"`
   - Missing `orderRepository.findById()` mock

3. **Line 179-195:** `"재고가 부족한 경우 예외를 전파해야 함"`
   - Wrong `confirmSale()` signature: expects `(orderId)`, but implementation uses `(productId, optionId, quantity)`

4. **Line 197-212:** `"주문을 찾을 수 없는 경우 예외를 전파해야 함"`
   - Missing `orderRepository.findById()` mock
   - Wrong `confirmSale()` signature

5. **Line 216-245:** `"여러 이벤트를 순차적으로 처리할 수 있어야 함"`
   - Missing `orderRepository.findById()` mock for all 3 events
   - Wrong `confirmSale()` signature (expects `orderId`, should be `productId, optionId, quantity`)

6. **Line 247-274:** `"한 이벤트가 실패해도 다음 이벤트를 처리할 수 있어야 함"`
   - Missing `orderRepository.findById()` mock for all 3 events
   - Wrong `confirmSale()` signature

7. **Line 278-293:** `"이벤트에서 올바른 orderId를 추출하여 서비스에 전달해야 함"`
   - Missing `orderRepository.findById()` mock
   - Wrong expectation: expects `confirmSale(orderId)`, should expect `confirmSale(productId, optionId, quantity)`

---

## Root Cause Analysis

### What Changed in Issue #014

**Before (Old Implementation):**
```typescript
@OnEvent('payment.completed')
async handle(event: PaymentCompletedEvent): Promise<void> {
  await this.stockManagementService.confirmSale(event.orderId);
}
```

**After (Current Implementation):**
```typescript
@OnEvent('payment.completed')
async handle(event: PaymentCompletedEvent): Promise<void> {
  // 1. Order 조회 (NEW)
  const order = await this.orderRepository.findById(event.orderId);
  if (!order) {
    throw new Error(`주문을 찾을 수 없습니다: ${event.orderId}`);
  }

  // 2. 재고 확정 - 시그니처 변경 (CHANGED)
  for (const orderItem of order.items) {
    await this.stockManagementService.confirmSale(
      orderItem.productId,      // NEW: productId
      orderItem.productOptionId, // NEW: optionId
      orderItem.quantity,        // NEW: quantity
    );
  }
}
```

### Key Changes
1. **Added Order Repository Dependency**
   - Handler now fetches Order entity using `orderRepository.findById()`
   - Throws error if order not found

2. **Changed `confirmSale()` Signature**
   - **Old:** `confirmSale(orderId: string)`
   - **New:** `confirmSale(productId: string, optionId: string, quantity: number)`
   - Reason: Stock management moved from Order domain to Product domain

3. **Loops Through Order Items**
   - Handler now iterates over `order.items` array
   - Calls `confirmSale()` once per order item

### Why Tests Are Failing

**Problem 1: Missing Order Repository Mock**
- Tests don't mock `orderRepository.findById()`
- Handler calls it and gets `undefined`
- Handler throws `"주문을 찾을 수 없습니다"` error
- Tests fail before reaching the assertions

**Problem 2: Wrong Method Signature Expectations**
- Tests expect: `confirmSale('order-1')`
- Implementation calls: `confirmSale('product-1', 'option-1', 2)`
- Assertion fails due to parameter mismatch

**Problem 3: Missing Order Entity with Items**
- Even tests that mock `orderRepository` don't return an Order with items
- Handler tries to iterate `order.items` but gets empty array or undefined
- `confirmSale()` is never called

---

## Current Implementation Details

### Handler Implementation
**File:** `src/order/application/event-handlers/payment-completed.handler.ts`

```typescript
@OnEvent('payment.completed')
async handle(event: PaymentCompletedEvent): Promise<void> {
  this.logger.log(
    `결제 완료 이벤트 수신: paymentId=${event.paymentId}, orderId=${event.orderId}`,
  );

  try {
    // Order 조회
    const order = await this.orderRepository.findById(event.orderId);
    if (!order) {
      throw new Error(`주문을 찾을 수 없습니다: ${event.orderId}`);
    }

    // 재고 확정 (reserved → sold)
    for (const orderItem of order.items) {
      await this.stockManagementService.confirmSale(
        orderItem.productId,
        orderItem.productOptionId,
        orderItem.quantity,
      );
    }

    this.logger.log(`재고 확정 완료: orderId=${event.orderId}`);
  } catch (error) {
    this.logger.error(
      `재고 확정 실패: orderId=${event.orderId}`,
      error,
    );
    throw error;
  }
}
```

### Dependencies
- `OrderRepository` (injected via `ORDER_REPOSITORY` token)
- `StockManagementService` (from Product domain)

---

## Required Test Updates

### Pattern 1: Tests That Verify Happy Path

**Example:** Line 58-99, 101-145

**Required Changes:**
1. Create Order entity with OrderItem(s)
2. Mock `orderRepository.findById()` to return the Order
3. Update `confirmSale()` expectations to match new signature

**Before:**
```typescript
it('결제 완료 이벤트 수신 시 재고를 확정해야 함', async () => {
  // Given
  const event = new PaymentCompletedEvent('payment-1', 'order-1');
  stockManagementService.confirmSale.mockResolvedValue(undefined);

  // When
  await handler.handle(event);

  // Then
  expect(stockManagementService.confirmSale).toHaveBeenCalledWith('order-1');
});
```

**After:**
```typescript
it('결제 완료 이벤트 수신 시 재고를 확정해야 함', async () => {
  // Given
  const orderItem = OrderItem.create({
    orderId: 'order-1',
    productId: 'product-1',
    productName: 'Test Product',
    productOptionId: 'option-1',
    productOptionName: 'Red',
    price: Price.from(10000),
    quantity: 2,
  });
  const order = Order.reconstitute({
    id: 'order-1',
    userId: 'user-1',
    status: OrderStatus.COMPLETED,
    items: [orderItem],
    totalAmount: 20000,
    discountAmount: 0,
    finalAmount: 20000,
    userCouponId: null,
    reservationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    createdAt: new Date(),
    paidAt: new Date(),
    updatedAt: new Date(),
  });

  const event = new PaymentCompletedEvent('payment-1', 'order-1');
  orderRepository.findById.mockResolvedValue(order);
  stockManagementService.confirmSale.mockResolvedValue(undefined);

  // When
  await handler.handle(event);

  // Then
  expect(orderRepository.findById).toHaveBeenCalledWith('order-1');
  expect(stockManagementService.confirmSale).toHaveBeenCalledWith(
    'product-1',
    'option-1',
    2,
  );
});
```

### Pattern 2: Tests That Verify Error Handling

**Example:** Line 179-195, 197-212

**Required Changes:**
1. For tests that should find the order: Mock `orderRepository.findById()` to return an Order
2. For tests that simulate "order not found": Mock `orderRepository.findById()` to return `null`
3. Update `confirmSale()` expectations and mocks to use new signature

**Before:**
```typescript
it('재고가 부족한 경우 예외를 전파해야 함', async () => {
  // Given
  const event = new PaymentCompletedEvent('payment-1', 'order-1');
  const insufficientStockError = new Error('재고가 부족합니다');
  stockManagementService.confirmSale.mockRejectedValue(insufficientStockError);

  // When & Then
  await expect(handler.handle(event)).rejects.toThrow(insufficientStockError);
  expect(stockManagementService.confirmSale).toHaveBeenCalledWith('order-1');
});
```

**After:**
```typescript
it('재고가 부족한 경우 예외를 전파해야 함', async () => {
  // Given
  const orderItem = OrderItem.create({
    orderId: 'order-1',
    productId: 'product-1',
    productName: 'Test Product',
    productOptionId: 'option-1',
    productOptionName: 'Red',
    price: Price.from(10000),
    quantity: 5,
  });
  const order = Order.reconstitute({
    id: 'order-1',
    userId: 'user-1',
    status: OrderStatus.COMPLETED,
    items: [orderItem],
    totalAmount: 50000,
    discountAmount: 0,
    finalAmount: 50000,
    userCouponId: null,
    reservationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    createdAt: new Date(),
    paidAt: new Date(),
    updatedAt: new Date(),
  });

  const event = new PaymentCompletedEvent('payment-1', 'order-1');
  const insufficientStockError = new Error('재고가 부족합니다');

  orderRepository.findById.mockResolvedValue(order);
  stockManagementService.confirmSale.mockRejectedValue(insufficientStockError);

  // When & Then
  await expect(handler.handle(event)).rejects.toThrow(insufficientStockError);
  expect(stockManagementService.confirmSale).toHaveBeenCalledWith(
    'product-1',
    'option-1',
    5,
  );
});
```

### Pattern 3: Tests for Order Not Found

**Example:** Line 197-212

**Required Changes:**
1. Mock `orderRepository.findById()` to return `null`
2. Expect error message: `"주문을 찾을 수 없습니다: {orderId}"`
3. Do NOT mock or expect `confirmSale()` calls (handler throws before reaching that code)

**Before:**
```typescript
it('주문을 찾을 수 없는 경우 예외를 전파해야 함', async () => {
  // Given
  const event = new PaymentCompletedEvent('payment-1', 'non-existent-order');
  const notFoundError = new Error('주문을 찾을 수 없습니다');
  stockManagementService.confirmSale.mockRejectedValue(notFoundError);

  // When & Then
  await expect(handler.handle(event)).rejects.toThrow(notFoundError);
  expect(loggerErrorSpy).toHaveBeenCalledWith(
    expect.stringContaining('재고 확정 실패'),
    notFoundError,
  );
});
```

**After:**
```typescript
it('주문을 찾을 수 없는 경우 예외를 전파해야 함', async () => {
  // Given
  const event = new PaymentCompletedEvent('payment-1', 'non-existent-order');
  orderRepository.findById.mockResolvedValue(null);

  // When & Then
  await expect(handler.handle(event)).rejects.toThrow(
    '주문을 찾을 수 없습니다: non-existent-order'
  );
  expect(loggerErrorSpy).toHaveBeenCalledWith(
    expect.stringContaining('재고 확정 실패'),
    expect.any(Error),
  );
  // confirmSale should NOT be called when order is not found
  expect(stockManagementService.confirmSale).not.toHaveBeenCalled();
});
```

### Pattern 4: Tests for Sequential/Multiple Events

**Example:** Line 216-245, 247-274

**Required Changes:**
1. Create separate Order entities for each event
2. Mock `orderRepository.findById()` to return different Orders based on orderId
3. Update all `confirmSale()` expectations to use new signature

**Before:**
```typescript
it('여러 이벤트를 순차적으로 처리할 수 있어야 함', async () => {
  // Given
  const event1 = new PaymentCompletedEvent('payment-1', 'order-1');
  const event2 = new PaymentCompletedEvent('payment-2', 'order-2');
  const event3 = new PaymentCompletedEvent('payment-3', 'order-3');

  stockManagementService.confirmSale.mockResolvedValue(undefined);

  // When
  await handler.handle(event1);
  await handler.handle(event2);
  await handler.handle(event3);

  // Then
  expect(stockManagementService.confirmSale).toHaveBeenCalledTimes(3);
  expect(stockManagementService.confirmSale).toHaveBeenNthCalledWith(1, 'order-1');
  expect(stockManagementService.confirmSale).toHaveBeenNthCalledWith(2, 'order-2');
  expect(stockManagementService.confirmSale).toHaveBeenNthCalledWith(3, 'order-3');
});
```

**After:**
```typescript
it('여러 이벤트를 순차적으로 처리할 수 있어야 함', async () => {
  // Given
  const createOrder = (orderId: string, productId: string) => {
    const orderItem = OrderItem.create({
      orderId,
      productId,
      productName: 'Test Product',
      productOptionId: `option-${productId}`,
      productOptionName: 'Red',
      price: Price.from(10000),
      quantity: 1,
    });
    return Order.reconstitute({
      id: orderId,
      userId: 'user-1',
      status: OrderStatus.COMPLETED,
      items: [orderItem],
      totalAmount: 10000,
      discountAmount: 0,
      finalAmount: 10000,
      userCouponId: null,
      reservationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      createdAt: new Date(),
      paidAt: new Date(),
      updatedAt: new Date(),
    });
  };

  const order1 = createOrder('order-1', 'product-1');
  const order2 = createOrder('order-2', 'product-2');
  const order3 = createOrder('order-3', 'product-3');

  orderRepository.findById.mockImplementation((orderId) => {
    if (orderId === 'order-1') return Promise.resolve(order1);
    if (orderId === 'order-2') return Promise.resolve(order2);
    if (orderId === 'order-3') return Promise.resolve(order3);
    return Promise.resolve(null);
  });

  stockManagementService.confirmSale.mockResolvedValue(undefined);

  const event1 = new PaymentCompletedEvent('payment-1', 'order-1');
  const event2 = new PaymentCompletedEvent('payment-2', 'order-2');
  const event3 = new PaymentCompletedEvent('payment-3', 'order-3');

  // When
  await handler.handle(event1);
  await handler.handle(event2);
  await handler.handle(event3);

  // Then
  expect(stockManagementService.confirmSale).toHaveBeenCalledTimes(3);
  expect(stockManagementService.confirmSale).toHaveBeenNthCalledWith(
    1,
    'product-1',
    'option-product-1',
    1,
  );
  expect(stockManagementService.confirmSale).toHaveBeenNthCalledWith(
    2,
    'product-2',
    'option-product-2',
    1,
  );
  expect(stockManagementService.confirmSale).toHaveBeenNthCalledWith(
    3,
    'product-3',
    'option-product-3',
    1,
  );
});
```

---

## Implementation Checklist

### Test File to Update
- [ ] `src/order/application/event-handlers/payment-completed.handler.spec.ts`

### Tests to Fix (7 total)

#### Happy Path Tests
- [ ] **Line 58-99:** `"결제 완료 이벤트 수신 시 재고를 확정해야 함"`
  - [x] Already has Order mock (this test is actually passing)
  - [x] Already has correct `confirmSale()` expectations
  - Note: This test is already correct and passing

- [ ] **Line 101-145:** `"이벤트 수신 시 로그를 기록해야 함"`
  - [x] Already has Order mock
  - [ ] Verify logger assertions still work correctly

- [ ] **Line 147-162:** `"재고 확정 완료 시 성공 로그를 기록해야 함"`
  - [ ] Add Order entity creation
  - [ ] Add `orderRepository.findById()` mock

#### Error Handling Tests
- [ ] **Line 164-177:** `"재고 확정 실패 시 에러 로그를 기록하고 예외를 재발생해야 함"`
  - [ ] Add Order entity creation
  - [ ] Add `orderRepository.findById()` mock

- [ ] **Line 179-195:** `"재고가 부족한 경우 예외를 전파해야 함"`
  - [ ] Add Order entity creation
  - [ ] Add `orderRepository.findById()` mock
  - [ ] Update `confirmSale()` call expectation to new signature

- [ ] **Line 197-212:** `"주문을 찾을 수 없는 경우 예외를 전파해야 함"`
  - [ ] Mock `orderRepository.findById()` to return `null`
  - [ ] Update error expectation to match actual error message
  - [ ] Add assertion that `confirmSale()` is NOT called
  - [ ] Remove `confirmSale()` mock setup (not needed)

#### Event Flow Tests
- [ ] **Line 216-245:** `"여러 이벤트를 순차적으로 처리할 수 있어야 함"`
  - [ ] Create 3 Order entities (one for each event)
  - [ ] Mock `orderRepository.findById()` with implementation that returns correct Order
  - [ ] Update all 3 `confirmSale()` call expectations to new signature

- [ ] **Line 247-274:** `"한 이벤트가 실패해도 다음 이벤트를 처리할 수 있어야 함"`
  - [ ] Create 3 Order entities
  - [ ] Mock `orderRepository.findById()` with implementation
  - [ ] Keep error mock for event2's `confirmSale()`
  - [ ] Update expectations

#### Event Data Validation Tests
- [ ] **Line 278-293:** `"이벤트에서 올바른 orderId를 추출하여 서비스에 전달해야 함"`
  - [ ] Add Order entity creation
  - [ ] Add `orderRepository.findById()` mock
  - [ ] Update `confirmSale()` expectation from `(orderId)` to `(productId, optionId, quantity)`

- [ ] **Line 295-308:** `"이벤트 발생 시각이 기록되어야 함"`
  - [x] No changes needed (doesn't call handler)

---

## Success Criteria

- [ ] All 7 failing tests pass
- [ ] Test suite shows 417/417 tests passing
- [ ] No test suite failures (43/43 passing)
- [ ] Tests accurately reflect current handler implementation
- [ ] Tests verify new behavior:
  - Order is fetched from repository
  - Error thrown when order not found
  - `confirmSale()` called with `(productId, optionId, quantity)` for each order item
  - Handler loops through all order items

---

## Testing Commands

```bash
# Run all tests
pnpm test

# Run only PaymentCompletedHandler tests
pnpm test payment-completed.handler.spec

# Run with coverage
pnpm test:cov

# Watch mode for iterative fixing
pnpm test:watch payment-completed.handler.spec
```

---

## File Locations

### File to Modify
```
src/order/application/event-handlers/payment-completed.handler.spec.ts
```

### Reference Files
```
src/order/application/event-handlers/payment-completed.handler.ts  # Implementation
src/order/domain/entities/order.entity.ts                           # Order entity
src/order/domain/entities/order-item.entity.ts                      # OrderItem entity
src/order/domain/entities/order-status.enum.ts                      # OrderStatus enum
src/product/domain/entities/price.vo.ts                             # Price value object
src/product/domain/services/stock-management.service.ts             # Service being called
```

---

## Related Issues

- **Issue #014**: Product domain stock management refactoring (completed)
  - This issue introduced the breaking changes
  - Moved stock management from Order domain to Product domain
  - Changed `confirmSale()` signature from `(orderId)` to `(productId, optionId, quantity)`

---

## Notes

- The first test (Line 58-99) is already correct and passing - it was updated during Issue #014
- The remaining 6 tests need the same pattern applied
- Use `Order.reconstitute()` instead of `Order.create()` for creating test Orders (reconstitute is for rebuilding from persistence)
- Each Order must have at least one OrderItem in the `items` array for the handler to work
- When testing "order not found", mock repository to return `null` and expect error before `confirmSale()` is called
- Helper function pattern (like `createOrder()`) can reduce code duplication for tests with multiple orders

---

## Tips for Implementation

1. **Create a Helper Function** to reduce duplication:
```typescript
const createTestOrder = (
  orderId: string,
  productId: string,
  optionId: string,
  quantity: number = 1,
): Order => {
  const orderItem = OrderItem.create({
    orderId,
    productId,
    productName: 'Test Product',
    productOptionId: optionId,
    productOptionName: 'Test Option',
    price: Price.from(10000),
    quantity,
  });

  return Order.reconstitute({
    id: orderId,
    userId: 'user-1',
    status: OrderStatus.COMPLETED,
    items: [orderItem],
    totalAmount: 10000 * quantity,
    discountAmount: 0,
    finalAmount: 10000 * quantity,
    userCouponId: null,
    reservationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    createdAt: new Date(),
    paidAt: new Date(),
    updatedAt: new Date(),
  });
};
```

2. **Pattern for Multi-Order Tests:**
```typescript
orderRepository.findById.mockImplementation((orderId) => {
  const orderMap = {
    'order-1': order1,
    'order-2': order2,
    'order-3': order3,
  };
  return Promise.resolve(orderMap[orderId] || null);
});
```

3. **Verify Order Not Found Behavior:**
```typescript
// When order is not found
orderRepository.findById.mockResolvedValue(null);
await expect(handler.handle(event)).rejects.toThrow('주문을 찾을 수 없습니다');
expect(stockManagementService.confirmSale).not.toHaveBeenCalled();
```
