# Issue #012: Domain Consolidation - Cart, Order, Payment Integration

## Overview

This issue addresses the consolidation of three separate domains (Cart, Order, Payment) into a unified Order domain. The current architecture has resulted in overly fragmented domain boundaries, leading to duplicate business logic, tight coupling through Application Services, and maintenance complexity. By integrating these closely related domains, we aim to improve code organization, reduce duplication, and simplify module dependencies while preserving all existing functionality, database schemas, and API contracts.

## Current State Analysis

### Existing Domain Structure

**Cart Domain** (`src/cart/`)
- **Purpose**: Shopping cart management
- **Key Entities**: Cart, CartItem
- **Key Services**: CartStockValidationService, CartCheckoutService
- **Use Cases**: 5 use cases (add, get, update, remove, clear)
- **Dependencies**: ProductModule

**Order Domain** (`src/order/`)
- **Purpose**: Order creation and lifecycle management
- **Key Entities**: Order, OrderItem, OrderStatus
- **Key Services**: StockReservationService
- **Use Cases**: 3 use cases (create, get, get-list)
- **Background Jobs**: ReleaseExpiredReservationJob (every 1 minute)
- **Event Handlers**: PaymentCompletedHandler
- **Dependencies**: CartModule, ProductModule, CouponModule

**Payment Domain** (`src/payment/`)
- **Purpose**: Payment processing with external PG API
- **Key Entities**: Payment, PaymentMethod
- **Use Cases**: 1 use case (process-payment)
- **External Clients**: MockPaymentApiClient
- **Domain Events**: PaymentCompletedEvent
- **Dependencies**: OrderModule

### Module Dependency Graph

```
┌──────────────┐
│ CartModule   │
│              │
│ exports:     │
│ - CART_REPO  │
│ - CartCheck  │
│   outService │
└──────┬───────┘
       │
       │ imports
       ▼
┌──────────────┐      ┌────────────────┐
│ProductModule │      │ CouponModule   │
└──────────────┘      └────────────────┘
       ▲                      ▲
       │                      │
       │ imports              │ imports
       │                      │
┌──────┴───────┐             │
│ OrderModule  │─────────────┘
│              │
│ exports:     │
│ - ORDER_REPO │
└──────┬───────┘
       ▲
       │ imports
       │
┌──────┴───────┐
│PaymentModule │
│              │
│ exports:     │
│ - PAYMENT_   │
│   REPOSITORY │
└──────────────┘
```

### Current File Count
- **Cart Domain**: ~25 files (entities, services, use cases, controllers, DTOs, tests)
- **Order Domain**: ~30 files (entities, services, use cases, controllers, DTOs, tests, jobs, event handlers)
- **Payment Domain**: ~20 files (entities, clients, use cases, controllers, DTOs, tests)
- **Total**: ~75 files across 3 domains

## Problems to Solve

### 1. Overly Fragmented Domain Boundaries
- Cart, Order, and Payment represent a **single business flow** (shopping → checkout → payment)
- Domain boundaries create artificial separation of highly cohesive logic
- User journey spans all three domains, making it hard to understand the complete flow

### 2. Duplicate Business Logic

**Quantity Validation:**
- `CartItem.validate()`: Validates quantity ≥ 1 (BR-CART-03)
- `OrderItem` constructor: Validates quantity ≥ 1
- **Impact**: Same validation logic duplicated in 2 entities

**Subtotal Calculation:**
- `CartItem.getSubtotal()`: `price.multiply(quantity)`
- `OrderItem.getSubtotal()`: `price.multiply(quantity)`
- **Impact**: Identical calculation logic in 2 entities

**Exception Duplication:**
- `OrderExpiredException`: Defined in both Order and Payment domains
- **Impact**: Same exception defined twice

**Stock Validation:**
- `CartStockValidationService`: Validates stock for cart operations
- `StockReservationService.reserveStockForCart()`: Validates stock for order creation
- **Impact**: Overlapping validation concerns

### 3. Tight Coupling via Application Services

**CartCheckoutService:**
- Exported from CartModule to OrderModule
- CreateOrderUseCase depends on CartCheckoutService
- **Problem**: Introduces coupling between domains that should be unified

**PaymentCompletedHandler:**
- Order domain listens to Payment domain events
- **Problem**: Event-driven communication within what should be a single aggregate

### 4. Module Dependency Complexity
- 3 separate modules with bidirectional dependencies
- OrderModule imports CartModule
- PaymentModule imports OrderModule
- **Impact**: Circular dependency risk, harder to test in isolation

### 5. Maintenance Overhead
- Changes to order flow require modifications across 3 domains
- Testing requires coordinating mocks across 3 modules
- Developers must navigate 3 separate folder structures

