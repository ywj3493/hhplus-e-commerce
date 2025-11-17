import { Module } from '@nestjs/common';
import { CouponController } from './presentation/controllers/coupon.controller';
import { IssueCouponUseCase } from './application/use-cases/issue-coupon.use-case';
import { GetUserCouponsUseCase } from './application/use-cases/get-user-coupons.use-case';
import { CouponService } from './domain/services/coupon.service';
import { UserCouponQueryService } from './domain/services/user-coupon-query.service';
import { InMemoryCouponRepository } from './infrastructure/repositories/in-memory-coupon.repository';
import { InMemoryUserCouponRepository } from './infrastructure/repositories/in-memory-user-coupon.repository';

/**
 * 쿠폰 모듈
 *
 * 책임:
 * - 쿠폰 발급 및 관리
 * - 사용자 쿠폰 조회
 *
 * Export:
 * - CouponRepository: Order 도메인에서 쿠폰 조회 시 사용
 * - UserCouponRepository: Order 도메인에서 쿠폰 사용 처리 시 사용
 * - CouponService: Order 도메인에서 쿠폰 사용 및 할인 계산 시 사용
 */
@Module({
  imports: [], // No dependencies
  controllers: [CouponController],
  providers: [
    // Domain Services
    CouponService,
    UserCouponQueryService,

    // Use Cases
    IssueCouponUseCase,
    GetUserCouponsUseCase,

    // Repositories
    {
      provide: 'CouponRepository',
      useClass: InMemoryCouponRepository,
    },
    {
      provide: 'UserCouponRepository',
      useClass: InMemoryUserCouponRepository,
    },
  ],
  exports: [
    'CouponRepository',
    'UserCouponRepository',
    CouponService, // Export for Order domain to use
  ],
})
export class CouponModule {}
