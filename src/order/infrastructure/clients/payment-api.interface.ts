import { PaymentMethod } from '@/order/domain/entities/payment-method.enum';

/**
 * PAYMENT_API_CLIENT Symbol Token
 */
export const PAYMENT_API_CLIENT = Symbol('PAYMENT_API_CLIENT');

/**
 * 외부 결제 API 요청 데이터
 */
export interface PaymentRequest {
  orderId: string;
  userId: string;
  amount: number;
  paymentMethod: PaymentMethod;
}

/**
 * 외부 결제 API 응답 데이터
 */
export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  message?: string;
  errorCode?: string;
}

/**
 * Payment API Client Interface
 *
 * 외부 PG 결제 API와의 통신을 추상화하는 인터페이스
 */
export interface IPaymentApiClient {
  /**
   * 결제 요청
   * @param request 결제 요청 데이터
   * @param testFail 테스트용 강제 실패 플래그 (선택)
   */
  requestPayment(
    request: PaymentRequest,
    testFail?: boolean,
  ): Promise<PaymentResponse>;
}
