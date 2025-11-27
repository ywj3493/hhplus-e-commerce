import { Injectable } from '@nestjs/common';
import { ConfirmSaleUseCase } from '@/product/application/use-cases/confirm-sale.use-case';
import type { OrderItem } from '@/order/domain/entities/order-item.entity';

/**
 * ConfirmStockUseCase
 *
 * 재고 확정 유스케이스 (Order 도메인)
 * 결제 완료 후 예약된 재고를 판매 확정 상태로 전환
 *
 * 책임:
 * 1. 주문 항목들의 재고 확정 (reserved → sold)
 * 2. ConfirmSaleUseCase를 통한 재고 상태 변경 (분산락 + 비관락 적용)
 *
 * Note: Saga Pattern 대비
 * - 단일 책임으로 분리하여 보상 트랜잭션 구현 용이
 * - 실패 시 롤백 로직을 명확하게 구현 가능
 */
@Injectable()
export class ConfirmStockUseCase {
  constructor(private readonly confirmSaleUseCase: ConfirmSaleUseCase) {}

  /**
   * 재고 확정 실행
   * @param orderItems 주문 항목 리스트
   */
  async execute(orderItems: OrderItem[]): Promise<void> {
    for (const item of orderItems) {
      await this.confirmSaleUseCase.execute(
        item.productId,
        item.productOptionId,
        item.quantity,
      );
    }
  }
}
