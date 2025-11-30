import { Module } from '@nestjs/common';
import { ProductController } from '@/product/presentation/controllers/product.controller';
import { GetProductsUseCase } from '@/product/application/use-cases/get-products.use-case';
import { GetProductDetailUseCase } from '@/product/application/use-cases/get-product-detail.use-case';
import { ReserveStockUseCase } from '@/product/application/use-cases/reserve-stock.use-case';
import { ReleaseStockUseCase } from '@/product/application/use-cases/release-stock.use-case';
import { ConfirmSaleUseCase } from '@/product/application/use-cases/confirm-sale.use-case';
import { ValidateStockUseCase } from '@/product/application/use-cases/validate-stock.use-case';
import { PRODUCT_REPOSITORY, CATEGORY_REPOSITORY } from '@/product/domain/repositories/tokens';
import { InMemoryProductRepository } from '@/product/infrastructure/repositories/in-memory-product.repository';
import { InMemoryCategoryRepository } from '@/product/infrastructure/repositories/in-memory-category.repository';
import { ProductPrismaRepository } from '@/product/infrastructure/repositories/product-prisma.repository';
import { CategoryPrismaRepository } from '@/product/infrastructure/repositories/category-prisma.repository';
import { StockManagementService } from '@/product/domain/services/stock-management.service';
import { PrismaModule } from '@/common/infrastructure/persistance/prisma.module';

/**
 * Product Module
 * Configures dependency injection for Product domain
 */
@Module({
  imports: [PrismaModule],
  controllers: [ProductController],
  providers: [
    // Use Cases
    GetProductsUseCase,
    GetProductDetailUseCase,

    // Stock Use Cases (Application Layer - 동시성 제어 포함)
    ReserveStockUseCase,
    ReleaseStockUseCase,
    ConfirmSaleUseCase,
    ValidateStockUseCase,

    // Domain Services (순수 비즈니스 로직)
    StockManagementService,

    // Repositories (환경별 분기)
    {
      provide: PRODUCT_REPOSITORY,
      useClass:
        process.env.NODE_ENV === 'test' ? InMemoryProductRepository : ProductPrismaRepository,
    },
    {
      provide: CATEGORY_REPOSITORY,
      useClass:
        process.env.NODE_ENV === 'test' ? InMemoryCategoryRepository : CategoryPrismaRepository,
    },
  ],
  exports: [
    // Export use cases if needed by other modules
    GetProductsUseCase,
    GetProductDetailUseCase,

    // Export stock use cases for other modules (Order)
    ReserveStockUseCase,
    ReleaseStockUseCase,
    ConfirmSaleUseCase,
    ValidateStockUseCase,

    // Export domain services (순수 비즈니스 로직)
    StockManagementService,

    PRODUCT_REPOSITORY,
  ],
})
export class ProductModule {}
