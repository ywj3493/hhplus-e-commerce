import { CouponService } from '@/coupon/domain/services/coupon.service';
import { Coupon, CouponType } from '@/coupon/domain/entities/coupon.entity';
import { UserCoupon } from '@/coupon/domain/entities/user-coupon.entity';
import {
  CouponAlreadyUsedException,
  CouponExhaustedException,
  CouponExpiredException,
} from '@/coupon/domain/coupon.exceptions';

describe('CouponService', () => {
  let service: CouponService;

  beforeEach(() => {
    service = new CouponService();
  });

  const createTestCoupon = (
    overrides?: Partial<{
      totalQuantity: number;
      issuedQuantity: number;
      validFrom: Date;
      validUntil: Date;
      discountType: CouponType;
      discountValue: number;
    }>,
  ): Coupon => {
    return Coupon.create(
      '10% 할인 쿠폰',
      '테스트 쿠폰',
      overrides?.discountType || CouponType.PERCENTAGE,
      overrides?.discountValue || 10,
      null, // minAmount
      overrides?.totalQuantity || 100,
      overrides?.issuedQuantity || 0,
      overrides?.validFrom || new Date('2025-01-01'),
      overrides?.validUntil || new Date('2025-12-31'),
    );
  };

  describe('쿠폰 발급', () => {
    it('유효한 쿠폰을 발급해야 함', () => {
      // Given
      const coupon = createTestCoupon();
      const userId = 'user-1';
      const initialIssuedQuantity = coupon.issuedQuantity;

      // When
      const userCoupon = service.issueCoupon(coupon, userId);

      // Then
      expect(userCoupon).toBeDefined();
      expect(userCoupon).toBeInstanceOf(UserCoupon);
      expect(userCoupon.userId).toBe(userId);
      expect(userCoupon.couponId).toBe(coupon.id);
      expect(coupon.issuedQuantity).toBe(initialIssuedQuantity + 1);
    });

    it('쿠폰 소진 시 예외를 발생시켜야 함', () => {
      // Given
      const exhaustedCoupon = createTestCoupon({
        totalQuantity: 100,
        issuedQuantity: 100, // 소진
      });
      const userId = 'user-1';

      // When & Then
      expect(() => service.issueCoupon(exhaustedCoupon, userId)).toThrow(
        CouponExhaustedException,
      );
    });

    it('발급 기간 외인 경우 예외를 발생시켜야 함', () => {
      // Given
      const expiredCoupon = createTestCoupon({
        validFrom: new Date('2020-01-01'),
        validUntil: new Date('2020-12-31'), // 만료
      });
      const userId = 'user-1';

      // When & Then
      expect(() => service.issueCoupon(expiredCoupon, userId)).toThrow(
        CouponExpiredException,
      );
    });
  });

  describe('쿠폰 사용 검증 및 처리', () => {
    it('사용 가능한 쿠폰을 사용 처리해야 함', () => {
      // Given
      const coupon = createTestCoupon();
      const userCoupon = UserCoupon.create('user-1', coupon);

      // When
      service.validateAndUseCoupon(userCoupon);

      // Then
      expect(userCoupon.isUsed).toBe(true);
      expect(userCoupon.usedAt).toBeDefined();
    });

    it('만료된 쿠폰은 사용할 수 없음', () => {
      // Given
      const expiredCoupon = createTestCoupon({
        validFrom: new Date('2020-01-01'),
        validUntil: new Date('2020-12-31'), // 만료
      });
      const userCoupon = UserCoupon.create('user-1', expiredCoupon);

      // When & Then
      expect(() => service.validateAndUseCoupon(userCoupon)).toThrow(
        CouponExpiredException,
      );
    });

    it('이미 사용된 쿠폰은 재사용할 수 없음', () => {
      // Given
      const coupon = createTestCoupon();
      const userCoupon = UserCoupon.create('user-1', coupon);
      userCoupon.use(); // 미리 사용

      // When & Then
      expect(() => service.validateAndUseCoupon(userCoupon)).toThrow(
        CouponAlreadyUsedException,
      );
    });
  });

  describe('할인 금액 계산', () => {
    it('퍼센트 할인을 계산해야 함 (BR-COUPON-10)', () => {
      // Given
      const coupon = createTestCoupon({
        discountType: CouponType.PERCENTAGE,
        discountValue: 10, // 10%
      });
      const orderAmount = 10000;

      // When
      const discount = service.calculateDiscount(coupon, orderAmount);

      // Then
      expect(discount).toBe(1000); // 10000 × 10% = 1000
    });

    it('퍼센트 할인은 소수점 이하를 버려야 함 (BR-COUPON-10)', () => {
      // Given
      const coupon = createTestCoupon({
        discountType: CouponType.PERCENTAGE,
        discountValue: 15, // 15%
      });
      const orderAmount = 12345;

      // When
      const discount = service.calculateDiscount(coupon, orderAmount);

      // Then
      // 12345 × 15% = 1851.75 → 1851 (소수점 버림)
      expect(discount).toBe(1851);
    });

    it('정액 할인을 계산해야 함 (BR-COUPON-11)', () => {
      // Given
      const coupon = createTestCoupon({
        discountType: CouponType.FIXED,
        discountValue: 5000, // 5000원
      });
      const orderAmount = 10000;

      // When
      const discount = service.calculateDiscount(coupon, orderAmount);

      // Then
      expect(discount).toBe(5000);
    });

    it('정액 할인이 주문 금액보다 클 수 없음 (BR-COUPON-11)', () => {
      // Given
      const coupon = createTestCoupon({
        discountType: CouponType.FIXED,
        discountValue: 10000, // 10000원
      });
      const orderAmount = 5000;

      // When
      const discount = service.calculateDiscount(coupon, orderAmount);

      // Then
      expect(discount).toBe(5000); // min(10000, 5000) = 5000
    });

    it('주문 금액이 0원이면 할인도 0원이어야 함', () => {
      // Given
      const percentageCoupon = createTestCoupon({
        discountType: CouponType.PERCENTAGE,
        discountValue: 10,
      });
      const fixedCoupon = createTestCoupon({
        discountType: CouponType.FIXED,
        discountValue: 5000,
      });
      const orderAmount = 0;

      // When
      const percentageDiscount = service.calculateDiscount(
        percentageCoupon,
        orderAmount,
      );
      const fixedDiscount = service.calculateDiscount(fixedCoupon, orderAmount);

      // Then
      expect(percentageDiscount).toBe(0);
      expect(fixedDiscount).toBe(0);
    });
  });
});
