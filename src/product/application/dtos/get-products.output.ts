import { StockStatus } from '../../domain/value-objects/stock-status.vo';

/**
 * Product item in list
 */
export class ProductListItem {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly price: number,
    public readonly imageUrl: string,
    public readonly stockStatus: StockStatus,
  ) {}
}

/**
 * Get Products Use Case Output DTO
 */
export class GetProductsOutput {
  constructor(
    public readonly items: ProductListItem[],
    public readonly total: number,
    public readonly page: number,
    public readonly limit: number,
    public readonly totalPages: number,
  ) {}
}
