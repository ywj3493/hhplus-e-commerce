import { UserCouponQueryService } from '@/coupon/domain/services/user-coupon-query.service';
import { UserCoupon, CouponStatus } from '@/coupon/domain/entities/user-coupon.entity';
import { Coupon, CouponType } from '@/coupon/domain/entities/coupon.entity';

describe('UserCouponQueryService', () => {
  let service: UserCouponQueryService;

  beforeEach(() => {
    service = new UserCouponQueryService();
  });

  const createTestCoupon = (validUntil: Date): Coupon => {
    return Coupon.create(
      '테스트 쿠폰',
      '테스트용',
      CouponType.PERCENTAGE,
      10,
      100,
      0,
      new Date('2025-01-01'),
      validUntil,
    );
  };

  describe('상태별 분류 및 정렬', () => {
    it('사용 가능한 쿠폰을 최신 발급 순으로 정렬해야 함 (BR-COUPON-07)', () => {
      // Given
      const coupon = createTestCoupon(new Date('2025-12-31'));

      const old = UserCoupon.reconstitute(
        'uc-old',
        'user-1',
        'coupon-1',
        false,
        null,
        new Date('2025-01-01'), // 가장 오래됨
        new Date('2025-12-31'),
      );

      const middle = UserCoupon.reconstitute(
        'uc-middle',
        'user-1',
        'coupon-1',
        false,
        null,
        new Date('2025-01-15'),
        new Date('2025-12-31'),
      );

      const newest = UserCoupon.reconstitute(
        'uc-new',
        'user-1',
        'coupon-1',
        false,
        null,
        new Date('2025-01-31'), // 가장 최신
        new Date('2025-12-31'),
      );

      // When
      const result = service.classifyAndSort([old, middle, newest]);

      // Then
      expect(result.available).toHaveLength(3);
      expect(result.available[0].id).toBe('uc-new'); // 최신 순
      expect(result.available[1].id).toBe('uc-middle');
      expect(result.available[2].id).toBe('uc-old');
      expect(result.used).toHaveLength(0);
      expect(result.expired).toHaveLength(0);
    });

    it('사용된 쿠폰을 최신 사용 순으로 정렬해야 함 (BR-COUPON-07)', () => {
      // Given
      const oldUsed = UserCoupon.reconstitute(
        'uc-old',
        'user-1',
        'coupon-1',
        true,
        new Date('2025-01-01'), // 가장 오래 사용됨
        new Date('2025-01-01'),
        new Date('2025-12-31'),
      );

      const middleUsed = UserCoupon.reconstitute(
        'uc-middle',
        'user-1',
        'coupon-1',
        true,
        new Date('2025-01-15'),
        new Date('2025-01-01'),
        new Date('2025-12-31'),
      );

      const newestUsed = UserCoupon.reconstitute(
        'uc-new',
        'user-1',
        'coupon-1',
        true,
        new Date('2025-01-31'), // 가장 최근 사용됨
        new Date('2025-01-01'),
        new Date('2025-12-31'),
      );

      // When
      const result = service.classifyAndSort([oldUsed, middleUsed, newestUsed]);

      // Then
      expect(result.used).toHaveLength(3);
      expect(result.used[0].id).toBe('uc-new'); // 최신 사용 순
      expect(result.used[1].id).toBe('uc-middle');
      expect(result.used[2].id).toBe('uc-old');
      expect(result.available).toHaveLength(0);
      expect(result.expired).toHaveLength(0);
    });

    it('만료된 쿠폰을 EXPIRED로 분류해야 함', () => {
      // Given
      const expired = UserCoupon.reconstitute(
        'uc-expired',
        'user-1',
        'coupon-1',
        false,
        null,
        new Date('2020-01-01'),
        new Date('2020-12-31'), // 만료됨
      );

      // When
      const result = service.classifyAndSort([expired]);

      // Then
      expect(result.expired).toHaveLength(1);
      expect(result.expired[0].id).toBe('uc-expired');
      expect(result.available).toHaveLength(0);
      expect(result.used).toHaveLength(0);
    });

    it('혼합된 상태의 쿠폰을 올바르게 분류해야 함 (BR-COUPON-05, BR-COUPON-06)', () => {
      // Given
      const available1 = UserCoupon.reconstitute(
        'uc-available-1',
        'user-1',
        'coupon-1',
        false,
        null,
        new Date('2025-01-01'),
        new Date('2025-12-31'),
      );

      const available2 = UserCoupon.reconstitute(
        'uc-available-2',
        'user-1',
        'coupon-1',
        false,
        null,
        new Date('2025-01-15'),
        new Date('2025-12-31'),
      );

      const used1 = UserCoupon.reconstitute(
        'uc-used-1',
        'user-1',
        'coupon-1',
        true,
        new Date('2025-01-10'),
        new Date('2025-01-01'),
        new Date('2025-12-31'),
      );

      const expired1 = UserCoupon.reconstitute(
        'uc-expired-1',
        'user-1',
        'coupon-1',
        false,
        null,
        new Date('2020-01-01'),
        new Date('2020-12-31'),
      );

      // When
      const result = service.classifyAndSort([
        available1,
        used1,
        expired1,
        available2,
      ]);

      // Then
      expect(result.available).toHaveLength(2);
      expect(result.used).toHaveLength(1);
      expect(result.expired).toHaveLength(1);
    });

    it('빈 배열을 입력하면 빈 결과를 반환해야 함', () => {
      // Given
      const userCoupons: UserCoupon[] = [];

      // When
      const result = service.classifyAndSort(userCoupons);

      // Then
      expect(result.available).toHaveLength(0);
      expect(result.used).toHaveLength(0);
      expect(result.expired).toHaveLength(0);
    });
  });
});
