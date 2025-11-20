# Issue 027: Payment Idempotency Key Implementation

**Status**: In Progress
**Priority**: Critical
**Created**: 2025-11-21
**Branch**: `feature/027`

## Problem Statement

### Current Issue
The payment processing system lacks proper duplicate payment prevention mechanisms. The current implementation in `ProcessPaymentUseCase` only checks for existing payments by `orderId` without any locking mechanism:

```typescript
// Current implementation (process-payment.use-case.ts:77-82)
const existingPayment = await this.paymentRepository.findByOrderId(input.orderId);
if (existingPayment) {
  throw new AlreadyPaidException('이미 결제 완료된 주문입니다.');
}
// ⚠️ Race window exists between check and payment processing
```

### Risk Scenarios

1. **Client Retry**: Network timeout causes the same request to be sent twice
2. **Concurrent Requests**: User clicks the payment button multiple times
3. **System Failure**: Request reprocessing during server restart

All these scenarios can result in:
- Multiple charges to the customer (financial risk)
- Duplicate payment records in the database
- Inventory and order state inconsistencies

### Why Not Use Database Locks?

While database locks (pessimistic/optimistic) can prevent race conditions, **payment duplication is fundamentally a business idempotency problem**, not just a database concurrency issue:

- Same payment intent should be processed only once
- Network retries should return the same result without reprocessing
- This is a standard pattern in payment systems (Stripe, PayPal, etc.)

## Solution: Idempotency Key Pattern

### Approach

Implement the **Idempotency Key** pattern, a standard solution used by payment providers:

1. Client generates a unique `idempotencyKey` (UUID) for each payment request
2. Server checks if a payment with this key already exists
3. If exists: return the existing payment result (idempotent)
4. If not exists: process the payment and store with the key

### Benefits

- **Business-level deduplication**: Prevents duplicate processing regardless of concurrency
- **Network retry safety**: Same request can be safely retried
- **Standard pattern**: Industry best practice for payment APIs
- **No long locks**: Database unique constraint handles race conditions at commit time

## Implementation Plan

### 1. Database Schema Changes

**File**: `prisma/schema.prisma`

```prisma
model Payment {
  id              String    @id @default(uuid())
  orderId         String    @unique
  userId          String
  amount          Decimal   @db.Decimal(10, 2)
  method          String
  transactionId   String
  status          String    @default("COMPLETED")
  idempotencyKey  String    @unique  // NEW
  createdAt       DateTime  @default(now())
  refundedAt      DateTime?

  order Order @relation(fields: [orderId], references: [id])
  user  User  @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([transactionId])
  @@index([status])
  @@index([idempotencyKey])  // NEW - for fast lookups
  @@map("payments")
}
```

**Migration Steps**:
```bash
pnpm prisma migrate dev --name add_payment_idempotency_key
```

### 2. Domain Layer Changes

**File**: `src/order/domain/entities/payment.entity.ts`

```typescript
export class Payment {
  private readonly _id: string;
  private readonly _orderId: string;
  private readonly _userId: string;
  private readonly _amount: number;
  private readonly _method: PaymentMethod;
  private readonly _transactionId: string;
  private readonly _idempotencyKey: string;  // NEW
  private _status: PaymentStatus;
  private readonly _createdAt: Date;
  private _refundedAt?: Date;

  constructor(params: {
    id: string;
    orderId: string;
    userId: string;
    amount: number;
    method: PaymentMethod;
    transactionId: string;
    idempotencyKey: string;  // NEW
    status: PaymentStatus;
    createdAt: Date;
    refundedAt?: Date;
  }) {
    // Validation and assignment
  }

  get idempotencyKey(): string {  // NEW
    return this._idempotencyKey;
  }
}
```

### 3. Repository Layer Changes

**File**: `src/order/domain/repositories/payment.repository.ts`

```typescript
export interface PaymentRepository {
  findById(id: string): Promise<Payment | null>;
  findByOrderId(orderId: string): Promise<Payment | null>;
  findByIdempotencyKey(idempotencyKey: string): Promise<Payment | null>;  // NEW
  save(payment: Payment): Promise<void>;
  refund(paymentId: string): Promise<void>;
}
```

**Implementation Files**:
- `src/order/infrastructure/repositories/payment-prisma.repository.ts`
- `src/__fake__/payment/in-memory-payment.repository.ts` (for testing)

### 4. Application Layer Changes

**File**: `src/order/application/dtos/process-payment.dto.ts`

```typescript
export class ProcessPaymentInput {
  userId: string;
  orderId: string;
  paymentMethod: PaymentMethod;
  idempotencyKey: string;  // NEW - required from client

  constructor(params: {
    userId: string;
    orderId: string;
    paymentMethod: PaymentMethod;
    idempotencyKey: string;  // NEW
  }) {
    this.validateIdempotencyKey(params.idempotencyKey);  // NEW
    // ... rest of validation
  }

  private validateIdempotencyKey(key: string): void {
    if (!key || key.trim().length === 0) {
      throw new InvalidInputException('Idempotency key is required');
    }
    // Optional: validate UUID format
  }
}
```

