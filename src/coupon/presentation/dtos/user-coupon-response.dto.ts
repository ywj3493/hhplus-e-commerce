import { CouponType } from '../../domain/entities/coupon.entity';
import { CouponStatus } from '../../domain/entities/user-coupon.entity';
import { IssueCouponOutput } from '../../application/dtos/issue-coupon.dto';

/**
 * 사용자 쿠폰 응답 DTO
 */
export class UserCouponResponseDto {
  userCouponId: string;
  couponName: string;
  discountType: CouponType;
  discountValue: number;
  status: CouponStatus;
  expiresAt: Date;
  issuedAt: Date;

  static from(output: IssueCouponOutput): UserCouponResponseDto {
    const dto = new UserCouponResponseDto();
    dto.userCouponId = output.userCouponId;
    dto.couponName = output.couponName;
    dto.discountType = output.discountType;
    dto.discountValue = output.discountValue;
    dto.status = output.status;
    dto.expiresAt = output.expiresAt;
    dto.issuedAt = output.issuedAt;
    return dto;
  }
}
