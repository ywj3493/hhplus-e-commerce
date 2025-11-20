import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import * as stubData from '@/__stub__/data/coupons.json';
import { FakeJwtAuthGuard } from '@/__fake__/auth/fake-jwt-auth.guard';

@ApiTags('Coupons')
@ApiBearerAuth('access-token')
@UseGuards(FakeJwtAuthGuard)
@Controller('coupons')
export class CouponsController {
  @Post(':id/issue')
  @ApiOperation({
    summary: '쿠폰 발급',
    description: '선착순 쿠폰을 발급받습니다. 각 사용자는 동일한 쿠폰을 1회만 발급받을 수 있습니다.',
  })
  @ApiParam({ name: 'id', type: String, description: '쿠폰 ID', example: 'coupon-001' })
  @ApiResponse({
    status: 201,
    description: '쿠폰 발급 성공',
    schema: {
      example: {
        success: true,
        data: stubData.issueCouponSuccess,
        timestamp: '2025-10-30T10:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '쿠폰을 찾을 수 없음',
    schema: {
      example: {
        success: false,
        error: {
          code: 'COUPON_NOT_FOUND',
          message: '쿠폰을 찾을 수 없습니다',
        },
        timestamp: '2025-10-30T10:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: '쿠폰 발급 불가',
    schema: {
      examples: {
        soldOut: {
          summary: '쿠폰 소진',
          value: {
            success: false,
            error: {
              code: 'COUPON_SOLD_OUT',
              message: '쿠폰이 모두 소진되었습니다',
            },
            timestamp: '2025-10-30T10:00:00Z',
          },
        },
        alreadyIssued: {
          summary: '이미 발급됨',
          value: {
            success: false,
            error: {
              code: 'COUPON_ALREADY_ISSUED',
              message: '이미 발급받은 쿠폰입니다',
            },
            timestamp: '2025-10-30T10:00:00Z',
          },
        },
        expired: {
          summary: '발급 기간 만료',
          value: {
            success: false,
            error: {
              code: 'COUPON_ISSUE_EXPIRED',
              message: '쿠폰 발급 기간이 종료되었습니다',
            },
            timestamp: '2025-10-30T10:00:00Z',
          },
        },
      },
    },
  })
  issueCoupon(@Param('id') id: string) {
    return {
      success: true,
      data: stubData.issueCouponSuccess,
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @ApiOperation({
    summary: '보유 쿠폰 조회',
    description: '사용자가 보유한 쿠폰 목록을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '보유 쿠폰 조회 성공',
    schema: {
      example: {
        success: true,
        data: {
          coupons: stubData.ownedCoupons,
        },
        timestamp: '2025-10-30T10:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '인증 필요',
    schema: {
      example: {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '인증이 필요합니다',
        },
        timestamp: '2025-10-30T10:00:00Z',
      },
    },
  })
  getOwnedCoupons() {
    return {
      success: true,
      data: {
        coupons: stubData.ownedCoupons,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
