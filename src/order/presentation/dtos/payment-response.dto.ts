import { PaymentMethod } from '../../domain/entities/payment-method.enum';
import { ProcessPaymentOutput } from '../../application/dtos/process-payment.dto';

/**
 * PaymentResponseDto
 *
 * POST /payments 응답 DTO
 */
export class PaymentResponseDto {
  paymentId: string;
  orderId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionId: string;
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
