import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  IPaymentApiClient,
  PaymentRequest,
  PaymentResponse,
} from './payment-api.interface';

/**
 * Mock Payment API Client
 *
 * 외부 PG 결제 API를 시뮬레이션하는 Mock 구현
 *
 * 테스트 동작:
 * - 기본: 성공 응답 (90%)
 * - 확률적 실패: 10% 랜덤 실패
 * - 의도적 실패: Request에 testFail 플래그가 true이면 실패
 */
@Injectable()
export class MockPaymentApiClient implements IPaymentApiClient {
  private readonly RANDOM_FAILURE_RATE = 0.1; // 10% 확률로 랜덤 실패

  /**
   * 결제 요청 (Mock 구현)
   *
   * @param request 결제 요청 데이터
   * @param testFail 테스트용 강제 실패 플래그 (선택)
   */
  async requestPayment(
    request: PaymentRequest,
    testFail = false,
  ): Promise<PaymentResponse> {
    // API 지연 시뮬레이션 (100ms)
    await this.simulateDelay(100);

    // 1. 의도적 실패 테스트 (testFail 플래그)
    if (testFail) {
      return {
        success: false,
        errorCode: 'TEST_FAILURE',
        message: '테스트용 강제 실패',
      };
    }

    // 2. 확률적 랜덤 실패 (10%)
    if (Math.random() < this.RANDOM_FAILURE_RATE) {
      return {
        success: false,
        errorCode: 'RANDOM_FAILURE',
        message: '결제 처리 중 오류가 발생했습니다.',
      };
    }

    // 3. 정상 처리
    return {
      success: true,
      transactionId: `TXN-${uuidv4()}`,
      message: '결제가 성공적으로 완료되었습니다.',
    };
  }

  /**
   * API 지연 시뮬레이션
   */
  private simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
