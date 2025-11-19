/**
 * 결제 완료 이벤트
 *
 * 결제가 완료되었을 때 발행되는 도메인 이벤트
 * Order 모듈의 Event Handler가 이 이벤트를 수신하여 재고 확정 처리를 수행합니다.
 */
export class PaymentCompletedEvent {
  constructor(
    public readonly paymentId: string,
    public readonly orderId: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
