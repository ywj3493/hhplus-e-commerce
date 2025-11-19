import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Controllers
import { CartController } from './presentation/controllers/cart.controller';
import { OrderController } from './presentation/controllers/order.controller';
import { PaymentController } from './presentation/controllers/payment.controller';

// Use Cases - Cart
import { AddCartItemUseCase } from './application/use-cases/add-cart-item.use-case';
import { GetCartUseCase } from './application/use-cases/get-cart.use-case';
import { UpdateCartItemUseCase } from './application/use-cases/update-cart-item.use-case';
import { RemoveCartItemUseCase } from './application/use-cases/remove-cart-item.use-case';
import { ClearCartUseCase } from './application/use-cases/clear-cart.use-case';

// Use Cases - Order
import { CreateOrderUseCase } from './application/use-cases/create-order.use-case';
import { GetOrderUseCase } from './application/use-cases/get-order.use-case';
import { GetOrdersUseCase } from './application/use-cases/get-orders.use-case';

// Use Cases - Payment
import { ProcessPaymentUseCase } from './application/use-cases/process-payment.use-case';

// Domain Services
import { CartStockValidationService } from './domain/services/cart-stock-validation.service';
import { StockReservationService } from './domain/services/stock-reservation.service';

// Event Handlers
import { PaymentCompletedHandler } from './application/event-handlers/payment-completed.handler';

// Batch Jobs
import { ReleaseExpiredReservationJob } from './application/jobs/release-expired-reservation.job';

// Repositories
import { InMemoryCartRepository } from './infrastructure/repositories/in-memory-cart.repository';
import { InMemoryOrderRepository } from './infrastructure/repositories/in-memory-order.repository';
import { InMemoryPaymentRepository } from './infrastructure/repositories/in-memory-payment.repository';

// External Clients
import { MockPaymentApiClient } from './infrastructure/clients/mock-payment-api.client';
import { PAYMENT_API_CLIENT } from './infrastructure/clients/payment-api.interface';

// Symbols
import { ORDER_REPOSITORY, CART_REPOSITORY } from './application/use-cases/create-order.use-case';
import { PAYMENT_REPOSITORY } from './domain/repositories/payment.repository';

// Import other modules
import { CouponModule } from '../coupon/coupon.module';
import { ProductModule } from '../product/product.module';

/**
 * Order Module (Unified with Cart and Payment)
 *
 * 통합된 Order 도메인 모듈
 * - Cart 도메인 (장바구니)
 * - Order 도메인 (주문)
 * - Payment 도메인 (결제)
 *
 * Imports:
 * - CouponModule (쿠폰 기능)
 * - ProductModule (상품/재고 기능)
 */
@Module({
  imports: [
    EventEmitterModule.forRoot(),
    CouponModule,
    ProductModule,
  ],
  controllers: [
    CartController,
    OrderController,
    PaymentController,
  ],
  providers: [
    // Cart Use Cases
    AddCartItemUseCase,
    GetCartUseCase,
    UpdateCartItemUseCase,
    RemoveCartItemUseCase,
    ClearCartUseCase,

    // Order Use Cases
    CreateOrderUseCase,
    GetOrderUseCase,
    GetOrdersUseCase,

    // Payment Use Cases
    ProcessPaymentUseCase,

    // Domain Services
    CartStockValidationService,
    StockReservationService,

    // Event Handlers
    PaymentCompletedHandler,

    // Batch Jobs
    ReleaseExpiredReservationJob,

    // Repositories
    {
      provide: CART_REPOSITORY,
      useClass: InMemoryCartRepository,
    },
    {
      provide: ORDER_REPOSITORY,
      useClass: InMemoryOrderRepository,
    },
    {
      provide: PAYMENT_REPOSITORY,
      useClass: InMemoryPaymentRepository,
    },

    // External Clients
    {
      provide: PAYMENT_API_CLIENT,
      useClass: MockPaymentApiClient,
    },
  ],
  exports: [
    CART_REPOSITORY,
    ORDER_REPOSITORY,
    PAYMENT_REPOSITORY,
    ReleaseExpiredReservationJob, // 스케줄러에서 사용
  ],
})
export class OrderModule {}
