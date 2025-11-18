import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  HttpCode,
} from '@nestjs/common';
import { CreateOrderUseCase } from '../../application/use-cases/create-order.use-case';
import { GetOrderUseCase } from '../../application/use-cases/get-order.use-case';
import { GetOrdersUseCase } from '../../application/use-cases/get-orders.use-case';
import { CreateOrderInput } from '../../application/dtos/create-order.dto';
import { GetOrderInput } from '../../application/dtos/get-order.dto';
import { GetOrdersInput } from '../../application/dtos/get-orders.dto';
import { CreateOrderRequestDto } from '../dtos/create-order-request.dto';
import { PaginationQueryDto } from '../dtos/pagination-query.dto';
import {
  CreateOrderResponseDto,
  OrderResponseDto,
} from '../dtos/order-response.dto';
import { OrderListResponseDto } from '../dtos/order-list-response.dto';

/**
 * 주문 컨트롤러
 *
 * API Endpoints:
 * - POST /orders - 주문 생성
 * - GET /orders/:id - 주문 조회
 * - GET /orders - 주문 목록 조회
 */
@Controller('orders')
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
  async createOrder(
    @Body() body: CreateOrderRequestDto,
    // TODO: @CurrentUser() user: User 구현 후 적용
  ): Promise<CreateOrderResponseDto> {
    // TODO: user.id로 변경
    const userId = 'user-1'; // 임시 하드코딩

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
  async getOrder(
    @Param('id') id: string,
    // TODO: @CurrentUser() user: User 구현 후 적용
  ): Promise<OrderResponseDto> {
    // TODO: user.id로 변경
    const userId = 'user-1'; // 임시 하드코딩

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
  async getOrders(
    @Query() query: PaginationQueryDto,
    // TODO: @CurrentUser() user: User 구현 후 적용
  ): Promise<OrderListResponseDto> {
    // TODO: user.id로 변경
    const userId = 'user-1'; // 임시 하드코딩

    const input = new GetOrdersInput(
      userId,
      query.page || 1,
      query.limit || 10,
    );
    const output = await this.getOrdersUseCase.execute(input);

    return OrderListResponseDto.from(output);
  }
}
