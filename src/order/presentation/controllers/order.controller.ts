import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  HttpCode,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { FakeJwtAuthGuard } from '@/__fake__/auth/fake-jwt-auth.guard';
import { CreateOrderUseCase } from '@/order/application/use-cases/create-order.use-case';
import { GetOrderUseCase } from '@/order/application/use-cases/get-order.use-case';
import { GetOrdersUseCase } from '@/order/application/use-cases/get-orders.use-case';
import { CreateOrderInput } from '@/order/application/dtos/create-order.dto';
import { GetOrderInput } from '@/order/application/dtos/get-order.dto';
import { GetOrdersInput } from '@/order/application/dtos/get-orders.dto';
import { CreateOrderRequestDto } from '@/order/presentation/dtos/create-order-request.dto';
import { PaginationQueryDto } from '@/order/presentation/dtos/pagination-query.dto';
import {
  CreateOrderResponseDto,
  OrderResponseDto,
} from '@/order/presentation/dtos/order-response.dto';
import { OrderListResponseDto } from '@/order/presentation/dtos/order-list-response.dto';

/**
 * 주문 컨트롤러
 *
 * API Endpoints:
 * - POST /orders - 주문 생성
 * - GET /orders/:id - 주문 조회
 * - GET /orders - 주문 목록 조회
 *
 * 인증: JWT 토큰 필요 (Bearer token)
 */
@ApiTags('orders')
@Controller('orders')
@UseGuards(FakeJwtAuthGuard)
@ApiBearerAuth('access-token')
export class OrderController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly getOrderUseCase: GetOrderUseCase,
    private readonly getOrdersUseCase: GetOrdersUseCase,
  ) {}

  /**
   * 주문 생성
   *
   * POST /orders
   *
   * @param body - 주문 생성 요청 (쿠폰 ID 선택)
   * @param user - 현재 사용자 (인증 정보)
   * @returns 생성된 주문 정보
   */
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: '주문 생성', description: '장바구니 상품으로 주문을 생성합니다.' })
  @ApiResponse({ status: 201, description: '주문 생성 성공', type: CreateOrderResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 요청 (장바구니 비어있음, 쿠폰 사용 불가 등)' })
  @ApiResponse({ status: 409, description: '재고 부족' })
  async createOrder(
    @Body() body: CreateOrderRequestDto,
    @Request() req,
  ): Promise<CreateOrderResponseDto> {
    const userId = req.user.userId;

    const input = new CreateOrderInput(userId, body.couponId);
    const output = await this.createOrderUseCase.execute(input);

    return CreateOrderResponseDto.from(output);
  }

  /**
   * 주문 조회
   *
   * GET /orders/:id
   *
   * @param id - 주문 ID
   * @param user - 현재 사용자 (인증 정보)
   * @returns 주문 상세 정보
   */
  @Get(':id')
  @ApiOperation({ summary: '주문 조회', description: '주문 상세 정보를 조회합니다.' })
  @ApiParam({ name: 'id', description: '주문 ID', example: 'order-1' })
  @ApiResponse({ status: 200, description: '주문 조회 성공', type: OrderResponseDto })
  @ApiResponse({ status: 404, description: '주문을 찾을 수 없음' })
  async getOrder(
    @Param('id') id: string,
    @Request() req,
  ): Promise<OrderResponseDto> {
    const userId = req.user.userId;

    const input = new GetOrderInput(id, userId);
    const output = await this.getOrderUseCase.execute(input);

    return OrderResponseDto.from(output);
  }

  /**
   * 주문 목록 조회
   *
   * GET /orders
   * GET /orders?page=1&limit=10
   *
   * @param query - 페이지네이션 쿼리
   * @param user - 현재 사용자 (인증 정보)
   * @returns 주문 목록 (페이지네이션)
   */
  @Get()
  @ApiOperation({ summary: '주문 목록 조회', description: '사용자의 주문 목록을 페이지네이션으로 조회합니다.' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '페이지 번호 (기본값: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '페이지당 항목 수 (기본값: 10)', example: 10 })
  @ApiResponse({ status: 200, description: '주문 목록 조회 성공', type: OrderListResponseDto })
  async getOrders(
    @Query() query: PaginationQueryDto,
    @Request() req,
  ): Promise<OrderListResponseDto> {
    const userId = req.user.userId;

    const input = new GetOrdersInput(
      userId,
      query.page || 1,
      query.limit || 10,
    );
    const output = await this.getOrdersUseCase.execute(input);

    return OrderListResponseDto.from(output);
  }
}
