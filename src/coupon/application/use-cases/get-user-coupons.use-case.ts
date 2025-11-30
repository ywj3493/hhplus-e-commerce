import { Inject, Injectable } from '@nestjs/common';
import { CouponRepository } from '@/coupon/domain/repositories/coupon.repository';
import { UserCouponRepository } from '@/coupon/domain/repositories/user-coupon.repository';
import {
  COUPON_REPOSITORY,
  USER_COUPON_REPOSITORY,
} from '@/coupon/domain/repositories/tokens';
import { CouponStatus } from '@/coupon/domain/entities/user-coupon.entity';
import {
  GetUserCouponsInput,
  GetUserCouponsOutput,
} from '@/coupon/application/dtos/get-user-coupons.dto';
import { Coupon } from '@/coupon/domain/entities/coupon.entity';
import { UserCouponQueryService } from '@/coupon/domain/services/user-coupon.service';

/**
 * 사용자 쿠폰 조회 Use Case
 *
 * 비즈니스 규칙:
 * - BR-COUPON-05: AVAILABLE 상태 분류 (Domain Service에서 처리)
 * - BR-COUPON-06: USED 상태 분류 (Domain Service에서 처리)
 * - BR-COUPON-07: 정렬 (Domain Service에서 처리)
 *
 * 흐름:
 * 1. UserCoupon 목록 조회 (userId로)
 * 2. 각 UserCoupon의 Coupon 정보 조회
 * 3. Domain Service를 통해 상태별로 분류 및 정렬
 * 4. DTO로 변환
 * 5. status 필터링 (있는 경우)
 */
@Injectable()
export class GetUserCouponsUseCase {
  constructor(
    @Inject(USER_COUPON_REPOSITORY)
    private readonly userCouponRepository: UserCouponRepository,
    @Inject(COUPON_REPOSITORY)
    private readonly couponRepository: CouponRepository,
    private readonly userCouponQueryService: UserCouponQueryService,
  ) {}

  async execute(input: GetUserCouponsInput): Promise<GetUserCouponsOutput> {
    // 1. UserCoupon 목록 조회
    const userCoupons = await this.userCouponRepository.findByUserId(
      input.userId,
    );

    if (userCoupons.length === 0) {
      return new GetUserCouponsOutput([], [], []);
    }

    // 2. 각 UserCoupon의 Coupon 정보 조회
    const couponIds = [...new Set(userCoupons.map((uc) => uc.couponId))];
    const coupons = new Map<string, Coupon>();

    for (const couponId of couponIds) {
      const coupon = await this.couponRepository.findById(couponId);
      if (coupon) {
        coupons.set(couponId, coupon);
      }
    }

    // 3. Domain Service를 통해 상태별로 분류 및 정렬
    // BR-COUPON-05, BR-COUPON-06, BR-COUPON-07
    const classified = this.userCouponQueryService.classifyAndSort(userCoupons);

    // 4. DTO로 변환
    const availableData = classified.available
      .map((uc) => {
        const coupon = coupons.get(uc.couponId);
        return coupon ? GetUserCouponsOutput.toUserCouponData(uc, coupon) : null;
      })
      .filter((data) => data !== null);

    const usedData = classified.used
      .map((uc) => {
        const coupon = coupons.get(uc.couponId);
        return coupon ? GetUserCouponsOutput.toUserCouponData(uc, coupon) : null;
      })
      .filter((data) => data !== null);

    const expiredData = classified.expired
      .map((uc) => {
        const coupon = coupons.get(uc.couponId);
        return coupon ? GetUserCouponsOutput.toUserCouponData(uc, coupon) : null;
      })
      .filter((data) => data !== null);

    // 5. status 필터링 (있는 경우)
    if (input.status) {
      if (input.status === CouponStatus.AVAILABLE) {
        return new GetUserCouponsOutput(availableData, [], []);
      } else if (input.status === CouponStatus.USED) {
        return new GetUserCouponsOutput([], usedData, []);
      } else if (input.status === CouponStatus.EXPIRED) {
        return new GetUserCouponsOutput([], [], expiredData);
      }
    }

    return new GetUserCouponsOutput(availableData, usedData, expiredData);
  }
}
