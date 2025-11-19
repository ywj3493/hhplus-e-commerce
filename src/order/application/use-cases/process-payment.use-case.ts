import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Payment } from '../../domain/entities/payment.entity';
import {
  AlreadyPaidException,
  InvalidOrderStatusException,
  OrderExpiredException,
  PaymentFailedException,
} from '../../domain/order.exceptions';
import {
  PaymentRepository,
  PAYMENT_REPOSITORY,
} from '../../domain/repositories/payment.repository';
import { PaymentCompletedEvent } from '../../domain/events/payment-completed.event';
import {
  IPaymentApiClient,
  PAYMENT_API_CLIENT,
} from '../../infrastructure/clients/payment-api.interface';
import {
  ProcessPaymentInput,
  ProcessPaymentOutput,
} from '../dtos/process-payment.dto';
import { Order } from '../../domain/entities/order.entity';
import { OrderStatus } from '../../domain/entities/order-status.enum';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { ORDER_REPOSITORY } from './create-order.use-case';

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
 * 5. Order 상태 COMPLETED로 변경
 * 6. PaymentCompletedEvent 발행
 */
@Injectable()
export class ProcessPaymentUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: PaymentRepository,
    @Inject(PAYMENT_API_CLIENT)
    private readonly paymentApiClient: IPaymentApiClient,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    input: ProcessPaymentInput,
    testFail = false, // 테스트용 강제 실패 플래그
  ): Promise<ProcessPaymentOutput> {
    // 1. 주문 조회
    const order = await this.orderRepository.findById(input.orderId);
    if (!order) {
      throw new Error('주문을 찾을 수 없습니다.');
    }

    // 2. 소유권 검증 (BR-PAYMENT-01)
    if (order.userId !== input.userId) {
      throw new Error('권한이 없습니다.');
    }

    // 3. 주문 상태 검증 (BR-PAYMENT-02)
    if (order.status !== OrderStatus.PENDING) {
      throw new InvalidOrderStatusException(
        '대기 중인 주문만 결제할 수 있습니다.',
      );
    }

    // 4. 예약 만료 검증 (BR-PAYMENT-03)
    if (order.isExpired()) {
      throw new OrderExpiredException('주문 예약 시간이 만료되었습니다.');
    }

    // 5. 기존 결제 여부 확인
    const existingPayment = await this.paymentRepository.findByOrderId(
      input.orderId,
    );
    if (existingPayment) {
      throw new AlreadyPaidException('이미 결제 완료된 주문입니다.');
    }

    // 6. 외부 결제 API 호출
    const paymentResponse = await this.paymentApiClient.requestPayment(
      {
        orderId: order.id,
        userId: order.userId,
        amount: order.finalAmount,
        paymentMethod: input.paymentMethod,
      },
      testFail, // 테스트 플래그 전달
    );

    if (!paymentResponse.success) {
      throw new PaymentFailedException(
        paymentResponse.message || '결제 처리에 실패했습니다.',
      );
    }

    // 7. Payment 엔티티 생성
    const payment = Payment.create({
      orderId: order.id,
      userId: order.userId,
      amount: order.finalAmount,
      paymentMethod: input.paymentMethod,
      transactionId: paymentResponse.transactionId!,
    });

    // 8. Payment 저장
    const savedPayment = await this.paymentRepository.save(payment);

    // 9. Order 상태 변경 (COMPLETED)
    order.complete();
    await this.orderRepository.save(order);

    // 10. PaymentCompletedEvent 발행 (재고 확정용)
    this.eventEmitter.emit(
      'payment.completed',
      new PaymentCompletedEvent(savedPayment.id, order.id),
    );

    // 11. Output DTO 반환
    return ProcessPaymentOutput.from(savedPayment);
  }
}
