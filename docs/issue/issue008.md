# Issue #008: Implement Cart Domain with In-Memory Repository

## Metadata
- **Issue Number**: #008
- **Status**: Completed
- **Created**: 2025-11-16
- **Completed**: 2025-11-17
- **Related Branch**: `step5`
- **Related Docs**:
  - [Cart Use Cases](../dev/dashboard/cart/use-cases.md)
  - [Cart Sequence Diagrams](../dev/dashboard/cart/sequence-diagrams.md)
  - [API Specification](../dev/dashboard/api-specification.md)
  - [Architecture](../dev/dashboard/architecture.md)

## Problem Statement

Product 도메인(Issue #007)에 이어 Cart 도메인을 구현합니다. 장바구니 관리 기능을 4-Layer Architecture와 Domain-Driven Design 원칙에 따라 구현하며, 실제 데이터베이스 대신 인메모리 저장소를 사용하여 비즈니스 로직에 집중합니다.

## Goals

1. **Cart Domain Layer 구현**
   - Cart, CartItem Entity 구현
   - CartStockValidationService 구현 (재고 검증 도메인 서비스)
   - CartRepository Interface 정의
   - 비즈니스 규칙 구현 (중복 아이템 처리, 재고 검증 등)

2. **Cart Application Layer 구현**
   - Use Case별 DTO 구성 (Input + Output 통합)
   - 5개 Use Case 구현:
     - AddCartItemUseCase (장바구니 아이템 추가)
     - GetCartUseCase (장바구니 조회)
     - UpdateCartItemUseCase (수량 변경)
     - RemoveCartItemUseCase (아이템 삭제)
     - ClearCartUseCase (장바구니 전체 삭제)

3. **Cart Infrastructure Layer 구현**
   - InMemoryCartRepository 구현
   - 인메모리 데이터 저장 및 조회

4. **Cart Presentation Layer 구현**
   - CartController 구현 (5개 엔드포인트)
   - Request/Response DTO 구현
   - Validation 구현

5. **테스트 작성**
   - Unit Tests: Domain Entity 및 Domain Service 테스트
   - Integration Tests: Use Case 테스트
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
└── cart/
    ├── domain/
    │   ├── entities/
    │   │   ├── cart.entity.ts
    │   │   ├── cart.entity.spec.ts
    │   │   ├── cart-item.entity.ts
    │   │   └── cart-item.entity.spec.ts
    │   ├── services/
    │   │   ├── cart-stock-validation.service.ts
    │   │   └── cart-stock-validation.service.spec.ts
    │   ├── repositories/
    │   │   └── cart.repository.ts (Interface)
    │   └── cart.exceptions.ts
    ├── application/
    │   ├── dtos/
    │   │   ├── add-cart-item.dto.ts (Input + Output)
    │   │   ├── get-cart.dto.ts (Input + Output)
    │   │   ├── update-cart-item.dto.ts (Input + Output)
    │   │   ├── remove-cart-item.dto.ts (Input + Output)
    │   │   └── clear-cart.dto.ts (Input + Output)
    │   └── use-cases/
    │       ├── add-cart-item.use-case.ts
    │       ├── add-cart-item.use-case.spec.ts
    │       ├── get-cart.use-case.ts
    │       ├── get-cart.use-case.spec.ts
    │       ├── update-cart-item.use-case.ts
    │       ├── update-cart-item.use-case.spec.ts
    │       ├── remove-cart-item.use-case.ts
    │       ├── remove-cart-item.use-case.spec.ts
    │       ├── clear-cart.use-case.ts
    │       └── clear-cart.use-case.spec.ts
    ├── infrastructure/
    │   ├── repositories/
    │   │   ├── in-memory-cart.repository.ts
    │   │   └── in-memory-cart.repository.spec.ts
    │   └── fixtures/
    │       └── cart.fixtures.ts (테스트 데이터)
    ├── presentation/
    │   ├── controllers/
    │   │   ├── cart.controller.ts
    │   │   └── cart.controller.spec.ts (E2E)
    │   └── dtos/
    │       ├── add-cart-item-request.dto.ts
    │       ├── cart-item-response.dto.ts
    │       ├── cart-response.dto.ts
    │       ├── update-cart-item-request.dto.ts
    │       └── get-cart-item-param.dto.ts
    └── cart.module.ts
```

## Implementation Plan

### Step 1: Domain Layer Implementation

#### 1.1 Cart Entity
**파일**: `src/cart/domain/entities/cart.entity.ts`

**비즈니스 규칙**:
- BR-CART-01: 동일 상품+옵션이 있으면 수량만 증가
- BR-CART-04: 사용자당 하나의 장바구니만 가짐
- BR-CART-05: 총 금액 = Σ (아이템 가격 × 수량)
- BR-CART-06: 빈 장바구니 처리 (아이템 없으면 빈 배열과 0원)

**메서드**:
```typescript
export class Cart {
  private id: string
  private userId: string
  private items: CartItem[]
  private createdAt: Date
  private updatedAt: Date

  static create(userId: string): Cart
  static reconstitute(data: CartData): Cart

  addItem(itemData: AddItemData): string  // BR-CART-01 구현, returns cartItemId
  updateItemQuantity(itemId: string, quantity: number): void
  removeItem(itemId: string): void
  clearAll(): number  // returns deleted count

  getTotalAmount(): Money  // BR-CART-05 구현
  findItem(itemId: string): CartItem | undefined
  getItems(): CartItem[]
  getUserId(): string
}
```

#### 1.2 CartItem Entity
**파일**: `src/cart/domain/entities/cart-item.entity.ts`

**비즈니스 규칙**:
- BR-CART-03: 수량은 1 이상이어야 함

**메서드**:
```typescript
export class CartItem {
  private id: string
  private cartId: string
  private productId: string
  private productName: string
  private productOptionId: string | null
  private price: Money
  private quantity: number

  static create(data: CartItemCreateData): CartItem
  static reconstitute(data: CartItemData): CartItem

  isSameProduct(productId: string, productOptionId: string | null): boolean
  increaseQuantity(amount: number): void
  updateQuantity(quantity: number): void  // BR-CART-03 검증

  getSubtotal(): Money
  getQuantity(): number
  getId(): string
}
```

#### 1.3 Domain Service: CartStockValidationService
**파일**: `src/cart/domain/services/cart-stock-validation.service.ts`

**목적**:
재고 검증 로직을 도메인 서비스로 분리하여 Application Layer의 비즈니스 로직 누출 방지

**책임**:
- 재고 조회 (StockRepository 사용)
- 재고 가용성 검증 (BR-CART-02)
- 재고 부족 시 예외 발생

**구현**:
```typescript
@Injectable()
export class CartStockValidationService {
  constructor(
    @Inject('StockRepository')
    private readonly stockRepository: StockRepository,
  ) {}

  /**
   * 요청한 수량이 재고 범위 내인지 검증
   * @param productId - 상품 ID (Product 도메인에서 ProductOption 조회 시 필요)
   * @param productOptionId - 상품 옵션 ID (nullable - 옵션이 없는 상품 지원)
   * @param requestedQuantity - 요청한 수량
   * @throws ProductNotFoundException 상품 옵션을 찾을 수 없을 때
   * @throws InsufficientStockException 재고 부족 시
   */
  async validateAvailability(
    productId: string,
    productOptionId: string | null,
    requestedQuantity: number,
  ): Promise<void> {
    const stock = await this.stockRepository.findByProductOption(
      productId,
      productOptionId,
    );

    if (!stock) {
      throw new ProductNotFoundException('상품 옵션을 찾을 수 없습니다.');
    }

    if (!stock.canFulfill(requestedQuantity)) {
      throw new InsufficientStockException(
        `재고가 부족합니다. (요청: ${requestedQuantity}, 가용: ${stock.getAvailableQuantity()})`,
      );
    }
  }
}
```

**사용 위치**:
- `AddCartItemUseCase`: 아이템 추가 시
- `UpdateCartItemUseCase`: 수량 증가 시 (BR-CART-08)

#### 1.4 Repository Interface
**파일**: `src/cart/domain/repositories/cart.repository.ts`

```typescript
export interface CartRepository {
  findByUserId(userId: string): Promise<Cart | null>
  save(cart: Cart): Promise<Cart>
  clearByUserId(userId: string): Promise<void>
}
```

#### 1.5 Domain Exceptions
**파일**: `src/cart/domain/cart.exceptions.ts`

```typescript
export class CartNotFoundException extends NotFoundException {
  constructor(message: string = '장바구니를 찾을 수 없습니다.') {
    super(message);
  }
}

export class CartItemNotFoundException extends NotFoundException {
  constructor(message: string = '장바구니 아이템을 찾을 수 없습니다.') {
    super(message);
  }
}

export class InsufficientStockException extends ConflictException {
  constructor(message: string = '재고가 부족합니다.') {
    super(message);
  }
}

export class InvalidQuantityException extends BadRequestException {
  constructor(message: string = '수량은 1 이상이어야 합니다.') {
    super(message);
  }
}
```

### Step 2: Infrastructure Layer Implementation

#### 2.1 In-Memory Repository
**파일**: `src/cart/infrastructure/repositories/in-memory-cart.repository.ts`

**구현**:
- Map<userId, Cart> 형태로 데이터 저장
- Deep copy를 통한 불변성 보장
- 테스트 환경을 위한 데이터 초기화 메서드 제공

**메서드**:
```typescript
@Injectable()
export class InMemoryCartRepository implements CartRepository {
  private carts: Map<string, Cart> = new Map()

  async findByUserId(userId: string): Promise<Cart | null>
  async save(cart: Cart): Promise<Cart>
  async clearByUserId(userId: string): Promise<void>

  // 테스트용 메서드
  clear(): void
}
```

**주의사항**:
- Product 도메인의 StockRepository는 직접 사용하지 않음
- 도메인 서비스(CartStockValidationService)에서 재고 검증 담당

#### 2.2 Test Fixtures
**파일**: `src/cart/infrastructure/fixtures/cart.fixtures.ts`

테스트용 Cart, CartItem 데이터 생성 헬퍼 함수 제공

```typescript
export const createTestCart = (userId: string = 'user-1'): Cart => { ... }
export const createTestCartItem = (data?: Partial<CartItemCreateData>): CartItem => { ... }
```

### Step 3: Application Layer Implementation

#### 3.1 Use Case: Add Cart Item
**파일**:
- `src/cart/application/dtos/add-cart-item.dto.ts`
- `src/cart/application/use-cases/add-cart-item.use-case.ts`

**DTO 구조** (Input + Output 통합):
```typescript
// add-cart-item.dto.ts
export class AddCartItemInput {
  userId: string
  productId: string
  productOptionId: string | null
  quantity: number

  constructor(data: AddCartItemInputData) {
    this.userId = data.userId
    this.productId = data.productId
    this.productOptionId = data.productOptionId
    this.quantity = data.quantity
    this.validate()
  }

  private validate(): void {
    if (this.quantity < 1) {
      throw new InvalidQuantityException('수량은 1 이상이어야 합니다.')
    }
  }
}

export class AddCartItemOutput {
  cartItemId: string
  quantity: number
  subtotal: number

  static from(cart: Cart, itemId: string): AddCartItemOutput {
    const item = cart.findItem(itemId)
    if (!item) {
      throw new CartItemNotFoundException()
    }
    return new AddCartItemOutput(
      item.getId(),
      item.getQuantity(),
      item.getSubtotal().getAmount(),
    )
  }
}
```

**Use Case 흐름**:
1. Product 존재 여부 확인 (ProductRepository)
2. **재고 검증 (CartStockValidationService)** ← 도메인 서비스 사용
3. Cart 조회 또는 생성
4. Cart.addItem() 호출 (도메인 로직)
5. Cart 저장
6. Output DTO 반환

**구현 예시**:
```typescript
@Injectable()
export class AddCartItemUseCase {
  constructor(
    @Inject('CartRepository')
    private readonly cartRepository: CartRepository,
    @Inject('ProductRepository')
    private readonly productRepository: ProductRepository,
    private readonly cartStockValidationService: CartStockValidationService,
  ) {}

  async execute(input: AddCartItemInput): Promise<AddCartItemOutput> {
    // 1. 상품 조회
    const product = await this.productRepository.findById(input.productId);
    if (!product) {
      throw new ProductNotFoundException('상품을 찾을 수 없습니다.');
    }

    // 2. 재고 검증 (도메인 서비스)
    await this.cartStockValidationService.validateAvailability(
      input.productOptionId,
      input.quantity,
    );

    // 3. 장바구니 조회 또는 생성
    let cart = await this.cartRepository.findByUserId(input.userId);
    if (!cart) {
      cart = Cart.create(input.userId);
    }

    // 4. 아이템 추가 (도메인 로직)
    const itemId = cart.addItem({
      productId: input.productId,
      productName: product.getName(),
      productOptionId: input.productOptionId,
      price: product.getPrice(),
      quantity: input.quantity,
    });

    // 5. 장바구니 저장
    const savedCart = await this.cartRepository.save(cart);

    return AddCartItemOutput.from(savedCart, itemId);
  }
}
```

#### 3.2 Use Case: Get Cart
**파일**:
- `src/cart/application/dtos/get-cart.dto.ts`
- `src/cart/application/use-cases/get-cart.use-case.ts`

**DTO 구조**:
```typescript
export class GetCartInput {
  userId: string

  constructor(userId: string) {
    this.userId = userId
  }
}

export class CartItemData {
  id: string
  productId: string
  productName: string
  productOptionId: string | null
  price: number
  quantity: number
  subtotal: number
}

export class GetCartOutput {
  items: CartItemData[]
  totalAmount: number
  itemCount: number

  static from(cart: Cart | null): GetCartOutput {
    if (!cart) {
      return new GetCartOutput([], 0, 0)
    }

    const items = cart.getItems().map(item => ({
      id: item.getId(),
      productId: item.getProductId(),
      productName: item.getProductName(),
      productOptionId: item.getProductOptionId(),
      price: item.getPrice().getAmount(),
      quantity: item.getQuantity(),
      subtotal: item.getSubtotal().getAmount(),
    }))

    return new GetCartOutput(
      items,
      cart.getTotalAmount().getAmount(),
      items.length,
    )
  }
}
```

**Use Case 흐름**:
1. Cart 조회 (userId로)
2. 없으면 빈 장바구니 반환 (BR-CART-06)
3. Output DTO 생성

#### 3.3 Use Case: Update Cart Item
**파일**:
- `src/cart/application/dtos/update-cart-item.dto.ts`
- `src/cart/application/use-cases/update-cart-item.use-case.ts`

**DTO 구조**:
```typescript
export class UpdateCartItemInput {
  userId: string
  cartItemId: string
  quantity: number

  constructor(data: UpdateCartItemInputData) {
    this.userId = data.userId
    this.cartItemId = data.cartItemId
    this.quantity = data.quantity
    this.validate()
  }

  private validate(): void {
    if (this.quantity < 0) {
      throw new InvalidQuantityException('수량은 0 이상이어야 합니다.')
    }
  }
}

export class UpdateCartItemOutput {
  cartItemId: string
  quantity: number
  subtotal: number

  static from(cart: Cart, itemId: string): UpdateCartItemOutput {
    const item = cart.findItem(itemId)
    if (!item) {
      // 아이템이 삭제된 경우 (quantity = 0)
      return new UpdateCartItemOutput(itemId, 0, 0)
    }
    return new UpdateCartItemOutput(
      item.getId(),
      item.getQuantity(),
      item.getSubtotal().getAmount(),
    )
  }
}
```

**Use Case 흐름**:
1. Cart 조회
2. CartItem 존재 여부 확인
3. 수량 증가 시만 재고 검증 (CartStockValidationService, BR-CART-08)
4. quantity = 0이면 아이템 삭제 (BR-CART-07)
5. quantity > 0이면 Cart.updateItemQuantity() 호출
6. Cart 저장
7. Output DTO 반환

**구현 예시**:
```typescript
@Injectable()
export class UpdateCartItemUseCase {
  constructor(
    @Inject('CartRepository')
    private readonly cartRepository: CartRepository,
    private readonly cartStockValidationService: CartStockValidationService,
  ) {}

  async execute(input: UpdateCartItemInput): Promise<UpdateCartItemOutput> {
    // 1. 장바구니 조회
    const cart = await this.cartRepository.findByUserId(input.userId);
    if (!cart) {
      throw new CartNotFoundException();
    }

    // 2. 아이템 존재 확인
    const item = cart.findItem(input.cartItemId);
    if (!item) {
      throw new CartItemNotFoundException();
    }

    // 3. 수량 0 이하면 삭제 (BR-CART-07)
    if (input.quantity <= 0) {
      cart.removeItem(input.cartItemId);
      await this.cartRepository.save(cart);
      return UpdateCartItemOutput.from(cart, input.cartItemId);
    }

    // 4. 수량 증가 시만 재고 검증 (BR-CART-08)
    if (input.quantity > item.getQuantity()) {
      await this.cartStockValidationService.validateAvailability(
        item.getProductOptionId(),
        input.quantity,
      );
    }

    // 5. 수량 변경
    cart.updateItemQuantity(input.cartItemId, input.quantity);

    // 6. 저장
    await this.cartRepository.save(cart);

    return UpdateCartItemOutput.from(cart, input.cartItemId);
  }
}
```

#### 3.4 Use Case: Remove Cart Item
**파일**:
- `src/cart/application/dtos/remove-cart-item.dto.ts`
- `src/cart/application/use-cases/remove-cart-item.use-case.ts`

**DTO 구조**:
```typescript
export class RemoveCartItemInput {
  userId: string
  cartItemId: string
}

export class RemoveCartItemOutput {
  success: boolean
  message: string
}
```

**Use Case 흐름**:
1. Cart 조회
2. Cart.removeItem() 호출
3. Cart 저장
4. Output DTO 반환

#### 3.5 Use Case: Clear Cart
**파일**:
- `src/cart/application/dtos/clear-cart.dto.ts`
- `src/cart/application/use-cases/clear-cart.use-case.ts`

**DTO 구조**:
```typescript
export class ClearCartInput {
  userId: string
}

export class ClearCartOutput {
  success: boolean
  message: string
  deletedCount: number
}
```

**Use Case 흐름**:
1. Cart 조회
2. 없으면 성공 반환 (BR-CART-14)
3. Cart.clearAll() 호출
4. Cart 저장
5. Output DTO 반환

### Step 4: Presentation Layer Implementation

#### 4.1 Cart Controller
**파일**: `src/cart/presentation/controllers/cart.controller.ts`

**Endpoints**:
```typescript
@Controller('carts')
export class CartController {
  constructor(
    private readonly addCartItemUseCase: AddCartItemUseCase,
    private readonly getCartUseCase: GetCartUseCase,
    private readonly updateCartItemUseCase: UpdateCartItemUseCase,
    private readonly removeCartItemUseCase: RemoveCartItemUseCase,
    private readonly clearCartUseCase: ClearCartUseCase,
  ) {}

  @Post('items')        // POST /carts/items
  @HttpCode(201)
  async addItem(
    @Body() dto: AddCartItemRequestDto,
    @CurrentUser() user: User,
  ): Promise<CartItemResponseDto> {
    const input = new AddCartItemInput({
      userId: user.id,
      productId: dto.productId,
      productOptionId: dto.productOptionId,
      quantity: dto.quantity,
    });
    const output = await this.addCartItemUseCase.execute(input);
    return CartItemResponseDto.from(output);
  }

  @Get()                // GET /carts
  async getCart(
    @CurrentUser() user: User,
  ): Promise<CartResponseDto> {
    const input = new GetCartInput(user.id);
    const output = await this.getCartUseCase.execute(input);
    return CartResponseDto.from(output);
  }

  @Patch('items/:id')   // PATCH /carts/items/:id
  async updateItem(
    @Param() param: GetCartItemParamDto,
    @Body() dto: UpdateCartItemRequestDto,
    @CurrentUser() user: User,
  ): Promise<CartItemResponseDto> {
    const input = new UpdateCartItemInput({
      userId: user.id,
      cartItemId: param.id,
      quantity: dto.quantity,
    });
    const output = await this.updateCartItemUseCase.execute(input);
    return CartItemResponseDto.from(output);
  }

  @Delete('items/:id')  // DELETE /carts/items/:id
  @HttpCode(204)
  async removeItem(
    @Param() param: GetCartItemParamDto,
    @CurrentUser() user: User,
  ): Promise<void> {
    const input = new RemoveCartItemInput({
      userId: user.id,
      cartItemId: param.id,
    });
    await this.removeCartItemUseCase.execute(input);
  }

  @Delete()             // DELETE /carts
  @HttpCode(204)
  async clearCart(
    @CurrentUser() user: User,
  ): Promise<void> {
    const input = new ClearCartInput(user.id);
    await this.clearCartUseCase.execute(input);
  }
}
```

#### 4.2 Request/Response DTOs
**파일**: `src/cart/presentation/dtos/*`

**AddCartItemRequestDto**:
```typescript
export class AddCartItemRequestDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsOptional()
  productOptionId?: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}
```

**UpdateCartItemRequestDto**:
```typescript
export class UpdateCartItemRequestDto {
  @IsNumber()
  @Min(0)
  quantity: number;
}
```

**CartItemResponseDto**:
```typescript
export class CartItemResponseDto {
  cartItemId: string;
  quantity: number;
  subtotal: number;

  static from(output: AddCartItemOutput | UpdateCartItemOutput): CartItemResponseDto {
    const dto = new CartItemResponseDto();
    dto.cartItemId = output.cartItemId;
    dto.quantity = output.quantity;
    dto.subtotal = output.subtotal;
    return dto;
  }
}
```

**CartResponseDto**:
```typescript
export class CartResponseDto {
  items: CartItemData[];
  totalAmount: number;
  itemCount: number;

  static from(output: GetCartOutput): CartResponseDto {
    const dto = new CartResponseDto();
    dto.items = output.items;
    dto.totalAmount = output.totalAmount;
    dto.itemCount = output.itemCount;
    return dto;
  }
}
```

### Step 5: Module Configuration

**파일**: `src/cart/cart.module.ts`

```typescript
@Module({
  imports: [ProductModule],  // ProductRepository, StockRepository 사용
  controllers: [CartController],
  providers: [
    // Domain Services
    CartStockValidationService,

    // Use Cases
    AddCartItemUseCase,
    GetCartUseCase,
    UpdateCartItemUseCase,
    RemoveCartItemUseCase,
    ClearCartUseCase,

    // Repository
    {
      provide: 'CartRepository',
      useClass: InMemoryCartRepository,
    },
  ],
  exports: ['CartRepository'],
})
export class CartModule {}
```

### Step 6: Testing

#### 6.1 Domain Entity Tests
**파일**:
- `cart.entity.spec.ts`: Cart Entity 단위 테스트
- `cart-item.entity.spec.ts`: CartItem Entity 단위 테스트

**테스트 케이스 예시**:
```typescript
describe('Cart', () => {
  describe('생성', () => {
    it('유효한 userId로 인스턴스를 생성해야 함', () => {
      // Given
      const userId = 'user-1';

      // When
      const cart = Cart.create(userId);

      // Then
      expect(cart.getUserId()).toBe(userId);
      expect(cart.getItems()).toHaveLength(0);
      expect(cart.getTotalAmount().getAmount()).toBe(0);
    });
  });

  describe('아이템 추가', () => {
    it('새로운 아이템을 추가해야 함', () => {
      // Given
      const cart = Cart.create('user-1');
      const itemData = {
        productId: 'prod-1',
        productName: '상품 A',
        productOptionId: 'opt-1',
        price: Money.of(10000),
        quantity: 2,
      };

      // When
      cart.addItem(itemData);

      // Then
      expect(cart.getItems()).toHaveLength(1);
      expect(cart.getTotalAmount().getAmount()).toBe(20000);
    });

    it('동일 상품+옵션이면 수량을 증가시켜야 함 (BR-CART-01)', () => {
      // Given
      const cart = Cart.create('user-1');
      const itemData = {
        productId: 'prod-1',
        productName: '상품 A',
        productOptionId: 'opt-1',
        price: Money.of(10000),
        quantity: 2,
      };
      cart.addItem(itemData);

      // When
      cart.addItem({ ...itemData, quantity: 3 });

      // Then
      expect(cart.getItems()).toHaveLength(1);  // 아이템 개수 증가 안됨
      expect(cart.getItems()[0].getQuantity()).toBe(5);  // 수량만 증가 (2 + 3)
    });
  });

  describe('총 금액 계산', () => {
    it('모든 아이템의 소계 합을 반환해야 함 (BR-CART-05)', () => {
      // Given
      const cart = Cart.create('user-1');
      cart.addItem({
        productId: 'prod-1',
        productName: '상품 A',
        productOptionId: 'opt-1',
        price: Money.of(10000),
        quantity: 2,
      });
      cart.addItem({
        productId: 'prod-2',
        productName: '상품 B',
        productOptionId: null,
        price: Money.of(5000),
        quantity: 3,
      });

      // When
      const total = cart.getTotalAmount();

      // Then
      expect(total.getAmount()).toBe(35000);  // (10000 × 2) + (5000 × 3)
    });

    it('아이템이 없으면 0을 반환해야 함 (BR-CART-06)', () => {
      // Given
      const cart = Cart.create('user-1');

      // When
      const total = cart.getTotalAmount();

      // Then
      expect(total.getAmount()).toBe(0);
    });
  });
});
```

#### 6.2 Domain Service Tests
**파일**: `cart-stock-validation.service.spec.ts`

**테스트 케이스 예시**:
```typescript
describe('CartStockValidationService', () => {
  let service: CartStockValidationService;
  let mockStockRepository: jest.Mocked<StockRepository>;

  beforeEach(() => {
    mockStockRepository = {
      findByProductOption: jest.fn(),
    } as any;

    service = new CartStockValidationService(mockStockRepository);
  });

  describe('재고 검증', () => {
    it('재고가 충분하면 성공해야 함', async () => {
      // Given
      const stock = Stock.reconstitute({
        id: 'stock-1',
        productOptionId: 'opt-1',
        availableQuantity: 10,
        reservedQuantity: 0,
      });
      mockStockRepository.findByProductOption.mockResolvedValue(stock);

      // When & Then
      await expect(
        service.validateAvailability('opt-1', 5),
      ).resolves.not.toThrow();
    });

    it('재고가 부족하면 InsufficientStockException을 발생시켜야 함', async () => {
      // Given
      const stock = Stock.reconstitute({
        id: 'stock-1',
        productOptionId: 'opt-1',
        availableQuantity: 3,
        reservedQuantity: 0,
      });
      mockStockRepository.findByProductOption.mockResolvedValue(stock);

      // When & Then
      await expect(
        service.validateAvailability('opt-1', 5),
      ).rejects.toThrow(InsufficientStockException);
    });

    it('재고를 찾을 수 없으면 ProductNotFoundException을 발생시켜야 함', async () => {
      // Given
      mockStockRepository.findByProductOption.mockResolvedValue(null);

      // When & Then
      await expect(
        service.validateAvailability('opt-1', 5),
      ).rejects.toThrow(ProductNotFoundException);
    });
  });
});
```

#### 6.3 Use Case Integration Tests
**파일**: 각 Use Case별 `.spec.ts` 파일

**테스트 케이스 예시**:
```typescript
describe('AddCartItemUseCase', () => {
  let useCase: AddCartItemUseCase;
  let mockCartRepository: jest.Mocked<CartRepository>;
  let mockProductRepository: jest.Mocked<ProductRepository>;
  let mockCartStockValidationService: jest.Mocked<CartStockValidationService>;

  beforeEach(() => {
    mockCartRepository = {
      findByUserId: jest.fn(),
      save: jest.fn(),
    } as any;

    mockProductRepository = {
      findById: jest.fn(),
    } as any;

    mockCartStockValidationService = {
      validateAvailability: jest.fn(),
    } as any;

    useCase = new AddCartItemUseCase(
      mockCartRepository,
      mockProductRepository,
      mockCartStockValidationService,
    );
  });

  describe('실행', () => {
    it('새로운 아이템을 장바구니에 추가해야 함', async () => {
      // Given
      const input = new AddCartItemInput({
        userId: 'user-1',
        productId: 'prod-1',
        productOptionId: 'opt-1',
        quantity: 2,
      });

      const product = Product.reconstitute({
        id: 'prod-1',
        name: '상품 A',
        price: Money.of(10000),
      });

      mockProductRepository.findById.mockResolvedValue(product);
      mockCartStockValidationService.validateAvailability.mockResolvedValue();
      mockCartRepository.findByUserId.mockResolvedValue(null);
      mockCartRepository.save.mockImplementation(cart => Promise.resolve(cart));

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.cartItemId).toBeDefined();
      expect(output.quantity).toBe(2);
      expect(mockCartRepository.save).toHaveBeenCalled();
    });

    it('동일 상품+옵션이 있으면 수량을 증가시켜야 함', async () => {
      // Given
      const existingCart = Cart.create('user-1');
      existingCart.addItem({
        productId: 'prod-1',
        productName: '상품 A',
        productOptionId: 'opt-1',
        price: Money.of(10000),
        quantity: 2,
      });

      const product = Product.reconstitute({
        id: 'prod-1',
        name: '상품 A',
        price: Money.of(10000),
      });

      mockProductRepository.findById.mockResolvedValue(product);
      mockCartStockValidationService.validateAvailability.mockResolvedValue();
      mockCartRepository.findByUserId.mockResolvedValue(existingCart);
      mockCartRepository.save.mockImplementation(cart => Promise.resolve(cart));

      const input = new AddCartItemInput({
        userId: 'user-1',
        productId: 'prod-1',
        productOptionId: 'opt-1',
        quantity: 3,
      });

      // When
      await useCase.execute(input);

      // Then
      const savedCart = mockCartRepository.save.mock.calls[0][0];
      expect(savedCart.getItems()).toHaveLength(1);
      expect(savedCart.getItems()[0].getQuantity()).toBe(5);  // 2 + 3
    });

    it('재고가 부족하면 InsufficientStockException을 발생시켜야 함', async () => {
      // Given
      const product = Product.reconstitute({
        id: 'prod-1',
        name: '상품 A',
        price: Money.of(10000),
      });

      mockProductRepository.findById.mockResolvedValue(product);
      mockCartStockValidationService.validateAvailability.mockRejectedValue(
        new InsufficientStockException(),
      );

      const input = new AddCartItemInput({
        userId: 'user-1',
        productId: 'prod-1',
        productOptionId: 'opt-1',
        quantity: 100,
      });

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        InsufficientStockException,
      );
    });
  });
});
```

#### 6.4 E2E Tests
**파일**: `cart.controller.spec.ts`

**테스트 케이스 예시**:
```typescript
describe('Cart API (E2E)', () => {
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

  describe('POST /carts/items', () => {
    it('장바구니에 상품을 추가해야 함', async () => {
      // Given
      const requestDto = {
        productId: 'prod-1',
        productOptionId: 'opt-1',
        quantity: 2,
      };

      // When & Then
      return request(app.getHttpServer())
        .post('/carts/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.cartItemId).toBeDefined();
          expect(res.body.quantity).toBe(2);
          expect(res.body.subtotal).toBeGreaterThan(0);
        });
    });

    it('재고가 부족하면 409 Conflict를 반환해야 함', async () => {
      // Given
      const requestDto = {
        productId: 'prod-1',
        productOptionId: 'opt-1',
        quantity: 1000,  // 재고 초과
      };

      // When & Then
      return request(app.getHttpServer())
        .post('/carts/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestDto)
        .expect(409);
    });
  });

  describe('GET /carts', () => {
    it('장바구니 내역을 조회해야 함', async () => {
      // Given
      await request(app.getHttpServer())
        .post('/carts/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: 'prod-1',
          productOptionId: 'opt-1',
          quantity: 2,
        });

      // When & Then
      return request(app.getHttpServer())
        .get('/carts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toBeInstanceOf(Array);
          expect(res.body.items).toHaveLength(1);
          expect(res.body.totalAmount).toBeGreaterThan(0);
          expect(res.body.itemCount).toBe(1);
        });
    });

    it('빈 장바구니면 빈 배열과 0원을 반환해야 함', async () => {
      // When & Then
      return request(app.getHttpServer())
        .get('/carts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toEqual([]);
          expect(res.body.totalAmount).toBe(0);
          expect(res.body.itemCount).toBe(0);
        });
    });
  });

  describe('PATCH /carts/items/:id', () => {
    it('장바구니 아이템 수량을 변경해야 함', async () => {
      // Given
      const addResponse = await request(app.getHttpServer())
        .post('/carts/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: 'prod-1',
          productOptionId: 'opt-1',
          quantity: 2,
        });

      const cartItemId = addResponse.body.cartItemId;

      // When & Then
      return request(app.getHttpServer())
        .patch(`/carts/items/${cartItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quantity: 5 })
        .expect(200)
        .expect((res) => {
          expect(res.body.quantity).toBe(5);
        });
    });

    it('수량을 0으로 변경하면 아이템이 삭제되어야 함 (BR-CART-07)', async () => {
      // Given
      const addResponse = await request(app.getHttpServer())
        .post('/carts/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: 'prod-1',
          productOptionId: 'opt-1',
          quantity: 2,
        });

      const cartItemId = addResponse.body.cartItemId;

      // When
      await request(app.getHttpServer())
        .patch(`/carts/items/${cartItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quantity: 0 })
        .expect(200);

      // Then
      return request(app.getHttpServer())
        .get('/carts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toEqual([]);
        });
    });
  });

  describe('DELETE /carts/items/:id', () => {
    it('장바구니에서 아이템을 삭제해야 함', async () => {
      // Given
      const addResponse = await request(app.getHttpServer())
        .post('/carts/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: 'prod-1',
          productOptionId: 'opt-1',
          quantity: 2,
        });

      const cartItemId = addResponse.body.cartItemId;

      // When & Then
      return request(app.getHttpServer())
        .delete(`/carts/items/${cartItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });
  });

  describe('DELETE /carts', () => {
    it('장바구니를 전체 비워야 함', async () => {
      // Given
      await request(app.getHttpServer())
        .post('/carts/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: 'prod-1',
          productOptionId: 'opt-1',
          quantity: 2,
        });

      // When
      await request(app.getHttpServer())
        .delete('/carts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Then
      return request(app.getHttpServer())
        .get('/carts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toEqual([]);
        });
    });
  });
});
```

## Business Rules Implementation

### BR-CART-01: 중복 아이템 처리
**위치**: `Cart.addItem()`
```typescript
const existingItem = this.items.find(
  item => item.isSameProduct(productId, productOptionId)
)
if (existingItem) {
  existingItem.increaseQuantity(quantity)
} else {
  this.items.push(CartItem.create(...))
}
```

### BR-CART-02: 재고 검증
**위치**: `CartStockValidationService.validateAvailability()`
```typescript
const stock = await this.stockRepository.findByProductOption(productOptionId)
if (!stock || !stock.canFulfill(requestedQuantity)) {
  throw new InsufficientStockException('재고가 부족합니다.')
}
```

### BR-CART-03: 최소 수량
**위치**: `CartItem.updateQuantity()`
```typescript
if (quantity < 1) {
  throw new InvalidQuantityException('수량은 1 이상이어야 합니다.')
}
```

### BR-CART-05: 총 금액 계산
**위치**: `Cart.getTotalAmount()`
```typescript
return this.items.reduce((sum, item) => sum + item.getSubtotal().getAmount(), 0)
```

### BR-CART-07: 수량 0 이하 처리
**위치**: `UpdateCartItemUseCase`
```typescript
if (quantity <= 0) {
  cart.removeItem(itemId)
}
```

### BR-CART-08: 재고 검증 (증가 시만)
**위치**: `UpdateCartItemUseCase`
```typescript
if (input.quantity > item.getQuantity()) {
  await this.cartStockValidationService.validateAvailability(
    item.getProductOptionId(),
    input.quantity,
  )
}
```

## Dependencies

### Product Domain
Cart 도메인은 Product 도메인에 의존합니다:
- `ProductRepository`: 상품 존재 여부 확인 (Application Layer)
- `StockRepository`: 재고 검증 (Domain Service)

**주의**: 도메인 간 직접 의존 대신 Application Layer와 Domain Service에서 조율

## Testing Strategy

### Test Coverage Goals
- Domain Layer: 100% (모든 비즈니스 로직 + Domain Service)
- Application Layer: >90% (Use Cases)
- Presentation Layer: >80% (Controllers)
- Infrastructure Layer: >80% (Repository)

### Test Types
1. **Unit Tests** (`.spec.ts`): Domain Entities, Value Objects, Domain Services
2. **Integration Tests** (`.spec.ts`): Use Cases with mocked repositories
3. **E2E Tests** (`.spec.ts`): API endpoints with full app context

## Commit Strategy

**커밋 단위**:
1. `feat: Cart 도메인 엔티티 및 도메인 서비스 구현`
   - Cart, CartItem Entity
   - CartStockValidationService
   - Domain Exceptions
2. `feat: Cart 인프라 레이어 구현`
   - InMemoryCartRepository
   - Test Fixtures
3. `feat: Cart 애플리케이션 레이어 구현`
   - Use Case별 DTO 및 Use Case 구현
4. `feat: Cart 프레젠테이션 레이어 구현`
   - CartController
   - Request/Response DTOs
5. `test: Cart 도메인 테스트 한글화 및 완성`
   - Domain Entity Tests
   - Domain Service Tests
   - Use Case Integration Tests
   - E2E Tests

**커밋 메시지 예시**:
```
feat: Cart 도메인 엔티티 및 도메인 서비스 구현

Cart와 CartItem 엔티티, CartStockValidationService를 구현했습니다.
- BR-CART-01: 중복 아이템 처리 로직
- BR-CART-02: 재고 검증 (도메인 서비스)
- BR-CART-03: 수량 검증 로직
- BR-CART-05: 총 금액 계산 로직

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Success Criteria

- [ ] Cart, CartItem Entity 구현 완료
- [ ] CartStockValidationService 구현 완료
- [ ] CartRepository Interface 정의 완료
- [ ] InMemoryCartRepository 구현 완료
- [ ] 5개 Use Case 구현 완료
- [ ] CartController 구현 완료 (5개 엔드포인트)
- [ ] 모든 비즈니스 규칙 구현 완료
- [ ] Domain Layer 테스트 작성 완료 (한글)
- [ ] Domain Service 테스트 작성 완료 (한글)
- [ ] Application Layer 테스트 작성 완료 (한글)
- [ ] E2E 테스트 작성 완료 (한글)
- [ ] 모든 테스트 통과
- [ ] 코딩 컨벤션 준수 (DTO 통합, 한글 테스트 등)

## Out of Scope

- Prisma 연동 (추후 별도 Issue에서 처리)
- 인증/인가 구현 (User Mock 사용)
- 장바구니 유효기간 관리
- 장바구니 공유 기능
- 동시성 제어 (현 단계에서는 사용자별 독립적 장바구니로 가정)

## References

- [Issue #007](./issue007.md) - Product Domain Implementation
- [Cart Use Cases](../dev/dashboard/cart/use-cases.md)
- [Cart Sequence Diagrams](../dev/dashboard/cart/sequence-diagrams.md)
- [API Specification](../dev/dashboard/api-specification.md#epic-2-장바구니-관리-api)
- [Architecture](../dev/dashboard/architecture.md)
- [CLAUDE.md](../../CLAUDE.md) - Project coding conventions
- [policy.md](../policy.md) - Development policies

## Completion Summary

### Test Coverage Improvements
이슈 구현 후 테스트 커버리지 개선 작업을 진행했습니다:

**추가된 테스트 파일**:
- `src/cart/application/use-cases/get-cart.use-case.spec.ts` (3개 테스트)
- `src/cart/application/use-cases/update-cart-item.use-case.spec.ts` (7개 테스트)
- `src/cart/application/use-cases/remove-cart-item.use-case.spec.ts` (5개 테스트)
- `src/cart/application/use-cases/clear-cart.use-case.spec.ts` (6개 테스트)

**테스트 결과**:
- 총 74개 테스트 모두 통과
- 추가된 테스트: 22개 (Use Case 통합 테스트)
- 테스트 커버리지: Application Layer 완전 커버

### Entity Refactoring
Cart 및 CartItem 엔티티를 Product 엔티티의 constructor 패턴에 맞춰 리팩토링했습니다:

**변경 내용**:
- `src/cart/domain/entities/cart-item.entity.ts`
  - Empty constructor + `as any` 패턴 제거
  - Private constructor with all parameters 사용
  - `create()` 및 `reconstitute()` 팩토리 메서드 패턴 적용
  - Type safety 향상

- `src/cart/domain/entities/cart.entity.ts`
  - CartItem과 동일한 constructor 패턴 적용
  - 불필요한 import 제거 (`CartItemCreateData`)

**개선 효과**:
- `as any` 타입 캐스팅 완전 제거
- 객체 생성 시 타입 안전성 향상
- Product 도메인과의 일관성 확보
- 코드 가독성 및 유지보수성 향상

### Final Status
- ✅ All domain entities implemented with constructor pattern
- ✅ All use cases have comprehensive test coverage
- ✅ 74 tests passing (0 failures)
- ✅ Type safety improvements completed
- ✅ Code consistency across domains achieved

## Notes

- 인메모리 저장소를 사용하므로 서버 재시작 시 데이터 초기화됨
- Product 도메인과의 의존성은 Application Layer와 Domain Service에서 관리
- **Domain Service 사용**: 재고 검증 로직을 CartStockValidationService로 분리하여 Application Layer의 비즈니스 로직 누출 방지
- 동시성 제어는 현 단계에서 고려하지 않음 (사용자별 독립적 장바구니)
- 재고 검증은 AddCartItem, UpdateCartItem(수량 증가 시만) 시에 수행
