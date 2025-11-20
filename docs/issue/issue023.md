# Issue #023: Cart Domain Prisma Integration

## Status
- **Created**: 2025-11-20
- **Branch**: TBD
- **Type**: Infrastructure Implementation
- **Priority**: High
- **Current Status**: Not Started

### Progress Summary

| Task | Status | Commit |
|------|--------|--------|
| Prisma Schema Definition (Cart, CartItem) | ⏳ Not Started | Pending |
| Seed Data Implementation | ⏳ Not Started | Pending |
| CartPrismaRepository | ⏳ Not Started | Pending |
| Module Configuration | ⏳ Not Started | Pending |
| Testcontainers Integration Tests | ⏳ Not Started | Pending |

## Objective
Cart 도메인의 데이터베이스 통합을 구현합니다. 현재 Cart Entity와 Use Cases는 구현되어 있으나, Prisma 스키마와 Repository가 누락되어 있습니다.

### Goals
1. Cart, CartItem Prisma 스키마 정의
2. CartPrismaRepository 구현
3. OrderModule 환경별 Repository 분기 설정
4. Testcontainers 통합 테스트 작성
5. 예시 데이터 (Seed) 추가

## Background
Cart 도메인은 이미 다음이 구현되어 있습니다:
- ✅ Cart Entity (`src/order/domain/entities/cart.entity.ts`)
- ✅ CartItem Entity (`src/order/domain/entities/cart.entity.ts`)
- ✅ CartRepository Interface (`src/order/domain/repositories/cart.repository.ts`)
- ✅ InMemoryCartRepository (`src/order/infrastructure/repositories/in-memory-cart.repository.ts`)
- ✅ Cart Use Cases (AddCartItem, GetCart, UpdateCartItem, RemoveCartItem, ClearCart)
- ✅ CartController (5개 엔드포인트)

하지만 Prisma 통합이 누락되어 있어, 실제 데이터베이스에 장바구니 데이터가 저장되지 않습니다.

## Technical Approach

### Technology Stack
- **ORM**: Prisma 6.x
- **Database**: MySQL 8.0
- **Testing**: Testcontainers (MySQL container)

### Cart Architecture

#### Cart Entity Structure
```typescript
Cart {
  id: string (UUID)
  userId: string (FK to User)
  items: CartItem[]
  createdAt: Date
  updatedAt: Date
}
```

#### CartItem Entity Structure
```typescript
CartItem {
  id: string (UUID)
  cartId: string (FK to Cart)
  productId: string (FK to Product)
  productName: string
  productOptionId: string (FK to ProductOption)
  price: number
  quantity: number
  createdAt: Date
}
```

### Key Features
- 사용자당 장바구니 1개 (Unique constraint on userId)
- CartItem은 Cart에 종속 (Cascade delete)
- Product/ProductOption 참조 (FK)
- 상품명/가격 스냅샷 저장 (주문 시점 가격 보존)

## Tasks

### Task 1: Prisma Schema Definition
**Deliverables:**
- Cart model in `schema.prisma`
- CartItem model in `schema.prisma`
- Relationships and constraints
- Migration file

**Schema Design:**

```prisma
/// 장바구니 엔티티
/// - 사용자당 장바구니 1개
/// - CartItem을 포함하여 조회
model Cart {
  id        String   @id @default(uuid())
  userId    String   @unique // 사용자당 장바구니 1개
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user  User       @relation(fields: [userId], references: [id])
  items CartItem[]

  @@index([userId])
  @@map("carts")
}

/// 장바구니 아이템 엔티티
/// - 상품 정보 스냅샷 저장 (주문 시점 가격 보존)
/// - 수량 조정 가능
model CartItem {
  id              String   @id @default(uuid())
  cartId          String
  productId       String
  productName     String   // 상품명 스냅샷
  productOptionId String
  price           Decimal  @db.Decimal(10, 2) // 가격 스냅샷
  quantity        Int
  createdAt       DateTime @default(now())

  cart          Cart          @relation(fields: [cartId], references: [id], onDelete: Cascade)
  product       Product       @relation(fields: [productId], references: [id])
  productOption ProductOption @relation(fields: [productOptionId], references: [id])

  @@index([cartId])
  @@index([productId])
  @@index([productOptionId])
  @@map("cart_items")
}
```

**Acceptance Criteria:**
- Schema compiles without errors
- Relationships are correctly defined
- Unique constraint on Cart.userId
- Cascade delete for CartItem
- Migration generated successfully

**Commit:**
```
feat: Cart/CartItem Prisma 스키마 및 Migration 추가

- Cart, CartItem 모델 정의
- 관계 설정 (User → Cart → CartItem → Product/ProductOption)
- 사용자당 장바구니 1개 unique 제약조건
- CartItem Cascade delete 설정
- Migration 생성 및 실행
```

---

### Task 2: Seed Data Implementation
**Deliverables:**
- `prisma/seed.ts` 업데이트
- 예시 장바구니 데이터 2-3개
- 예시 CartItem 데이터 (다양한 상품/옵션 조합)

