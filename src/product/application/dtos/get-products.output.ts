import { StockStatus } from '../../domain/entities/stock-status.vo';

/**
 * 상품 목록의 상품 아이템
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
 * 상품 목록 조회 Use Case Output DTO
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
