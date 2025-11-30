import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { FakeAuthController } from '@/__fake__/auth/fake-auth.controller';
import { FakeJwtAuthGuard } from '@/__fake__/auth/fake-jwt-auth.guard';
import { PrismaModule } from '@/common/infrastructure/persistance/prisma.module';
import { RedisModule } from '@/common/infrastructure/locks/locks.module';
import { CacheConfigModule } from '@/common/infrastructure/cache/cache.module';
import { ProductModule } from '@/product/product.module';
import { CouponModule } from '@/coupon/coupon.module';
import { OrderModule } from '@/order/order.module';
import { UserModule } from '@/user/user.module';

/**
 * App Module
 *
 * 도메인 통합 후 구조:
 * - PrismaModule: 전역 데이터베이스 연결 (Global)
 * - RedisModule: 전역 Redis 연결 및 분산락 (Global)
 * - CacheConfigModule: 전역 캐시 설정 (Global)
 * - UserModule: 사용자 정보 관리
 * - ProductModule: 상품 및 재고 관리
 * - CouponModule: 쿠폰 관리
 * - OrderModule: 장바구니, 주문, 결제 통합 (구 CartModule, PaymentModule 포함)
 */
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: 'fake-secret-key-for-testing',
      signOptions: { expiresIn: '1d' },
    }),
    PrismaModule, // Global module for database connection
    RedisModule, // Global module for Redis and distributed lock
    CacheConfigModule, // Global module for caching
    UserModule,
    ProductModule,
    CouponModule,
    OrderModule, // Cart + Order + Payment 통합
  ],
  controllers: [
    FakeAuthController,
  ],
  providers: [FakeJwtAuthGuard],
})
export class AppModule {}
