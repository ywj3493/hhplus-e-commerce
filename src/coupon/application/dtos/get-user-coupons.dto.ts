import { ApiProperty } from '@nestjs/swagger';
import { Coupon, CouponType } from '@/coupon/domain/entities/coupon.entity';
import {
  CouponStatus,
  UserCoupon,
} from '@/coupon/domain/entities/user-coupon.entity';

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
  @ApiProperty({ description: '사용자 쿠폰 ID', example: 'user-coupon-1' })
  id: string;

  @ApiProperty({ description: '쿠폰 ID', example: 'coupon-1' })
  couponId: string;

  @ApiProperty({ description: '쿠폰 이름', example: '신규 가입 환영 쿠폰' })
  couponName: string;

  @ApiProperty({ description: '할인 타입', enum: CouponType, example: CouponType.PERCENTAGE })
  discountType: CouponType;

  @ApiProperty({ description: '할인 값', example: 10 })
  discountValue: number;

  @ApiProperty({ description: '쿠폰 상태', enum: CouponStatus, example: CouponStatus.AVAILABLE })
  status: CouponStatus;

  @ApiProperty({ description: '발급 일시', example: '2025-01-15T10:00:00.000Z' })
  issuedAt: Date;

  @ApiProperty({ description: '만료 일시', example: '2025-12-31T23:59:59.999Z' })
  expiresAt: Date;

  @ApiProperty({ description: '사용 일시', example: null, nullable: true })
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
