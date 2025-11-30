import { Module } from '@nestjs/common';
import { CouponController } from '@/coupon/presentation/controllers/coupon.controller';
import { IssueCouponUseCase } from '@/coupon/application/use-cases/issue-coupon.use-case';
import { GetUserCouponsUseCase } from '@/coupon/application/use-cases/get-user-coupons.use-case';
import { CouponService } from '@/coupon/domain/services/coupon.service';
import { CouponApplyService } from '@/coupon/application/services/coupon-apply.service';
import { UserCouponQueryService } from '@/coupon/domain/services/user-coupon.service';
import { InMemoryCouponRepository } from '@/coupon/infrastructure/repositories/in-memory-coupon.repository';
import { InMemoryUserCouponRepository } from '@/coupon/infrastructure/repositories/in-memory-user-coupon.repository';
import { CouponPrismaRepository } from '@/coupon/infrastructure/repositories/coupon-prisma.repository';
import { UserCouponPrismaRepository } from '@/coupon/infrastructure/repositories/user-coupon-prisma.repository';
import { PrismaModule } from '@/common/infrastructure/persistance/prisma.module';
import {
  COUPON_REPOSITORY,
  USER_COUPON_REPOSITORY,
} from '@/coupon/domain/repositories/tokens';

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
  imports: [PrismaModule],
  controllers: [CouponController],
  providers: [
    // Domain Services
    CouponService,
    UserCouponQueryService,

    // Application Services
    CouponApplyService,

    // Use Cases
    IssueCouponUseCase,
    GetUserCouponsUseCase,

    // Repositories (환경별 분기)
    {
      provide: COUPON_REPOSITORY,
      useClass:
        process.env.NODE_ENV === 'test'
          ? InMemoryCouponRepository
          : CouponPrismaRepository,
    },
    {
      provide: USER_COUPON_REPOSITORY,
      useClass:
        process.env.NODE_ENV === 'test'
          ? InMemoryUserCouponRepository
          : UserCouponPrismaRepository,
    },
  ],
  exports: [
    COUPON_REPOSITORY,
    USER_COUPON_REPOSITORY,
    CouponService,
    CouponApplyService, // Export for Order module
  ],
})
export class CouponModule {}
