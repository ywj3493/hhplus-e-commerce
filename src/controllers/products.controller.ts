import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import * as stubData from '../__stub__/data/products.json';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  @Get()
  @ApiOperation({
    summary: '상품 목록 조회',
    description: '상품 목록을 페이지네이션하여 조회합니다.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '페이지 번호 (1부터 시작)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '페이지 크기 (1-100)', example: 20 })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: '정렬 기준 (price, popularity, createdAt)', example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, type: String, description: '정렬 방향 (asc, desc)', example: 'desc' })
  @ApiResponse({
    status: 200,
    description: '상품 목록 조회 성공',
    schema: {
      example: {
        success: true,
        data: {
          items: stubData.productList,
          pagination: {
            page: 1,
            limit: 20,
            totalItems: 150,
            totalPages: 8,
            hasNext: true,
            hasPrev: false,
          },
        },
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
          code: 'INVALID_PAGE_NUMBER',
          message: '유효하지 않은 페이지 번호입니다',
        },
        timestamp: '2025-10-30T10:00:00Z',
      },
    },
  })
  getProducts(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: string = 'desc',
  ) {
    return {
      success: true,
      data: {
        items: stubData.productList,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          totalItems: 150,
          totalPages: 8,
          hasNext: true,
          hasPrev: false,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('popular')
  @ApiOperation({
    summary: '인기 상품 Top 5 조회',
    description: '최근 3일간 판매량 기준 인기 상품 5개를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '인기 상품 조회 성공',
    schema: {
      example: {
        success: true,
        data: {
          items: stubData.popularProducts,
        },
        timestamp: '2025-10-30T10:00:00Z',
      },
    },
  })
  getPopularProducts() {
    return {
      success: true,
      data: {
        items: stubData.popularProducts,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: '상품 상세 조회',
    description: '특정 상품의 상세 정보를 조회합니다.',
  })
  @ApiParam({ name: 'id', type: String, description: '상품 ID', example: 'prod-001' })
  @ApiResponse({
    status: 200,
    description: '상품 상세 조회 성공',
    schema: {
      example: {
        success: true,
        data: stubData.productDetail,
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
  getProductById(@Param('id') id: string) {
    return {
      success: true,
      data: stubData.productDetail,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id/options')
  @ApiOperation({
    summary: '상품 옵션 조회',
    description: '특정 상품의 옵션 정보를 조회합니다.',
  })
  @ApiParam({ name: 'id', type: String, description: '상품 ID', example: 'prod-001' })
  @ApiResponse({
    status: 200,
    description: '상품 옵션 조회 성공',
    schema: {
      example: {
        success: true,
        data: {
          options: stubData.productOptions,
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
  getProductOptions(@Param('id') id: string) {
    return {
      success: true,
      data: {
        options: stubData.productOptions,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
