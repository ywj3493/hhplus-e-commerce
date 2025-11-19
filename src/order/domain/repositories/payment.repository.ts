import { Payment } from '../entities/payment.entity';

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
}
