import { Injectable } from '@nestjs/common';
import { Coupon, CouponType } from '../entities/coupon.entity';
import { UserCoupon } from '../entities/user-coupon.entity';
import {
  CouponAlreadyUsedException,
  CouponExpiredException,
} from '../coupon.exceptions';

/**
 * 쿠폰 도메인 서비스
 *
 * 책임:
 * - 쿠폰 발급 처리
 * - 쿠폰 사용 검증 및 처리
 * - 할인 금액 계산
 */
@Injectable()
export class CouponService {
  /**
   * 쿠폰 발급 처리
   *
   * @param coupon - 발급할 쿠폰
   * @param userId - 사용자 ID
   * @returns 발급된 UserCoupon
   * @throws CouponExhaustedException 쿠폰 소진 시
   * @throws CouponExpiredException 발급 기간 외
   */
  issueCoupon(coupon: Coupon, userId: string): UserCoupon {
    // 1. 쿠폰 수량 감소 (BR-COUPON-02, BR-COUPON-03 검증 포함)
    coupon.decreaseQuantity();

    // 2. UserCoupon 생성
    const userCoupon = UserCoupon.create(userId, coupon);

    return userCoupon;
  }

  /**
   * 쿠폰 사용 검증 및 처리
   *
   * BR-COUPON-08: 1회만 사용 가능
   * BR-COUPON-09: 유효 기간 내 사용
   *
   * @param userCoupon - 사용할 UserCoupon
   * @throws CouponExpiredException 유효 기간 만료
   * @throws CouponAlreadyUsedException 이미 사용된 쿠폰
   */
  validateAndUseCoupon(userCoupon: UserCoupon): void {
    // BR-COUPON-09: 유효 기간 검증
    if (userCoupon.isExpired()) {
      throw new CouponExpiredException('쿠폰이 만료되었습니다.');
    }

    // BR-COUPON-08: 사용 여부 검증
    if (!userCoupon.isAvailable()) {
      throw new CouponAlreadyUsedException('이미 사용된 쿠폰입니다.');
    }

    // 쿠폰 사용 처리
    userCoupon.use();
  }

  /**
   * 할인 금액 계산
   *
   * BR-COUPON-10: 퍼센트 할인 (orderAmount × discountRate / 100)
   * BR-COUPON-11: 정액 할인 (min(discountAmount, orderAmount))
   *
   * @param coupon - 쿠폰 정보
   * @param orderAmount - 주문 금액
   * @returns 할인 금액
   */
  calculateDiscount(coupon: Coupon, orderAmount: number): number {
    if (coupon.discountType === CouponType.PERCENTAGE) {
      // BR-COUPON-10: 퍼센트 할인
      return Math.floor(orderAmount * (coupon.discountValue / 100));
    } else {
      // BR-COUPON-11: 정액 할인 (주문 금액을 초과할 수 없음)
      return Math.min(coupon.discountValue, orderAmount);
    }
  }
}
