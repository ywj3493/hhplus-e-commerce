# Issue #022: DB Integration Phase 4 - Coupon Domain

## Status
- **Created**: 2025-11-20
- **Branch**: TBD
- **Type**: Infrastructure Implementation
- **Priority**: High
- **Current Status**: Not Started

### Progress Summary

| Task | Status | Commit |
|------|--------|--------|
| Prisma Schema Definition (Coupon, UserCoupon) | ⏳ Not Started | Pending |
| Seed Data Implementation | ⏳ Not Started | Pending |
| CouponPrismaRepository | ⏳ Not Started | Pending |
| UserCouponPrismaRepository | ⏳ Not Started | Pending |
| Coupon Issuance Concurrency Control | ⏳ Not Started | Pending |
| Testcontainers Integration Tests | ⏳ Not Started | Pending |

## Objective
Coupon 도메인의 데이터베이스 통합을 구현합니다. 쿠폰 발급 시 동시성 제어를 포함하여 중복 발급 방지 및 발급 수량 제한을 구현합니다.

### Goals
1. Coupon, UserCoupon Prisma 스키마 정의
2. CouponPrismaRepository 구현
3. UserCouponPrismaRepository 구현
4. 쿠폰 발급 동시성 제어 (SELECT FOR UPDATE)
5. Testcontainers 통합 테스트 작성
6. 예시 데이터 (Seed) 추가

## Background
Coupon 도메인은 쿠폰 발급 시 동시성 제어가 필요합니다. 여러 사용자가 동시에 제한된 수량의 쿠폰을 발급받으려 할 때, 발급 가능 수량을 초과하지 않도록 비관적 락을 사용합니다.

## Technical Approach

### Technology Stack
- **ORM**: Prisma 6.x
- **Database**: MySQL 8.0
- **Concurrency Control**: Pessimistic Locking (SELECT FOR UPDATE)
- **Testing**: Testcontainers (MySQL container)

### Coupon Architecture

#### Coupon Entity Structure
```typescript
Coupon {
  id: string (UUID)
  name: string
  discountType: DiscountType (FIXED, PERCENTAGE)
  discountValue: number
  minPurchaseAmount: number?
  maxDiscountAmount: number?
  totalQuantity: number
  issuedQuantity: number
  validFrom: Date
  validUntil: Date
  createdAt: Date
  updatedAt: Date
}
```

#### UserCoupon Entity Structure
```typescript
UserCoupon {
  id: string (UUID)
  userId: string (FK to User)
  couponId: string (FK to Coupon)
  isUsed: boolean
  usedAt: Date?
  issuedAt: Date
}
```

### Coupon Issuance Concurrency Control

**Problem:**
- 100개 제한 쿠폰에 1000명이 동시 발급 요청
- 중복 발급 방지 (사용자당 1번만)
- 발급 가능 수량 초과 방지

**Solution: Pessimistic Locking**
```typescript
async issueCoupon(userId: string, couponId: string): Promise<void> {
  await this.prisma.$transaction(async (tx) => {
    // 1. SELECT FOR UPDATE로 쿠폰 잠금
    const coupon = await tx.$queryRaw`
      SELECT * FROM coupons WHERE id = ${couponId} FOR UPDATE
    `;

    // 2. 발급 가능 여부 검증
    if (coupon.issuedQuantity >= coupon.totalQuantity) {
      throw new Error('쿠폰이 모두 소진되었습니다');
    }

    // 3. 중복 발급 체크
    const existing = await tx.userCoupon.findUnique({
      where: { userId_couponId: { userId, couponId } }
    });
    if (existing) {
      throw new Error('이미 발급받은 쿠폰입니다');
    }

    // 4. 쿠폰 발급
    await tx.userCoupon.create({ userId, couponId, ... });
    await tx.coupon.update({
      where: { id: couponId },
      data: { issuedQuantity: { increment: 1 } }
    });
  });
}
```

## Tasks

### Task 1: Prisma Schema Definition
**Deliverables:**
- Coupon model in `schema.prisma`
- UserCoupon model in `schema.prisma`
- Relationships and constraints
- Indexes for performance

**Schema Design:**

