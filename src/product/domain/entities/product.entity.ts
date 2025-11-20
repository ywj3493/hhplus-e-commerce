import { Money } from '@/product/domain/entities/money.vo';
import { StockStatus } from '@/product/domain/entities/stock-status.vo';
import { ProductOption } from '@/product/domain/entities/product-option.entity';

/**
 * 타입별로 그룹화된 옵션
 * BR-PROD-05: type 필드 기준으로 옵션 그룹화
 */
export interface GroupedOptions {
  type: string;
  options: Array<{
    id: string;
    name: string;
    additionalPrice: Money;
    stockStatus: StockStatus;
    isSelectable: boolean;
  }>;
}

/**
 * Product Entity
 * Product 도메인의 메인 애그리거트 루트
 * BR-PROD-05: 옵션은 타입별로 그룹화됨
 */
export class Product {
  private readonly _id: string;
  private readonly _name: string;
  private readonly _price: Money;
  private readonly _description: string;
  private readonly _imageUrl: string;
  private readonly _options: ProductOption[];
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  private constructor(
    id: string,
    name: string,
    price: Money,
    description: string,
    imageUrl: string,
    options: ProductOption[],
    createdAt: Date,
    updatedAt: Date,
  ) {
    this._id = id;
    this._name = name;
    this._price = price;
    this._description = description;
    this._imageUrl = imageUrl;
    this._options = options;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;

    this.validate();
  }

  /**
   * Product 인스턴스를 생성하는 팩토리 메서드
   */
  static create(
    id: string,
    name: string,
    price: Money,
    description: string,
    imageUrl: string,
    options: ProductOption[],
    createdAt: Date,
    updatedAt: Date,
  ): Product {
    return new Product(id, name, price, description, imageUrl, options, createdAt, updatedAt);
  }

  private validate(): void {
    if (!this._id || this._id.trim() === '') {
      throw new Error('상품 ID는 필수입니다');
    }
    if (!this._name || this._name.trim() === '') {
      throw new Error('상품명은 필수입니다');
    }
    if (!this._imageUrl || this._imageUrl.trim() === '') {
      throw new Error('상품 이미지 URL은 필수입니다');
    }
  }

  /**
   * 전체 재고 상태 조회
   * 하나 이상의 옵션이 재고 있으면 재고 있음으로 표시
   * BR-PROD-04: 재고 상태 계산
   */
  getStockStatus(): StockStatus {
    if (this._options.length === 0) {
      return StockStatus.outOfStock();
    }

    const hasAvailableOption = this._options.some((option) => option.isSelectable());
    return hasAvailableOption ? StockStatus.inStock() : StockStatus.outOfStock();
  }

  /**
   * 타입별로 옵션 그룹화
   * BR-PROD-05: type 필드 기준으로 옵션 그룹화
   */
  getGroupedOptions(): GroupedOptions[] {
    const grouped = new Map<string, ProductOption[]>();

    // 타입별로 옵션 그룹화
    for (const option of this._options) {
      const existing = grouped.get(option.type) || [];
      existing.push(option);
      grouped.set(option.type, existing);
    }

    // GroupedOptions 배열로 변환
    return Array.from(grouped.entries()).map(([type, options]) => ({
      type,
      options: options.map((opt) => ({
        id: opt.id,
        name: opt.name,
        additionalPrice: opt.additionalPrice,
        stockStatus: opt.getStockStatus(),
        isSelectable: opt.isSelectable(),
      })),
    }));
  }

  /**
   * ID로 옵션 찾기
   */
  findOption(optionId: string): ProductOption | undefined {
    return this._options.find((opt) => opt.id === optionId);
  }

  /**
   * 옵션을 포함한 총 가격 계산
   * BR-PROD-07: 총 금액 계산 = (상품 가격 + 옵션 추가 가격) × 수량
   */
  calculateTotalPrice(optionId: string, quantity: number): Money {
    if (quantity <= 0) {
      throw new Error('수량은 양수여야 합니다');
    }

    const option = this.findOption(optionId);
    if (!option) {
      throw new Error(`옵션을 찾을 수 없습니다: ${optionId}`);
    }

    const unitPrice = option.calculatePrice(this._price);
    return unitPrice.multiply(quantity);
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get price(): Money {
    return this._price;
  }

  get description(): string {
    return this._description;
  }

  get imageUrl(): string {
    return this._imageUrl;
  }

  get options(): ProductOption[] {
    return [...this._options]; // 불변성 유지를 위해 복사본 반환
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
