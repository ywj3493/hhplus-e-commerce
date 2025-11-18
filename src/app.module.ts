import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ProductsController } from './controllers/products.controller';
import { CartController as OldCartController } from './controllers/cart.controller';
import { OrdersController } from './controllers/orders.controller';
import { CouponsController } from './controllers/coupons.controller';
import { FakeAuthController } from './__fake__/auth/fake-auth.controller';
import { FakeJwtAuthGuard } from './__fake__/auth/fake-jwt-auth.guard';
import { ProductModule } from './product/product.module';
import { CartModule } from './cart/cart.module';
import { CouponModule } from './coupon/coupon.module';
import { OrderModule } from './order/order.module';

@Module({
  imports: [
    JwtModule.register({
      secret: 'fake-secret-key-for-testing',
      signOptions: { expiresIn: '1d' },
    }),
    ProductModule,
    CartModule,
    CouponModule,
    OrderModule,
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
