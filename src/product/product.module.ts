import { Module } from '@nestjs/common';
import { ProductController } from './presentation/controllers/product.controller';
import { GetProductsUseCase } from './application/use-cases/get-products.use-case';
import { GetProductDetailUseCase } from './application/use-cases/get-product-detail.use-case';
import { PRODUCT_REPOSITORY } from './domain/repositories/product.repository';
import { InMemoryProductRepository } from './infrastructure/repositories/in-memory-product.repository';

/**
 * Product Module
 * Configures dependency injection for Product domain
 */
@Module({
  controllers: [ProductController],
  providers: [
    // Use Cases
    GetProductsUseCase,
    GetProductDetailUseCase,

    // Repository
    {
      provide: PRODUCT_REPOSITORY,
      useClass: InMemoryProductRepository,
    },
  ],
  exports: [
    // Export use cases if needed by other modules
    GetProductsUseCase,
    GetProductDetailUseCase,
    PRODUCT_REPOSITORY,
  ],
})
export class ProductModule {}
