import { Payment } from '@/order/domain/entities/payment.entity';

/**
 * PAYMENT_REPOSITORY Symbol Token
 */
export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');

/**
 * Payment Repository Interface
 *
 * Payment 엔티티의 영속성 관리를 위한 인터페이스
 */
export interface PaymentRepository {
  /**
   * ID로 Payment 조회
   */
  findById(id: string): Promise<Payment | null>;

  /**
   * 주문 ID로 Payment 조회
   */
  findByOrderId(orderId: string): Promise<Payment | null>;

  /**
   * Payment 저장
   */
  save(payment: Payment): Promise<Payment>;

  /**
   * Payment 환불 처리
   *
   * @param paymentId 환불할 결제 ID
   * @throws {Error} 결제를 찾을 수 없거나 이미 환불된 경우
   */
  refund(paymentId: string): Promise<void>;
}
