# Issue 015: Authentication Guard Implementation

## Issue Type
Bug / Feature Gap

## Priority
High

## Status
Open

---

## Problem Statement

Authentication guards have been implemented in the codebase but are **not applied to most protected endpoints**. Currently, only the User controller has authentication enabled, while Cart, Order, Payment, and Coupon controllers remain unprotected despite having authentication requirements documented in Swagger.

**Impact:**
- Any user can access cart, order, payment, and coupon endpoints without authentication
- Security vulnerability: unauthorized access to sensitive user data and operations
- Gap between API documentation (Swagger) and actual implementation
- All controllers use hardcoded `userId = 'user-1'` instead of authenticated user

---

## Current State Analysis

### Available Authentication Infrastructure

**Guards Implemented:**
1. **FakeAuthGuard** (`src/__fake__/auth/fake-auth.guard.ts`)
   - Uses Master Token approach
   - Validates Bearer tokens from `TOKEN_USER_MAP`
   - Simple validation for testing

2. **FakeJwtAuthGuard** (`src/__fake__/auth/fake-jwt-auth.guard.ts`)
   - Uses JWT token validation with JwtService
   - More sophisticated error handling
   - Standard JWT-based authentication

**Authentication Endpoints:**
- `POST /api/v1/fake-auth/login` - Working login endpoint
  - Test users: `user1/test1` (userId: user-001), `user2/test2` (userId: user-002)
  - Returns JWT access token

**Test Credentials:**
- Master Tokens (for FakeAuthGuard):
  - `test-master-token-12345` → `user-uuid-1`
  - `test-token-user2` → `user-uuid-2`
  - `test-token-user3` → `user-uuid-3`

- JWT Users (for FakeJwtAuthGuard):
  - Username: `user1`, Password: `test1` → userId: `user-001`
  - Username: `user2`, Password: `test2` → userId: `user-002`

### Current Protection Status

**✅ PROTECTED (1 controller):**
- **UserController** (`src/user/presentation/controllers/user.controller.ts`)
  - `GET /api/v1/users/me` - Uses `@UseGuards(FakeAuthGuard)` + `@ApiBearerAuth('access-token')`

**❌ UNPROTECTED (4 controllers):**

1. **CartController** (`src/order/presentation/controllers/cart.controller.ts`)
   - `POST /api/v1/carts/items` - Add item to cart
   - `GET /api/v1/carts` - Get user's cart
   - `PATCH /api/v1/carts/items/:id` - Update cart item quantity
   - `DELETE /api/v1/carts/items/:id` - Remove cart item
   - `DELETE /api/v1/carts` - Clear cart
   - **Issue:** Uses `const userId = 'user-1'; // TODO: 추후 @CurrentUser() 데코레이터로 변경`

2. **OrderController** (`src/order/presentation/controllers/order.controller.ts`)
   - `POST /api/v1/orders` - Create order
   - `GET /api/v1/orders/:id` - Get order detail
   - `GET /api/v1/orders` - Get user's orders
   - **Issue:** Uses `const userId = 'user-1'; // TODO: 추후 @CurrentUser() 데코레이터로 변경`

3. **PaymentController** (`src/order/presentation/controllers/payment.controller.ts`)
   - `POST /api/v1/payments` - Process payment
   - **Issue:** Uses `const userId = 'user-1'; // TODO: 추후 인증에서 추출`

4. **CouponController** (`src/coupon/presentation/controllers/coupon.controller.ts`)
   - `POST /api/v1/coupons/:id/issue` - Issue coupon to user
   - `GET /api/v1/coupons/my` - Get user's coupons
   - **Issue:** Uses `const userId = 'user-1'; // TODO: 추후 인증에서 추출`

**✓ CORRECTLY PUBLIC (1 controller):**
- **ProductController** (`src/product/presentation/controllers/product.controller.ts`)
  - `GET /api/v1/products` - List products (public)
  - `GET /api/v1/products/:id` - Get product detail (public)

---

## Root Cause