```prisma
/// 쿠폰 엔티티
/// - 할인 타입: FIXED (정액), PERCENTAGE (정률)
/// - 발급 수량 제한 관리
model Coupon {
  id                String   @id @default(uuid())
  name              String   // 쿠폰명
  discountType      String   // FIXED, PERCENTAGE
  discountValue     Decimal  @db.Decimal(10, 2) // 할인 금액 또는 비율
  minPurchaseAmount Decimal? @db.Decimal(10, 2) // 최소 구매 금액
  maxDiscountAmount Decimal? @db.Decimal(10, 2) // 최대 할인 금액 (정률일 때)
  totalQuantity     Int      // 총 발급 가능 수량
  issuedQuantity    Int      @default(0) // 발급된 수량
  validFrom         DateTime // 유효 시작일
  validUntil        DateTime // 유효 종료일
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  userCoupons UserCoupon[]

  @@index([validFrom, validUntil])
  @@index([issuedQuantity])
  @@map("coupons")
}

/// 사용자 쿠폰 엔티티 (발급 내역)
/// - 사용자당 쿠폰 1번만 발급 가능
/// - 사용 여부 추적
model UserCoupon {
  id       String    @id @default(uuid())
  userId   String
  couponId String
  isUsed   Boolean   @default(false)
  usedAt   DateTime?
  issuedAt DateTime  @default(now())

  user   User   @relation(fields: [userId], references: [id])
  coupon Coupon @relation(fields: [couponId], references: [id])

  @@unique([userId, couponId]) // 사용자당 쿠폰 1번만 발급
  @@index([userId])
  @@index([couponId])
  @@index([isUsed])
  @@map("user_coupons")
}
```

**Acceptance Criteria:**
- Schema compiles without errors
- Relationships are correctly defined
- Unique constraint on (userId, couponId)
- Indexes for performance

**Commit:**
```
feat: Coupon/UserCoupon Prisma 스키마 및 Migration 추가

- Coupon, UserCoupon 모델 정의
- 관계 설정 (User → UserCoupon → Coupon)
- 중복 발급 방지 unique 제약조건 (userId, couponId)
- 발급 수량 및 유효기간 인덱스 설정
- Migration 생성 및 실행
```

---

### Task 2: Seed Data Implementation
**Deliverables:**
- `prisma/seed.ts` 업데이트
- 예시 쿠폰 데이터 3-5개
- 예시 사용자 쿠폰 발급 데이터

**Seed Data Structure:**
```typescript
// 쿠폰 예시 데이터
- 쿠폰 1: 5000원 할인 쿠폰 (정액, 수량 100개)
- 쿠폰 2: 10% 할인 쿠폰 (정률, 최대 3000원, 수량 50개)
- 쿠폰 3: 신규 가입 쿠폰 (수량 무제한)
- 쿠폰 4: 만료된 쿠폰
- 쿠폰 5: 소진된 쿠폰 (issuedQuantity = totalQuantity)

// 사용자 쿠폰 발급 데이터
- 사용자 1: 쿠폰 1 발급 (미사용)
- 사용자 2: 쿠폰 2 발급 (사용 완료)
```

**Acceptance Criteria:**
- `pnpm prisma db seed` 실행 성공
- Coupon, UserCoupon 데이터 생성
- 기존 User와 연결

**Commit:**
```
feat: Coupon/UserCoupon Seed 데이터 추가

- 5개 쿠폰 예시 데이터 (정액/정률, 유효/만료/소진)
- 사용자별 쿠폰 발급 예시 데이터
```

---

### Task 3: CouponPrismaRepository Implementation
**Deliverables:**
- `src/coupon/infrastructure/repositories/coupon-prisma.repository.ts`
- Implements `CouponRepository` interface

**Key Methods:**
```typescript
class CouponPrismaRepository implements CouponRepository {
  // Basic CRUD
  async findById(couponId: string): Promise<Coupon | null>
  async findAll(): Promise<Coupon[]>
  async findAvailableCoupons(): Promise<Coupon[]> {
    // 발급 가능한 쿠폰 (유효기간 내 + 수량 남음)
  }

  // Coupon issuance with concurrency control
  async issueCoupon(userId: string, couponId: string): Promise<void> {
    // SELECT FOR UPDATE를 사용한 비관적 락
    // 1. 쿠폰 잠금
    // 2. 발급 가능 검증
    // 3. 중복 발급 검증
    // 4. UserCoupon 생성 + issuedQuantity 증가
  }

  async useCoupon(userCouponId: string): Promise<void> {
    // 쿠폰 사용 처리
  }

  async cancelCoupon(userCouponId: string): Promise<void> {
    // 쿠폰 사용 취소 (주문 취소 시)
  }
}
```

**Acceptance Criteria:**
- All interface methods implemented
- Pessimistic locking for issueCoupon
- Duplicate issuance prevention
- Quantity limit enforcement

**Commit:**
```
feat: CouponPrismaRepository 구현 (쿠폰 발급 동시성 제어)

- CouponPrismaRepository 구현 (CouponRepository)
- SELECT FOR UPDATE를 통한 비관적 락 구현
- 쿠폰 발급/사용/취소 트랜잭션 처리
- 중복 발급 및 수량 초과 방지
- CouponModule에 환경별 Repository 분기
```

---

### Task 4: UserCouponPrismaRepository Implementation
**Deliverables:**
- `src/coupon/infrastructure/repositories/user-coupon-prisma.repository.ts`
- Implements `UserCouponRepository` interface

**Key Methods:**
```typescript
class UserCouponPrismaRepository implements UserCouponRepository {
  async findById(userCouponId: string): Promise<UserCoupon | null>
  async findByUserId(userId: string): Promise<UserCoupon[]>
  async findUnusedByUserId(userId: string): Promise<UserCoupon[]>
  async save(userCoupon: UserCoupon): Promise<void>
}
```

