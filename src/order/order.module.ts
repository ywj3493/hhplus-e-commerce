import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Controllers
import { CartController } from '@/order/presentation/controllers/cart.controller';
import { OrderController } from '@/order/presentation/controllers/order.controller';
import { PaymentController } from '@/order/presentation/controllers/payment.controller';

// Use Cases - Cart
import { AddCartItemUseCase } from '@/order/application/use-cases/add-cart-item.use-case';
import { GetCartUseCase } from '@/order/application/use-cases/get-cart.use-case';
import { UpdateCartItemUseCase } from '@/order/application/use-cases/update-cart-item.use-case';
import { RemoveCartItemUseCase } from '@/order/application/use-cases/remove-cart-item.use-case';
import { ClearCartUseCase } from '@/order/application/use-cases/clear-cart.use-case';

// Use Cases - Order
import { CreateOrderUseCase } from '@/order/application/use-cases/create-order.use-case';
import { GetOrderUseCase } from '@/order/application/use-cases/get-order.use-case';
import { GetOrdersUseCase } from '@/order/application/use-cases/get-orders.use-case';

// Use Cases - Payment
import { ProcessPaymentUseCase } from '@/order/application/use-cases/process-payment.use-case';
import { ConfirmStockUseCase } from '@/order/application/use-cases/confirm-stock.use-case';
import { CompleteOrderUseCase } from '@/order/application/use-cases/complete-order.use-case';

// Facades
import { OrderFacade } from '@/order/application/facades/order.facade';

// Batch Jobs
import { ReleaseExpiredReservationJob } from '@/order/application/jobs/release-expired-reservation.job';

// Repositories - InMemory
import { InMemoryCartRepository } from '@/order/infrastructure/repositories/in-memory-cart.repository';
import { InMemoryOrderRepository } from '@/order/infrastructure/repositories/in-memory-order.repository';
import { InMemoryPaymentRepository } from '@/order/infrastructure/repositories/in-memory-payment.repository';

// Repositories - Prisma
import { CartPrismaRepository } from '@/order/infrastructure/repositories/cart-prisma.repository';
import { OrderPrismaRepository } from '@/order/infrastructure/repositories/order-prisma.repository';
import { PaymentPrismaRepository } from '@/order/infrastructure/repositories/payment-prisma.repository';

// Payment Adapter
import { FakePaymentAdapter } from '@/order/infrastructure/gateways/fake-payment.adapter';
import { FakePaymentApiAdapter } from '@/__fake__/payment/fake-payment-api.adapter';
import { PAYMENT_ADAPTER } from '@/order/domain/ports/payment.port';

// Symbols
import { ORDER_REPOSITORY, CART_REPOSITORY, PAYMENT_REPOSITORY } from '@/order/domain/repositories/tokens';

// Import other modules
import { CouponModule } from '@/coupon/coupon.module';
import { ProductModule } from '@/product/product.module';

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
    ConfirmStockUseCase,
    CompleteOrderUseCase,

    // Facades
    OrderFacade,

    // Batch Jobs
    ReleaseExpiredReservationJob,

    // Repositories
    {
      provide: CART_REPOSITORY,
      useClass:
        process.env.NODE_ENV === 'test'
          ? InMemoryCartRepository
          : CartPrismaRepository,
    },
    {
      provide: ORDER_REPOSITORY,
      useClass:
        process.env.NODE_ENV === 'test'
          ? InMemoryOrderRepository
          : OrderPrismaRepository,
    },
    {
      provide: PAYMENT_REPOSITORY,
      useClass:
        process.env.NODE_ENV === 'test'
          ? InMemoryPaymentRepository
          : PaymentPrismaRepository,
    },

    // Payment Adapter
    {
      provide: PAYMENT_ADAPTER,
      useClass:
        process.env.NODE_ENV === 'test'
          ? FakePaymentAdapter
          : process.env.NODE_ENV === 'production'
          ? FakePaymentApiAdapter
          : FakePaymentAdapter,
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
