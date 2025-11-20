import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { PaymentMethod } from '@/order/domain/entities/payment-method.enum';

/**
 * ProcessPaymentRequestDto
 *
 * POST /payments 요청 DTO
 */
export class ProcessPaymentRequestDto {
  @ApiProperty({ description: '주문 ID', example: 'order-1' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: '결제 수단', enum: PaymentMethod, example: PaymentMethod.CREDIT_CARD })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
