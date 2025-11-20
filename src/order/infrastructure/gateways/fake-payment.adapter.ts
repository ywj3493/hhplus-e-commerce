import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  IPaymentGateway,
  ProcessPaymentRequest,
  ProcessPaymentResponse,
  RefundPaymentResponse,
} from '@/order/domain/ports/payment.port';

/**
 * Fake Payment Adapter
 *
 * 테스트/개발 환경용 결제 Adapter (랜덤 실패 제거, X-Test-Fail 헤더 기반 제어)
 */
@Injectable()
export class FakePaymentAdapter implements IPaymentGateway {
  async processPayment(
    request: ProcessPaymentRequest,
    shouldFail = false,
  ): Promise<ProcessPaymentResponse> {
    await this.simulateDelay(100);

    if (shouldFail) {
      return {
        success: false,
        errorMessage: '결제 처리 중 오류가 발생했습니다.',
      };
    }

    return {
      success: true,
      transactionId: `FAKE-TXN-${uuidv4()}`,
    };
  }

  /**
   * 결제 환불 처리
   * @param transactionId 환불할 거래 ID
   * @returns 환불 처리 결과
   */
  async refund(transactionId: string): Promise<RefundPaymentResponse> {
    await this.simulateDelay(100);

    // Fake 구현이므로 항상 성공
    console.log(`[FakePaymentAdapter] 환불 처리: ${transactionId}`);

    return {
      success: true,
    };
  }

  private simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
