import { Coupon } from '../entities/coupon.entity';

/**
 * 쿠폰 저장소 인터페이스
 */
export interface CouponRepository {
  /**
   * ID로 쿠폰 조회
   */
  findById(id: string): Promise<Coupon | null>;

  /**
   * ID로 쿠폰 조회 (FOR UPDATE)
   * 동시성 제어를 위해 잠금 획득
   *
   * @param id - 쿠폰 ID
   * @param em - Entity Manager (Transaction 지원)
   */
  findByIdForUpdate(id: string, em?: any): Promise<Coupon | null>;

  /**
   * 쿠폰 저장
   *
   * @param coupon - 저장할 쿠폰
   * @param em - Entity Manager (Transaction 지원)
   */
  save(coupon: Coupon, em?: any): Promise<Coupon>;
}