## Integration Goals

### Primary Objectives
1. **Unify Related Domains**: Merge Cart, Order, Payment into a single Order domain
2. **Reduce Duplication**: Eliminate duplicate validation, calculation, and exception logic
3. **Simplify Dependencies**: Reduce module dependencies (3 modules → 1 module)
4. **Improve Maintainability**: All order lifecycle logic in one place
5. **Preserve Functionality**: Maintain all existing features, APIs, and business rules

### What Changes
- ✅ Domain boundaries (3 domains → 1 domain)
- ✅ Module structure (3 modules → 1 module)
- ✅ Import paths (`@/cart/*`, `@/payment/*` → `@/order/*`)
- ✅ Duplicate logic consolidated (Quantity VO, exception unification)
- ✅ Application Services removed (CartCheckoutService)

### What Stays the Same
- ✅ Database schema (Cart, Order, Payment tables unchanged)
- ✅ API endpoints (`/cart`, `/orders`, `/payments`)
- ✅ User scenarios (shopping cart → order → payment flow)
- ✅ Business rules (all BR-* requirements)
- ✅ Stock management logic (reservation, expiration, conversion)
- ✅ Background jobs (ReleaseExpiredReservationJob)

## Consolidation Strategy

### Phase 1: Unified Order Domain Structure Design

**Target Directory Structure:**
```
order/
├── domain/
│   ├── entities/
│   │   ├── cart.entity.ts              (from Cart)
│   │   ├── cart.entity.spec.ts         (from Cart)
│   │   ├── cart-item.entity.ts         (from Cart)
│   │   ├── cart-item.entity.spec.ts    (from Cart)
│   │   ├── order.entity.ts             (existing)
│   │   ├── order.entity.spec.ts        (existing)
│   │   ├── order-item.entity.ts        (existing)
│   │   ├── order-item.entity.spec.ts   (existing)
│   │   ├── payment.entity.ts           (from Payment)
│   │   ├── payment.entity.spec.ts      (from Payment)
│   │   ├── order-status.enum.ts        (existing)
│   │   └── payment-method.enum.ts      (from Payment)
│   ├── repositories/
│   │   ├── cart.repository.ts          (from Cart)
│   │   ├── order.repository.ts         (existing)
│   │   └── payment.repository.ts       (from Payment)
│   ├── services/
│   │   ├── cart-stock-validation.service.ts      (from Cart)
│   │   ├── cart-stock-validation.service.spec.ts (from Cart)
│   │   ├── stock-reservation.service.ts          (existing)
│   │   ├── stock-reservation.service.spec.ts     (existing)
│   │   └── payment-processing.service.ts         (new - extracted from use case)
│   ├── events/
│   │   └── payment-completed.event.ts  (from Payment - but likely removed)
│   ├── value-objects/
│   │   ├── quantity.vo.ts              (new)
│   │   └── quantity.vo.spec.ts         (new)
│   └── order.exceptions.ts             (unified exceptions)
├── application/
│   ├── use-cases/
│   │   ├── add-cart-item.use-case.ts           (from Cart)
│   │   ├── add-cart-item.use-case.spec.ts      (from Cart)
│   │   ├── get-cart.use-case.ts                (from Cart)
│   │   ├── get-cart.use-case.spec.ts           (from Cart)
│   │   ├── update-cart-item.use-case.ts        (from Cart)
│   │   ├── update-cart-item.use-case.spec.ts   (from Cart)
│   │   ├── remove-cart-item.use-case.ts        (from Cart)
│   │   ├── remove-cart-item.use-case.spec.ts   (from Cart)
│   │   ├── clear-cart.use-case.ts              (from Cart)
│   │   ├── clear-cart.use-case.spec.ts         (from Cart)
│   │   ├── create-order.use-case.ts            (existing - refactored)
│   │   ├── create-order.use-case.spec.ts       (existing - refactored)
│   │   ├── get-order.use-case.ts               (existing)
│   │   ├── get-order.use-case.spec.ts          (existing)
│   │   ├── get-orders.use-case.ts              (existing)
│   │   ├── get-orders.use-case.spec.ts         (existing)
│   │   ├── process-payment.use-case.ts         (from Payment)
│   │   └── process-payment.use-case.spec.ts    (from Payment)
│   ├── jobs/
│   │   ├── release-expired-reservation.job.ts       (existing)
│   │   └── release-expired-reservation.job.spec.ts  (existing)
│   └── dtos/
│       ├── add-cart-item.dto.ts        (from Cart)
│       ├── get-cart.dto.ts             (from Cart)
│       ├── update-cart-item.dto.ts     (from Cart)
│       ├── remove-cart-item.dto.ts     (from Cart)
│       ├── clear-cart.dto.ts           (from Cart)
│       ├── create-order.dto.ts         (existing)
│       ├── get-order.dto.ts            (existing)
│       ├── get-orders.dto.ts           (existing)
│       └── process-payment.dto.ts      (from Payment)
├── infrastructure/
│   ├── repositories/
│   │   ├── in-memory-cart.repository.ts      (from Cart)
│   │   ├── in-memory-cart.repository.spec.ts (from Cart)
│   │   ├── in-memory-order.repository.ts     (existing)
│   │   ├── in-memory-order.repository.spec.ts (existing)
│   │   ├── in-memory-payment.repository.ts   (from Payment)
│   │   └── in-memory-payment.repository.spec.ts (from Payment)
│   ├── clients/
│   │   ├── payment-api.interface.ts          (from Payment)
│   │   └── mock-payment-api.client.ts        (from Payment)
│   └── fixtures/
│       ├── cart.fixtures.ts            (from Cart)
│       ├── order.fixtures.ts           (existing)
│       └── payment.fixtures.ts         (new if needed)
├── presentation/
│   ├── controllers/
│   │   ├── cart.controller.ts          (from Cart)
│   │   ├── cart.controller.spec.ts     (from Cart)
│   │   ├── order.controller.ts         (existing)
│   │   ├── order.controller.spec.ts    (existing)
│   │   ├── payment.controller.ts       (from Payment)
│   │   └── payment.controller.spec.ts  (from Payment)
│   └── dtos/
│       ├── add-cart-item-request.dto.ts       (from Cart)
│       ├── cart-item-response.dto.ts          (from Cart)
│       ├── cart-response.dto.ts               (from Cart)
│       ├── get-cart-item-param.dto.ts         (from Cart)
│       ├── update-cart-item-request.dto.ts    (from Cart)
│       ├── create-order-request.dto.ts        (existing)
│       ├── order-list-response.dto.ts         (existing)
│       ├── order-response.dto.ts              (existing)
│       ├── pagination-query.dto.ts            (existing)
│       ├── process-payment-request.dto.ts     (from Payment)
│       └── payment-response.dto.ts            (from Payment)
└── order.module.ts                            (unified module)
```

