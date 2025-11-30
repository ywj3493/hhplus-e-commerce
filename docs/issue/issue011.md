# Issue #011: Payment Domain Implementation

## Overview
Implement the Payment domain following the 4-Layer Architecture pattern established in Product, Cart, Coupon, and Order domains. This implementation includes payment processing with external PG API integration (mocked), payment event handling for stock confirmation, and comprehensive error handling for payment failures.

## Business Requirements

### Payment Processing (UC-PAY-01)
- **BR-PAY-01**: Order Ownership Validation - Only the order owner can process payment
- **BR-PAY-02**: Order Status Validation - Payment can only be processed for PENDING orders
- **BR-PAY-03**: Order Expiration Check - Reject payment if reservation period (10 minutes) has expired
- **BR-PAY-04**: Duplicate Payment Prevention - Prevent duplicate payments for the same order
- **BR-PAY-05**: External PG API Integration - Call external payment gateway API for payment processing
- **BR-PAY-06**: Payment Method Support - Support CREDIT_CARD payment method only
- **BR-PAY-07**: Payment History - Store payment records with transaction ID from PG
- **BR-PAY-08**: Order Status Update - Update order status to COMPLETED upon successful payment
- **BR-PAY-09**: Stock Confirmation - Convert reserved stock to sold stock after successful payment
- **BR-PAY-10**: Payment Failure Handling - Handle PG API failures gracefully without order status change

## API Specifications

### POST /payments - Process Payment
**Request:**
```json
{
  "orderId": "string",
  "paymentMethod": "CREDIT_CARD"
}
```

**Headers:**
- `X-Test-Fail: "true"` (optional, for testing intentional failures)

**Response:** 201 Created
```json
{
  "paymentId": "string",
  "orderId": "string",
  "status": "COMPLETED",
  "amount": 45000,
  "paymentMethod": "CREDIT_CARD",
  "transactionId": "TXN-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "createdAt": "2025-11-18T12:05:00Z"
}
```

**Error Responses:**

403 Forbidden (Order Ownership Violation)
```json
{
  "statusCode": 403,
  "message": "본인의 주문만 결제할 수 있습니다.",
  "error": "Forbidden"
}
```

409 Conflict (Invalid Order Status)
```json
{
  "statusCode": 409,
  "message": "PENDING 상태의 주문만 결제할 수 있습니다.",
  "error": "Conflict"
}
```

410 Gone (Order Expired)
```json
{
  "statusCode": 410,
  "message": "주문 예약 시간이 만료되었습니다.",
  "error": "Gone"
}
```

409 Conflict (Already Paid)
```json
{
  "statusCode": 409,
  "message": "이미 결제가 완료된 주문입니다.",
  "error": "Conflict"
}
```

502 Bad Gateway (Payment API Failure)
```json
{
  "statusCode": 502,
  "message": "결제 처리 중 오류가 발생했습니다.",
  "error": "Bad Gateway"
}
```

## Data Model

### Payment Entity
```typescript
class Payment {
  private readonly _id: string;
  private readonly _orderId: string;
  private readonly _userId: string;
  private readonly _amount: number;
  private readonly _paymentMethod: PaymentMethod; // CREDIT_CARD
  private readonly _transactionId: string; // From PG API
  private readonly _createdAt: Date;
}
```

### PaymentMethod Enum
```typescript
enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD'
}
```

## Architecture Design

### 4-Layer Architecture

#### 1. Domain Layer
- **Entities**
  - `Payment` - Core payment entity with immutable fields
  - `PaymentMethod` - Enum for payment methods (CREDIT_CARD only)
- **Repositories**
  - `PaymentRepository` - Interface for payment data access
- **Events**
  - `PaymentCompletedEvent` - Domain event emitted after successful payment
- **Exceptions**
  - `PaymentDomainException` - Base payment domain exception
  - `PaymentApiException` - External API failure exception
  - `PaymentFailedException` - Payment processing failure
  - `AlreadyPaidException` - Duplicate payment attempt
  - `OrderExpiredException` - Order reservation expired
  - `InvalidOrderStatusException` - Invalid order status for payment

#### 2. Infrastructure Layer
- **Repositories**
  - `InMemoryPaymentRepository` - In-memory implementation for testing
- **External Clients**
  - `MockPaymentApiClient` - Mock PG API client with dual failure modes:
    - Random failure: 10% probabilistic failure
    - Intentional failure: Via `testFail` parameter from request header

#### 3. Application Layer
- **Use Cases**
  - `ProcessPaymentUseCase` - Main payment processing orchestration
    1. Validate order ownership
    2. Validate order status (must be PENDING)
    3. Check order expiration
    4. Check for existing payment
    5. Call external PG API
    6. Create Payment entity
    7. Update Order status to COMPLETED
    8. Emit PaymentCompletedEvent
