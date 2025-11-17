import {
  GetUserCouponsOutput,
  UserCouponData,
} from '../../application/dtos/get-user-coupons.dto';

/**
 * 사용자 쿠폰 목록 응답 DTO
 */
export class UserCouponsResponseDto {
  available: UserCouponData[];
  used: UserCouponData[];
  expired: UserCouponData[];

  static from(output: GetUserCouponsOutput): UserCouponsResponseDto {
    const dto = new UserCouponsResponseDto();
    dto.available = output.available;
    dto.used = output.used;
    dto.expired = output.expired;
    return dto;
  }
}