### Phase 2: Duplicate Logic Removal & Refactoring

#### 2.1 Create Quantity Value Object

**New File:** `src/order/domain/value-objects/quantity.vo.ts`

```typescript
export class Quantity {
  private readonly _value: number;

  constructor(value: number) {
    this.validate(value);
    this._value = value;
  }

  private validate(value: number): void {
    if (!Number.isInteger(value)) {
      throw new InvalidQuantityException('수량은 정수여야 합니다.');
    }
    if (value < 1) {
      throw new InvalidQuantityException('수량은 1개 이상이어야 합니다.');
    }
  }

  get value(): number {
    return this._value;
  }

  add(other: Quantity): Quantity {
    return new Quantity(this._value + other.value);
  }

  equals(other: Quantity): boolean {
    return this._value === other.value;
  }
}
```

**Impact:**
- CartItem will use `Quantity` VO instead of primitive number
- OrderItem will use `Quantity` VO instead of primitive number
- Validation logic centralized in one place

#### 2.2 Unify Exception Definitions

**Update:** `src/order/domain/order.exceptions.ts`

**Remove from Payment domain:**
- `OrderExpiredException` (use Order domain's version)

**Keep in unified exceptions file:**
```typescript
// Order-related exceptions
export class OrderNotFoundException extends OrderDomainException { ... }
export class OrderExpiredException extends OrderDomainException { ... }
export class InvalidOrderStateException extends OrderDomainException { ... }

// Cart-related exceptions
export class CartNotFoundException extends OrderDomainException { ... }
export class CartItemNotFoundException extends OrderDomainException { ... }
export class InsufficientStockException extends OrderDomainException { ... }

// Payment-related exceptions
export class PaymentApiException extends OrderDomainException { ... }
export class PaymentFailedException extends OrderDomainException { ... }
export class AlreadyPaidException extends OrderDomainException { ... }

// Common exceptions
export class InvalidQuantityException extends OrderDomainException { ... }
```

#### 2.3 Remove CartCheckoutService

**Refactor:** `CreateOrderUseCase`

**Before:**
```typescript
constructor(
  @Inject(ORDER_REPOSITORY) private orderRepository: OrderRepository,
  @Inject(PRODUCT_REPOSITORY) private productRepository: ProductRepository,
  private stockReservationService: StockReservationService,
  private cartCheckoutService: CartCheckoutService,  // ❌ Application Service
  private couponApplicationService: CouponApplicationService,
) {}

async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
  // Get cart items via Application Service
  const cartItems = await this.cartCheckoutService.getCartItemsForCheckout(input.userId);

  // ... order creation logic ...

  // Clear cart via Application Service
  await this.cartCheckoutService.clearCartAfterCheckout(input.userId);
}
```

**After:**
```typescript
constructor(
  @Inject(CART_REPOSITORY) private cartRepository: CartRepository,  // ✅ Direct repository access
  @Inject(ORDER_REPOSITORY) private orderRepository: OrderRepository,
  @Inject(PRODUCT_REPOSITORY) private productRepository: ProductRepository,
  private stockReservationService: StockReservationService,
  private couponApplicationService: CouponApplicationService,
) {}

async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
  // Get cart directly from repository
  const cart = await this.cartRepository.findByUserId(input.userId);
  if (!cart || cart.items.length === 0) {
    throw new EmptyCartException('장바구니가 비어있습니다.');
  }

  const cartItems = cart.items;

  // ... order creation logic ...

  // Clear cart directly via repository
  await this.cartRepository.clearByUserId(input.userId);
}
```

**Rationale:**
- Cart and Order are now in the same domain - no need for Application Service abstraction
- Direct repository access is simpler and more transparent
- Reduces unnecessary indirection

#### 2.4 Simplify Payment Event Handling

**Remove:** `PaymentCompletedEvent` domain event (optional)

**Refactor:** `ProcessPaymentUseCase`

**Option A: Keep Event-Driven (Recommended for Future Extensibility)**
```typescript
async execute(input: ProcessPaymentInput): Promise<ProcessPaymentOutput> {
  // ... payment processing ...

  // Update order status
  order.complete();
  await this.orderRepository.save(order);

  // Emit event (other handlers might need this in future)
  this.eventEmitter.emit('payment.completed', new PaymentCompletedEvent(payment.id, order.id));

  return ProcessPaymentOutput.from(payment, order);
}
```

**Option B: Direct Service Call (Simpler for Current Scope)**
```typescript
async execute(input: ProcessPaymentInput): Promise<ProcessPaymentOutput> {
  // ... payment processing ...

  // Update order status
  order.complete();
  await this.orderRepository.save(order);

  // Directly call stock service (same domain)
  await this.stockReservationService.convertReservedToSold(order.id);

  return ProcessPaymentOutput.from(payment, order);
}
```

**Decision:** Use Option A to maintain event-driven architecture (easier to extend later with notifications, analytics, etc.)

#### 2.5 Consolidate Stock Validation Logic

**Current State:**
- `CartStockValidationService`: Validates stock when adding to cart
- `StockReservationService.reserveStockForCart()`: Validates stock when creating order

**Refactor:**
- Keep both services (different responsibilities)
- `CartStockValidationService`: Quick validation for cart operations (read-only)
- `StockReservationService`: Transactional stock reservation (write operation)

**No change needed** - these serve different purposes despite some overlap.

### Phase 3: File Migration & Import Path Updates

#### 3.1 Migration Sequence

**Step 1: Move Payment Domain Files**
```bash
# Move domain layer
mv src/payment/domain/entities/*.ts src/order/domain/entities/
mv src/payment/domain/repositories/*.ts src/order/domain/repositories/
mv src/payment/domain/events/*.ts src/order/domain/events/
mv src/payment/domain/payment.exceptions.ts src/order/domain/

# Move infrastructure layer
mv src/payment/infrastructure/clients/*.ts src/order/infrastructure/clients/
mv src/payment/infrastructure/repositories/*.ts src/order/infrastructure/repositories/

# Move application layer
mv src/payment/application/dtos/*.ts src/order/application/dtos/
mv src/payment/application/use-cases/*.ts src/order/application/use-cases/

# Move presentation layer
mv src/payment/presentation/controllers/*.ts src/order/presentation/controllers/
mv src/payment/presentation/dtos/*.ts src/order/presentation/dtos/
```

**Step 2: Move Cart Domain Files**
```bash
# Move domain layer
mv src/cart/domain/entities/*.ts src/order/domain/entities/
mv src/cart/domain/repositories/*.ts src/order/domain/repositories/
mv src/cart/domain/services/*.ts src/order/domain/services/
mv src/cart/domain/cart.exceptions.ts src/order/domain/

# Move infrastructure layer
mv src/cart/infrastructure/fixtures/*.ts src/order/infrastructure/fixtures/
mv src/cart/infrastructure/repositories/*.ts src/order/infrastructure/repositories/

# Move application layer
mv src/cart/application/dtos/*.ts src/order/application/dtos/
mv src/cart/application/use-cases/*.ts src/order/application/use-cases/
# Note: Delete src/cart/application/services/ (CartCheckoutService removed)

# Move presentation layer
mv src/cart/presentation/controllers/*.ts src/order/presentation/controllers/
mv src/cart/presentation/dtos/*.ts src/order/presentation/dtos/
```

**Step 3: Update Import Paths**

**Find and replace across all moved files:**
```typescript
// Old imports
import { ... } from '@/cart/domain/entities/...';
import { ... } from '@/cart/domain/repositories/...';
import { ... } from '@/payment/domain/entities/...';
import { ... } from '@/payment/infrastructure/clients/...';

// New imports
import { ... } from '@/order/domain/entities/...';
import { ... } from '@/order/domain/repositories/...';
import { ... } from '@/order/domain/entities/...';
import { ... } from '@/order/infrastructure/clients/...';
```

**Update external references:**
- Any files in `src/product/` or `src/coupon/` that reference cart/payment should update to `@/order/*`

#### 3.2 Module Consolidation

**Update:** `src/order/order.module.ts`

**Before (Order Module only):**
```typescript
@Module({
  imports: [
    EventEmitterModule.forRoot(),
    CartModule,      // ❌ Remove
    CouponModule,
    ProductModule,
  ],
  providers: [
    // Order repositories
    { provide: ORDER_REPOSITORY, useClass: InMemoryOrderRepository },

    // Domain services
    StockReservationService,

    // Use cases
    CreateOrderUseCase,
    GetOrderUseCase,
    GetOrdersUseCase,

    // Event handlers
    PaymentCompletedHandler,

    // Jobs
    ReleaseExpiredReservationJob,
  ],
  controllers: [OrderController],
  exports: [ORDER_REPOSITORY],
})
export class OrderModule {}
```

**After (Unified Order Module):**
```typescript
@Module({
  imports: [
    EventEmitterModule.forRoot(),
    CouponModule,     // Only external dependency
    ProductModule,    // Only external dependency
  ],
  providers: [
    // Repositories
    { provide: CART_REPOSITORY, useClass: InMemoryCartRepository },
    { provide: ORDER_REPOSITORY, useClass: InMemoryOrderRepository },
    { provide: PAYMENT_REPOSITORY, useClass: InMemoryPaymentRepository },

    // External clients
    { provide: PAYMENT_API_CLIENT, useClass: MockPaymentApiClient },

    // Domain services
    CartStockValidationService,
    StockReservationService,

    // Use cases - Cart
    AddCartItemUseCase,
    GetCartUseCase,
    UpdateCartItemUseCase,
    RemoveCartItemUseCase,
    ClearCartUseCase,

    // Use cases - Order
    CreateOrderUseCase,
    GetOrderUseCase,
    GetOrdersUseCase,

    // Use cases - Payment
    ProcessPaymentUseCase,

    // Event handlers
    PaymentCompletedHandler,

    // Jobs
    ReleaseExpiredReservationJob,
  ],
  controllers: [
    CartController,
    OrderController,
    PaymentController,
  ],
  exports: [
    CART_REPOSITORY,
    ORDER_REPOSITORY,
    PAYMENT_REPOSITORY,
  ],
})
export class OrderModule {}
```

**Module Dependency Change:**
```
Before: OrderModule → CartModule, ProductModule, CouponModule
        PaymentModule → OrderModule
        CartModule → ProductModule

After:  OrderModule → ProductModule, CouponModule
```

### Phase 4: Test Migration & Validation

#### 4.1 Test File Migration

**Move all test files with their source files:**
```bash
# Cart tests
mv src/cart/domain/entities/*.spec.ts src/order/domain/entities/
mv src/cart/domain/services/*.spec.ts src/order/domain/services/
mv src/cart/infrastructure/repositories/*.spec.ts src/order/infrastructure/repositories/
mv src/cart/application/use-cases/*.spec.ts src/order/application/use-cases/
mv src/cart/presentation/controllers/*.spec.ts src/order/presentation/controllers/

# Payment tests
mv src/payment/domain/entities/*.spec.ts src/order/domain/entities/
mv src/payment/infrastructure/repositories/*.spec.ts src/order/infrastructure/repositories/
mv src/payment/application/use-cases/*.spec.ts src/order/application/use-cases/
mv src/payment/presentation/controllers/*.spec.ts src/order/presentation/controllers/
```

#### 4.2 Update Test Imports

**Update all test files:**
```typescript
// Old
import { Cart } from '@/cart/domain/entities/cart.entity';
import { Payment } from '@/payment/domain/entities/payment.entity';

// New
import { Cart } from '@/order/domain/entities/cart.entity';
import { Payment } from '@/order/domain/entities/payment.entity';
```

#### 4.3 Update Mock Providers

**Example: CreateOrderUseCase.spec.ts**

**Before:**
```typescript
providers: [
  CreateOrderUseCase,
  { provide: ORDER_REPOSITORY, useValue: mockOrderRepository },
  { provide: PRODUCT_REPOSITORY, useValue: mockProductRepository },
  { provide: StockReservationService, useValue: mockStockReservationService },
  { provide: CartCheckoutService, useValue: mockCartCheckoutService },  // ❌
  { provide: CouponApplicationService, useValue: mockCouponApplicationService },
]
```

**After:**
```typescript
providers: [
  CreateOrderUseCase,
  { provide: CART_REPOSITORY, useValue: mockCartRepository },  // ✅ Direct repository
  { provide: ORDER_REPOSITORY, useValue: mockOrderRepository },
  { provide: PRODUCT_REPOSITORY, useValue: mockProductRepository },
  { provide: StockReservationService, useValue: mockStockReservationService },
  { provide: CouponApplicationService, useValue: mockCouponApplicationService },
]
```

#### 4.4 Validation Checklist

**Run tests after each migration step:**
```bash
# Test domain layer
pnpm test src/order/domain

# Test infrastructure layer
pnpm test src/order/infrastructure

# Test application layer
pnpm test src/order/application

# Test presentation layer
pnpm test src/order/presentation

# Test entire order module
pnpm test src/order

# Test entire project
pnpm test
```

**Expected Results:**
- ✅ All existing tests pass (412 tests → 412 tests)
- ✅ No new failing tests introduced
- ✅ Test coverage remains the same or improves

### Phase 5: Cleanup & Documentation

#### 5.1 Remove Empty Directories

```bash
# Remove empty cart directory
rm -rf src/cart

# Remove empty payment directory
rm -rf src/payment
```

#### 5.2 Update Path Aliases (if needed)

**Check:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"],
      "@/order/*": ["src/order/*"],  // Should cover cart, order, payment now
      // Remove if they exist:
      // "@/cart/*": ["src/cart/*"],    // ❌ Delete
      // "@/payment/*": ["src/payment/*"]  // ❌ Delete
    }
  }
}
```

#### 5.3 Update App Module

**Update:** `src/app.module.ts`

**Before:**
```typescript
@Module({
  imports: [
    ProductModule,
    CartModule,      // ❌ Remove
    CouponModule,
    OrderModule,
    PaymentModule,   // ❌ Remove
  ],
})
export class AppModule {}
```

**After:**
```typescript
@Module({
  imports: [
    ProductModule,
    CouponModule,
    OrderModule,     // ✅ Unified module
  ],
})
export class AppModule {}
```

#### 5.4 Documentation Updates

**Update:**
- `README.md` - Update project structure
- `CLAUDE.md` - Update architecture description
- API documentation - No changes needed (endpoints unchanged)

## Key Refactoring Details

### Quantity Value Object

**Purpose:** Centralize quantity validation logic used in CartItem and OrderItem

**Benefits:**
- Single source of truth for quantity validation
- Type-safe quantity operations
- Consistent validation rules (integer, ≥ 1)

**Usage:**
```typescript
// CartItem
class CartItem {
  private _quantity: Quantity;

