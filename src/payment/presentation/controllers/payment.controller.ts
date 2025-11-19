import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ProcessPaymentUseCase } from '../../application/use-cases/process-payment.use-case';
import { ProcessPaymentInput } from '../../application/dtos/process-payment.dto';
import { ProcessPaymentRequestDto } from '../dtos/process-payment-request.dto';
import { PaymentResponseDto } from '../dtos/payment-response.dto';

/**
 * PaymentController
 *
 * POST /payments - 결제 처리
 */
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly processPaymentUseCase: ProcessPaymentUseCase,
  ) {}

  /**
   * 결제 처리
   *
   * POST /payments
   *
   * @param body 결제 요청 데이터
   * @param testFail 테스트용 강제 실패 헤더 (X-Test-Fail: true)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async processPayment(
    @Body() body: ProcessPaymentRequestDto,
    @Headers('x-test-fail') testFail?: string,
  ): Promise<PaymentResponseDto> {
    // TODO: 실제 환경에서는 @CurrentUser() 데코레이터로 인증된 사용자 정보 가져오기
    const userId = 'user-1'; // 임시 하드코딩

    // Input DTO 생성
    const input = new ProcessPaymentInput(
      userId,
      body.orderId,
      body.paymentMethod,
    );

    // UseCase 실행 (테스트 플래그 전달)
    const shouldFail = testFail === 'true';
    const output = await this.processPaymentUseCase.execute(input, shouldFail);

    // Response DTO 반환
    return PaymentResponseDto.from(output);
  }
}