**File**: `src/order/application/use-cases/process-payment.use-case.ts`

```typescript
async execute(input: ProcessPaymentInput, testFail?: boolean): Promise<ProcessPaymentOutput> {
  // 1. Check for existing payment by idempotency key (NEW)
  const existingPayment = await this.paymentRepository.findByIdempotencyKey(
    input.idempotencyKey
  );

  if (existingPayment) {
    // Return existing result (idempotent)
    return new ProcessPaymentOutput({
      paymentId: existingPayment.id,
      orderId: existingPayment.orderId,
      amount: existingPayment.amount,
      status: existingPayment.status,
      transactionId: existingPayment.transactionId,
      paidAt: existingPayment.createdAt,
    });
  }

  // 2. Load and validate order
  const order = await this.orderRepository.findById(input.orderId);
  // ... validation logic

  // 3. Process payment via PG
  const pgResult = await this.paymentGateway.processPayment({
    amount: order.totalAmount,
    method: input.paymentMethod,
    orderId: order.id,
    userId: input.userId,
  });

  // 4. Create and save payment entity
  const payment = Payment.create({
    orderId: order.id,
    userId: input.userId,
    amount: order.totalAmount,
    method: input.paymentMethod,
    transactionId: pgResult.transactionId,
    idempotencyKey: input.idempotencyKey,  // NEW
    status: PaymentStatus.COMPLETED,
  });

  await this.paymentRepository.save(payment);

  return new ProcessPaymentOutput({
    paymentId: payment.id,
    orderId: payment.orderId,
    amount: payment.amount,
    status: payment.status,
    transactionId: payment.transactionId,
    paidAt: payment.createdAt,
  });
}
```

### 5. Presentation Layer Changes

**File**: `src/order/presentation/controllers/payment.controller.ts`

```typescript
class ProcessPaymentRequestDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsString()
  @IsNotEmpty()
  @IsUUID()  // Validate UUID format
  idempotencyKey: string;  // NEW
}

@Post()
async processPayment(@Body() dto: ProcessPaymentRequestDto) {
  const input = new ProcessPaymentInput({
    userId: dto.userId,
    orderId: dto.orderId,
    paymentMethod: dto.paymentMethod,
    idempotencyKey: dto.idempotencyKey,  // NEW
  });

  const result = await this.orderFacade.completeOrder(input);
  return result;
}
```

### 6. Test Cases

**Unit Tests** (`process-payment.use-case.spec.ts`):
- ✅ 동일한 idempotencyKey로 2번 호출 시 같은 결과 반환
- ✅ 다른 idempotencyKey로 호출 시 새 결제 생성
- ✅ idempotencyKey 없이 호출 시 에러 발생

**Integration Tests**:
- ✅ DB unique constraint가 동시 요청을 막는지 검증
- ✅ 기존 결제 조회 시 PG API 호출하지 않는지 확인

**E2E Tests**:
- ✅ 동시에 같은 idempotencyKey로 요청 시 하나만 처리됨

## Technical Decisions

### 1. Storage Location
**Decision**: Add `idempotencyKey` column to `Payment` table
**Rationale**:
- Simple 1:1 relationship with payments
- No need for separate idempotency table at this scale
- Can be refactored to shared table later if needed for other APIs

### 2. Duplicate Request Handling
**Decision**: Return existing payment immediately
**Rationale**:
- Simple and performant
- No need to wait for in-progress requests
- DB unique constraint handles concurrent commits

### 3. Key Generation
**Decision**: Client must provide idempotency key (UUID v4)
**Rationale**:
- Standard practice in payment APIs
- Client has context for retries
- Server stays stateless

### 4. Key Format
**Decision**: UUID v4 format, validated with `@IsUUID()` decorator
**Rationale**:
- Universal standard
- Low collision probability
- Easy to validate

## Out of Scope

The following items are intentionally excluded and will be addressed in separate issues:

- ❌ Database pessimistic/optimistic locks
- ❌ Order State Machine pattern implementation
- ❌ OrderFacade transaction wrapping
- ❌ Saga pattern improvements

These are separate concerns that should be tackled independently.

## Success Criteria

- [ ] Prisma schema updated with `idempotencyKey` column
- [ ] Migration applied successfully
- [ ] Domain entities updated
- [ ] Repository methods implemented
- [ ] UseCase logic implements idempotency check
- [ ] Controller accepts idempotencyKey parameter
- [ ] All tests pass
- [ ] Duplicate payment scenario manually verified

## References

- `/docs/reports/step08/concurrency-control-review.md` - Concurrency analysis report
- [Stripe API Idempotency](https://stripe.com/docs/api/idempotent_requests)
- [PayPal Idempotency](https://developer.paypal.com/docs/api/reference/api-responses/#idempotency)

## Related Issues

- Issue #026: OrderFacade compensation transaction (completed)
- Issue #024: Payment Gateway refactoring (completed)
