import { Inject, Injectable } from '@nestjs/common';
import { ProductRepository } from '@/product/domain/repositories/product.repository';
import { PRODUCT_REPOSITORY } from '@/product/domain/repositories/tokens';
import { GetProductsInput } from '@/product/application/dtos/get-products.dto';
import { GetProductsOutput, ProductListItem } from '@/product/application/dtos/get-products.dto';
import { REDIS_CACHE_SERVICE } from '@/common/infrastructure/cache/tokens';
import { RedisCacheServiceInterface } from '@/common/infrastructure/cache/redis-cache.service.interface';
import { RedisCacheable } from '@/common/utils/decorators/redis-cacheable.decorator';

/**
 * Get Products Use Case
 * UC-PROD-01: Product List Retrieval
 * Orchestrates product list retrieval with pagination and stock status
 */
@Injectable()
export class GetProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
    @Inject(REDIS_CACHE_SERVICE)
    private readonly redisCacheService: RedisCacheServiceInterface,
  ) {}

  /**
   * Execute use case
   * @param input - Pagination parameters
   * @returns Paginated product list with stock status
   */
  @RedisCacheable('products:list:{input.page}:{input.limit}', { ttlMs: 30000 })
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
