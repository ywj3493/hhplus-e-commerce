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
}