**Seed Data Structure:**
```typescript
// 장바구니 예시 데이터
- 장바구니 1 (사용자 1): 아이템 3개
  - 상품 1 (옵션 1): 수량 2
  - 상품 2 (옵션 1): 수량 1
  - 상품 3 (옵션 2): 수량 1

- 장바구니 2 (사용자 2): 아이템 1개
  - 상품 1 (옵션 2): 수량 5

- 장바구니 3 (사용자 3): 빈 장바구니 (아이템 0개)
```

**Acceptance Criteria:**
- `pnpm prisma db seed` 실행 성공
- Cart, CartItem 데이터 생성
- 기존 User, Product, ProductOption과 연결

**Commit:**
```
feat: Cart/CartItem Seed 데이터 추가

- 3개 장바구니 예시 데이터 (아이템 있음/없음)
- 다양한 상품/옵션 조합 CartItem 데이터
```

---

### Task 3: CartPrismaRepository Implementation
**Deliverables:**
- `src/order/infrastructure/repositories/cart-prisma.repository.ts`
- Implements `CartRepository` interface

**Key Methods:**
```typescript
class CartPrismaRepository implements CartRepository {
  async findByUserId(userId: string): Promise<Cart | null> {
    // CartItem 포함 조회 (include)
    // Prisma 모델 → Domain Entity 변환
  }

  async save(cart: Cart): Promise<Cart> {
    // Upsert Cart
    // CartItem 동기화 (기존 삭제 + 새로 생성)
    // 트랜잭션 처리
  }

  async clearByUserId(userId: string): Promise<void> {
    // CartItem Cascade delete로 자동 삭제됨
  }
}
```

**Domain Entity → Prisma Model Mapping:**
```typescript
// Cart Entity → CartData (from method)
const cartData = cart.toData();

// Prisma create
await prisma.cart.create({
  data: {
    id: cartData.id,
    userId: cartData.userId,
    createdAt: cartData.createdAt,
    updatedAt: cartData.updatedAt,
    items: {
      create: cartData.items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productOptionId: item.productOptionId,
        price: item.price,
        quantity: item.quantity,
        createdAt: item.createdAt,
      }))
    }
  }
});
```

**Prisma Model → Domain Entity Mapping:**
```typescript
// Prisma query result
const prismaCart = await prisma.cart.findUnique({
  where: { userId },
  include: { items: true }
});

// CartData (from method parameter)
const cartData: CartData = {
  id: prismaCart.id,
  userId: prismaCart.userId,
  items: prismaCart.items.map(item => ({
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    productOptionId: item.productOptionId,
    price: item.price.toNumber(),
    quantity: item.quantity,
    createdAt: item.createdAt,
  })),
  createdAt: prismaCart.createdAt,
  updatedAt: prismaCart.updatedAt,
};

return Cart.from(cartData);
```

**Acceptance Criteria:**
- All interface methods implemented
- Prisma model ↔ Domain entity conversion
- Transaction support for save()
- CartItem synchronization (delete old + create new)

**Commit:**
```
feat: CartPrismaRepository 구현

- CartPrismaRepository 구현 (CartRepository)
- Prisma 모델 ↔ Domain 엔티티 변환
- CartItem 동기화 트랜잭션 처리
- findByUserId, save, clearByUserId 구현
```

---

### Task 4: Module Configuration
**Deliverables:**
- `src/order/order.module.ts` 업데이트
- 환경별 Repository 분기 설정

**Module Provider:**
```typescript
// OrderModule
{
  provide: CART_REPOSITORY,
  useClass: process.env.NODE_ENV === 'test'
    ? InMemoryCartRepository
    : CartPrismaRepository,
}
```

**Acceptance Criteria:**
- Test environment uses InMemoryCartRepository
- Other environments use CartPrismaRepository
- CART_REPOSITORY token correctly injected

**Commit:**
```
feat: OrderModule에 환경별 Cart Repository 분기

- NODE_ENV === 'test' → InMemoryCartRepository
- 그 외 → CartPrismaRepository
- CART_REPOSITORY 토큰 주입
```

---

### Task 5: Integration Testing with Testcontainers
**Deliverables:**
- `test/cart/integration/cart-prisma.repository.integration.spec.ts`

**Test Coverage:**

**Cart Repository:**
- 사용자별 장바구니 조회 (CartItem 포함)
- 장바구니 저장 (신규 생성)
- 장바구니 저장 (기존 업데이트 - CartItem 동기화)
- 장바구니 비우기
- 존재하지 않는 사용자 조회 시 null 반환

