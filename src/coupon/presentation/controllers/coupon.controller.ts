import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  HttpCode,
} from '@nestjs/common';
import { IssueCouponUseCase } from '../../application/use-cases/issue-coupon.use-case';
import { GetUserCouponsUseCase } from '../../application/use-cases/get-user-coupons.use-case';
import { IssueCouponInput } from '../../application/dtos/issue-coupon.dto';
import { GetUserCouponsInput } from '../../application/dtos/get-user-coupons.dto';
import { UserCouponResponseDto } from '../dtos/user-coupon-response.dto';
import { UserCouponsResponseDto } from '../dtos/user-coupons-response.dto';
import { CouponStatus } from '../../domain/entities/user-coupon.entity';

/**
 * 쿠폰 컨트롤러
 *
 * API Endpoints:
 * - POST /coupons/:id/issue - 쿠폰 발급
 * - GET /coupons/my - 사용자 쿠폰 목록 조회
 */
@Controller('coupons')
export class CouponController {
  constructor(
    private readonly issueCouponUseCase: IssueCouponUseCase,
    private readonly getUserCouponsUseCase: GetUserCouponsUseCase,
  ) {}

  /**
   * 쿠폰 발급
   *
   * POST /coupons/:id/issue
   *
   * @param couponId - 쿠폰 ID
   * @param user - 현재 사용자 (인증 정보)
   * @returns 발급된 사용자 쿠폰 정보
   */
  @Post(':id/issue')
  @HttpCode(201)
  async issueCoupon(
    @Param('id') couponId: string,
    // TODO: @CurrentUser() user: User 구현 후 적용
    // 현재는 임시로 하드코딩된 userId 사용
  ): Promise<UserCouponResponseDto> {
    // TODO: user.id로 변경
    const userId = 'user-1'; // 임시 하드코딩

    const input = new IssueCouponInput({
      userId,
      couponId,
    });

    const output = await this.issueCouponUseCase.execute(input);
    return UserCouponResponseDto.from(output);
  }

  /**
   * 사용자 쿠폰 목록 조회
   *
   * GET /coupons/my
   * GET /coupons/my?status=AVAILABLE
   *
   * @param status - 쿠폰 상태 필터 (optional)
   * @param user - 현재 사용자 (인증 정보)
   * @returns 사용자 쿠폰 목록
   */
  @Get('my')
  async getUserCoupons(
    @Query('status') status?: CouponStatus,
    // TODO: @CurrentUser() user: User 구현 후 적용
  ): Promise<UserCouponsResponseDto> {
    // TODO: user.id로 변경
    const userId = 'user-1'; // 임시 하드코딩

    const input = new GetUserCouponsInput({
      userId,
      status,
    });

    const output = await this.getUserCouponsUseCase.execute(input);
    return UserCouponsResponseDto.from(output);
  }
}
