import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  IPaymentGateway,
  ProcessPaymentRequest,
  ProcessPaymentResponse,
} from '@/order/domain/ports/payment.port';

/**
 * Fake Payment API Adapter
 *
 * 실제 PG사 API 호출을 모사하는 Adapter
 * 프로덕션 환경에서 실제 PG API로 교체 예정
 */
@Injectable()
export class FakePaymentApiAdapter implements IPaymentGateway {
  async processPayment(
    request: ProcessPaymentRequest,
    shouldFail = false,
  ): Promise<ProcessPaymentResponse> {
    // 실제 API 호출 시뮬레이션 (200ms 지연)
    await this.simulateApiCall(200);

    // shouldFail은 실제 PG API에서는 사용하지 않음
    // 테스트 환경에서만 의미있는 파라미터

    // 실제 PG API 호출 시나리오 모사
    try {
      // TODO: 실제 PG API 호출
      // const response = await this.callPgApi(request);

      // 현재는 Mock 응답
      const response = await this.mockPgApiCall(request);

      return {
        success: true,
        transactionId: response.transactionId,
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : '결제 처리 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * Mock PG API 호출
   * 실제 구현 시 이 메서드를 실제 PG API 호출로 교체
   */
  private async mockPgApiCall(request: ProcessPaymentRequest): Promise<{ transactionId: string }> {
    // 실제 PG API 응답 형식 모사
    return {
      transactionId: `PG-TXN-${uuidv4()}`,
    };
  }

  private simulateApiCall(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
