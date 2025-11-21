import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsUUID } from 'class-validator';
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

  @ApiProperty({
    description: '멱등성 키 (중복 결제 방지용, UUID v4 형식)',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsString()
  @IsUUID('4')
  idempotencyKey: string;
}
