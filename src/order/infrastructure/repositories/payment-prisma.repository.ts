import { Injectable } from '@nestjs/common';
import { PaymentRepository } from '@/order/domain/repositories/payment.repository';
import {
  Payment,
  PaymentData,
} from '@/order/domain/entities/payment.entity';
import { PaymentMethod } from '@/order/domain/entities/payment-method.enum';
import { PaymentStatus } from '@/order/domain/entities/payment-status.enum';
import { PrismaService } from '@/common/infrastructure/prisma/prisma.service';

/**
 * PaymentPrismaRepository
 * Prisma를 사용한 Payment Repository 구현체
 *
 * 주요 기능:
 * - Payment 엔티티 CRUD
 * - orderId unique 제약조건 활용
 */
@Injectable()
export class PaymentPrismaRepository implements PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ID로 결제 조회
   * @param id - 결제 ID
   * @returns Payment 엔티티 또는 null
   */
  async findById(id: string): Promise<Payment | null> {
    const paymentModel = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!paymentModel) {
      return null;
    }

    return this.toDomain(paymentModel);
  }

  /**
   * 주문 ID로 결제 조회
   * @param orderId - 주문 ID
   * @returns Payment 엔티티 또는 null
   */
  async findByOrderId(orderId: string): Promise<Payment | null> {
    const paymentModel = await this.prisma.payment.findUnique({
      where: { orderId },
    });

    if (!paymentModel) {
      return null;
    }

    return this.toDomain(paymentModel);
  }

  /**
   * 결제 저장 (생성 또는 업데이트)
   * @param payment - Payment 도메인 엔티티
   * @returns 저장된 결제
   */
  async save(payment: Payment): Promise<Payment> {
    const paymentData = {
      orderId: payment.orderId,
      userId: payment.userId,
      amount: payment.amount,
      method: payment.paymentMethod,
      transactionId: payment.transactionId,
      status: payment.status,
      refundedAt: payment.refundedAt,
    };

    const savedPayment = await this.prisma.payment.upsert({
      where: { id: payment.id },
      update: paymentData,
      create: {
        id: payment.id,
        ...paymentData,
        createdAt: payment.createdAt,
      },
    });

    return this.toDomain(savedPayment);
  }

  /**
   * 결제 환불 처리
   * @param paymentId - 환불할 결제 ID
   * @throws {Error} 결제를 찾을 수 없거나 이미 환불된 경우
   */
  async refund(paymentId: string): Promise<void> {
    // 결제 조회
    const payment = await this.findById(paymentId);

    if (!payment) {
      throw new Error('결제를 찾을 수 없습니다.');
    }

    // 환불 처리 (도메인 로직 활용)
    payment.refund();

    // 변경사항 저장
    await this.save(payment);
  }

  /**
   * Prisma Payment 모델을 Domain Payment 엔티티로 변환
   * @param prismaPayment - Prisma Payment 모델
   * @returns Payment 도메인 엔티티
   */
  private toDomain(prismaPayment: any): Payment {
    const paymentData: PaymentData = {
      id: prismaPayment.id,
      orderId: prismaPayment.orderId,
      userId: prismaPayment.userId,
      amount: Number(prismaPayment.amount),
      paymentMethod: prismaPayment.method as PaymentMethod,
      transactionId: prismaPayment.transactionId,
      status: prismaPayment.status as PaymentStatus,
      createdAt: prismaPayment.createdAt,
      refundedAt: prismaPayment.refundedAt,
    };

    return Payment.reconstitute(paymentData);
  }
}
