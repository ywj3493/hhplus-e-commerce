import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ProductsController } from './controllers/products.controller';
import { CartController } from './controllers/cart.controller';
import { OrdersController } from './controllers/orders.controller';
import { CouponsController } from './controllers/coupons.controller';
import { FakeAuthController } from './__fake__/auth/fake-auth.controller';
import { FakeJwtAuthGuard } from './__fake__/auth/fake-jwt-auth.guard';
import { ProductModule } from './product/product.module';

@Module({
  imports: [
    JwtModule.register({
      secret: 'fake-secret-key-for-testing',
      signOptions: { expiresIn: '1d' },
    }),
    ProductModule,
  ],
  controllers: [
    FakeAuthController,
    ProductsController,
    CartController,
    OrdersController,
    CouponsController,
  ],
  providers: [FakeJwtAuthGuard],
})
export class AppModule {}