**Acceptance Criteria:**
- All interface methods implemented
- Prisma model → Domain entity mapping
- Query optimization for user coupon list

**Commit:**
```
feat: UserCouponPrismaRepository 구현

- UserCouponPrismaRepository 구현 (UserCouponRepository)
- Prisma 모델 ↔ Domain 엔티티 변환
- 사용자별 쿠폰 조회 최적화
- CouponModule에 환경별 Repository 분기
```

---

### Task 5: Integration Testing with Testcontainers
**Deliverables:**
- `test/coupon/integration/coupon-prisma.repository.integration.spec.ts`
- `test/coupon/integration/user-coupon-prisma.repository.integration.spec.ts`

**Test Coverage:**

**Coupon Repository:**
- CRUD operations
- 발급 가능한 쿠폰 조회
- 쿠폰 발급 성공
- 중복 발급 방지
- 수량 소진 시 발급 실패
- **동시성 테스트: 100명이 쿠폰 10개 동시 발급**

**UserCoupon Repository:**
- CRUD operations
- 사용자별 쿠폰 조회
- 미사용 쿠폰 조회

**Concurrency Test:**
```typescript
it('100명이 쿠폰 10개를 동시에 발급받으면 정확히 10명만 성공해야 함', async () => {
  // Given: 총 발급 가능 수량 10개인 쿠폰
  const coupon = await createCoupon({ totalQuantity: 10 });

  // When: 100명이 동시에 발급 시도
  const userIds = Array.from({ length: 100 }, (_, i) => `user-${i}`);
  const promises = userIds.map(userId =>
    repository.issueCoupon(userId, coupon.id).catch(err => err)
  );

  const results = await Promise.all(promises);

  // Then: 정확히 10명만 성공
  const succeeded = results.filter(r => !(r instanceof Error));
  expect(succeeded).toHaveLength(10);

  // And: 쿠폰 발급 수량 확인
  const updatedCoupon = await prisma.coupon.findUnique({
    where: { id: coupon.id }
  });
  expect(updatedCoupon.issuedQuantity).toBe(10);
});
```

**Acceptance Criteria:**
- All integration tests pass
- Concurrency test validates pessimistic locking
- No duplicate issuance
- Quantity limits enforced

**Commit:**
```
test: Coupon 도메인 Testcontainers 통합 테스트

- CouponPrismaRepository 통합 테스트
- UserCouponPrismaRepository 통합 테스트
- 쿠폰 발급 동시성 테스트 (100 concurrent requests)
- SELECT FOR UPDATE 비관적 락 검증
- 중복 발급 및 수량 초과 방지 검증
```

---

## Verification Checklist

### Functional Requirements
- [ ] Coupon CRUD operations work correctly
- [ ] UserCoupon CRUD operations work correctly
- [ ] Available coupons query works
- [ ] Coupon issuance prevents duplicates
- [ ] Coupon issuance enforces quantity limits
- [ ] Concurrent issuance handled safely
- [ ] Coupon usage/cancellation works

### Non-Functional Requirements
- [ ] Coupon issuance <100ms (single operation)
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

### Integration Tests
- Coupon repository operations
- UserCoupon repository operations
- **Coupon issuance concurrency test** (critical)
- Duplicate prevention
- Quantity limit enforcement

### Performance Tests
- Coupon issuance latency
- Concurrent load (100 requests)

## Migration Strategy

### Repository Selection
```typescript
// CouponModule
{
  provide: COUPON_REPOSITORY,
  useClass: process.env.NODE_ENV === 'test'
    ? InMemoryCouponRepository
    : CouponPrismaRepository,
},
{
  provide: USER_COUPON_REPOSITORY,
  useClass: process.env.NODE_ENV === 'test'
    ? InMemoryUserCouponRepository
    : UserCouponPrismaRepository,
}
```

## Dependencies

### Database Schema
- Builds on User domain (Issue #019) ✅
- References: User

### Domain Integration
- Order 생성 시 쿠폰 사용 (향후 연동)

## Related Issues
- **Blocked by**: Issue #019 (User domain) ✅
- **Related**: Issue #021 (Order domain) - 쿠폰 사용 연동

## References
- [Data Model](/docs/dev/dashboard/data-model.md) - Coupon schema
- [Requirements](/docs/dev/dashboard/requirements.md) - FR-COUPON-02 (동시성)
- [Issue #019](/docs/issue/issue019.md) - User domain pattern
- [Issue #020](/docs/issue/issue020.md) - Product domain pattern (concurrency)

## Notes
- Coupon issuance concurrency is **critical** - requires thorough testing
- Similar pattern to Stock concurrency in Issue #020
- Unique constraint (userId, couponId) provides additional safety
- Consider coupon expiration in queries

---

**Issue created**: 2025-11-20
**Target completion**: Phase 4 of DB integration
**Critical path**: Coupon issuance concurrency control
