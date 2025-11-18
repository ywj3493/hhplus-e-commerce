import { Module } from '@nestjs/common';
import { OrderController } from './presentation/controllers/order.controller';
import { CreateOrderUseCase } from './application/use-cases/create-order.use-case';
import { GetOrderUseCase } from './application/use-cases/get-order.use-case';
import { GetOrdersUseCase } from './application/use-cases/get-orders.use-case';
import { ReleaseExpiredReservationJob } from './application/jobs/release-expired-reservation.job';
import { StockReservationService } from './domain/services/stock-reservation.service';
import { InMemoryOrderRepository } from './infrastructure/repositories/in-memory-order.repository';
import {
  ORDER_REPOSITORY,
  CART_REPOSITORY,
  USER_COUPON_REPOSITORY,
  COUPON_REPOSITORY,
} from './application/use-cases/create-order.use-case';

// Import other modules
import { CartModule } from '../cart/cart.module';
import { CouponModule } from '../coupon/coupon.module';
import { ProductModule } from '../product/product.module';

/**
 * Order Module
 *
 * Providers:
 * - Use Cases
 * - Domain Services
 * - Repositories
 * - Batch Jobs
 *
 * Imports:
 * - CartModule (장바구니 기능)
 * - CouponModule (쿠폰 기능)
 * - ProductModule (상품/재고 기능)
 */
@Module({
  imports: [CartModule, CouponModule, ProductModule],
  controllers: [OrderController],
  providers: [
    // Use Cases
    CreateOrderUseCase,
    GetOrderUseCase,
    GetOrdersUseCase,

    // Batch Jobs
    ReleaseExpiredReservationJob,

    // Domain Services
    StockReservationService,

    // Repositories
    {
      provide: ORDER_REPOSITORY,
      useClass: InMemoryOrderRepository,
    },
    // Note: CART_REPOSITORY, USER_COUPON_REPOSITORY, COUPON_REPOSITORY는
    // CartModule, CouponModule에서 export됨
  ],
  exports: [
    ORDER_REPOSITORY,
    ReleaseExpiredReservationJob, // 스케줄러에서 사용
  ],
})
export class OrderModule {}
