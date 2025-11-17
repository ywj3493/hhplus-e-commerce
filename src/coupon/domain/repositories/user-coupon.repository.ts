import { UserCoupon } from '../entities/user-coupon.entity';

/**
 * 사용자 쿠폰 저장소 인터페이스
 */
export interface UserCouponRepository {
  /**
   * ID로 사용자 쿠폰 조회
   */
  findById(id: string): Promise<UserCoupon | null>;

  /**
   * 사용자 ID로 모든 쿠폰 조회
   */
  findByUserId(userId: string): Promise<UserCoupon[]>;

  /**
   * 사용자가 특정 쿠폰을 이미 발급받았는지 확인
   *
   * BR-COUPON-01: 1인 1쿠폰 검증에 사용
   *
   * @param userId - 사용자 ID
   * @param couponId - 쿠폰 ID
   * @param em - Entity Manager (Transaction 지원)
   */
  existsByUserIdAndCouponId(
    userId: string,
    couponId: string,
    em?: any,
  ): Promise<boolean>;

  /**
   * 사용자 쿠폰 저장
   *
   * @param userCoupon - 저장할 사용자 쿠폰
   * @param em - Entity Manager (Transaction 지원)
   */
  save(userCoupon: UserCoupon, em?: any): Promise<UserCoupon>;
}
