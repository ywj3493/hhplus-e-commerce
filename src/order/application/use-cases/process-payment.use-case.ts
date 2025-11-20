import { Inject, Injectable } from '@nestjs/common';
import { Payment } from '@/order/domain/entities/payment.entity';
import {
  InvalidOrderStatusException,
  OrderExpiredException,
  PaymentFailedException,
} from '@/order/domain/order.exceptions';
import type { PaymentRepository } from '@/order/domain/repositories/payment.repository';
import {
  PaymentAdapter,
  PAYMENT_ADAPTER,
} from '@/order/domain/ports/payment.port';
import {
  ProcessPaymentInput,
  ProcessPaymentOutput,
} from '@/order/application/dtos/process-payment.dto';
import { OrderStatus } from '@/order/domain/entities/order-status.enum';
import type { OrderRepository } from '@/order/domain/repositories/order.repository';
import { ORDER_REPOSITORY, PAYMENT_REPOSITORY } from '@/order/domain/repositories/tokens';

/**
 * ProcessPaymentUseCase
 *
 * 결제 처리 유스케이스
 *
 * 책임:
 * 1. 주문 조회 및 검증 (소유권, 상태, 만료)
 * 2. 기존 결제 여부 확인
 * 3. 외부 결제 API 호출
 * 4. Payment 엔티티 생성 및 저장
 *
 * Note: Facade Pattern
 * - 결제 처리만 담당 (단일 책임)
 * - 재고 확정 및 주문 완료는 PaymentFacadeService에서 처리
 * - 보상 트랜잭션 구현 대비 UseCase 분리
 */
@Injectable()
export class ProcessPaymentUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: PaymentRepository,
    @Inject(PAYMENT_ADAPTER)
    private readonly paymentAdapter: PaymentAdapter,
  ) {}

  async execute(
    input: ProcessPaymentInput,
    testFail = false, // 테스트용 강제 실패 플래그
  ): Promise<ProcessPaymentOutput> {
    // 1. 멱등성 체크: 기존 결제 조회 (idempotencyKey 기반)
    const existingPayment = await this.paymentRepository.findByIdempotencyKey(
      input.idempotencyKey,
    );

    if (existingPayment) {
      // 이미 처리된 요청 → 기존 결과 반환 (멱등성 보장)
      return ProcessPaymentOutput.from(existingPayment);
    }

    // 2. 주문 조회
    const order = await this.orderRepository.findById(input.orderId);
    if (!order) {
      throw new Error('주문을 찾을 수 없습니다.');
    }

    // 3. 소유권 검증 (BR-PAYMENT-01)
    if (order.userId !== input.userId) {
      throw new Error('권한이 없습니다.');
    }

    // 4. 주문 상태 검증 (BR-PAYMENT-02)
    if (order.status !== OrderStatus.PENDING) {
      throw new InvalidOrderStatusException(
        '대기 중인 주문만 결제할 수 있습니다.',
      );
    }

    // 5. 예약 만료 검증 (BR-PAYMENT-03)
    if (order.isExpired()) {
      throw new OrderExpiredException('주문 예약 시간이 만료되었습니다.');
    }

    // 6. 결제 Adapter 호출
    const paymentResponse = await this.paymentAdapter.processPayment(
      {
        orderId: order.id,
        userId: order.userId,
        amount: order.finalAmount,
        paymentMethod: input.paymentMethod,
      },
      testFail,
    );

    if (!paymentResponse.success) {
      throw new PaymentFailedException(
        paymentResponse.errorMessage || '결제 처리에 실패했습니다.',
      );
    }

    // 7. Payment 엔티티 생성
    const payment = Payment.create({
      orderId: order.id,
      userId: order.userId,
      amount: order.finalAmount,
      paymentMethod: input.paymentMethod,
      transactionId: paymentResponse.transactionId!,
      idempotencyKey: input.idempotencyKey,
    });

    // 8. Payment 저장
    const savedPayment = await this.paymentRepository.save(payment);

    // 9. Output DTO 반환
    // Note: 재고 확정 및 주문 완료는 PaymentFacadeService에서 처리
    return ProcessPaymentOutput.from(savedPayment);
  }
}
