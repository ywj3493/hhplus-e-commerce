import { PaymentMethod } from '@/order/domain/entities/payment-method.enum';

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface ProcessPaymentRequest {
  orderId: string;
  userId: string;
  amount: number;
  paymentMethod: PaymentMethod;
}

export interface ProcessPaymentResponse {
  success: boolean;
  transactionId?: string;
  errorMessage?: string;
}

export interface RefundPaymentResponse {
  success: boolean;
  errorMessage?: string;
}

/**
 * Payment Port
 *
 * 결제 처리를 위한 Domain Port
 * Infrastructure Adapter가 이 인터페이스를 구현
 */
export interface IPaymentGateway {
  processPayment(
    request: ProcessPaymentRequest,
    shouldFail?: boolean,
  ): Promise<ProcessPaymentResponse>;

  /**
   * 결제 환불 처리
   *
   * @param transactionId 환불할 거래 ID
   * @returns 환불 처리 결과
   */
  refund(transactionId: string): Promise<RefundPaymentResponse>;
}
