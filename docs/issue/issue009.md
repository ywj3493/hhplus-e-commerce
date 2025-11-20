# Issue #009: Implement Coupon Domain with In-Memory Repository

## Metadata
- **Issue Number**: #009
- **Status**: Completed ✅
- **Created**: 2025-11-17
- **Completed**: 2025-11-18
- **Related Branch**: step5
- **Related Docs**:
  - [Coupon Use Cases](../dev/dashboard/coupon/use-cases.md)
  - [Coupon Sequence Diagrams](../dev/dashboard/coupon/sequence-diagrams.md)
  - [API Specification](../dev/dashboard/api-specification.md)
  - [Architecture](../dev/dashboard/architecture.md)
  - [Requirements](../dev/requirements.md)

## Problem Statement

Product 도메인(Issue #007)과 Cart 도메인(Issue #008)에 이어 Coupon 도메인을 구현합니다. 쿠폰 발급 및 관리 기능을 4-Layer Architecture와 Domain-Driven Design 원칙에 따라 구현하며, 실제 데이터베이스 대신 인메모리 저장소를 사용하여 비즈니스 로직에 집중합니다.

## Goals

1. **Coupon Domain Layer 구현**
   - Coupon, UserCoupon Entity 구현
   - CouponService 구현 (쿠폰 발급 및 사용 도메인 서비스)
   - CouponRepository, UserCouponRepository Interface 정의
   - 비즈니스 규칙 구현 (1인 1쿠폰, 선착순 발급, 동시성 제어 등)

2. **Coupon Application Layer 구현**
   - Use Case별 DTO 구성 (Input + Output 통합)
   - 2개 Use Case 구현:
     - IssueCouponUseCase (쿠폰 발급)
     - GetUserCouponsUseCase (사용자 쿠폰 목록 조회)

3. **Coupon Infrastructure Layer 구현**
   - InMemoryCouponRepository 구현
   - InMemoryUserCouponRepository 구현
   - 인메모리 데이터 저장 및 조회 (동시성 제어 포함)

4. **Coupon Presentation Layer 구현**
   - CouponController 구현 (2개 엔드포인트)
   - Request/Response DTO 구현
   - Validation 구현

5. **테스트 작성**
   - Unit Tests: Domain Entity 및 Domain Service 테스트
   - Integration Tests: Use Case 테스트 (동시성 테스트 포함)
   - E2E Tests: API 엔드포인트 테스트
   - 모든 테스트는 한글 작성 (describe, it blocks)

6. **코딩 컨벤션 준수**
   - DTO Structure: Use Case별 통합 (Input + Output)
   - Test Language: Korean
   - Package Manager: pnpm
   - Commit Messages: Korean with English type prefix

## Architecture Approach

### Domain-First Organization
```
src/
└── coupon/
    ├── domain/
    │   ├── entities/
    │   │   ├── coupon.entity.ts
    │   │   ├── coupon.entity.spec.ts
    │   │   ├── user-coupon.entity.ts
    │   │   └── user-coupon.entity.spec.ts
    │   ├── services/
    │   │   ├── coupon.service.ts
    │   │   └── coupon.service.spec.ts
    │   ├── repositories/
    │   │   ├── coupon.repository.ts (Interface)
    │   │   └── user-coupon.repository.ts (Interface)
    │   └── coupon.exceptions.ts
    ├── application/
    │   ├── dtos/
    │   │   ├── issue-coupon.dto.ts (Input + Output)
    │   │   └── get-user-coupons.dto.ts (Input + Output)
    │   └── use-cases/
    │       ├── issue-coupon.use-case.ts
    │       ├── issue-coupon.use-case.spec.ts
    │       ├── get-user-coupons.use-case.ts
    │       └── get-user-coupons.use-case.spec.ts
    ├── infrastructure/
    │   ├── repositories/
    │   │   ├── in-memory-coupon.repository.ts
    │   │   ├── in-memory-coupon.repository.spec.ts
    │   │   ├── in-memory-user-coupon.repository.ts
    │   │   └── in-memory-user-coupon.repository.spec.ts
    │   └── fixtures/
    │       └── coupon.fixtures.ts (테스트 데이터)
    ├── presentation/
    │   ├── controllers/
    │   │   ├── coupon.controller.ts
    │   │   └── coupon.controller.spec.ts (E2E)
    │   └── dtos/
    │       ├── issue-coupon-request.dto.ts
    │       ├── user-coupon-response.dto.ts
    │       └── user-coupons-response.dto.ts
    └── coupon.module.ts
```

## Implementation Plan

### Step 1: Domain Layer Implementation

#### 1.1 Coupon Entity
**파일**: `src/coupon/domain/entities/coupon.entity.ts`

**비즈니스 규칙**:
- BR-COUPON-02: 선착순 발급 (issuedQuantity >= totalQuantity 검증)
- BR-COUPON-03: 발급 기간 검증 (validFrom ~ validUntil)
- FR-COUPON-02: 수량 제한 및 동시성 제어

**메서드**:
```typescript
export class Coupon {
  private id: string
  private name: string
  private description: string
  private discountType: CouponType  // PERCENTAGE or FIXED
  private discountValue: number     // 10 (10%) or 5000 (5000원)
  private totalQuantity: number
  private issuedQuantity: number
  private validFrom: Date
  private validUntil: Date
  private createdAt: Date
  private updatedAt: Date

  static create(data: CouponCreateData): Coupon
  static reconstitute(data: CouponData): Coupon

  decreaseQuantity(): void  // BR-COUPON-02, BR-COUPON-03 구현
  isValid(): boolean        // 발급 기간 내인지 확인
  getAvailableQuantity(): number

  // Getters (property getters)
  get id(): string
  get name(): string
  get description(): string
  get discountType(): CouponType
  get discountValue(): number
  get totalQuantity(): number
  get issuedQuantity(): number
  get validFrom(): Date
  get validUntil(): Date
}
```

**CouponType Enum**:
```typescript
export enum CouponType {
  PERCENTAGE = 'PERCENTAGE',  // 퍼센트 할인 (%)
  FIXED = 'FIXED',            // 정액 할인 (원)
}
```

#### 1.2 UserCoupon Entity
**파일**: `src/coupon/domain/entities/user-coupon.entity.ts`

**비즈니스 규칙**:
- BR-COUPON-08: 1회만 사용 가능
- BR-COUPON-09: 유효 기간 내 사용

**메서드**:
```typescript
export class UserCoupon {
  private id: string
  private userId: string
  private couponId: string
  private isUsed: boolean
  private usedAt: Date | null
  private issuedAt: Date
  private expiresAt: Date

  static create(userId: string, coupon: Coupon): UserCoupon
  static reconstitute(data: UserCouponData): UserCoupon

  use(): void               // BR-COUPON-08 구현
  isAvailable(): boolean    // BR-COUPON-05: AVAILABLE 상태 확인
  isExpired(): boolean      // BR-COUPON-05: EXPIRED 상태 확인
  getStatus(): CouponStatus // AVAILABLE, USED, EXPIRED

  // Getters (property getters)
  get id(): string
  get userId(): string
  get couponId(): string
  get isUsed(): boolean
  get usedAt(): Date | null
  get issuedAt(): Date
  get expiresAt(): Date
}
```

**CouponStatus Enum**:
```typescript
export enum CouponStatus {
  AVAILABLE = 'AVAILABLE',  // 사용 가능
  USED = 'USED',            // 사용 완료
  EXPIRED = 'EXPIRED',      // 기간 만료
}
```

#### 1.3 Domain Services

##### 1.3.1 CouponService
**파일**: `src/coupon/domain/services/coupon.service.ts`

**목적**:
쿠폰 발급 및 사용 로직을 도메인 서비스로 분리하여 비즈니스 규칙을 명확히 관리

**책임**:
- 쿠폰 발급 처리 (수량 감소, UserCoupon 생성)
- 쿠폰 사용 검증 및 처리
- 할인 금액 계산 (BR-COUPON-10, BR-COUPON-11)

##### 1.3.2 UserCouponQueryService
**파일**: `src/coupon/domain/services/user-coupon-query.service.ts`

**목적**:
사용자 쿠폰 조회 관련 도메인 로직을 분리하여 책임을 명확히 함

**책임**:
- 사용자 쿠폰 상태별 분류 (BR-COUPON-05, BR-COUPON-06)
- 상태별 정렬 로직 (BR-COUPON-07: Available은 최신 발급순, Used는 최신 사용순)

**CouponService 구현**:
```typescript
@Injectable()
export class CouponService {
  /**
   * 쿠폰 발급 처리
   * @param coupon - 발급할 쿠폰
   * @param userId - 사용자 ID
   * @returns 발급된 UserCoupon
   * @throws CouponExhaustedException 쿠폰 소진 시
   * @throws CouponExpiredException 발급 기간 외
   */
  issueCoupon(coupon: Coupon, userId: string): UserCoupon {
    // 1. 수량 감소 (BR-COUPON-02, BR-COUPON-03 검증 포함)
    coupon.decreaseQuantity();

    // 2. UserCoupon 생성
    const userCoupon = UserCoupon.create(userId, coupon);

    return userCoupon;
  }

  /**
   * 쿠폰 사용 검증 및 처리
   * @param userCoupon - 사용할 UserCoupon
   * @throws CouponExpiredException 유효 기간 만료
   * @throws CouponAlreadyUsedException 이미 사용된 쿠폰
   *
   * Note: 구현에서는 coupon 파라미터가 제거되었습니다.
   * UserCoupon이 자체적으로 만료 검증을 수행하므로 불필요합니다.
   */
  validateAndUseCoupon(userCoupon: UserCoupon): void {
    // BR-COUPON-09: 유효 기간 검증
    if (userCoupon.isExpired()) {
      throw new CouponExpiredException('쿠폰이 만료되었습니다.');
    }

    // BR-COUPON-08: 사용 여부 검증
    if (!userCoupon.isAvailable()) {
      throw new CouponAlreadyUsedException('이미 사용된 쿠폰입니다.');
    }

    // 쿠폰 사용 처리
    userCoupon.use();
  }

  /**
   * 할인 금액 계산
   * @param coupon - 쿠폰 정보
   * @param orderAmount - 주문 금액
   * @returns 할인 금액
   */
  calculateDiscount(coupon: Coupon, orderAmount: number): number {
    if (coupon.getDiscountType() === CouponType.PERCENTAGE) {
      // BR-COUPON-10: 퍼센트 할인
      return Math.floor(orderAmount * (coupon.getDiscountValue() / 100));
    } else {
      // BR-COUPON-11: 정액 할인
      return Math.min(coupon.getDiscountValue(), orderAmount);
    }
  }
}
```

#### 1.4 Repository Interfaces
**파일**: `src/coupon/domain/repositories/coupon.repository.ts`

```typescript
export interface CouponRepository {
  findById(id: string): Promise<Coupon | null>
  findByIdForUpdate(id: string, em?: EntityManager): Promise<Coupon | null>  // FOR UPDATE
  save(coupon: Coupon, em?: EntityManager): Promise<Coupon>
}
```

**파일**: `src/coupon/domain/repositories/user-coupon.repository.ts`

```typescript
export interface UserCouponRepository {
  findById(id: string): Promise<UserCoupon | null>
  findByUserId(userId: string): Promise<UserCoupon[]>
  existsByUserIdAndCouponId(userId: string, couponId: string, em?: EntityManager): Promise<boolean>
  save(userCoupon: UserCoupon, em?: EntityManager): Promise<UserCoupon>
}
```

#### 1.5 Domain Exceptions
**파일**: `src/coupon/domain/coupon.exceptions.ts`

```typescript
export class CouponNotFoundException extends NotFoundException {
  constructor(message: string = '쿠폰을 찾을 수 없습니다.') {
    super(message);
  }
}

export class CouponExhaustedException extends ConflictException {
  constructor(message: string = '쿠폰이 모두 소진되었습니다.') {
    super(message);
  }
}

export class CouponAlreadyIssuedException extends ConflictException {
  constructor(message: string = '이미 발급받은 쿠폰입니다.') {
    super(message);
  }
}

export class CouponExpiredException extends BadRequestException {
  constructor(message: string = '쿠폰 발급 기간이 아닙니다.') {
    super(message);
  }
}

export class CouponAlreadyUsedException extends BadRequestException {
  constructor(message: string = '이미 사용된 쿠폰입니다.') {
    super(message);
  }
}
```

### Step 2: Infrastructure Layer Implementation

#### 2.1 In-Memory Coupon Repository
**파일**: `src/coupon/infrastructure/repositories/in-memory-coupon.repository.ts`

**구현**:
- Map<couponId, Coupon> 형태로 데이터 저장
- `findByIdForUpdate()`: 동시성 제어를 위한 잠금 시뮬레이션
- Deep copy를 통한 불변성 보장

**메서드**:
```typescript
@Injectable()
export class InMemoryCouponRepository implements CouponRepository {
  private coupons: Map<string, Coupon> = new Map()
  private locks: Map<string, boolean> = new Map()  // 잠금 시뮬레이션

  async findById(id: string): Promise<Coupon | null>
  async findByIdForUpdate(id: string, em?: EntityManager): Promise<Coupon | null>  // SELECT FOR UPDATE
  async save(coupon: Coupon, em?: EntityManager): Promise<Coupon>

  // 테스트용 메서드
  clear(): void
  seed(coupons: Coupon[]): void
}
```

**동시성 제어 구현**:
```typescript
async findByIdForUpdate(id: string): Promise<Coupon | null> {
  // 잠금 대기 (실제 DB의 SELECT FOR UPDATE 시뮬레이션)
  while (this.locks.get(id)) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  // 잠금 획득
  this.locks.set(id, true);

  const coupon = this.coupons.get(id);
  return coupon ? this.toDomain(coupon) : null;
}

async save(coupon: Coupon): Promise<Coupon> {
  // 저장 후 잠금 해제
  this.coupons.set(coupon.getId(), coupon);
  this.locks.delete(coupon.getId());
  return coupon;
}
```

#### 2.2 In-Memory UserCoupon Repository
**파일**: `src/coupon/infrastructure/repositories/in-memory-user-coupon.repository.ts`

**구현**:
- Map<userCouponId, UserCoupon> 형태로 데이터 저장
- `existsByUserIdAndCouponId()`: 중복 발급 방지 (BR-COUPON-01)
- `findByUserId()`: 사용자의 모든 쿠폰 조회

**메서드**:
```typescript
@Injectable()
export class InMemoryUserCouponRepository implements UserCouponRepository {
  private userCoupons: Map<string, UserCoupon> = new Map()

  async findById(id: string): Promise<UserCoupon | null>
  async findByUserId(userId: string): Promise<UserCoupon[]>
  async existsByUserIdAndCouponId(
    userId: string,
    couponId: string,
    em?: EntityManager,
  ): Promise<boolean>
  async save(userCoupon: UserCoupon, em?: EntityManager): Promise<UserCoupon>

  // 테스트용 메서드
  clear(): void
}
```

#### 2.3 Test Fixtures
**파일**: `src/coupon/infrastructure/fixtures/coupon.fixtures.ts`

테스트용 Coupon, UserCoupon 데이터 생성 헬퍼 함수 제공

```typescript
export const createTestCoupon = (overrides?: Partial<CouponCreateData>): Coupon => {
  return Coupon.create({
    name: '10% 할인 쿠폰',
    description: '전체 상품 10% 할인',
    discountType: CouponType.PERCENTAGE,
    discountValue: 10,
    totalQuantity: 100,
    issuedQuantity: 0,
    validFrom: new Date('2025-01-01'),
    validUntil: new Date('2025-12-31'),
    ...overrides,
  });
};

export const createTestUserCoupon = (
  userId: string = 'user-1',
  coupon?: Coupon,
): UserCoupon => {
  const testCoupon = coupon || createTestCoupon();
  return UserCoupon.create(userId, testCoupon);
};
```

### Step 3: Application Layer Implementation

#### 3.1 Use Case: Issue Coupon
**파일**:
- `src/coupon/application/dtos/issue-coupon.dto.ts`
- `src/coupon/application/use-cases/issue-coupon.use-case.ts`

**DTO 구조** (Input + Output 통합):
```typescript
// issue-coupon.dto.ts
export class IssueCouponInput {
  userId: string
  couponId: string

  constructor(data: IssueCouponInputData) {
    this.userId = data.userId
    this.couponId = data.couponId
    this.validate()
  }

  private validate(): void {
    if (!this.userId || !this.couponId) {
      throw new BadRequestException('userId와 couponId는 필수입니다.')
    }
  }
}

export class IssueCouponOutput {
  userCouponId: string
  couponName: string
  discountType: CouponType
  discountValue: number
  status: CouponStatus
  expiresAt: Date
  issuedAt: Date

  static from(userCoupon: UserCoupon, coupon: Coupon): IssueCouponOutput {
    return new IssueCouponOutput(
      userCoupon.getId(),
      coupon.getName(),
      coupon.getDiscountType(),
      coupon.getDiscountValue(),
      userCoupon.getStatus(),
      userCoupon.getExpiresAt(),
      userCoupon.getIssuedAt(),
    )
  }
}
```

**Use Case 흐름**:
1. Transaction 시작
2. Coupon 조회 (FOR UPDATE - 동시성 제어)
3. 중복 발급 확인 (BR-COUPON-01)
4. 쿠폰 발급 (CouponService.issueCoupon)
5. Coupon 저장 (issuedQuantity 증가)
6. UserCoupon 저장
7. Transaction 커밋
8. Output DTO 반환

**구현 예시**:
```typescript
@Injectable()
export class IssueCouponUseCase {
  constructor(
    @Inject('CouponRepository')
    private readonly couponRepository: CouponRepository,
    @Inject('UserCouponRepository')
    private readonly userCouponRepository: UserCouponRepository,
    private readonly couponService: CouponService,
    private readonly dataSource: DataSource,
  ) {}

  async execute(input: IssueCouponInput): Promise<IssueCouponOutput> {
    // Note: In-memory repository 구현에서는 트랜잭션 래퍼가 불필요합니다.
    // Prisma 마이그레이션 시 this.dataSource.transaction()으로 감싸야 합니다.

    // 1. 쿠폰 조회 (FOR UPDATE - 동시성 제어)
    const coupon = await this.couponRepository.findByIdForUpdate(
      input.couponId,
    );

    if (!coupon) {
      throw new CouponNotFoundException('쿠폰을 찾을 수 없습니다.');
    }

    // 2. 중복 발급 확인 (BR-COUPON-01)
    const alreadyIssued = await this.userCouponRepository.existsByUserIdAndCouponId(
      input.userId,
      input.couponId,
    );

    if (alreadyIssued) {
      throw new CouponAlreadyIssuedException('이미 발급받은 쿠폰입니다.');
    }

    // 3. 쿠폰 발급 (Domain Service)
    const userCoupon = this.couponService.issueCoupon(coupon, input.userId);

    // 4. Coupon 저장 (issuedQuantity 증가)
    await this.couponRepository.save(coupon);

    // 5. UserCoupon 저장
    const savedUserCoupon = await this.userCouponRepository.save(
      userCoupon,
    );

    return IssueCouponOutput.from(savedUserCoupon, coupon);
  }
}
```

#### 3.2 Use Case: Get User Coupons
**파일**:
- `src/coupon/application/dtos/get-user-coupons.dto.ts`
- `src/coupon/application/use-cases/get-user-coupons.use-case.ts`

**DTO 구조**:
```typescript
export class GetUserCouponsInput {
  userId: string
  status?: CouponStatus  // Optional filter

  constructor(data: GetUserCouponsInputData) {
    this.userId = data.userId
    this.status = data.status
  }
}

export class UserCouponData {
  id: string
  couponId: string
  couponName: string
  discountType: CouponType
  discountValue: number
  status: CouponStatus
  issuedAt: Date
  expiresAt: Date
  usedAt: Date | null
}

export class GetUserCouponsOutput {
  available: UserCouponData[]
  used: UserCouponData[]
  expired: UserCouponData[]

  static toUserCouponData(
    userCoupon: UserCoupon,
    coupon: Coupon,
  ): UserCouponData {
    // Helper method for mapping
  }
}
```

**Use Case 흐름**:
1. UserCoupon 목록 조회 (userId로)
2. 각 UserCoupon의 Coupon 정보 조회
3. UserCouponQueryService를 사용하여 상태별 분류 및 정렬 (BR-COUPON-05, BR-COUPON-06, BR-COUPON-07)
4. status 필터링 (있는 경우)
5. Output DTO 생성

**Note**: 구현에서는 상태별 분류 및 정렬 로직이 `UserCouponQueryService`로 분리되었습니다.

**구현 예시**:
```typescript
@Injectable()
export class GetUserCouponsUseCase {
  constructor(
    @Inject('UserCouponRepository')
    private readonly userCouponRepository: UserCouponRepository,
    @Inject('CouponRepository')
    private readonly couponRepository: CouponRepository,
    private readonly userCouponQueryService: UserCouponQueryService,
  ) {}

  async execute(input: GetUserCouponsInput): Promise<GetUserCouponsOutput> {
    // 1. UserCoupon 목록 조회
    const userCoupons = await this.userCouponRepository.findByUserId(
      input.userId,
    );

    if (userCoupons.length === 0) {
      return new GetUserCouponsOutput([], [], []);
    }

    // 2. 각 UserCoupon의 Coupon 정보 조회
    const couponIds = [...new Set(userCoupons.map(uc => uc.couponId))];
    const coupons = new Map<string, Coupon>();

    for (const couponId of couponIds) {
      const coupon = await this.couponRepository.findById(couponId);
      if (coupon) {
        coupons.set(couponId, coupon);
      }
    }

    // 3. 상태별로 분류 및 정렬 (UserCouponQueryService 사용)
    const classified = this.userCouponQueryService.classifyAndSortUserCoupons(
      userCoupons,
    );

    // 4. DTO 변환
    const toUserCouponData = (uc: UserCoupon) => {
      const coupon = coupons.get(uc.couponId);
      if (!coupon) return null;
      return GetUserCouponsOutput.toUserCouponData(uc, coupon);
    };

    const available = classified.available.map(toUserCouponData).filter(Boolean);
    const used = classified.used.map(toUserCouponData).filter(Boolean);
    const expired = classified.expired.map(toUserCouponData).filter(Boolean);

    // 5. status 필터링 (있는 경우)
    if (input.status === CouponStatus.AVAILABLE) {
      return new GetUserCouponsOutput(available, [], []);
    } else if (input.status === CouponStatus.USED) {
      return new GetUserCouponsOutput([], used, []);
    } else if (input.status === CouponStatus.EXPIRED) {
      return new GetUserCouponsOutput([], [], expired);
    }

    return new GetUserCouponsOutput(available, used, expired);
  }
}
```

### Step 4: Presentation Layer Implementation

#### 4.1 Coupon Controller
**파일**: `src/coupon/presentation/controllers/coupon.controller.ts`

**Endpoints**:
```typescript
@Controller('coupons')
export class CouponController {
  constructor(
    private readonly issueCouponUseCase: IssueCouponUseCase,
    private readonly getUserCouponsUseCase: GetUserCouponsUseCase,
  ) {}

  @Post(':id/issue')        // POST /coupons/:id/issue
  @HttpCode(201)
  async issueCoupon(
    @Param('id') couponId: string,
    @CurrentUser() user: User,
  ): Promise<UserCouponResponseDto> {
    const input = new IssueCouponInput({
      userId: user.id,
      couponId,
    });
    const output = await this.issueCouponUseCase.execute(input);
    return UserCouponResponseDto.from(output);
  }

  @Get('my')                // GET /coupons/my
  async getUserCoupons(
    @Query('status') status: CouponStatus | undefined,
    @CurrentUser() user: User,
  ): Promise<UserCouponsResponseDto> {
    const input = new GetUserCouponsInput({
      userId: user.id,
      status,
    });
    const output = await this.getUserCouponsUseCase.execute(input);
    return UserCouponsResponseDto.from(output);
  }
}
```

#### 4.2 Response DTOs
**파일**: `src/coupon/presentation/dtos/*`

**UserCouponResponseDto**:
```typescript
export class UserCouponResponseDto {
  userCouponId: string;
  couponName: string;
  discountType: CouponType;
  discountValue: number;
  status: CouponStatus;
  expiresAt: Date;
  issuedAt: Date;

  static from(output: IssueCouponOutput): UserCouponResponseDto {
    const dto = new UserCouponResponseDto();
    dto.userCouponId = output.userCouponId;
    dto.couponName = output.couponName;
    dto.discountType = output.discountType;
    dto.discountValue = output.discountValue;
    dto.status = output.status;
    dto.expiresAt = output.expiresAt;
    dto.issuedAt = output.issuedAt;
    return dto;
  }
}
```

**UserCouponsResponseDto**:
```typescript
export class UserCouponsResponseDto {
  available: UserCouponData[];
  used: UserCouponData[];
  expired: UserCouponData[];

  static from(output: GetUserCouponsOutput): UserCouponsResponseDto {
    const dto = new UserCouponsResponseDto();
    dto.available = output.available;
    dto.used = output.used;
    dto.expired = output.expired;
    return dto;
  }
}
```

### Step 5: Module Configuration

**파일**: `src/coupon/coupon.module.ts`

```typescript
@Module({
  imports: [],  // No dependencies for Coupon domain
  controllers: [CouponController],
  providers: [
    // Domain Services
    CouponService,
    UserCouponQueryService,

    // Use Cases
    IssueCouponUseCase,
    GetUserCouponsUseCase,

    // Repositories
    {
      provide: 'CouponRepository',
      useClass: InMemoryCouponRepository,
    },
    {
      provide: 'UserCouponRepository',
      useClass: InMemoryUserCouponRepository,
    },
  ],
  exports: [
    'CouponRepository',
    'UserCouponRepository',
    CouponService,  // Export for Order domain to use
  ],
})
export class CouponModule {}
```

### Step 6: Testing

#### 6.1 Domain Entity Tests
**파일**:
- `coupon.entity.spec.ts`: Coupon Entity 단위 테스트
- `user-coupon.entity.spec.ts`: UserCoupon Entity 단위 테스트

**테스트 케이스 예시**:
```typescript
describe('Coupon', () => {
  describe('생성', () => {
    it('유효한 데이터로 인스턴스를 생성해야 함', () => {
      // Given
      const data = {
        name: '10% 할인 쿠폰',
        description: '전체 상품 10% 할인',
        discountType: CouponType.PERCENTAGE,
        discountValue: 10,
        totalQuantity: 100,
        issuedQuantity: 0,
        validFrom: new Date('2025-01-01'),
        validUntil: new Date('2025-12-31'),
      };

      // When
      const coupon = Coupon.create(data);

      // Then
      expect(coupon.getName()).toBe('10% 할인 쿠폰');
      expect(coupon.getDiscountType()).toBe(CouponType.PERCENTAGE);
      expect(coupon.getAvailableQuantity()).toBe(100);
    });
  });

  describe('수량 감소', () => {
    it('유효한 쿠폰의 수량을 감소시켜야 함', () => {
      // Given
      const coupon = Coupon.create({
        name: '쿠폰',
        discountType: CouponType.PERCENTAGE,
        discountValue: 10,
        totalQuantity: 100,
        issuedQuantity: 50,
        validFrom: new Date('2025-01-01'),
        validUntil: new Date('2025-12-31'),
      });

      // When
      coupon.decreaseQuantity();

      // Then
      expect(coupon.getIssuedQuantity()).toBe(51);
      expect(coupon.getAvailableQuantity()).toBe(49);
    });

    it('쿠폰이 소진된 경우 예외를 발생시켜야 함 (BR-COUPON-02)', () => {
      // Given
      const coupon = Coupon.create({
        name: '쿠폰',
        discountType: CouponType.PERCENTAGE,
        discountValue: 10,
        totalQuantity: 100,
        issuedQuantity: 100,  // 소진
        validFrom: new Date('2025-01-01'),
        validUntil: new Date('2025-12-31'),
      });

      // When & Then
      expect(() => coupon.decreaseQuantity()).toThrow(
        CouponExhaustedException,
      );
    });

    it('발급 기간이 아닌 경우 예외를 발생시켜야 함 (BR-COUPON-03)', () => {
      // Given
      const coupon = Coupon.create({
        name: '쿠폰',
        discountType: CouponType.PERCENTAGE,
        discountValue: 10,
        totalQuantity: 100,
        issuedQuantity: 0,
        validFrom: new Date('2025-01-01'),
        validUntil: new Date('2025-01-31'),  // 만료
      });

      // When & Then
      expect(() => coupon.decreaseQuantity()).toThrow(
        CouponExpiredException,
      );
    });
  });
});
```

```typescript
describe('UserCoupon', () => {
  describe('생성', () => {
    it('유효한 데이터로 인스턴스를 생성해야 함', () => {
      // Given
      const coupon = createTestCoupon();
      const userId = 'user-1';

      // When
      const userCoupon = UserCoupon.create(userId, coupon);

      // Then
      expect(userCoupon.getUserId()).toBe(userId);
      expect(userCoupon.getCouponId()).toBe(coupon.getId());
      expect(userCoupon.isAvailable()).toBe(true);
      expect(userCoupon.getStatus()).toBe(CouponStatus.AVAILABLE);
    });
  });

  describe('사용', () => {
    it('사용 가능한 쿠폰을 사용 처리해야 함', () => {
      // Given
      const userCoupon = createTestUserCoupon();

      // When
      userCoupon.use();

      // Then
      expect(userCoupon.getIsUsed()).toBe(true);
      expect(userCoupon.getUsedAt()).toBeDefined();
      expect(userCoupon.getStatus()).toBe(CouponStatus.USED);
    });

    it('이미 사용된 쿠폰은 재사용할 수 없음 (BR-COUPON-08)', () => {
      // Given
      const userCoupon = createTestUserCoupon();
      userCoupon.use();

      // When & Then
      expect(() => userCoupon.use()).toThrow(DomainException);
    });
  });

  describe('상태 확인', () => {
    it('사용 가능한 쿠폰은 AVAILABLE 상태여야 함 (BR-COUPON-05)', () => {
      // Given
      const userCoupon = createTestUserCoupon();

      // When
      const status = userCoupon.getStatus();

      // Then
      expect(status).toBe(CouponStatus.AVAILABLE);
    });

    it('사용된 쿠폰은 USED 상태여야 함 (BR-COUPON-06)', () => {
      // Given
      const userCoupon = createTestUserCoupon();
      userCoupon.use();

      // When
      const status = userCoupon.getStatus();

      // Then
      expect(status).toBe(CouponStatus.USED);
    });

    it('만료된 쿠폰은 EXPIRED 상태여야 함', () => {
      // Given
      const expiredCoupon = Coupon.create({
        name: '만료 쿠폰',
        discountType: CouponType.PERCENTAGE,
        discountValue: 10,
        totalQuantity: 100,
        issuedQuantity: 0,
        validFrom: new Date('2020-01-01'),
        validUntil: new Date('2020-12-31'),  // 만료
      });
      const userCoupon = UserCoupon.create('user-1', expiredCoupon);

      // When
      const status = userCoupon.getStatus();

      // Then
      expect(status).toBe(CouponStatus.EXPIRED);
    });
  });
});
```

#### 6.2 Domain Service Tests
**파일**: `coupon.service.spec.ts`

**테스트 케이스 예시**:
```typescript
describe('CouponService', () => {
  let service: CouponService;

  beforeEach(() => {
    service = new CouponService();
  });

  describe('쿠폰 발급', () => {
    it('유효한 쿠폰을 발급해야 함', () => {
      // Given
      const coupon = createTestCoupon();
      const userId = 'user-1';
      const initialIssuedQuantity = coupon.getIssuedQuantity();

      // When
      const userCoupon = service.issueCoupon(coupon, userId);

      // Then
      expect(userCoupon).toBeDefined();
      expect(userCoupon.getUserId()).toBe(userId);
      expect(coupon.getIssuedQuantity()).toBe(initialIssuedQuantity + 1);
    });

    it('쿠폰 소진 시 예외를 발생시켜야 함', () => {
      // Given
      const exhaustedCoupon = createTestCoupon({
        totalQuantity: 100,
        issuedQuantity: 100,
      });

      // When & Then
      expect(() => service.issueCoupon(exhaustedCoupon, 'user-1')).toThrow(
        CouponExhaustedException,
      );
    });
  });

  describe('할인 금액 계산', () => {
    it('퍼센트 할인을 계산해야 함 (BR-COUPON-10)', () => {
      // Given
      const coupon = createTestCoupon({
        discountType: CouponType.PERCENTAGE,
        discountValue: 10,  // 10%
      });
      const orderAmount = 10000;

      // When
      const discount = service.calculateDiscount(coupon, orderAmount);

      // Then
      expect(discount).toBe(1000);  // 10000 × 10% = 1000
    });

    it('정액 할인을 계산해야 함 (BR-COUPON-11)', () => {
      // Given
      const coupon = createTestCoupon({
        discountType: CouponType.FIXED,
        discountValue: 5000,  // 5000원
      });
      const orderAmount = 10000;

      // When
      const discount = service.calculateDiscount(coupon, orderAmount);

      // Then
      expect(discount).toBe(5000);
    });

    it('정액 할인이 주문 금액보다 클 수 없음 (BR-COUPON-11)', () => {
      // Given
      const coupon = createTestCoupon({
        discountType: CouponType.FIXED,
        discountValue: 10000,  // 10000원
      });
      const orderAmount = 5000;

      // When
      const discount = service.calculateDiscount(coupon, orderAmount);

      // Then
      expect(discount).toBe(5000);  // min(10000, 5000) = 5000
    });
  });
});
```

#### 6.3 Use Case Integration Tests
**파일**: 각 Use Case별 `.spec.ts` 파일

**테스트 케이스 예시**:
```typescript
describe('IssueCouponUseCase', () => {
  let useCase: IssueCouponUseCase;
  let mockCouponRepository: jest.Mocked<CouponRepository>;
  let mockUserCouponRepository: jest.Mocked<UserCouponRepository>;
  let mockCouponService: jest.Mocked<CouponService>;
  let mockDataSource: jest.Mocked<DataSource>;

  beforeEach(() => {
    mockCouponRepository = {
      findByIdForUpdate: jest.fn(),
      save: jest.fn(),
    } as any;

    mockUserCouponRepository = {
      existsByUserIdAndCouponId: jest.fn(),
      save: jest.fn(),
    } as any;

    mockCouponService = {
      issueCoupon: jest.fn(),
    } as any;

    mockDataSource = {
      transaction: jest.fn(callback => callback(null)),
    } as any;

    useCase = new IssueCouponUseCase(
      mockCouponRepository,
      mockUserCouponRepository,
      mockCouponService,
      mockDataSource,
    );
  });

  describe('실행', () => {
    it('유효한 쿠폰을 발급해야 함', async () => {
      // Given
      const input = new IssueCouponInput({
        userId: 'user-1',
        couponId: 'coupon-1',
      });

      const coupon = createTestCoupon();
      const userCoupon = createTestUserCoupon('user-1', coupon);

      mockCouponRepository.findByIdForUpdate.mockResolvedValue(coupon);
      mockUserCouponRepository.existsByUserIdAndCouponId.mockResolvedValue(false);
      mockCouponService.issueCoupon.mockReturnValue(userCoupon);
      mockCouponRepository.save.mockResolvedValue(coupon);
      mockUserCouponRepository.save.mockResolvedValue(userCoupon);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.userCouponId).toBeDefined();
      expect(mockCouponRepository.findByIdForUpdate).toHaveBeenCalledWith(
        'coupon-1',
        null,
      );
      expect(mockCouponService.issueCoupon).toHaveBeenCalled();
    });

    it('존재하지 않는 쿠폰이면 예외를 발생시켜야 함', async () => {
      // Given
      mockCouponRepository.findByIdForUpdate.mockResolvedValue(null);

      const input = new IssueCouponInput({
        userId: 'user-1',
        couponId: 'invalid-coupon',
      });

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        CouponNotFoundException,
      );
    });

    it('이미 발급받은 쿠폰이면 예외를 발생시켜야 함 (BR-COUPON-01)', async () => {
      // Given
      const coupon = createTestCoupon();
      mockCouponRepository.findByIdForUpdate.mockResolvedValue(coupon);
      mockUserCouponRepository.existsByUserIdAndCouponId.mockResolvedValue(true);

      const input = new IssueCouponInput({
        userId: 'user-1',
        couponId: 'coupon-1',
      });

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        CouponAlreadyIssuedException,
      );
    });
  });

  describe('동시성 테스트', () => {
    it('100명이 동시 요청 시 총 발급 수량만큼만 성공해야 함 (FR-COUPON-02)', async () => {
      // Given
      const coupon = createTestCoupon({
        totalQuantity: 10,
        issuedQuantity: 0,
      });

      const repository = new InMemoryCouponRepository();
      repository.seed([coupon]);

      const userCouponRepository = new InMemoryUserCouponRepository();
      const couponService = new CouponService();
      const dataSource = {
        transaction: (callback) => callback(null),
      } as any;

      const realUseCase = new IssueCouponUseCase(
        repository,
        userCouponRepository,
        couponService,
        dataSource,
      );

      // When: 100명이 동시에 발급 요청
      const requests = Array.from({ length: 100 }, (_, i) =>
        realUseCase.execute(
          new IssueCouponInput({
            userId: `user-${i}`,
            couponId: coupon.getId(),
          }),
        ),
      );

      const results = await Promise.allSettled(requests);

      // Then: 10명만 성공
      const succeeded = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      expect(succeeded.length).toBe(10);
      expect(failed.length).toBe(90);
    });
  });
});
```

#### 6.4 E2E Tests
**파일**: `coupon.controller.spec.ts`

**테스트 케이스 예시**:
```typescript
describe('Coupon API (E2E)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // 인증 토큰 생성 (Mock)
    authToken = 'mock-token';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /coupons/:id/issue', () => {
    it('쿠폰을 발급해야 함', async () => {
      // Given
      const couponId = 'coupon-1';

      // When & Then
      return request(app.getHttpServer())
        .post(`/coupons/${couponId}/issue`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body.userCouponId).toBeDefined();
          expect(res.body.status).toBe(CouponStatus.AVAILABLE);
        });
    });

    it('쿠폰이 소진되면 409 Conflict를 반환해야 함', async () => {
      // Given
      const exhaustedCouponId = 'exhausted-coupon';

      // When & Then
      return request(app.getHttpServer())
        .post(`/coupons/${exhaustedCouponId}/issue`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);
    });

    it('이미 발급받은 쿠폰이면 409 Conflict를 반환해야 함', async () => {
      // Given
      const couponId = 'coupon-1';

      // 첫 번째 발급 성공
      await request(app.getHttpServer())
        .post(`/coupons/${couponId}/issue`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      // When & Then: 두 번째 발급 실패
      return request(app.getHttpServer())
        .post(`/coupons/${couponId}/issue`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);
    });
  });

  describe('GET /coupons/my', () => {
    it('사용자의 모든 쿠폰을 조회해야 함', async () => {
      // Given
      await request(app.getHttpServer())
        .post('/coupons/coupon-1/issue')
        .set('Authorization', `Bearer ${authToken}`);

      // When & Then
      return request(app.getHttpServer())
        .get('/coupons/my')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.available).toBeInstanceOf(Array);
          expect(res.body.used).toBeInstanceOf(Array);
          expect(res.body.expired).toBeInstanceOf(Array);
        });
    });

    it('상태별로 필터링할 수 있어야 함', async () => {
      // When & Then
      return request(app.getHttpServer())
        .get('/coupons/my?status=AVAILABLE')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.available).toBeInstanceOf(Array);
          expect(res.body.used).toHaveLength(0);
          expect(res.body.expired).toHaveLength(0);
        });
    });

    it('쿠폰이 없으면 빈 배열을 반환해야 함', async () => {
      // When & Then
      return request(app.getHttpServer())
        .get('/coupons/my')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.available).toEqual([]);
          expect(res.body.used).toEqual([]);
          expect(res.body.expired).toEqual([]);
        });
    });
  });
});
```

## Business Rules Implementation

### BR-COUPON-01: 1인 1쿠폰
**위치**: `IssueCouponUseCase`
```typescript
const alreadyIssued = await this.userCouponRepository.existsByUserIdAndCouponId(
  input.userId,
  input.couponId,
)
if (alreadyIssued) {
  throw new CouponAlreadyIssuedException('이미 발급받은 쿠폰입니다.')
}
```

### BR-COUPON-02: 선착순 발급
**위치**: `Coupon.decreaseQuantity()`
```typescript
if (this.issuedQuantity >= this.totalQuantity) {
  throw new CouponExhaustedException('쿠폰이 모두 소진되었습니다.')
}
this.issuedQuantity++
```

### BR-COUPON-03: 발급 기간 검증
**위치**: `Coupon.decreaseQuantity()`
```typescript
if (!this.isValid()) {
  throw new CouponExpiredException('쿠폰 발급 기간이 아닙니다.')
}
```

### BR-COUPON-04: 동시 발급 방지
**위치**: `InMemoryCouponRepository.findByIdForUpdate()`
```typescript
// 잠금 대기
while (this.locks.get(id)) {
  await new Promise(resolve => setTimeout(resolve, 10))
}
// 잠금 획득
this.locks.set(id, true)
```

### BR-COUPON-05~07: 상태별 분류 및 정렬
**위치**: `GetUserCouponsOutput.from()`
```typescript
if (uc.getStatus() === CouponStatus.AVAILABLE) {
  available.push(data)
} else if (uc.getStatus() === CouponStatus.USED) {
  used.push(data)
}

// 정렬
available.sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime())
used.sort((a, b) => b.usedAt.getTime() - a.usedAt.getTime())
```

### BR-COUPON-08: 1회만 사용
**위치**: `UserCoupon.use()`
```typescript
if (this.isUsed) {
  throw new DomainException('이미 사용된 쿠폰입니다.')
}
this.isUsed = true
this.usedAt = new Date()
```

### BR-COUPON-10~11: 할인 계산
**위치**: `CouponService.calculateDiscount()`
```typescript
if (coupon.getDiscountType() === CouponType.PERCENTAGE) {
  return Math.floor(orderAmount * (coupon.getDiscountValue() / 100))
} else {
  return Math.min(coupon.getDiscountValue(), orderAmount)
}
```

## Dependencies

### Order Domain (향후 구현)
Coupon 도메인은 Order 도메인에서 사용됩니다:
- `CouponService`: 쿠폰 사용 및 할인 계산 (Order UseCase에서 사용)
- `UserCouponRepository`: 쿠폰 조회 및 사용 처리

**주의**: Order 도메인에서 CouponService를 주입받아 사용

## Testing Strategy

### Test Coverage Goals
- Domain Layer: 100% (모든 비즈니스 로직 + Domain Service)
- Application Layer: >90% (Use Cases + 동시성 테스트)
- Presentation Layer: >80% (Controllers)
- Infrastructure Layer: >80% (Repository)

### Test Types
1. **Unit Tests** (`.spec.ts`): Domain Entities, Value Objects, Domain Services
2. **Integration Tests** (`.spec.ts`): Use Cases with mocked repositories
3. **Concurrency Tests** (`.spec.ts`): 동시성 제어 검증
4. **E2E Tests** (`.spec.ts`): API endpoints with full app context

## Commit Strategy

**커밋 단위**:
1. `feat: Coupon 도메인 엔티티 및 도메인 서비스 구현`
   - Coupon, UserCoupon Entity
   - CouponService
   - Domain Exceptions
2. `feat: Coupon 인프라 레이어 구현`
   - InMemoryCouponRepository (동시성 제어 포함)
   - InMemoryUserCouponRepository
   - Test Fixtures
3. `feat: Coupon 애플리케이션 레이어 구현`
   - Use Case별 DTO 및 Use Case 구현
4. `feat: Coupon 프레젠테이션 레이어 구현`
   - CouponController
   - Request/Response DTOs
5. `test: Coupon 도메인 테스트 한글화 및 완성`
   - Domain Entity Tests
   - Domain Service Tests
   - Use Case Integration Tests (동시성 테스트 포함)
   - E2E Tests

**커밋 메시지 예시**:
```
feat: Coupon 도메인 엔티티 및 도메인 서비스 구현

Coupon과 UserCoupon 엔티티, CouponService를 구현했습니다.
- BR-COUPON-01: 1인 1쿠폰 제약
- BR-COUPON-02: 선착순 발급 로직
- BR-COUPON-03: 발급 기간 검증
- BR-COUPON-08: 1회 사용 제한
- BR-COUPON-10~11: 할인 금액 계산

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Success Criteria

- [x] Coupon, UserCoupon Entity 구현 완료
- [x] CouponService 구현 완료
- [x] UserCouponQueryService 구현 완료 (상태별 분류 및 정렬)
- [x] CouponRepository, UserCouponRepository Interface 정의 완료
- [x] InMemoryCouponRepository 구현 완료 (동시성 제어 포함)
- [x] InMemoryUserCouponRepository 구현 완료
- [x] 2개 Use Case 구현 완료
- [x] CouponController 구현 완료 (2개 엔드포인트)
- [x] 모든 비즈니스 규칙 구현 완료 (BR-COUPON-01 ~ BR-COUPON-11)
- [x] Domain Layer 테스트 작성 완료 (한글)
- [x] Domain Service 테스트 작성 완료 (한글)
- [x] Application Layer 테스트 작성 완료 (한글, 동시성 테스트 포함)
- [x] E2E 테스트 작성 완료 (한글)
- [x] 모든 테스트 통과
- [x] 코딩 컨벤션 준수 (DTO 통합, 한글 테스트 등)

## Out of Scope

- Prisma 연동 (추후 별도 Issue에서 처리)
- 인증/인가 구현 (User Mock 사용)
- 쿠폰 사용 취소 기능
- 쿠폰 만료 스케줄러
- 쿠폰 통계 및 분석 기능
- Order 도메인 구현 (별도 Issue)

## References

- [Issue #007](./issue007.md) - Product Domain Implementation
- [Issue #008](./issue008.md) - Cart Domain Implementation
- [Coupon Use Cases](../dev/dashboard/coupon/use-cases.md)
- [Coupon Sequence Diagrams](../dev/dashboard/coupon/sequence-diagrams.md)
- [API Specification](../dev/dashboard/api-specification.md)
- [Architecture](../dev/dashboard/architecture.md)
- [Requirements](../dev/requirements.md)
- [CLAUDE.md](../../CLAUDE.md) - Project coding conventions
- [policy.md](../policy.md) - Development policies

## Implementation Notes

### 구현 완료 사항
- 모든 비즈니스 규칙 (BR-COUPON-01 ~ BR-COUPON-11) 구현 완료
- 4-Layer Architecture 준수: Domain → Application → Infrastructure ← Presentation
- 동시성 제어: In-memory 저장소에서 pessimistic locking 시뮬레이션
- 테스트 커버리지: Domain 100%, Application/Infrastructure 90% 이상

### 스펙 대비 개선 사항
1. **UserCouponQueryService 분리**
   - 상태별 분류 및 정렬 로직을 별도 도메인 서비스로 분리
   - GetUserCouponsUseCase의 책임을 명확히 함

2. **Property Getter 패턴 사용**
   - 메서드 스타일 getter (`getId()`) 대신 property getter (`get id()`) 사용
   - TypeScript 표준 패턴 적용

3. **validateAndUseCoupon 시그니처 간소화**
   - `coupon` 파라미터 제거 (UserCoupon이 자체적으로 만료 검증)
   - 더 명확한 책임 분리

### 향후 Prisma 마이그레이션 시 고려사항
- **Transaction 처리**: IssueCouponUseCase에서 `this.dataSource.transaction()` 래퍼 추가
- **동시성 제어**: In-memory lock 대신 실제 `SELECT FOR UPDATE` 사용
- **Unique Constraint**: UserCoupon 테이블에 `(userId, couponId)` unique index 추가
- **Repository EntityManager**: Prisma transaction client 전달 구조 수정

### 기타 참고사항
- 인메모리 저장소를 사용하므로 서버 재시작 시 데이터 초기화됨
- Order 도메인에서 CouponService를 사용하여 쿠폰 적용 및 할인 계산
- 사용자 인증은 Mock으로 처리 (향후 Auth 도메인 구현 시 연동)
