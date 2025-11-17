import { Coupon, CouponType } from '../../domain/entities/coupon.entity';
import { UserCoupon } from '../../domain/entities/user-coupon.entity';

/**
 * 테스트용 쿠폰 생성 헬퍼
 */
export const createTestCoupon = (
  overrides?: Partial<{
    name: string;
    description: string;
    discountType: CouponType;
    discountValue: number;
    totalQuantity: number;
    issuedQuantity: number;
    validFrom: Date;
    validUntil: Date;
  }>,
): Coupon => {
  return Coupon.create(
    overrides?.name || '10% 할인 쿠폰',
    overrides?.description || '전체 상품 10% 할인',
    overrides?.discountType || CouponType.PERCENTAGE,
    overrides?.discountValue ?? 10,
    overrides?.totalQuantity ?? 100,
    overrides?.issuedQuantity ?? 0,
    overrides?.validFrom || new Date('2025-01-01'),
    overrides?.validUntil || new Date('2025-12-31'),
  );
};

/**
 * 테스트용 사용자 쿠폰 생성 헬퍼
 */
export const createTestUserCoupon = (
  userId: string = 'user-1',
  coupon?: Coupon,
): UserCoupon => {
  const testCoupon = coupon || createTestCoupon();
  return UserCoupon.create(userId, testCoupon);
};
