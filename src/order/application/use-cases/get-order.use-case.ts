import { Injectable, Inject } from '@nestjs/common';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { GetOrderInput, GetOrderOutput } from '../dtos/get-order.dto';
import {
  OrderNotFoundException,
  OrderOwnershipException,
} from '../../domain/order.exceptions';
import { ORDER_REPOSITORY } from './create-order.use-case';

/**
 * GetOrderUseCase
 * 주문 조회 Use Case
 *
 * BR-ORDER-06: 본인의 주문만 조회 가능
 * BR-ORDER-07: 스냅샷 표시 (주문 시점의 상품 정보)
 */
@Injectable()
export class GetOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
  ) {}

  async execute(input: GetOrderInput): Promise<GetOrderOutput> {
    // 1. 주문 조회
    const order = await this.orderRepository.findById(input.orderId);

    if (!order) {
      throw new OrderNotFoundException();
    }

    // 2. BR-ORDER-06: 소유권 검증
    if (order.userId !== input.userId) {
      throw new OrderOwnershipException();
    }

    // 3. Output DTO 반환
    return GetOrderOutput.from(order);
  }
}
