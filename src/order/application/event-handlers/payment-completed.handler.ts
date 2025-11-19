import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PaymentCompletedEvent } from '../../../payment/domain/events/payment-completed.event';
import { StockReservationService } from '../../domain/services/stock-reservation.service';

/**
 * PaymentCompletedHandler
 *
 * 결제 완료 이벤트를 수신하여 재고 확정 처리를 수행합니다.
 *
 * 책임:
 * 1. PaymentCompletedEvent 수신
 * 2. StockReservationService.convertReservedToSold 호출
 * 3. 재고 상태 변경 (reserved → sold)
 */
@Injectable()
export class PaymentCompletedHandler {
  private readonly logger = new Logger(PaymentCompletedHandler.name);

  constructor(
    private readonly stockReservationService: StockReservationService,
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
      // 재고 확정 (reserved → sold)
      await this.stockReservationService.convertReservedToSold(event.orderId);

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
