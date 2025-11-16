import { Money } from '../../domain/entities/money.vo';
import { StockStatus } from '../../domain/entities/stock-status.vo';

/**
 * 상품 상세의 옵션 정보
 */
export class ProductOptionDetail {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly additionalPrice: Money,
    public readonly stockStatus: StockStatus,
    public readonly isSelectable: boolean,
  ) {}
}

/**
 * 타입별로 그룹화된 옵션
 */
export class ProductOptionGroup {
  constructor(
    public readonly type: string,
    public readonly options: ProductOptionDetail[],
  ) {}
}

/**
 * 상품 상세 조회 Use Case Input DTO
 */
export class GetProductDetailInput {
  readonly productId: string;

  constructor(productId: string) {
    this.productId = productId;
    this.validate();
  }

  private validate(): void {
    if (!this.productId || this.productId.trim() === '') {
      throw new Error('상품 ID는 필수입니다');
    }
  }
}

/**
 * 상품 상세 조회 Use Case Output DTO
 */
export class GetProductDetailOutput {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly price: Money,
    public readonly description: string,
    public readonly imageUrl: string,
    public readonly optionGroups: ProductOptionGroup[],
  ) {}
}