- **DTOs**
  - `ProcessPaymentInput` - Input DTO with validation
  - `ProcessPaymentOutput` - Output DTO with payment details

#### 4. Presentation Layer
- **Controllers**
  - `PaymentController` - REST API endpoint handler
    - POST /payments - Process payment
    - Extracts X-Test-Fail header for controlled testing
- **DTOs**
  - `ProcessPaymentRequestDto` - NestJS request DTO with class-validator
  - `PaymentResponseDto` - HTTP response DTO

### Event-Driven Architecture

#### PaymentCompletedEvent Flow
```
ProcessPaymentUseCase (Payment Module)
  └─> emit PaymentCompletedEvent { paymentId, orderId }
       └─> PaymentCompletedHandler (Order Module)
            └─> StockReservationService.convertReservedToSold(orderId)
                 └─> Stock.sell() - reserved → sold
```

#### Module Dependencies
```
PaymentModule
  ├─> imports: [OrderModule, EventEmitterModule]
  └─> exports: [PAYMENT_REPOSITORY]

OrderModule
  ├─> imports: [EventEmitterModule, CartModule, CouponModule, ProductModule]
  └─> providers: [PaymentCompletedHandler]
```

## Implementation Details

### Mock Payment API Client
The MockPaymentApiClient simulates external PG API behavior:

**Dual Failure Modes:**
1. **Random Failure** (10% probability)
   - Simulates real-world API instability
   - Returns error code: `RANDOM_FAILURE`

2. **Intentional Failure** (via testFail parameter)
   - Controlled via X-Test-Fail header in request
   - Controller extracts header and passes to use case
   - Returns error code: `TEST_FAILURE`
   - Enables deterministic testing of failure scenarios

**Success Response:**
- Generates unique transaction ID: `TXN-{uuid}`
- Simulates 100ms API delay

### Stock Confirmation via Event
Instead of directly calling stock confirmation in payment use case, the implementation follows event-driven architecture:

1. Payment use case emits `PaymentCompletedEvent` after successful payment
2. `PaymentCompletedHandler` in Order module listens for this event
3. Handler calls `StockReservationService.convertReservedToSold(orderId)`
4. Stock service converts reserved stock to sold stock

**Benefits:**
- Loose coupling between Payment and Order domains
- Single Responsibility Principle
- Testability - can test payment and stock confirmation independently

### StockReservationService Method Overloading
To support event-driven stock confirmation, StockReservationService now has method overloading:

```typescript
// Overload 1: Accept orderId (for event handler)
async convertReservedToSold(orderId: string): Promise<void>;

// Overload 2: Accept OrderItem[] (for existing use cases)
async convertReservedToSold(orderItems: OrderItem[]): Promise<void>;

// Implementation
async convertReservedToSold(orderIdOrItems: string | OrderItem[]): Promise<void> {
  let orderItems: OrderItem[];
  if (typeof orderIdOrItems === 'string') {
    const order = await this.orderRepository.findById(orderIdOrItems);
    if (!order) throw new Error(`주문을 찾을 수 없습니다: ${orderIdOrItems}`);
    orderItems = order.items;
  } else {
    orderItems = orderIdOrItems;
  }
  // ... conversion logic
}
```

## Files Created/Modified

### Created Files

#### Domain Layer
- `src/payment/domain/entities/payment-method.enum.ts` - PaymentMethod enum
- `src/payment/domain/entities/payment.entity.ts` - Payment entity
- `src/payment/domain/entities/payment.entity.spec.ts` - Payment entity tests
- `src/payment/domain/repositories/payment.repository.ts` - Repository interface
- `src/payment/domain/payment.exceptions.ts` - Domain exceptions
- `src/payment/domain/events/payment-completed.event.ts` - Payment completed event

#### Infrastructure Layer
- `src/payment/infrastructure/clients/payment-api.interface.ts` - External API interface
- `src/payment/infrastructure/clients/mock-payment-api.client.ts` - Mock PG API client
- `src/payment/infrastructure/repositories/in-memory-payment.repository.ts` - In-memory repository
- `src/payment/infrastructure/repositories/in-memory-payment.repository.spec.ts` - Repository tests

#### Application Layer
- `src/payment/application/dtos/process-payment.dto.ts` - Use case DTOs
- `src/payment/application/use-cases/process-payment.use-case.ts` - Payment processing use case
- `src/payment/application/use-cases/process-payment.use-case.spec.ts` - Use case tests (21 tests)

