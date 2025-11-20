import { UserCoupon, CouponStatus } from '@/coupon/domain/entities/user-coupon.entity';
import { Coupon, CouponType } from '@/coupon/domain/entities/coupon.entity';

describe('UserCoupon', () => {
  const createTestCoupon = (): Coupon => {
    return Coupon.create(
      '10% 할인 쿠폰',
      '테스트 쿠폰',
      CouponType.PERCENTAGE,
      10,
      100,
      0,
      new Date('2025-01-01'),
      new Date('2025-12-31'),
    );
  };

  const createExpiredCoupon = (): Coupon => {
    return Coupon.create(
      '만료된 쿠폰',
      '만료된 테스트 쿠폰',
      CouponType.PERCENTAGE,
      10,
      100,
      0,
      new Date('2020-01-01'),
      new Date('2020-12-31'), // 만료
    );
  };

  describe('생성', () => {
    it('유효한 데이터로 인스턴스를 생성해야 함', () => {
      // Given
      const coupon = createTestCoupon();
      const userId = 'user-1';

      // When
      const userCoupon = UserCoupon.create(userId, coupon);

      // Then
      expect(userCoupon.userId).toBe(userId);
      expect(userCoupon.couponId).toBe(coupon.id);
      expect(userCoupon.isUsed).toBe(false);
      expect(userCoupon.usedAt).toBeNull();
      expect(userCoupon.isAvailable()).toBe(true);
    });

    it('쿠폰의 유효기간 종료일을 만료일로 설정해야 함', () => {
      // Given
      const coupon = createTestCoupon();
      const userId = 'user-1';

      // When
      const userCoupon = UserCoupon.create(userId, coupon);

      // Then
      expect(userCoupon.expiresAt).toEqual(coupon.validUntil);
    });
  });

  describe('사용', () => {
    it('사용 가능한 쿠폰을 사용 처리해야 함', () => {
      // Given
      const coupon = createTestCoupon();
      const userCoupon = UserCoupon.create('user-1', coupon);

      // When
      userCoupon.use();

      // Then
      expect(userCoupon.isUsed).toBe(true);
      expect(userCoupon.usedAt).toBeDefined();
      expect(userCoupon.usedAt).not.toBeNull();
      expect(userCoupon.getStatus()).toBe(CouponStatus.USED);
    });

    it('이미 사용된 쿠폰은 재사용할 수 없음 (BR-COUPON-08)', () => {
      // Given
      const coupon = createTestCoupon();
      const userCoupon = UserCoupon.create('user-1', coupon);
      userCoupon.use();

      // When & Then
      expect(() => userCoupon.use()).toThrow('이미 사용된 쿠폰입니다.');
    });
  });

  describe('상태 확인', () => {
    it('사용되지 않고 유효기간 내인 쿠폰은 사용 가능해야 함', () => {
      // Given
      const coupon = createTestCoupon();
      const userCoupon = UserCoupon.create('user-1', coupon);

      // When
      const isAvailable = userCoupon.isAvailable();

      // Then
      expect(isAvailable).toBe(true);
    });

    it('사용된 쿠폰은 사용 불가해야 함', () => {
      // Given
      const coupon = createTestCoupon();
      const userCoupon = UserCoupon.create('user-1', coupon);
      userCoupon.use();

      // When
      const isAvailable = userCoupon.isAvailable();

      // Then
      expect(isAvailable).toBe(false);
    });

    it('만료된 쿠폰은 사용 불가해야 함', () => {
      // Given
      const expiredCoupon = createExpiredCoupon();
      const userCoupon = UserCoupon.create('user-1', expiredCoupon);

      // When
      const isAvailable = userCoupon.isAvailable();

      // Then
      expect(isAvailable).toBe(false);
    });
  });

  describe('상태 조회', () => {
    it('사용 가능한 쿠폰은 AVAILABLE 상태여야 함 (BR-COUPON-05)', () => {
      // Given
      const coupon = createTestCoupon();
      const userCoupon = UserCoupon.create('user-1', coupon);

      // When
      const status = userCoupon.getStatus();

      // Then
      expect(status).toBe(CouponStatus.AVAILABLE);
    });

    it('사용된 쿠폰은 USED 상태여야 함 (BR-COUPON-06)', () => {
      // Given
      const coupon = createTestCoupon();
      const userCoupon = UserCoupon.create('user-1', coupon);
      userCoupon.use();

      // When
      const status = userCoupon.getStatus();

      // Then
      expect(status).toBe(CouponStatus.USED);
    });

    it('만료된 쿠폰은 EXPIRED 상태여야 함', () => {
      // Given
      const expiredCoupon = createExpiredCoupon();
      const userCoupon = UserCoupon.create('user-1', expiredCoupon);

      // When
      const status = userCoupon.getStatus();

      // Then
      expect(status).toBe(CouponStatus.EXPIRED);
    });
  });

  describe('만료 확인', () => {
    it('유효기간이 지나지 않은 쿠폰은 만료되지 않아야 함', () => {
      // Given
      const coupon = createTestCoupon();
      const userCoupon = UserCoupon.create('user-1', coupon);

      // When
      const isExpired = userCoupon.isExpired();

      // Then
      expect(isExpired).toBe(false);
    });

    it('유효기간이 지난 쿠폰은 만료되어야 함', () => {
      // Given
      const expiredCoupon = createExpiredCoupon();
      const userCoupon = UserCoupon.create('user-1', expiredCoupon);

      // When
      const isExpired = userCoupon.isExpired();

      // Then
      expect(isExpired).toBe(true);
    });
  });
});
