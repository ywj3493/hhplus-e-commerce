# Issue #020: DB Integration Phase 2 - Product & Category Domain

## Status
- **Created**: 2025-11-20
- **Branch**: `step7`
- **Type**: Infrastructure Implementation
- **Priority**: High

## Objective
Implement Product and Category domain database integration with Prisma ORM, including stock concurrency control using pessimistic locking.

### Goals
1. Design and implement Product domain Prisma schema (Category, Product, ProductOption, Stock)
2. Implement CategoryPrismaRepository
3. Implement ProductPrismaRepository with stock concurrency control
4. Write Testcontainers integration tests
5. Validate stock reservation and release operations

## Background
Following Phase 1 (User domain), this phase focuses on the most critical domain for e-commerce: Product management. This domain requires special attention to:
- **Stock concurrency control**: Multiple users purchasing the same product simultaneously
- **Complex relationships**: Category → Product → ProductOption → Stock
- **Performance optimization**: Frequently queried data with JOIN operations

## Technical Approach

### Technology Stack
- **ORM**: Prisma 6.x
- **Database**: MySQL 8.0
- **Concurrency Control**: Pessimistic Locking (SELECT FOR UPDATE)
- **Testing**: Testcontainers (MySQL container)

### Stock Architecture

#### Stock Entity Structure
```typescript
Stock {
  id: string (UUID)
  productId: string (FK to Product)
  productOptionId: string | null (FK to ProductOption, nullable)
  totalQuantity: number
  availableQuantity: number
  reservedQuantity: number
  soldQuantity: number
  updatedAt: Date
}
```

#### Stock Invariants
- `totalQuantity = availableQuantity + reservedQuantity + soldQuantity`
- `availableQuantity >= 0`
- `reservedQuantity >= 0`
- `soldQuantity >= 0`

#### Concurrency Control Strategy
**Pessimistic Locking (비관적 락)** using `SELECT FOR UPDATE`:

```sql
-- Reserve stock (주문 시)
BEGIN TRANSACTION;
SELECT * FROM stocks WHERE id = ? FOR UPDATE;
UPDATE stocks
SET availableQuantity = availableQuantity - ?,
    reservedQuantity = reservedQuantity + ?
WHERE id = ?;
COMMIT;
```

**Why Pessimistic Locking?**
- E-commerce stock management requires **absolute consistency**
- Prevents overselling in high-concurrency scenarios
- Simpler to implement than optimistic locking (no version field needed)
- Assignment 05 requirement: DB-based concurrency control

## Tasks

### Task 1: Prisma Schema Definition
**Deliverables:**
- Category model in `schema.prisma`
- Product model in `schema.prisma`
- ProductOption model in `schema.prisma`
- Stock model in `schema.prisma`
- Relationships and constraints
- Indexes for performance

**Schema Design:**

```prisma
/// 카테고리 엔티티
/// - 단일 계층 구조
model Category {
  id        String    @id @default(uuid())
  name      String    @unique
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  products Product[]

  @@map("categories")
}

/// 상품 엔티티
model Product {
  id          String   @id @default(uuid())
  name        String
  description String   @db.Text
  price       Decimal  @db.Decimal(10, 2)
  categoryId  String
  hasOptions  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  category Category         @relation(fields: [categoryId], references: [id])
  options  ProductOption[]
  stocks   Stock[]

  @@index([categoryId])
  @@index([createdAt])
  @@map("products")
}

/// 상품 옵션 엔티티
model ProductOption {
  id              String   @id @default(uuid())
  productId       String
  type            String   // 색상, 사이즈 등
  name            String   // Red, XL 등
  additionalPrice Decimal  @db.Decimal(10, 2)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  product Product @relation(fields: [productId], references: [id])
  stocks  Stock[]

  @@index([productId])
  @@map("product_options")
}

/// 재고 엔티티 (동시성 제어 대상)
model Stock {
  id                String   @id @default(uuid())
  productId         String
  productOptionId   String?  // nullable
  totalQuantity     Int
  availableQuantity Int
  reservedQuantity  Int      @default(0)
  soldQuantity      Int      @default(0)
  updatedAt         DateTime @updatedAt

  product       Product        @relation(fields: [productId], references: [id])
  productOption ProductOption? @relation(fields: [productOptionId], references: [id])

  @@unique([productId, productOptionId])
  @@index([productId])
  @@index([productOptionId])
  @@map("stocks")
}
```

