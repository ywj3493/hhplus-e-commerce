import { BadRequestException } from '@nestjs/common';
import { Coupon, CouponType } from '../../domain/entities/coupon.entity';
import {
  CouponStatus,
  UserCoupon,
} from '../../domain/entities/user-coupon.entity';

/**
 * 쿠폰 발급 Input 데이터
 */
export interface IssueCouponInputData {
  userId: string;
  couponId: string;
}

/**
 * 쿠폰 발급 Input DTO
 */
export class IssueCouponInput {
  userId: string;
  couponId: string;

  constructor(data: IssueCouponInputData) {
    this.userId = data.userId;
    this.couponId = data.couponId;
    this.validate();
  }

  private validate(): void {
    if (!this.userId || !this.couponId) {
      throw new BadRequestException('userId와 couponId는 필수입니다.');
    }
  }
}

/**
 * 쿠폰 발급 Output DTO
 */
export class IssueCouponOutput {
  userCouponId: string;
  couponName: string;
  discountType: CouponType;
  discountValue: number;
  status: CouponStatus;
  expiresAt: Date;
  issuedAt: Date;

  constructor(
    userCouponId: string,
    couponName: string,
    discountType: CouponType,
    discountValue: number,
    status: CouponStatus,
    expiresAt: Date,
    issuedAt: Date,
  ) {
    this.userCouponId = userCouponId;
    this.couponName = couponName;
    this.discountType = discountType;
    this.discountValue = discountValue;
    this.status = status;
    this.expiresAt = expiresAt;
    this.issuedAt = issuedAt;
  }

  static from(userCoupon: UserCoupon, coupon: Coupon): IssueCouponOutput {
    return new IssueCouponOutput(
      userCoupon.id,
      coupon.name,
      coupon.discountType,
      coupon.discountValue,
      userCoupon.getStatus(),
      userCoupon.expiresAt,
      userCoupon.issuedAt,
    );
  }
}
