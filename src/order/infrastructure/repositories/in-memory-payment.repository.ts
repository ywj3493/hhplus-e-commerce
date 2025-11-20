import { Injectable } from '@nestjs/common';
import { Payment, PaymentData } from '@/order/domain/entities/payment.entity';
import { PaymentRepository } from '@/order/domain/repositories/payment.repository';

/**
 * In-Memory Payment Repository
 *
 * 테스트용 in-memory 구현
 */
@Injectable()
export class InMemoryPaymentRepository implements PaymentRepository {
  private payments: Map<string, Payment> = new Map();

  /**
   * ID로 Payment 조회
   */
  async findById(id: string): Promise<Payment | null> {
    const payment = this.payments.get(id);
    return payment ? this.deepCopy(payment) : null;
  }

  /**
   * 주문 ID로 Payment 조회
   */
  async findByOrderId(orderId: string): Promise<Payment | null> {
    const payment = Array.from(this.payments.values()).find(
      (p) => p.orderId === orderId,
    );
    return payment ? this.deepCopy(payment) : null;
  }

  /**
   * Payment 저장
   */
  async save(payment: Payment): Promise<Payment> {
    this.payments.set(payment.id, this.deepCopy(payment));
    return this.deepCopy(payment);
  }

  /**
   * Deep Copy (불변성 보장)
   */
  private deepCopy(payment: Payment): Payment {
    return Payment.reconstitute({
      id: payment.id,
      orderId: payment.orderId,
      userId: payment.userId,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
      createdAt: new Date(payment.createdAt.getTime()),
    });
  }

  // ===== Test Helpers =====

  /**
   * 전체 데이터 삭제 (테스트용)
   */
  clear(): void {
    this.payments.clear();
  }

  /**
   * 테스트 데이터 시딩 (테스트용)
   */
  seed(payments: Payment[]): void {
    payments.forEach((payment) => {
      this.payments.set(payment.id, this.deepCopy(payment));
    });
  }

  /**
   * 전체 데이터 조회 (테스트용)
   */
  findAll(): Payment[] {
    return Array.from(this.payments.values()).map((p) => this.deepCopy(p));
  }
}
