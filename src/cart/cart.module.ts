import { Module } from '@nestjs/common';
import { ProductModule } from '../product/product.module';
import { CartController } from './presentation/controllers/cart.controller';
import { AddCartItemUseCase } from './application/use-cases/add-cart-item.use-case';
import { GetCartUseCase } from './application/use-cases/get-cart.use-case';
import { UpdateCartItemUseCase } from './application/use-cases/update-cart-item.use-case';
import { RemoveCartItemUseCase } from './application/use-cases/remove-cart-item.use-case';
import { ClearCartUseCase } from './application/use-cases/clear-cart.use-case';
import { CartStockValidationService } from './domain/services/cart-stock-validation.service';
import { CartCheckoutService } from './application/services/cart-checkout.service';
import { InMemoryCartRepository } from './infrastructure/repositories/in-memory-cart.repository';

export const CART_REPOSITORY = 'CartRepository';

/**
 * Cart Module
 * Configures dependency injection for Cart domain
 *
 * Dependencies:
 * - ProductModule: Product 조회 및 재고 검증을 위해 필요
 */
@Module({
  imports: [ProductModule], // ProductRepository, StockRepository 사용
  controllers: [CartController],
  providers: [
    // Domain Services
    CartStockValidationService,

    // Application Services
    CartCheckoutService,

    // Use Cases
    AddCartItemUseCase,
    GetCartUseCase,
    UpdateCartItemUseCase,
    RemoveCartItemUseCase,
    ClearCartUseCase,

    // Repository
    {
      provide: CART_REPOSITORY,
      useClass: InMemoryCartRepository,
    },
  ],
  exports: [
    // Export for other modules
    CART_REPOSITORY,
    CartCheckoutService, // Export for Order module
  ],
})
export class CartModule {}