  constructor(quantity: number) {
    this._quantity = new Quantity(quantity);  // Validates automatically
  }

  increaseQuantity(amount: number): void {
    const additionalQuantity = new Quantity(amount);
    this._quantity = this._quantity.add(additionalQuantity);
  }

  get quantity(): number {
    return this._quantity.value;
  }
}
```

### CartCheckoutService Removal

**Rationale:**
- Application Services are meant for cross-domain orchestration
- Cart and Order are now in the same domain
- Direct repository access is simpler and more transparent

**Impact:**
- `CreateOrderUseCase` uses `CartRepository` directly
- Reduced indirection, clearer code flow
- No functional changes to order creation logic

### Exception Consolidation

**Before:**
- `src/cart/domain/cart.exceptions.ts`
- `src/order/domain/order.exceptions.ts`
- `src/payment/domain/payment.exceptions.ts`

**After:**
- `src/order/domain/order.exceptions.ts` (all exceptions unified)

**Benefits:**
- Single exception hierarchy
- Easier to handle exceptions across the domain
- No duplicate exception definitions

## What Stays Unchanged

### Database Schema (Prisma)
```prisma
// No changes to schema.prisma
model Cart { ... }        // Remains unchanged
model CartItem { ... }    // Remains unchanged
model Order { ... }       // Remains unchanged
model OrderItem { ... }   // Remains unchanged
model Payment { ... }     // Remains unchanged
```

### API Endpoints
```
POST   /cart/items              // Cart operations
GET    /cart
PATCH  /cart/items/:productOptionId
DELETE /cart/items/:productOptionId
DELETE /cart

