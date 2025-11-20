import { Inject, Injectable } from '@nestjs/common';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '@/product/domain/repositories/product.repository';
import { GetProductsInput } from '@/product/application/dtos/get-products.dto';
import { GetProductsOutput, ProductListItem } from '@/product/application/dtos/get-products.dto';

/**
 * Get Products Use Case
 * UC-PROD-01: Product List Retrieval
 * Orchestrates product list retrieval with pagination and stock status
 */
@Injectable()
export class GetProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  /**
   * Execute use case
   * @param input - Pagination parameters
   * @returns Paginated product list with stock status
   */
  async execute(input: GetProductsInput): Promise<GetProductsOutput> {
    // Fetch products from repository (BR-PROD-01: sorted by newest first)
    const paginationResult = await this.productRepository.findAll(input.page, input.limit);

    // Map domain entities to output DTOs with stock status
    const items = paginationResult.items.map(
      (product) =>
        new ProductListItem(
          product.id,
          product.name,
          product.price.amount,
          product.imageUrl,
          product.getStockStatus(), // BR-PROD-04: Calculate stock status
        ),
    );

    return new GetProductsOutput(
      items,
      paginationResult.total,
      paginationResult.page,
      paginationResult.limit,
      paginationResult.totalPages,
    );
  }
}
