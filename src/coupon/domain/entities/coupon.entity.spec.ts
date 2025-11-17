import { Coupon, CouponType } from './coupon.entity';
import {
  CouponExhaustedException,
  CouponExpiredException,
} from '../coupon.exceptions';

describe('Coupon', () => {
  describe('생성', () => {
    it('유효한 데이터로 인스턴스를 생성해야 함', () => {
      // Given
      const name = '10% 할인 쿠폰';
      const description = '전체 상품 10% 할인';
      const discountType = CouponType.PERCENTAGE;
      const discountValue = 10;
      const totalQuantity = 100;
      const issuedQuantity = 0;
      const validFrom = new Date('2025-01-01');
      const validUntil = new Date('2025-12-31');

      // When
      const coupon = Coupon.create(
        name,
        description,
        discountType,
        discountValue,
        totalQuantity,
        issuedQuantity,
        validFrom,
        validUntil,
      );

      // Then
      expect(coupon.name).toBe('10% 할인 쿠폰');
      expect(coupon.discountType).toBe(CouponType.PERCENTAGE);
      expect(coupon.discountValue).toBe(10);
      expect(coupon.availableQuantity).toBe(100);
      expect(coupon.totalQuantity).toBe(100);
      expect(coupon.issuedQuantity).toBe(0);
    });
  });

  describe('수량 감소', () => {
    it('유효한 쿠폰의 수량을 감소시켜야 함', () => {
      // Given
      const coupon = Coupon.create(
        '쿠폰',
        '테스트 쿠폰',
        CouponType.PERCENTAGE,
        10,
        100,
        50,
        new Date('2025-01-01'),
        new Date('2025-12-31'),
      );

      // When
      coupon.decreaseQuantity();

      // Then
      expect(coupon.issuedQuantity).toBe(51);
      expect(coupon.availableQuantity).toBe(49);
    });

    it('쿠폰이 소진된 경우 예외를 발생시켜야 함 (BR-COUPON-02)', () => {
      // Given
      const coupon = Coupon.create(
        '쿠폰',
        '테스트 쿠폰',
        CouponType.PERCENTAGE,
        10,
        100,
        100, // 소진
        new Date('2025-01-01'),
        new Date('2025-12-31'),
      );

      // When & Then
      expect(() => coupon.decreaseQuantity()).toThrow(
        CouponExhaustedException,
      );
    });

    it('발급 기간이 아닌 경우 예외를 발생시켜야 함 (BR-COUPON-03)', () => {
      // Given
      const coupon = Coupon.create(
        '쿠폰',
        '테스트 쿠폰',
        CouponType.PERCENTAGE,
        10,
        100,
        0,
        new Date('2020-01-01'),
        new Date('2020-01-31'), // 만료
      );

      // When & Then
      expect(() => coupon.decreaseQuantity()).toThrow(CouponExpiredException);
    });
  });

  describe('유효성 검증', () => {
    it('유효 기간 내의 쿠폰은 유효해야 함', () => {
      // Given
      const coupon = Coupon.create(
        '쿠폰',
        '테스트 쿠폰',
        CouponType.PERCENTAGE,
        10,
        100,
        0,
        new Date('2025-01-01'),
        new Date('2025-12-31'),
      );

      // When
      const isValid = coupon.isValid();

      // Then
      expect(isValid).toBe(true);
    });

    it('유효 기간이 지난 쿠폰은 유효하지 않아야 함', () => {
      // Given
      const coupon = Coupon.create(
        '쿠폰',
        '테스트 쿠폰',
        CouponType.PERCENTAGE,
        10,
        100,
        0,
        new Date('2020-01-01'),
        new Date('2020-12-31'), // 만료
      );

      // When
      const isValid = coupon.isValid();

      // Then
      expect(isValid).toBe(false);
    });
  });

  describe('남은 수량 조회', () => {
    it('전체 수량에서 발급된 수량을 뺀 값을 반환해야 함', () => {
      // Given
      const coupon = Coupon.create(
        '쿠폰',
        '테스트 쿠폰',
        CouponType.PERCENTAGE,
        10,
        100,
        30,
        new Date('2025-01-01'),
        new Date('2025-12-31'),
      );

      // When
      const available = coupon.availableQuantity;

      // Then
      expect(available).toBe(70);
    });
  });
});