#### Presentation Layer
- `src/payment/presentation/dtos/process-payment-request.dto.ts` - Request DTO
- `src/payment/presentation/dtos/payment-response.dto.ts` - Response DTO
- `src/payment/presentation/controllers/payment.controller.ts` - REST controller
- `src/payment/presentation/controllers/payment.controller.spec.ts` - Controller tests (12 tests)

#### Module
- `src/payment/payment.module.ts` - Payment module configuration

#### Order Module Integration
- `src/order/application/event-handlers/payment-completed.handler.ts` - Event handler for stock confirmation
- `src/order/application/event-handlers/payment-completed.handler.spec.ts` - Event handler tests (8 tests)

#### Cart Module Integration (Refactoring)

- `src/cart/application/services/cart-checkout.service.ts` - Cart checkout application service
  - Encapsulates cart checkout logic for Order domain
  - `getCartItemsForCheckout()`: Retrieve and validate cart items
  - `clearCartAfterCheckout()`: Clear cart after successful order

#### Coupon Module Integration (Refactoring)

- `src/coupon/application/services/coupon-apply.service.ts` - Coupon application service
  - Encapsulates coupon application logic for Order domain
  - `applyCoupon()`: Validate, use coupon, and calculate discount

### Modified Files

#### Order Module

- `src/order/domain/services/stock-reservation.service.ts`
  - Added ORDER_REPOSITORY injection
  - Added method overloading for convertReservedToSold
  - Accept orderId or OrderItem[] parameter

- `src/order/domain/services/stock-reservation.service.spec.ts`
  - Added ORDER_REPOSITORY mock provider

- `src/order/order.module.ts`
  - Added EventEmitterModule import
  - Added PaymentCompletedHandler to providers
  - Removed direct repository symbol exports (CART_REPOSITORY, USER_COUPON_REPOSITORY, COUPON_REPOSITORY)

- `src/order/application/use-cases/create-order.use-case.ts` (Refactoring)
  - Reduced repository dependencies from 5 to 2
  - Now uses CartCheckoutService and CouponApplyService
  - Before: CART_REPOSITORY, USER_COUPON_REPOSITORY, COUPON_REPOSITORY, PRODUCT_REPOSITORY, ORDER_REPOSITORY
  - After: ORDER_REPOSITORY, PRODUCT_REPOSITORY + Application Services

- `src/order/application/use-cases/create-order.use-case.spec.ts` (Refactoring)
  - Updated to mock Application Services instead of repositories

#### Cart Module (Refactoring)

- `src/cart/cart.module.ts`
  - Added CartCheckoutService to providers and exports
  - Exported for Order module consumption

#### Coupon Module (Refactoring)

- `src/coupon/coupon.module.ts`
  - Added CouponApplyService to providers and exports
  - Exported for Order module consumption

## Testing

### Test Coverage

#### Payment Domain

- ✅ Payment entity creation and validation
- ✅ Payment repository operations (save, findById, findByOrderId)
- ✅ Repository immutability guarantees
- ✅ ProcessPaymentUseCase - 21 comprehensive tests
  - BR-PAY-01: Order ownership validation
  - BR-PAY-02: Order status validation (PENDING only)
  - BR-PAY-03: Order expiration check
  - BR-PAY-04: Duplicate payment prevention
  - BR-PAY-05: External PG API integration
  - BR-PAY-10: Payment failure handling
  - Success scenarios and all failure scenarios
- ✅ PaymentController - 12 tests
  - X-Test-Fail header handling
  - DTO conversion and validation
  - Exception handling
- ✅ PaymentCompletedHandler - 8 tests
  - Event handling and stock confirmation
  - Error handling and logging
  - Idempotency scenarios

#### Order Domain Integration

- ✅ StockReservationService with ORDER_REPOSITORY dependency
- ✅ Method overloading for convertReservedToSold

#### Refactoring

- ✅ CartCheckoutService integration
- ✅ CouponApplyService integration
- ✅ CreateOrderUseCase with reduced dependencies
- ✅ All existing tests continue to pass

### Test Results
```
Test Suites: 41 passed, 41 total
Tests:       412 passed, 412 total
```

## Technical Decisions

### 1. BALANCE Payment Method Removal
**Decision:** Remove BALANCE payment method from initial implementation
**Rationale:**
- Simplified domain model focusing on core payment flow
- Real-world scenarios typically delegate to PG providers (no wallet needed)
- No separate User/Wallet domain required
- Can be added later if business requirements change

### 2. Mock Payment API with Dual Failure Modes
**Decision:** Implement both random and intentional failure modes
**Rationale:**
- Random failure (10%) simulates real-world API instability
- Intentional failure via header enables deterministic testing
- Clear test intent when debugging or writing integration tests
- Flexible testing strategy for different scenarios

