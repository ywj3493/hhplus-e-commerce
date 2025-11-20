import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import * as stubData from '@/__stub__/data/cart.json';
import { FakeJwtAuthGuard } from '@/__fake__/auth/fake-jwt-auth.guard';

@ApiTags('Cart')
@ApiBearerAuth('access-token')
@UseGuards(FakeJwtAuthGuard)
@Controller('cart')
export class CartController {
  @Get()
  @ApiOperation({
    summary: '장바구니 조회',
    description: '사용자의 장바구니 내용을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '장바구니 조회 성공',
    schema: {
      example: {
        success: true,
        data: stubData.cart,
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
  getCart() {
    return {
      success: true,
      data: stubData.cart,
      timestamp: new Date().toISOString(),
    };
  }

  @Post()
  @ApiOperation({
    summary: '장바구니에 상품 추가',
    description: '장바구니에 상품을 추가합니다. 이미 존재하는 상품은 수량이 증가합니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        productId: {
          type: 'string',
          example: 'prod-002',
          description: '상품 ID',
        },
        optionId: {
          type: 'string',
          example: null,
          description: '옵션 ID (옵션이 없는 상품은 null)',
          nullable: true,
        },
        quantity: {
          type: 'number',
          example: 1,
          description: '수량 (1 이상)',
        },
      },
      required: ['productId', 'quantity'],
    },
  })
  @ApiResponse({
    status: 201,
    description: '장바구니에 상품 추가 성공',
    schema: {
      example: {
        success: true,
        data: stubData.addToCartSuccess,
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
          code: 'INVALID_QUANTITY',
          message: '수량은 1 이상이어야 합니다',
        },
        timestamp: '2025-10-30T10:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '상품을 찾을 수 없음',
    schema: {
      example: {
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: '상품을 찾을 수 없습니다',
        },
        timestamp: '2025-10-30T10:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: '재고 부족',
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
  addToCart(
    @Body() body: { productId: string; optionId?: string; quantity: number },
  ) {
    return {
      success: true,
      data: stubData.addToCartSuccess,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':itemId')
  @ApiOperation({
    summary: '장바구니 상품 수량 수정',
    description: '장바구니에 담긴 상품의 수량을 수정합니다.',
  })
  @ApiParam({ name: 'itemId', type: String, description: '장바구니 아이템 ID', example: 'cart-item-001' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        quantity: {
          type: 'number',
          example: 3,
          description: '변경할 수량 (1 이상)',
        },
      },
      required: ['quantity'],
    },
  })
  @ApiResponse({
    status: 200,
    description: '장바구니 상품 수량 수정 성공',
    schema: {
      example: {
        success: true,
        data: stubData.updateCartItemSuccess,
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
          code: 'INVALID_QUANTITY',
          message: '수량은 1 이상이어야 합니다',
        },
        timestamp: '2025-10-30T10:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '장바구니 아이템을 찾을 수 없음',
    schema: {
      example: {
        success: false,
        error: {
          code: 'CART_ITEM_NOT_FOUND',
          message: '장바구니 아이템을 찾을 수 없습니다',
        },
        timestamp: '2025-10-30T10:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: '재고 부족',
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
  updateCartItem(
    @Param('itemId') itemId: string,
    @Body() body: { quantity: number },
  ) {
    return {
      success: true,
      data: stubData.updateCartItemSuccess,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete(':itemId')
  @ApiOperation({
    summary: '장바구니에서 상품 삭제',
    description: '장바구니에서 특정 상품을 삭제합니다.',
  })
  @ApiParam({ name: 'itemId', type: String, description: '장바구니 아이템 ID', example: 'cart-item-001' })
  @ApiResponse({
    status: 200,
    description: '장바구니 상품 삭제 성공',
    schema: {
      example: {
        success: true,
        data: {
          message: '장바구니에서 상품이 삭제되었습니다',
        },
        timestamp: '2025-10-30T10:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '장바구니 아이템을 찾을 수 없음',
    schema: {
      example: {
        success: false,
        error: {
          code: 'CART_ITEM_NOT_FOUND',
          message: '장바구니 아이템을 찾을 수 없습니다',
        },
        timestamp: '2025-10-30T10:00:00Z',
      },
    },
  })
  deleteCartItem(@Param('itemId') itemId: string) {
    return {
      success: true,
      data: {
        message: '장바구니에서 상품이 삭제되었습니다',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
