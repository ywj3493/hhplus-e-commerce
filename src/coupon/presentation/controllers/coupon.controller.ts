import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  HttpCode,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { FakeJwtAuthGuard } from '@/__fake__/auth/fake-jwt-auth.guard';
import { IssueCouponUseCase } from '@/coupon/application/use-cases/issue-coupon.use-case';
import { GetUserCouponsUseCase } from '@/coupon/application/use-cases/get-user-coupons.use-case';
import { IssueCouponInput } from '@/coupon/application/dtos/issue-coupon.dto';
import { GetUserCouponsInput } from '@/coupon/application/dtos/get-user-coupons.dto';
import { UserCouponResponseDto } from '@/coupon/presentation/dtos/user-coupon-response.dto';
import { UserCouponsResponseDto } from '@/coupon/presentation/dtos/user-coupons-response.dto';
import { CouponStatus } from '@/coupon/domain/entities/user-coupon.entity';

/**
 * 쿠폰 컨트롤러
 *
 * API Endpoints:
 * - POST /coupons/:id/issue - 쿠폰 발급
 * - GET /coupons/my - 사용자 쿠폰 목록 조회
 *
 * 인증: JWT 토큰 필요 (Bearer token)
 */
@ApiTags('coupons')
@Controller('coupons')
@UseGuards(FakeJwtAuthGuard)
@ApiBearerAuth('access-token')
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
  @ApiOperation({ summary: '쿠폰 발급', description: '사용자에게 쿠폰을 발급합니다.' })
  @ApiParam({ name: 'id', description: '쿠폰 ID', example: 'coupon-1' })
  @ApiResponse({ status: 201, description: '쿠폰 발급 성공', type: UserCouponResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 요청 (쿠폰 없음, 중복 발급 등)' })
  @ApiResponse({ status: 409, description: '수량 부족으로 발급 실패' })
  async issueCoupon(
    @Param('id') couponId: string,
    @Request() req,
  ): Promise<UserCouponResponseDto> {
    const userId = req.user.userId;

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
  @ApiOperation({ summary: '내 쿠폰 목록 조회', description: '사용자의 쿠폰 목록을 조회합니다.' })
  @ApiQuery({ name: 'status', required: false, enum: CouponStatus, description: '쿠폰 상태 필터 (AVAILABLE, USED, EXPIRED)' })
  @ApiResponse({ status: 200, description: '쿠폰 목록 조회 성공', type: UserCouponsResponseDto })
  async getUserCoupons(
    @Query('status') status: CouponStatus | undefined,
    @Request() req,
  ): Promise<UserCouponsResponseDto> {
    const userId = req.user.userId;

    const input = new GetUserCouponsInput({
      userId,
      status,
    });

    const output = await this.getUserCouponsUseCase.execute(input);
    return UserCouponsResponseDto.from(output);
  }
}
