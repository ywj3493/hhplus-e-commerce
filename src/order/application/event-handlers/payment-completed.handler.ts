import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PaymentCompletedEvent } from '@/order/domain/events/payment-completed.event';
import { StockManagementService } from '@/product/domain/services/stock-management.service';
import type { OrderRepository } from '@/order/domain/repositories/order.repository';
import { ORDER_REPOSITORY } from '@/order/domain/repositories/tokens';

/**
 * PaymentCompletedHandler
 *
 * 결제 완료 이벤트를 수신하여 재고 확정 처리를 수행합니다.
 *
 * 책임:
 * 1. PaymentCompletedEvent 수신
 * 2. Order 조회
 * 3. Product 도메인 서비스를 통한 재고 확정
 * 4. 재고 상태 변경 (reserved → sold)
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
      // Order 조회
      const order = await this.orderRepository.findById(event.orderId);
      if (!order) {
        throw new Error(`주문을 찾을 수 없습니다: ${event.orderId}`);
      }

      // 재고 확정 (reserved → sold)
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
    } catch (error) {
      this.logger.error(
        `재고 확정 실패: orderId=${event.orderId}`,
        error,
      );
      throw error;
    }
  }
}
