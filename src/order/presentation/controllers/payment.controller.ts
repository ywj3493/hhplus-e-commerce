import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { FakeJwtAuthGuard } from '@/__fake__/auth/fake-jwt-auth.guard';
import { OrderFacade } from '@/order/application/facades/order.facade';
import { ProcessPaymentInput } from '@/order/application/dtos/process-payment.dto';
import { ProcessPaymentRequestDto } from '@/order/presentation/dtos/process-payment-request.dto';
import { PaymentResponseDto } from '@/order/presentation/dtos/payment-response.dto';

/**
 * PaymentController
 *
 * POST /payments - 결제 처리
 *
 * 인증: JWT 토큰 필요 (Bearer token)
 */
@ApiTags('payments')
@Controller('payments')
@UseGuards(FakeJwtAuthGuard)
@ApiBearerAuth('access-token')
export class PaymentController {
  constructor(
    private readonly orderFacade: OrderFacade,
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
  @ApiOperation({ summary: '결제 처리', description: '주문에 대한 결제를 처리합니다.' })
  @ApiHeader({ name: 'X-Test-Fail', required: false, description: '테스트용 강제 실패 플래그 (true/false)', schema: { type: 'string', example: 'false' } })
  @ApiResponse({ status: 201, description: '결제 처리 성공', type: PaymentResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 요청 (주문 없음, 이미 결제됨 등)' })
  @ApiResponse({ status: 402, description: '결제 실패' })
  async processPayment(
    @Body() body: ProcessPaymentRequestDto,
    @Headers('x-test-fail') testFail: string | undefined,
    @Request() req,
  ): Promise<PaymentResponseDto> {
    const userId = req.user.userId;

    // Input DTO 생성
    const input = new ProcessPaymentInput(
      userId,
      body.orderId,
      body.paymentMethod,
    );

    // Facade를 통한 주문 완료 처리 (결제 → 재고 확정 → 주문 완료)
    const shouldFail = testFail === 'true';
    const output = await this.orderFacade.completeOrder(input, shouldFail);

    // Response DTO 반환
    return PaymentResponseDto.from(output);
  }
}
