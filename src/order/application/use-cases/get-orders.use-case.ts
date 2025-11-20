import { Injectable, Inject } from '@nestjs/common';
import { OrderRepository } from '@/order/domain/repositories/order.repository';
import { GetOrdersInput, GetOrdersOutput } from '@/order/application/dtos/get-orders.dto';
import { ORDER_REPOSITORY } from '@/order/application/use-cases/create-order.use-case';

/**
 * GetOrdersUseCase
 * 주문 목록 조회 Use Case
 *
 * BR-ORDER-09: 최신 주문부터 표시 (created_at DESC)
 * BR-ORDER-10: 기본 페이지 크기 10
 * BR-ORDER-11: 최대 페이지 크기 100
 * BR-ORDER-12: 본인 주문만 표시
 */
@Injectable()
export class GetOrdersUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
  ) {}

  async execute(input: GetOrdersInput): Promise<GetOrdersOutput> {
    // 1. 사용자의 주문 목록 조회 (페이지네이션)
    const orders = await this.orderRepository.findByUserId(input.userId, {
      page: input.page,
      limit: input.limit,
    });

    // 2. 총 개수 조회
    const total = await this.orderRepository.countByUserId(input.userId);

    // 3. Output DTO 반환
    return GetOrdersOutput.from(orders, input.page, input.limit, total);
  }
}
