import { PaymentMethod } from '@/order/domain/entities/payment-method.enum';

/**
 * ProcessPaymentInput
 *
 * 결제 처리 UseCase의 입력 DTO
 */
export class ProcessPaymentInput {
  constructor(
    public readonly userId: string,
    public readonly orderId: string,
    public readonly paymentMethod: PaymentMethod,
    public readonly idempotencyKey: string,
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.userId || this.userId.trim() === '') {
      throw new Error('사용자 ID는 필수입니다.');
    }

    if (!this.orderId || this.orderId.trim() === '') {
      throw new Error('주문 ID는 필수입니다.');
    }

    if (!Object.values(PaymentMethod).includes(this.paymentMethod)) {
      throw new Error('유효하지 않은 결제 방법입니다.');
    }

    if (!this.idempotencyKey || this.idempotencyKey.trim() === '') {
      throw new Error('멱등성 키는 필수입니다.');
    }
  }
}

/**
 * ProcessPaymentOutput
 *
 * 결제 처리 UseCase의 출력 DTO
 */
export class ProcessPaymentOutput {
  constructor(
    public readonly paymentId: string,
    public readonly orderId: string,
    public readonly amount: number,
    public readonly paymentMethod: PaymentMethod,
    public readonly transactionId: string,
    public readonly createdAt: Date,
  ) {}

  /**
   * Payment Entity로부터 Output DTO 생성
   */
  static from(payment: {
    id: string;
    orderId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    transactionId: string;
    createdAt: Date;
  }): ProcessPaymentOutput {
    return new ProcessPaymentOutput(
      payment.id,
      payment.orderId,
      payment.amount,
      payment.paymentMethod,
      payment.transactionId,
      payment.createdAt,
    );
  }
}
