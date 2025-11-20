import { ApiProperty } from '@nestjs/swagger';
import {
  GetUserCouponsOutput,
  UserCouponData,
} from '@/coupon/application/dtos/get-user-coupons.dto';

/**
 * 사용자 쿠폰 목록 응답 DTO
 */
export class UserCouponsResponseDto {
  @ApiProperty({ description: '사용 가능한 쿠폰 목록', type: [UserCouponData] })
  available: UserCouponData[];

  @ApiProperty({ description: '사용한 쿠폰 목록', type: [UserCouponData] })
  used: UserCouponData[];

  @ApiProperty({ description: '만료된 쿠폰 목록', type: [UserCouponData] })
  expired: UserCouponData[];

  static from(output: GetUserCouponsOutput): UserCouponsResponseDto {
    const dto = new UserCouponsResponseDto();
    dto.available = output.available;
    dto.used = output.used;
    dto.expired = output.expired;
    return dto;
  }
}