**Acceptance Criteria:**
- Schema compiles without errors
- Relationships are correctly defined
- Indexes are appropriate for query patterns

**Commit:**
```
feat: Product/Category Prisma 스키마 및 Migration 추가

- Category, Product, ProductOption, Stock 모델 정의
- 관계 설정 (Category → Product → ProductOption → Stock)
- 재고 동시성 제어를 위한 인덱스 설정
- Stock unique 제약조건 (productId, productOptionId)
- Migration 생성 및 실행
```

---

### Task 2: CategoryPrismaRepository Implementation
**Deliverables:**
- `src/product/infrastructure/repositories/category-prisma.repository.ts`
- Implements `ICategoryRepository` interface

**Key Methods:**
```typescript
class CategoryPrismaRepository implements ICategoryRepository {
  async findAll(): Promise<Category[]>
  async findById(categoryId: string): Promise<Category | null>
  async findByName(name: string): Promise<Category | null>
}
```

**Acceptance Criteria:**
- All interface methods implemented
- Prisma model → Domain entity mapping
- Error handling for database constraints

**Commit:**
```
feat: CategoryPrismaRepository 구현

- CategoryPrismaRepository 구현 (ICategoryRepository)
- Prisma 모델 ↔ Domain 엔티티 변환
- ProductModule에 환경별 Repository 분기
```

---

### Task 3: ProductPrismaRepository with Stock Concurrency Control
**Deliverables:**
- `src/product/infrastructure/repositories/product-prisma.repository.ts`
- Implements `IProductRepository` interface
- **Stock concurrency control** using `SELECT FOR UPDATE`

**Critical Methods:**

```typescript
class ProductPrismaRepository implements IProductRepository {
  // Basic CRUD
  async findById(productId: string): Promise<Product | null>
  async findAll(params: FindAllParams): Promise<Product[]>
  async count(): Promise<number>

  // Stock operations with pessimistic locking
  async reserveStock(
    stockId: string,
    quantity: number
  ): Promise<void> {
    // SELECT FOR UPDATE to prevent race conditions
    await this.prisma.$transaction(async (tx) => {
      const stock = await tx.stock.findUnique({
        where: { id: stockId },
        // Prisma의 비관적 락은 raw query로 구현
      });

      await tx.$executeRaw`
        SELECT * FROM stocks WHERE id = ${stockId} FOR UPDATE
      `;

      // Validate and update
      await tx.stock.update({ ... });
    });
  }

  async releaseStock(stockId: string, quantity: number): Promise<void>
  async confirmStock(stockId: string, quantity: number): Promise<void>
}
```

**Acceptance Criteria:**
- Stock reservation prevents overselling
- Concurrent requests handled correctly
- Transaction rollback on errors
- Performance acceptable (<100ms for stock operations)

**Commit:**
```
feat: ProductPrismaRepository 구현 (재고 동시성 제어)

- ProductPrismaRepository 구현 (IProductRepository)
- SELECT FOR UPDATE를 통한 비관적 락 구현
- 재고 예약/해제/확정 트랜잭션 처리
- ProductModule에 환경별 Repository 분기
```

---

### Task 4: Integration Testing with Testcontainers
**Deliverables:**
- `test/product/integration/category-prisma.repository.integration.spec.ts`
- `test/product/integration/product-prisma.repository.integration.spec.ts`
- **Concurrency test** for stock operations

**Test Coverage:**

**Category Repository:**
- CRUD operations
- Unique name constraint

**Product Repository:**
- CRUD operations with JOIN (category, options, stock)
- Pagination and sorting
- Stock reservation concurrency test (100 concurrent requests)

