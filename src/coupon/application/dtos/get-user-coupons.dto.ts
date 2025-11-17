import { Coupon, CouponType } from '../../domain/entities/coupon.entity';
import {
  CouponStatus,
  UserCoupon,
} from '../../domain/entities/user-coupon.entity';

/**
 * 사용자 쿠폰 조회 Input 데이터
 */
export interface GetUserCouponsInputData {
  userId: string;
  status?: CouponStatus;
}

/**
 * 사용자 쿠폰 조회 Input DTO
 */
export class GetUserCouponsInput {
  userId: string;
  status?: CouponStatus;

  constructor(data: GetUserCouponsInputData) {
    this.userId = data.userId;
    this.status = data.status;
  }
}

/**
 * 사용자 쿠폰 데이터
 */
export class UserCouponData {
  id: string;
  couponId: string;
  couponName: string;
  discountType: CouponType;
  discountValue: number;
  status: CouponStatus;
  issuedAt: Date;
  expiresAt: Date;
  usedAt: Date | null;

  constructor(
    id: string,
    couponId: string,
    couponName: string,
    discountType: CouponType,
    discountValue: number,
    status: CouponStatus,
    issuedAt: Date,
    expiresAt: Date,
    usedAt: Date | null,
  ) {
    this.id = id;
    this.couponId = couponId;
    this.couponName = couponName;
    this.discountType = discountType;
    this.discountValue = discountValue;
    this.status = status;
    this.issuedAt = issuedAt;
    this.expiresAt = expiresAt;
    this.usedAt = usedAt;
  }
}

/**
 * 사용자 쿠폰 조회 Output DTO
 *
 * 순수 데이터 전달 객체 - 비즈니스 로직 없음
 */
export class GetUserCouponsOutput {
  available: UserCouponData[];
  used: UserCouponData[];
  expired: UserCouponData[];

  constructor(
    available: UserCouponData[],
    used: UserCouponData[],
    expired: UserCouponData[],
  ) {
    this.available = available;
    this.used = used;
    this.expired = expired;
  }

  /**
   * UserCoupon과 Coupon으로부터 UserCouponData 생성
   */
  static toUserCouponData(
    userCoupon: UserCoupon,
    coupon: Coupon,
  ): UserCouponData {
    return new UserCouponData(
      userCoupon.id,
      userCoupon.couponId,
      coupon.name,
      coupon.discountType,
      coupon.discountValue,
      userCoupon.getStatus(),
      userCoupon.issuedAt,
      userCoupon.expiresAt,
      userCoupon.usedAt,
    );
  }
}
