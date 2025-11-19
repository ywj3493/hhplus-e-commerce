import { IsEnum, IsString } from 'class-validator';
import { PaymentMethod } from '../../domain/entities/payment-method.enum';

/**
 * ProcessPaymentRequestDto
 *
 * POST /payments 요청 DTO
 */
export class ProcessPaymentRequestDto {
  @IsString()
  orderId: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