1. **Missing Guard Decorators**
   - Controllers lack `@UseGuards(FakeAuthGuard)` or `@UseGuards(FakeJwtAuthGuard)` decorators
   - No global guard configuration in AppModule

2. **Missing Swagger Documentation**
   - Controllers lack `@ApiBearerAuth('access-token')` decorators
   - Swagger UI doesn't show lock icons on protected endpoints

3. **Hardcoded User IDs**
   - All controllers use hardcoded `userId = 'user-1'`
   - Controllers don't extract authenticated user from request object

4. **Documentation vs Implementation Gap**
   - Swagger description in `main.ts` states authentication is required for carts, orders, payments, coupons
   - Actual implementation doesn't enforce this requirement

---

## Technical Requirements

### 1. Choose Guard Strategy

**Option A: Controller-Level Guards (Recommended)**
```typescript
import { FakeJwtAuthGuard } from '@/__fake__/auth/fake-jwt-auth.guard';

@Controller('carts')
@UseGuards(FakeJwtAuthGuard)  // Apply to entire controller
@ApiBearerAuth('access-token')
export class CartController {
  // All methods inherit guard
}
```

**Benefits:**
- Explicit and clear which controllers are protected
- Easy to have different guards per controller if needed
- Follows NestJS best practices

**Option B: Global Guard**
```typescript
// In app.module.ts providers array
{
  provide: APP_GUARD,
  useClass: FakeJwtAuthGuard,
}
```