**Test Cases:**
```typescript
describe('CartPrismaRepository 통합 테스트', () => {
  describe('findByUserId', () => {
    it('사용자 ID로 장바구니를 조회해야 함', async () => {
      // Given: Seed 데이터의 사용자 장바구니

      // When: findByUserId 호출
      const cart = await repository.findByUserId(userId);

      // Then: Cart Entity 반환 (CartItem 포함)
      expect(cart).toBeDefined();
      expect(cart.items).toHaveLength(3);
    });

    it('장바구니가 없는 사용자는 null을 반환해야 함', async () => {
      // When: 존재하지 않는 사용자
      const cart = await repository.findByUserId('non-existent');

      // Then: null 반환
      expect(cart).toBeNull();
    });
  });

  describe('save', () => {
    it('신규 장바구니를 생성해야 함', async () => {
      // Given: 새로운 Cart Entity
      const cart = Cart.create(userId);
      cart.addItem(productId, productName, productOptionId, price, quantity);

      // When: save 호출
      await repository.save(cart);

      // Then: DB에 저장됨
      const saved = await prisma.cart.findUnique({
        where: { userId },
        include: { items: true }
      });
      expect(saved).toBeDefined();
      expect(saved.items).toHaveLength(1);
    });

    it('기존 장바구니를 업데이트하고 CartItem을 동기화해야 함', async () => {
      // Given: 기존 장바구니 (아이템 2개)
      const cart = await repository.findByUserId(userId);

      // When: 아이템 추가 + 저장
      cart.addItem(newProductId, newProductName, newOptionId, price, quantity);
      await repository.save(cart);

      // Then: CartItem 동기화 (기존 2개 삭제 + 새로 3개 생성)
      const updated = await prisma.cart.findUnique({
        where: { userId },
        include: { items: true }
      });
      expect(updated.items).toHaveLength(3);
    });
  });

  describe('clearByUserId', () => {
    it('사용자 장바구니를 비워야 함', async () => {
      // Given: 아이템이 있는 장바구니

      // When: clearByUserId 호출
      await repository.clearByUserId(userId);

      // Then: Cart는 유지, CartItem만 삭제
      const cart = await prisma.cart.findUnique({
        where: { userId },
        include: { items: true }
      });
      expect(cart).toBeDefined();
      expect(cart.items).toHaveLength(0);
    });
  });
});
```

**Acceptance Criteria:**
- All integration tests pass
- Testcontainers MySQL setup
- CartItem synchronization validated
- Cascade delete verified

**Commit:**
```
test: Cart 도메인 Testcontainers 통합 테스트

- CartPrismaRepository 통합 테스트
- findByUserId, save, clearByUserId 검증
- CartItem 동기화 테스트
- Cascade delete 검증
```

---

## Verification Checklist

### Functional Requirements
- [ ] Cart CRUD operations work correctly
- [ ] CartItem included in queries
- [ ] User can have only one cart (unique constraint)
- [ ] CartItem synchronization on save
- [ ] Cascade delete for CartItem
- [ ] Product/ProductOption references valid

### Non-Functional Requirements
- [ ] Cart retrieval <100ms
- [ ] CartItem synchronization transactional
- [ ] All integration tests pass
- [ ] Migration applied successfully

### Code Quality
- [ ] Repository pattern followed
- [ ] Domain entity validation preserved
- [ ] Error handling comprehensive
- [ ] Korean comments for readability

## Testing Strategy

### Integration Tests
- Cart repository operations
- CartItem synchronization
- Cascade delete behavior
- Unique constraint validation

### Manual Testing
- `pnpm prisma db seed` - Seed data creation
- `pnpm test:integration` - Integration tests
- API endpoints (CartController)

## Migration Strategy

### Repository Selection
```typescript
// OrderModule
{
  provide: CART_REPOSITORY,
  useClass: process.env.NODE_ENV === 'test'
    ? InMemoryCartRepository
    : CartPrismaRepository,
}
```

### Data Migration
- No existing production data (new feature)
- Seed data provides examples

## Dependencies

### Database Schema
- Builds on User domain (Issue #019) ✅
- Builds on Product domain (Issue #020) ✅
- References: User, Product, ProductOption

### Domain Integration
- Cart Use Cases already implemented ✅
- CartController already implemented ✅

## Related Issues
- **Blocked by**: Issue #019 (User domain) ✅
- **Blocked by**: Issue #020 (Product domain) ✅
- **Related**: Issue #021 (Order domain) - 주문 생성 시 장바구니 사용

## References
- [Data Model](/docs/dev/dashboard/data-model.md) - Cart schema
- [Requirements](/docs/dev/dashboard/requirements.md) - FR-CART-01~06
- [User Stories](/docs/dev/dashboard/user-stories.md) - US-CART-01~06
- [API Specification](/docs/dev/dashboard/api-specification.md) - Cart endpoints
- [Issue #019](/docs/issue/issue019.md) - User domain pattern
- [Issue #020](/docs/issue/issue020.md) - Product domain pattern

## Notes
- Cart Entity and Use Cases are already implemented - only DB integration needed
- CartItem 동기화 전략: 기존 모두 삭제 후 재생성 (단순하고 안전)
- 상품명/가격 스냅샷 저장으로 주문 시점 가격 보존
- Cascade delete로 CartItem 관리 간소화

---

**Issue created**: 2025-11-20
**Target completion**: Phase 5 of DB integration
**Critical path**: CartItem synchronization in save()
