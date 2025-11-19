import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OrderController } from './presentation/controllers/order.controller';
import { CreateOrderUseCase } from './application/use-cases/create-order.use-case';
import { GetOrderUseCase } from './application/use-cases/get-order.use-case';
import { GetOrdersUseCase } from './application/use-cases/get-orders.use-case';
import { ReleaseExpiredReservationJob } from './application/jobs/release-expired-reservation.job';
import { PaymentCompletedHandler } from './application/event-handlers/payment-completed.handler';
import { StockReservationService } from './domain/services/stock-reservation.service';
import { InMemoryOrderRepository } from './infrastructure/repositories/in-memory-order.repository';
import { ORDER_REPOSITORY } from './application/use-cases/create-order.use-case';

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
  imports: [
    EventEmitterModule.forRoot(),
    CartModule,
    CouponModule,
    ProductModule,
  ],
  controllers: [OrderController],
  providers: [
    // Use Cases
    CreateOrderUseCase,
    GetOrderUseCase,
    GetOrdersUseCase,

    // Batch Jobs
    ReleaseExpiredReservationJob,

    // Event Handlers
    PaymentCompletedHandler,

    // Domain Services
    StockReservationService,

    // Repositories
    {
      provide: ORDER_REPOSITORY,
      useClass: InMemoryOrderRepository,
    },
    // Note: CartCheckoutService, CouponApplicationService는
    // CartModule, CouponModule에서 export됨
  ],
  exports: [
    ORDER_REPOSITORY,
    ReleaseExpiredReservationJob, // 스케줄러에서 사용
  ],
})
export class OrderModule {}
