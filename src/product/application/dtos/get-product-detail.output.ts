import { Money } from '../../domain/value-objects/money.vo';
import { StockStatus } from '../../domain/value-objects/stock-status.vo';

/**
 * Product option in detail
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
 * Grouped options by type
 */
export class ProductOptionGroup {
  constructor(
    public readonly type: string,
    public readonly options: ProductOptionDetail[],
  ) {}
}

/**
 * Get Product Detail Use Case Output DTO
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