**Concurrency Test Example:**
```typescript
it('100명이 동시에 재고 1개 상품을 구매하면 1명만 성공해야 함', async () => {
  // Given: 재고 1개 상품
  const stock = await createStock({ availableQuantity: 1 });

  // When: 100명이 동시에 예약 시도
  const promises = Array(100).fill(null).map(() =>
    repository.reserveStock(stock.id, 1)
  );

  const results = await Promise.allSettled(promises);

  // Then: 1명만 성공, 99명 실패
  const succeeded = results.filter(r => r.status === 'fulfilled');
  expect(succeeded).toHaveLength(1);

  // DB에서 재고 확인
  const finalStock = await prisma.stock.findUnique({
    where: { id: stock.id }
  });
  expect(finalStock.availableQuantity).toBe(0);
  expect(finalStock.reservedQuantity).toBe(1);
});
```

**Acceptance Criteria:**
- All integration tests pass
- Concurrency test validates pessimistic locking
- No race conditions in stock operations

**Commit:**
```
test: Product/Category 도메인 Testcontainers 통합 테스트

- CategoryPrismaRepository 통합 테스트
- ProductPrismaRepository 통합 테스트
- 재고 동시성 테스트 (100 concurrent requests)
- SELECT FOR UPDATE 비관적 락 검증
- 재고 예약/해제/확정 시나리오 테스트
```

---

## Verification Checklist

### Functional Requirements
- [ ] Category CRUD operations work correctly
- [ ] Product CRUD with JOIN (category, options, stocks)
- [ ] Stock reservation prevents overselling
- [ ] Stock release restores availability
- [ ] Stock confirmation moves reserved → sold
- [ ] Concurrent stock operations handled safely

### Non-Functional Requirements
- [ ] Stock reservation <100ms (single operation)
- [ ] Pessimistic locking prevents race conditions
- [ ] Transactions rollback on failure
- [ ] All integration tests pass
- [ ] No deadlocks in concurrent scenarios

### Code Quality
- [ ] Repository pattern followed
- [ ] Domain entity validation preserved
- [ ] Error handling comprehensive
- [ ] Korean comments for readability

## Testing Strategy

### Unit Tests
- Domain entity validation (existing)
- Repository interface contracts

### Integration Tests
- Category repository operations
- Product repository with JOINs
- **Stock concurrency test** (critical)
- Transaction behavior

### Performance Tests
- Stock operation latency
- Concurrent load (100 requests)

## Migration Strategy

### Coexistence Period
- **InMemory**: Remains for unit tests
- **Prisma**: New implementation for integration/e2e tests

### Repository Selection
```typescript
{
  provide: PRODUCT_REPOSITORY,
  useClass: process.env.NODE_ENV === 'test'
    ? InMemoryProductRepository
    : ProductPrismaRepository,
}
```

## Dependencies

### Database Schema
- Builds on User domain schema (Issue #019)
- Foreign keys to future domains (Cart, Order) will be added in later phases

### Assignment Requirements
- **Assignment 04**: RDBMS integration
- **Assignment 05**: Concurrency control (pessimistic lock)

## Related Issues
- **Blocked by**: Issue #019 (User domain) ✅
- **Blocks**: Issue #021 (Coupon domain)
- **Related**: Assignment 05 (STEP 9, 10 - Concurrency)

## References
- [Data Model](/docs/dev/dashboard/data-model.md) - Stock schema
- [Requirements](/docs/dev/dashboard/requirements.md) - Concurrency requirements
- [Assignment 05](/docs/reference/assignment/assignment05.md) - Concurrency control

## Notes
- Stock concurrency is **critical** - requires thorough testing
- Prisma's native support for `FOR UPDATE` via raw queries
- Consider connection pool size for high concurrency
- Monitor deadlock scenarios in production

---

**Issue created**: 2025-11-20
**Target completion**: Phase 2 of 5-phase DB integration
**Critical path**: Stock concurrency control implementation
