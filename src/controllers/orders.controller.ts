import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import * as stubData from '@/__stub__/data/orders.json';
import { FakeJwtAuthGuard } from '@/__fake__/auth/fake-jwt-auth.guard';

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@UseGuards(FakeJwtAuthGuard)
@Controller('orders')
export class OrdersController {
  @Post()
  @ApiOperation({
    summary: '주문 생성',
    description: '사용자의 장바구니 전체 항목으로 주문을 생성하고 재고를 예약합니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        couponId: {
          type: 'string',
          example: 'coupon-001',
          description: '사용할 쿠폰 ID (선택)',
          nullable: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '주문 생성 성공',
    schema: {
      example: {
        success: true,
        data: stubData.createOrderSuccess,
        timestamp: '2025-10-30T10:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청',
    schema: {
      example: {
        success: false,
        error: {
          code: 'EMPTY_CART',
          message: '장바구니가 비어있습니다',
        },
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
    description: '재고 부족 또는 쿠폰 사용 불가',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          message: '재고가 부족합니다',
        },
        timestamp: '2025-10-30T10:00:00Z',
      },
    },
  })
  createOrder(@Body() body: { couponId?: string }) {
    return {
      success: true,
      data: stubData.createOrderSuccess,
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @ApiOperation({
    summary: '주문 내역 조회',
    description: '사용자의 주문 내역을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '주문 내역 조회 성공',
    schema: {
      example: {
        success: true,
        data: {
          orders: stubData.orderHistory,
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
  getOrders() {
    return {
      success: true,
      data: {
        orders: stubData.orderHistory,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: '주문 상세 조회',
    description: '특정 주문의 상세 정보를 조회합니다.',
  })
  @ApiParam({ name: 'id', type: String, description: '주문 ID', example: 'order-001' })
  @ApiResponse({
    status: 200,
    description: '주문 상세 조회 성공',
    schema: {
      example: {
        success: true,
        data: stubData.orderDetail,
        timestamp: '2025-10-30T10:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '주문을 찾을 수 없음',
    schema: {
      example: {
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: '주문을 찾을 수 없습니다',
        },
        timestamp: '2025-10-30T10:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: '권한 없음',
    schema: {
      example: {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '권한이 없습니다',
        },
        timestamp: '2025-10-30T10:00:00Z',
      },
    },
  })
  getOrderById(@Param('id') id: string) {
    return {
      success: true,
      data: stubData.orderDetail,
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/payment')
  @ApiOperation({
    summary: '결제 처리',
    description: '주문에 대한 결제를 처리합니다.',
  })
  @ApiParam({ name: 'id', type: String, description: '주문 ID', example: 'order-001' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        paymentMethod: {
          type: 'string',
          example: 'CARD',
          description: '결제 수단 (CARD, BANK_TRANSFER, MOBILE)',
        },
        paymentAmount: {
          type: 'number',
          example: 213000,
          description: '결제 금액',
        },
      },
      required: ['paymentMethod', 'paymentAmount'],
    },
  })
  @ApiResponse({
    status: 200,
    description: '결제 성공',
    schema: {
      example: {
        success: true,
        data: stubData.paymentSuccess,
        timestamp: '2025-10-30T10:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INVALID_PAYMENT_AMOUNT',
          message: '결제 금액이 주문 금액과 일치하지 않습니다',
        },
        timestamp: '2025-10-30T10:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '주문을 찾을 수 없음',
    schema: {
      example: {
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: '주문을 찾을 수 없습니다',
        },
        timestamp: '2025-10-30T10:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: '결제 불가 상태',
    schema: {
      example: {
        success: false,
        error: {
          code: 'RESERVATION_EXPIRED',
          message: '재고 예약이 만료되었습니다',
        },
        timestamp: '2025-10-30T10:00:00Z',
      },
    },
  })
  processPayment(
    @Param('id') id: string,
    @Body() body: { paymentMethod: string; paymentAmount: number },
  ) {
    return {
      success: true,
      data: stubData.paymentSuccess,
      timestamp: new Date().toISOString(),
    };
  }
}
