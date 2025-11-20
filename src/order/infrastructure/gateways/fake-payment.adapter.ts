import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  IPaymentGateway,
  ProcessPaymentRequest,
  ProcessPaymentResponse,
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

  private simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
