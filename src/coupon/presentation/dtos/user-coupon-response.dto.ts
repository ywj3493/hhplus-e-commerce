import { ApiProperty } from '@nestjs/swagger';
import { CouponType } from '@/coupon/domain/entities/coupon.entity';
import { CouponStatus } from '@/coupon/domain/entities/user-coupon.entity';
import { IssueCouponOutput } from '@/coupon/application/dtos/issue-coupon.dto';

/**
 * 사용자 쿠폰 응답 DTO
 */
export class UserCouponResponseDto {
  @ApiProperty({ description: '사용자 쿠폰 ID', example: 'user-coupon-1' })
  userCouponId: string;

  @ApiProperty({ description: '쿠폰 이름', example: '신규 가입 환영 쿠폰' })
  couponName: string;

  @ApiProperty({ description: '할인 타입', enum: CouponType, example: CouponType.PERCENTAGE })
  discountType: CouponType;

  @ApiProperty({ description: '할인 값 (PERCENTAGE: 0-100, FIXED_AMOUNT: 원 단위)', example: 10 })
  discountValue: number;

  @ApiProperty({ description: '쿠폰 상태', enum: CouponStatus, example: CouponStatus.AVAILABLE })
  status: CouponStatus;

  @ApiProperty({ description: '만료 일시', example: '2025-12-31T23:59:59.999Z' })
  expiresAt: Date;

  @ApiProperty({ description: '발급 일시', example: '2025-01-15T10:00:00.000Z' })
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
