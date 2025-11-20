import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PaymentCompletedEvent } from '@/order/domain/events/payment-completed.event';
import { StockManagementService } from '@/product/domain/services/stock-management.service';
import type { OrderRepository } from '@/order/domain/repositories/order.repository';
import { ORDER_REPOSITORY } from '@/order/domain/repositories/tokens';

/**
 * PaymentCompletedHandler
 *
 * 결제 완료 이벤트를 수신하여 재고 확정 및 주문 완료 처리를 수행합니다.
 *
 * 책임:
 * 1. PaymentCompletedEvent 수신
 * 2. Order 조회
 * 3. Product 도메인 서비스를 통한 재고 확정
 * 4. 재고 상태 변경 (reserved → sold)
 * 5. Order 상태 변경 (PENDING → COMPLETED) - 재고 확정 후
 *
 * Note: Option A (Event-driven) 방식
 * - 재고가 모두 확정된 후에만 Order를 COMPLETED로 변경
 * - 재고 확정 실패 시 Order는 PENDING 상태 유지
 */
@Injectable()
export class PaymentCompletedHandler {
  private readonly logger = new Logger(PaymentCompletedHandler.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    private readonly stockManagementService: StockManagementService,
  ) {}

  /**
   * 결제 완료 이벤트 핸들러
   */
  @OnEvent('payment.completed')
  async handle(event: PaymentCompletedEvent): Promise<void> {
    this.logger.log(
      `결제 완료 이벤트 수신: paymentId=${event.paymentId}, orderId=${event.orderId}`,
    );

    try {
      // TODO: Production에서는 FOR UPDATE로 Order 조회 필요
      const order = await this.orderRepository.findById(event.orderId);
      if (!order) {
        throw new Error(`주문을 찾을 수 없습니다: ${event.orderId}`);
      }

      // 재고 확정 (reserved → sold)
      // 모든 상품의 재고가 확정되어야 다음 단계로 진행
      for (const orderItem of order.items) {
        await this.stockManagementService.confirmSale(
          orderItem.productId,
          orderItem.productOptionId,
          orderItem.quantity,
        );
      }

      this.logger.log(
        `재고 확정 완료: orderId=${event.orderId}`,
      );

      // 모든 재고 확정 후 Order 완료 처리
      // 재고 확정이 실패하면 이 코드는 실행되지 않음 (Order는 PENDING 유지)
      order.complete();
      await this.orderRepository.save(order);

      this.logger.log(
        `주문 완료 처리: orderId=${event.orderId}`,
      );
    } catch (error) {
      this.logger.error(
        `결제 완료 처리 실패: orderId=${event.orderId}`,
        error,
      );
      throw error;
    }
  }
}
