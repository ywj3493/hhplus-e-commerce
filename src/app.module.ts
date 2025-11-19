import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ProductsController } from './controllers/products.controller';
import { CartController as OldCartController } from './controllers/cart.controller';
import { OrdersController } from './controllers/orders.controller';
import { CouponsController } from './controllers/coupons.controller';
import { FakeAuthController } from './__fake__/auth/fake-auth.controller';
import { FakeJwtAuthGuard } from './__fake__/auth/fake-jwt-auth.guard';
import { ProductModule } from './product/product.module';
import { CouponModule } from './coupon/coupon.module';
import { OrderModule } from './order/order.module';

/**
 * App Module
 *
 * 도메인 통합 후 구조:
 * - ProductModule: 상품 및 재고 관리
 * - CouponModule: 쿠폰 관리
 * - OrderModule: 장바구니, 주문, 결제 통합 (구 CartModule, PaymentModule 포함)
 */
@Module({
  imports: [
    JwtModule.register({
      secret: 'fake-secret-key-for-testing',
      signOptions: { expiresIn: '1d' },
    }),
    ProductModule,
    CouponModule,
    OrderModule, // Cart + Order + Payment 통합
  ],
  controllers: [
    FakeAuthController,
    ProductsController,
    OldCartController, // 기존 mock controller는 임시로 유지
    OrdersController,
    CouponsController,
  ],
  providers: [FakeJwtAuthGuard],
})
export class AppModule {}