**Benefits:**
- All endpoints protected by default
- Need to explicitly mark public endpoints with `@Public()` decorator
- More secure (can't forget to add guards)

**Drawbacks:**
- Requires creating `@Public()` decorator
- Need to mark ProductController and FakeAuthController as public

### 2. Update Controllers

For each protected controller, apply these changes:

**Before:**
```typescript
@Controller('carts')
export class CartController {
  @Post('items')
  async addItem(@Body() dto: AddCartItemRequestDto) {
    const userId = 'user-1'; // TODO: 추후 @CurrentUser() 데코레이터로 변경
    // ...
  }
}
```

**After:**
```typescript
import { Request } from 'express';
import { FakeJwtAuthGuard } from '@/__fake__/auth/fake-jwt-auth.guard';

@Controller('carts')
@UseGuards(FakeJwtAuthGuard)
@ApiBearerAuth('access-token')
export class CartController {
  @Post('items')
  async addItem(
    @Body() dto: AddCartItemRequestDto,
    @Request() req,
  ) {
    const userId = req.user.userId;  // Extract from authenticated user
    // ...
  }
}
```

### 3. User Object Structure

After authentication, `req.user` contains:
```typescript
{
  userId: string;  // e.g., 'user-001', 'user-002'
  username: string; // e.g., 'user1', 'user2'
}
```

### 4. Optional: Create @CurrentUser() Decorator

For cleaner code, create a custom decorator:

```typescript
// src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

**Usage:**
```typescript
@Post('items')
async addItem(
  @Body() dto: AddCartItemRequestDto,
  @CurrentUser() user: { userId: string; username: string },
) {
  const userId = user.userId;
  // ...
}
```

---

## Implementation Checklist

### Phase 1: Add Guards to Controllers

- [ ] **CartController** (`src/order/presentation/controllers/cart.controller.ts`)
  - [ ] Add `@UseGuards(FakeJwtAuthGuard)` to controller class
  - [ ] Add `@ApiBearerAuth('access-token')` to controller class
  - [ ] Update all 5 methods to extract userId from `req.user`

- [ ] **OrderController** (`src/order/presentation/controllers/order.controller.ts`)
  - [ ] Add `@UseGuards(FakeJwtAuthGuard)` to controller class
  - [ ] Add `@ApiBearerAuth('access-token')` to controller class
  - [ ] Update all 3 methods to extract userId from `req.user`

- [ ] **PaymentController** (`src/order/presentation/controllers/payment.controller.ts`)
  - [ ] Add `@UseGuards(FakeJwtAuthGuard)` to controller class
  - [ ] Add `@ApiBearerAuth('access-token')` to controller class
  - [ ] Update payment method to extract userId from `req.user`

- [ ] **CouponController** (`src/coupon/presentation/controllers/coupon.controller.ts`)
  - [ ] Add `@UseGuards(FakeJwtAuthGuard)` to controller class
  - [ ] Add `@ApiBearerAuth('access-token')` to controller class
  - [ ] Update both methods to extract userId from `req.user`

### Phase 2: Optional Improvements

- [ ] Create `@CurrentUser()` decorator for cleaner code
- [ ] Update all controllers to use `@CurrentUser()` instead of `@Request()`
- [ ] Consider global guard + `@Public()` decorator approach

### Phase 3: Testing

- [ ] **Manual Testing via Swagger UI:**
  1. Go to `http://localhost:3000/docs`
  2. Try accessing protected endpoints without auth → Should get 401
  3. Click "Authorize" button, login via `/api/v1/fake-auth/login`
  4. Copy JWT token and paste into authorization modal
  5. Try accessing protected endpoints with auth → Should work
  6. Verify different users can only access their own data

- [ ] **Integration Tests:**
  - [ ] Update existing integration tests to authenticate before requests
  - [ ] Add test for 401 Unauthorized when no token provided
  - [ ] Add test for 401 Unauthorized when invalid token provided
  - [ ] Add test for successful request with valid token

### Phase 4: Documentation

- [ ] Remove all TODO comments about authentication
- [ ] Verify Swagger documentation shows lock icons on protected endpoints
- [ ] Update README or API docs if needed

---

## File Locations

### Files to Modify
```
src/order/presentation/controllers/cart.controller.ts
src/order/presentation/controllers/order.controller.ts
src/order/presentation/controllers/payment.controller.ts
src/coupon/presentation/controllers/coupon.controller.ts
```

### Files to Reference
```
src/__fake__/auth/fake-jwt-auth.guard.ts      # Guard to use
src/__fake__/auth/fake-auth.guard.ts          # Alternative guard
src/__fake__/auth/fake-auth.controller.ts     # Login endpoint
src/__fake__/auth/fake-users.ts               # Test users
src/__fake__/auth/master-token.ts             # Master tokens
src/user/presentation/controllers/user.controller.ts  # Example of protected controller
src/main.ts                                   # Swagger configuration
src/app.module.ts                             # Module configuration
```

### Files to Create (Optional)
```
src/common/decorators/current-user.decorator.ts  # Custom @CurrentUser() decorator
src/common/decorators/public.decorator.ts        # If using global guard approach
```

---

## Success Criteria

- [ ] All 4 controllers (Cart, Order, Payment, Coupon) have authentication guards applied
- [ ] All protected endpoints return 401 Unauthorized without valid token
- [ ] All protected endpoints work correctly with valid JWT token
- [ ] Swagger UI shows lock icons on protected endpoints
- [ ] No hardcoded `userId = 'user-1'` in any controller
- [ ] All controllers extract userId from authenticated user
- [ ] Different users can only access their own data (cart, orders, coupons)
- [ ] Integration tests pass with authentication
- [ ] Manual testing in Swagger UI confirms authentication works

---

## Related Issues

- **Issue #013**: User domain implementation and Master Token authentication (completed)
- **Issue #014**: Product domain stock management refactoring (completed)

---

## Notes

- Choose between `FakeJwtAuthGuard` (JWT-based, recommended) and `FakeAuthGuard` (Master Token)
- If using global guard approach, must create `@Public()` decorator for ProductController and FakeAuthController
- Consider using `@CurrentUser()` decorator for cleaner, more maintainable code
- All test users and tokens are configured in `src/__fake__/auth/` directory
- JwtModule is already configured globally in AppModule with secret `fake-secret-key-for-testing`

---

## References

- NestJS Guards Documentation: https://docs.nestjs.com/guards
- NestJS Authentication: https://docs.nestjs.com/security/authentication
- Swagger Bearer Auth: https://docs.nestjs.com/openapi/security