### 3. Independent /payments Endpoint
**Decision:** Use independent `/payments` endpoint instead of nested `/orders/:id/payments`
**Rationale:**
- Payment is separate domain with its own lifecycle
- Aligns with RESTful resource modeling
- Easier to scale and maintain independently
- Clear separation of concerns

### 4. Event-Driven Stock Confirmation
**Decision:** Use event-driven approach instead of direct method call
**Rationale:**
- Loose coupling between Payment and Order domains
- Single Responsibility Principle - payment use case focuses on payment only
- Testability - can mock event emitter to test in isolation
- Extensibility - can add more event handlers (e.g., notification, analytics) without modifying payment use case

### 5. Symbol-Based Dependency Injection
**Decision:** Use Symbol tokens for dependency injection (PAYMENT_REPOSITORY, PAYMENT_API_CLIENT)
**Rationale:**
- Prevents naming collisions across modules
- Better type safety compared to string tokens
- Follows NestJS best practices
- Consistent with existing architecture (Product, Cart, Order, Coupon)

### 6. Application Service Pattern for Cross-Domain Operations
**Decision:** Introduce Application Services (CartCheckoutService, CouponApplyService) to reduce domain coupling
**Rationale:**
- **Domain Boundary Enforcement**: Order domain no longer directly accesses Cart/Coupon repositories
- **Reduced Coupling**: CreateOrderUseCase dependencies reduced from 5 repositories to 2 repositories + Application Services
- **Single Responsibility**: Each Application Service encapsulates specific cross-domain workflows
- **Reusability**: Application Services can be reused by other use cases
- **Testability**: Easier to mock Application Services than multiple repositories

**Before Refactoring:**
```typescript
CreateOrderUseCase(
  orderRepository,
  cartRepository,           // ❌ Direct access to Cart domain
  userCouponRepository,     // ❌ Direct access to Coupon domain
  couponRepository,         // ❌ Direct access to Coupon domain
  productRepository,
  stockReservationService,
  couponService
)
```

**After Refactoring:**
```typescript
CreateOrderUseCase(
  orderRepository,
  productRepository,
  stockReservationService,
  cartCheckoutService,      // ✅ Application Service abstraction
  couponApplicationService  // ✅ Application Service abstraction
)
```

**Benefits:**
- Clear separation between Domain Services (pure business logic) and Application Services (cross-domain orchestration)
- Follows DDD principles - domains should not directly depend on other domain's infrastructure
- Improves maintainability and scalability

## Dependencies

### Module Dependencies
- `@nestjs/common` - NestJS core decorators and utilities
- `@nestjs/event-emitter` - Event-driven architecture support
- `uuid` - Transaction ID generation
- `class-validator` - Request validation
- `class-transformer` - DTO transformation

### Domain Dependencies
- Payment module depends on Order module for:
  - ORDER_REPOSITORY (to validate and update orders)
  - Event handler registration
- Order module depends on Product module for stock operations

## Next Steps

1. ✅ **Domain Layer** - Completed
2. ✅ **Infrastructure Layer** - Completed
3. ✅ **Application Layer** - Completed (including comprehensive tests)
4. ✅ **Presentation Layer** - Completed (including controller tests)
5. ✅ **Module Configuration** - Completed
6. ✅ **Event Handler Implementation** - Completed (including event handler tests)
7. ✅ **Refactoring** - CreateOrderUseCase domain coupling reduced via Application Services
8. ✅ **Tests** - All tests passing (41 suites, 412 tests)
9. ✅ **Issue Documentation** - This document

## Future Enhancements

### Short-term
- Add payment cancellation/refund functionality
- Add payment status inquiry endpoint (GET /payments/:id)
- Add payment history endpoint (GET /payments?orderId=xxx)

### Long-term
- Replace MockPaymentApiClient with real PG integration (e.g., Toss, Stripe)
- Add payment retry mechanism for transient failures
- Add webhook handler for async payment notifications
- Add BALANCE payment method with User/Wallet domain
- Add payment analytics and reporting

## References
- [Requirements Document](../dev/requirements.md)
- [Use Cases Document](../dev/use-cases.md)
- [API Specification](../dev/api-spec.md)
- [Sequence Diagrams](../dev/sequence-diagrams.md)
- [Data Model](../dev/data-model.md)

## Related Issues
- Issue #010: Order Domain Implementation
- Issue #009: Coupon Domain Implementation
- Issue #006: Cart Domain Implementation
- Issue #004: Product Domain Implementation
