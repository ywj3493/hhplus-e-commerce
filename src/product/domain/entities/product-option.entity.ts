import { Price } from '@/product/domain/entities/price.vo';
import { StockStatus } from '@/product/domain/entities/stock-status.vo';
import { Stock } from '@/product/domain/entities/stock.entity';

/**
 * ProductOption Entity
 * 타입, 이름, 가격, 재고를 가진 상품 옵션을 나타냄
 * BR-PROD-05: 옵션은 type 필드로 그룹화됨
 * BR-PROD-06: 재고 상태는 옵션별로 표시됨
 */
export class ProductOption {
  private readonly _id: string;
  private readonly _productId: string;
  private readonly _type: string;
  private readonly _name: string;
  private readonly _additionalPrice: Price;
  private readonly _stock: Stock;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  private constructor(
    id: string,
    productId: string,
    type: string,
    name: string,
    additionalPrice: Price,
    stock: Stock,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this._id = id;
    this._productId = productId;
    this._type = type;
    this._name = name;
    this._additionalPrice = additionalPrice;
    this._stock = stock;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;

    this.validate();
  }

  /**
   * ProductOption 인스턴스를 생성하는 팩토리 메서드
   */
  static create(
    id: string,
    productId: string,
    type: string,
    name: string,
    additionalPrice: Price,
    stock: Stock,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date(),
  ): ProductOption {
    return new ProductOption(id, productId, type, name, additionalPrice, stock, createdAt, updatedAt);
  }

  private validate(): void {
    if (!this._id || this._id.trim() === '') {
      throw new Error('옵션 ID는 필수입니다');
    }
    if (!this._productId || this._productId.trim() === '') {
      throw new Error('상품 ID는 필수입니다');
    }
    if (!this._type || this._type.trim() === '') {
      throw new Error('옵션 타입은 필수입니다');
    }
    if (!this._name || this._name.trim() === '') {
      throw new Error('옵션명은 필수입니다');
    }
  }

  /**
   * 총 가격 계산 (기본 가격 + 추가 가격)
   * BR-PROD-07: 총 금액 계산에 사용됨
   */
  calculatePrice(basePrice: Price): Price {
    return basePrice.add(this._additionalPrice);
  }

  /**
   * 재고 상태 조회
   * BR-PROD-06: 옵션별로 재고 상태 표시
   */
  getStockStatus(): StockStatus {
    return this._stock.getStatus();
  }

  /**
   * 옵션 선택 가능 여부 확인
   * BR-PROD-08: 품절된 옵션은 선택 불가
   */
  isSelectable(): boolean {
    return this._stock.isAvailable();
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get productId(): string {
    return this._productId;
  }

  get type(): string {
    return this._type;
  }

  get name(): string {
    return this._name;
  }

  get additionalPrice(): Price {
    return this._additionalPrice;
  }

  get stock(): Stock {
    return this._stock;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