POST   /orders                  // Order operations
GET    /orders
GET    /orders/:id

POST   /payments                // Payment operations
```

### User Scenarios
1. **Add to Cart** → CartController → AddCartItemUseCase → Cart entity
2. **Create Order** → OrderController → CreateOrderUseCase → Order entity
3. **Process Payment** → PaymentController → ProcessPaymentUseCase → Payment entity

All user flows remain identical.

### Business Rules
- All BR-CART-* rules unchanged
- All BR-ORDER-* rules unchanged
- All BR-PAY-* rules unchanged
- Stock reservation logic unchanged
- 10-minute expiration logic unchanged
- Coupon discount logic unchanged

### Background Jobs
- `ReleaseExpiredReservationJob` continues running every 1 minute
- Same logic: find expired orders → release stock → cancel orders

### Event-Driven Architecture
- `PaymentCompletedEvent` still emitted (or converted to direct call)
- Stock confirmation flow unchanged

## Migration Checklist

### Domain Layer
- [ ] Move Cart entities to Order domain
- [ ] Move Payment entities to Order domain
- [ ] Create Quantity Value Object
- [ ] Unify exception files
- [ ] Update repository interfaces
- [ ] Move domain services
- [ ] Update all domain layer imports

### Infrastructure Layer
- [ ] Move Cart repositories to Order
- [ ] Move Payment repositories to Order
- [ ] Move Payment API client to Order
- [ ] Move fixtures to Order
- [ ] Update all infrastructure imports

### Application Layer
- [ ] Move Cart use cases to Order
- [ ] Move Payment use cases to Order
- [ ] Remove CartCheckoutService
- [ ] Refactor CreateOrderUseCase (use CartRepository directly)
- [ ] Refactor ProcessPaymentUseCase (event or direct call)
- [ ] Move all DTOs to unified location
- [ ] Update all application layer imports

### Presentation Layer
- [ ] Move CartController to Order
- [ ] Move PaymentController to Order
- [ ] Move all presentation DTOs
- [ ] Update controller imports

### Module Configuration
- [ ] Create unified OrderModule
- [ ] Register all providers (cart, order, payment)
- [ ] Register all controllers
- [ ] Remove CartModule import from AppModule
- [ ] Remove PaymentModule import from AppModule
- [ ] Update OrderModule imports in other modules (if any)

### Testing
- [ ] Move all Cart test files
- [ ] Move all Payment test files
- [ ] Update test imports
- [ ] Update mock providers
- [ ] Run domain layer tests
- [ ] Run infrastructure layer tests
- [ ] Run application layer tests
- [ ] Run presentation layer tests
- [ ] Run full test suite (pnpm test)

### Cleanup
- [ ] Delete `src/cart/` directory
- [ ] Delete `src/payment/` directory
- [ ] Update `tsconfig.json` paths (if needed)
- [ ] Update `app.module.ts`
- [ ] Update documentation

## Testing Strategy

### Pre-Migration Testing
1. **Baseline Test Run**
   ```bash
   pnpm test
   # Record: X test suites passed, Y tests passed
   ```

2. **Create Test Snapshot**
   ```bash
   pnpm test -- --coverage
   # Save coverage report for comparison
   ```

### During Migration Testing
1. **Incremental Testing**
   - Test after moving each subdomain (Payment first, then Cart)
   - Test after each refactoring (Quantity VO, Exception unification)

2. **Import Verification**
   ```bash
   # Check for broken imports
   pnpm run build
   ```

### Post-Migration Testing
1. **Full Test Suite**
   ```bash
   pnpm test
   # Verify: Same number of tests passing
   ```

2. **Integration Tests**
   ```bash
   pnpm test:e2e  # If E2E tests exist
   ```

3. **Manual API Testing**
   - Test POST /cart/items (add item)
   - Test GET /cart (get cart)
   - Test POST /orders (create order)
   - Test POST /payments (process payment)
   - Verify end-to-end flow

### Rollback Plan
If tests fail after migration:
1. Use git to revert to pre-migration state
2. Review failed tests to identify issues
3. Fix issues incrementally
4. Re-run migration with fixes

## Expected Benefits

### 1. Improved Code Organization
- **Before**: Navigate 3 separate domain folders to understand order flow
- **After**: All order lifecycle logic in one domain folder
- **Impact**: Faster onboarding for new developers, easier code exploration

### 2. Reduced Duplication
- **Before**: Quantity validation in 2 places, exception definitions duplicated
- **After**: Single Quantity VO, unified exception hierarchy
- **Impact**: Less maintenance, consistent validation logic

### 3. Simplified Dependencies
- **Before**: 3 modules with complex bidirectional dependencies
- **After**: 1 module with 2 external dependencies (Product, Coupon)
- **Impact**: Easier testing, reduced circular dependency risk

### 4. Enhanced Maintainability
- **Before**: Changes to order flow require modifications across 3 domains
- **After**: Changes confined to single domain
- **Impact**: Faster development, fewer merge conflicts

### 5. Better Cohesion
- **Before**: Artificially separated domains for single business flow
- **After**: Unified domain matching business flow
- **Impact**: Code structure aligns with business reality

### 6. Preserved Functionality
- **API Contracts**: No changes to external interfaces
- **Database Schema**: No changes to data model
- **Business Rules**: All rules maintained exactly
- **Impact**: Zero downtime, backward compatible

## Implementation Steps

### Recommended Implementation Order

**Step 1: Create New Files (No Breaking Changes)**
1. Create `src/order/domain/value-objects/quantity.vo.ts`
2. Create `src/order/domain/value-objects/quantity.vo.spec.ts`
3. Run tests: `pnpm test src/order/domain/value-objects`

**Step 2: Migrate Payment Domain**
1. Copy (not move) Payment files to Order domain
2. Update imports in copied files
3. Update OrderModule to include Payment providers
4. Update AppModule to keep both PaymentModule and OrderModule temporarily
5. Run tests: `pnpm test`
6. If tests pass, delete original Payment files and remove PaymentModule from AppModule

**Step 3: Migrate Cart Domain**
1. Copy (not move) Cart files to Order domain
2. Update imports in copied files
3. Update OrderModule to include Cart providers
4. Update AppModule to keep both CartModule and OrderModule temporarily
5. Run tests: `pnpm test`
6. If tests pass, delete original Cart files and remove CartModule from AppModule

**Step 4: Refactor CartCheckoutService**
1. Update CreateOrderUseCase to use CartRepository directly
2. Update CreateOrderUseCase tests to mock CartRepository
3. Remove CartCheckoutService files
4. Run tests: `pnpm test src/order/application/use-cases/create-order`

**Step 5: Integrate Quantity VO (Optional for Phase 1)**
1. Update CartItem to use Quantity VO
2. Update OrderItem to use Quantity VO
3. Update related tests
4. Run tests: `pnpm test src/order/domain/entities`

**Step 6: Final Validation**
1. Run full test suite: `pnpm test`
2. Run build: `pnpm run build`
3. Manual API testing
4. Code review

### Time Estimate
- **Step 1**: 1 hour
- **Step 2**: 2-3 hours
- **Step 3**: 2-3 hours
- **Step 4**: 1 hour
- **Step 5**: 2 hours (optional)
- **Step 6**: 1 hour
- **Total**: 9-12 hours (1-2 days)

## Risks and Mitigations

### Risk 1: Breaking Existing Functionality
**Mitigation:**
- Comprehensive test coverage (412 tests)
- Incremental migration with testing after each step
- Copy-first approach (keep original until verified)

### Risk 2: Import Path Errors
**Mitigation:**
- Use TypeScript compiler to catch import errors
- Run `pnpm run build` frequently
- Search and replace with verification

### Risk 3: Test Failures
**Mitigation:**
- Establish baseline before migration
- Test incrementally (per subdomain)
- Clear rollback plan via git

### Risk 4: Merge Conflicts (Team Environment)
**Mitigation:**
- Communicate migration plan to team
- Perform migration in dedicated branch
- Minimize time between start and PR creation

## Success Criteria

### Functional Requirements
- ✅ All existing tests pass (412 tests)
- ✅ All API endpoints work identically
- ✅ User flows unchanged (cart → order → payment)
- ✅ Background jobs continue running
- ✅ Stock reservation logic intact

### Code Quality Requirements
- ✅ No duplicate business logic
- ✅ TypeScript compilation succeeds
- ✅ No circular dependencies
- ✅ Test coverage maintained or improved

### Architecture Requirements
- ✅ Single OrderModule with clear structure
- ✅ Unified exception hierarchy
- ✅ Simplified module dependencies
- ✅ Clear domain boundaries with external modules

## Related Issues
- Issue #006: Cart Domain Implementation
- Issue #010: Order Domain Implementation
- Issue #011: Payment Domain Implementation

## References
- [DDD: Aggregate Design](https://martinfowler.com/bliki/DDD_Aggregate.html)
- [Bounded Context](https://martinfowler.com/bliki/BoundedContext.html)
- [Value Objects in DDD](https://martinfowler.com/bliki/ValueObject.html)
