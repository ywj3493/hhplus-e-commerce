import { Inject, Injectable, Logger } from '@nestjs/common';
import { ProcessPaymentUseCase } from '@/order/application/use-cases/process-payment.use-case';
import { ConfirmStockUseCase } from '@/order/application/use-cases/confirm-stock.use-case';
import { CompleteOrderUseCase } from '@/order/application/use-cases/complete-order.use-case';
import {
  ProcessPaymentInput,
  ProcessPaymentOutput,
} from '@/order/application/dtos/process-payment.dto';
import type { OrderRepository } from '@/order/domain/repositories/order.repository';
import { ORDER_REPOSITORY } from '@/order/domain/repositories/tokens';

/**
 * OrderFacade
 *
 * 주문 관련 복합 프로세스를 조율하는 Facade 서비스
 *
 * 책임:
 * 1. 결제 처리 (ProcessPaymentUseCase)
 * 2. 재고 확정 (ConfirmStockUseCase)
 * 3. 주문 완료 (CompleteOrderUseCase)
 *
 * Note: Saga Pattern 준비
 * - 각 UseCase를 순차적으로 호출
 * - 현재는 단순 순차 호출
 * - 향후 보상 트랜잭션 추가 시 이 레이어에서 처리
 *
 * 미래 확장 예시:
 * - try-catch로 각 단계 실패 시 이전 단계 롤백
 * - 재시도 로직 추가
 * - 분산 트랜잭션 관리
 */
@Injectable()
export class OrderFacade {
  private readonly logger = new Logger(OrderFacade.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    private readonly processPaymentUseCase: ProcessPaymentUseCase,
    private readonly confirmStockUseCase: ConfirmStockUseCase,
    private readonly completeOrderUseCase: CompleteOrderUseCase,
  ) {}

  /**
   * 주문 결제 및 완료 처리
   *
   * 순서:
   * 1. 결제 처리
   * 2. 재고 확정 (reserved → sold)
   * 3. 주문 완료 (PENDING → COMPLETED)
   *
   * @param input 결제 입력 데이터
   * @param testFail 테스트용 강제 실패 플래그
   * @returns 결제 결과
   */
  async completeOrder(
    input: ProcessPaymentInput,
    testFail = false,
  ): Promise<ProcessPaymentOutput> {
    this.logger.log(`주문 완료 프로세스 시작: orderId=${input.orderId}`);

    // Step 1: 결제 처리
    const payment = await this.processPaymentUseCase.execute(input, testFail);
    this.logger.log(
      `결제 완료: paymentId=${payment.paymentId}, orderId=${input.orderId}`,
    );

    // Step 2: Order 조회 (재고 확정에 필요한 OrderItem 정보)
    const order = await this.orderRepository.findById(input.orderId);
    if (!order) {
      throw new Error(`주문을 찾을 수 없습니다: ${input.orderId}`);
    }

    // Step 3: 재고 확정 (reserved → sold)
    await this.confirmStockUseCase.execute(order.items);
    this.logger.log(`재고 확정 완료: orderId=${input.orderId}`);

    // Step 4: 주문 완료 (PENDING → COMPLETED)
    await this.completeOrderUseCase.execute(input.orderId);
    this.logger.log(`주문 완료 처리: orderId=${input.orderId}`);

    return payment;
  }
}
