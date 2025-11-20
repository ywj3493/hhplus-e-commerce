import { Inject, Injectable } from '@nestjs/common';
import type { OrderRepository } from '@/order/domain/repositories/order.repository';
import { ORDER_REPOSITORY } from '@/order/domain/repositories/tokens';

/**
 * CompleteOrderUseCase
 *
 * 주문 완료 유스케이스
 * 재고 확정 후 주문 상태를 COMPLETED로 변경
 *
 * 책임:
 * 1. Order 조회
 * 2. Order 상태 변경 (PENDING → COMPLETED)
 * 3. Order 저장
 *
 * Note: Saga Pattern 대비
 * - 단일 책임으로 분리하여 보상 트랜잭션 구현 용이
 * - 실패 시 롤백 로직을 명확하게 구현 가능
 */
@Injectable()
export class CompleteOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
  ) {}

  /**
   * 주문 완료 실행
   * @param orderId 주문 ID
   */
  async execute(orderId: string): Promise<void> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error(`주문을 찾을 수 없습니다: ${orderId}`);
    }

    order.complete();
    await this.orderRepository.save(order);
  }
}
