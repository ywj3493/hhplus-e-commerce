import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@/order/domain/entities/payment-method.enum';
import { ProcessPaymentOutput } from '@/order/application/dtos/process-payment.dto';

/**
 * PaymentResponseDto
 *
 * POST /payments 응답 DTO
 */
export class PaymentResponseDto {
  @ApiProperty({ description: '결제 ID', example: 'payment-1' })
  paymentId: string;

  @ApiProperty({ description: '주문 ID', example: 'order-1' })
  orderId: string;

  @ApiProperty({ description: '결제 금액', example: 4482000 })
  amount: number;

  @ApiProperty({ description: '결제 수단', enum: PaymentMethod, example: PaymentMethod.CREDIT_CARD })
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: '거래 ID (외부 PG사)', example: 'txn-abc123def456' })
  transactionId: string;

  @ApiProperty({ description: '결제 생성 시간', example: '2025-01-15T10:03:00.000Z' })
  createdAt: Date;

  /**
   * ProcessPaymentOutput으로부터 Response DTO 생성
   */
  static from(output: ProcessPaymentOutput): PaymentResponseDto {
    const dto = new PaymentResponseDto();
    dto.paymentId = output.paymentId;
    dto.orderId = output.orderId;
    dto.amount = output.amount;
    dto.paymentMethod = output.paymentMethod;
    dto.transactionId = output.transactionId;
    dto.createdAt = output.createdAt;
    return dto;
  }
}
