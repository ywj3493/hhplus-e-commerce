import { Injectable } from '@nestjs/common';
import { UserCoupon, CouponStatus } from '../entities/user-coupon.entity';

/**
 * 사용자 쿠폰 조회 관련 도메인 서비스
 *
 * 책임:
 * - 사용자 쿠폰 목록 분류 (BR-COUPON-05, BR-COUPON-06)
 * - 사용자 쿠폰 목록 정렬 (BR-COUPON-07)
 */
@Injectable()
export class UserCouponQueryService {
  /**
   * 사용자 쿠폰 목록을 상태별로 분류하고 정렬
   *
   * BR-COUPON-05: AVAILABLE 상태 분류
   * BR-COUPON-06: USED 상태 분류
   * BR-COUPON-07: 정렬 (Available: 최신 발급 순, Used: 최신 사용 순)
   *
   * @param userCoupons 사용자 쿠폰 목록
   * @returns 상태별로 분류되고 정렬된 쿠폰 목록
   */
  classifyAndSort(userCoupons: UserCoupon[]): {
    available: UserCoupon[];
    used: UserCoupon[];
    expired: UserCoupon[];
  } {
    const available: UserCoupon[] = [];
    const used: UserCoupon[] = [];
    const expired: UserCoupon[] = [];

    // BR-COUPON-05, BR-COUPON-06: 상태별 분류
    for (const uc of userCoupons) {
      const status = uc.getStatus();

      if (status === CouponStatus.AVAILABLE) {
        available.push(uc);
      } else if (status === CouponStatus.USED) {
        used.push(uc);
      } else if (status === CouponStatus.EXPIRED) {
        expired.push(uc);
      }
    }

    // BR-COUPON-07: 정렬
    // Available: 최신 발급 순
    available.sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());

    // Used: 최신 사용 순
    used.sort((a, b) => {
      if (!a.usedAt || !b.usedAt) return 0;
      return b.usedAt.getTime() - a.usedAt.getTime();
    });

    // Expired: 정렬 불필요 (요구사항 없음)

    return { available, used, expired };
  }
}
