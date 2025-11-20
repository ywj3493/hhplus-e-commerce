import { Injectable, Inject } from '@nestjs/common';
import { UserCouponRepository } from '@/coupon/domain/repositories/user-coupon.repository';
import { CouponRepository } from '@/coupon/domain/repositories/coupon.repository';
import {
  COUPON_REPOSITORY,
  USER_COUPON_REPOSITORY,
} from '@/coupon/domain/repositories/tokens';
import { CouponService } from '@/coupon/domain/services/coupon.service';

/**
 * 쿠폰 적용 결과
 */
export interface CouponApplicationResult {
  discountAmount: number;
  userCouponId: string;
}

/**
 * CouponApplicationService
 *
 * 주문 생성 시 쿠폰 적용 로직을 캡슐화하는 Application Service
 *
 * 책임:
 * 1. 쿠폰 조회 및 검증
 * 2. 쿠폰 사용 처리
 * 3. 할인 금액 계산
 */
@Injectable()
export class CouponApplicationService {
  constructor(
    @Inject(USER_COUPON_REPOSITORY)
    private readonly userCouponRepository: UserCouponRepository,
    @Inject(COUPON_REPOSITORY)
    private readonly couponRepository: CouponRepository,
    private readonly couponService: CouponService,
  ) {}

  /**
   * 쿠폰을 적용하고 할인 금액을 계산합니다
   *
   * @param userId 사용자 ID
   * @param couponId 사용할 쿠폰 ID
   * @param totalAmount 주문 총액
   * @returns 할인 금액과 UserCoupon ID
   * @throws Error 쿠폰이 없거나, 소유권이 없거나, 사용할 수 없는 경우
   */
  async applyCoupon(
    userId: string,
    couponId: string,
    totalAmount: number,
  ): Promise<CouponApplicationResult> {
    // 1. UserCoupon 조회
    const userCoupon = await this.userCouponRepository.findById(couponId);

    if (!userCoupon) {
      throw new Error('쿠폰을 찾을 수 없습니다.');
    }

    // 2. 소유권 검증
    if (userCoupon.userId !== userId) {
      throw new Error('본인의 쿠폰만 사용할 수 있습니다.');
    }

    // 3. 쿠폰 검증 및 사용 처리
    this.couponService.validateAndUseCoupon(userCoupon);

    // 4. Coupon 엔티티 조회 (할인 계산용)
    const coupon = await this.couponRepository.findById(userCoupon.couponId);

    if (!coupon) {
      throw new Error('쿠폰 정보를 찾을 수 없습니다.');
    }

    // 5. 할인 금액 계산
    const discountAmount = this.couponService.calculateDiscount(
      coupon,
      totalAmount,
    );

    // 6. UserCoupon 저장 (사용됨 상태로)
    await this.userCouponRepository.save(userCoupon);

    return {
      discountAmount,
      userCouponId: userCoupon.id,
    };
  }
}
