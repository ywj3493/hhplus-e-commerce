import { Inject, Injectable, Logger } from '@nestjs/common';
import { ProcessPaymentUseCase } from '@/order/application/use-cases/process-payment.use-case';
import { ConfirmStockUseCase } from '@/order/application/use-cases/confirm-stock.use-case';
import { CompleteOrderUseCase } from '@/order/application/use-cases/complete-order.use-case';
import {
  ProcessPaymentInput,
  ProcessPaymentOutput,
} from '@/order/application/dtos/process-payment.dto';
import type { OrderRepository } from '@/order/domain/repositories/order.repository';
import type { PaymentRepository } from '@/order/domain/repositories/payment.repository';
import { ORDER_REPOSITORY } from '@/order/domain/repositories/tokens';
import { PAYMENT_REPOSITORY } from '@/order/domain/repositories/payment.repository';
import { StockManagementService } from '@/product/domain/services/stock-management.service';
import type { OrderItem } from '@/order/domain/entities/order-item.entity';

/**
 * OrderFacade
 *
 * 주문 관련 복합 프로세스를 조율하는 Facade 서비스
 *
 * 책임:
 * 1. 결제 처리 (ProcessPaymentUseCase)
 * 2. 재고 확정 (ConfirmStockUseCase)
 * 3. 주문 완료 (CompleteOrderUseCase)
 * 4. 보상 트랜잭션 처리 (실패 시 롤백)
 *
 * 보상 트랜잭션 전략:
 * - Step 1 (결제) 실패 → 보상 불필요 (아무것도 수행되지 않음)
 * - Step 2 (재고 확정) 실패 → 결제 환불
 * - Step 3 (주문 완료) 실패 → 재고 해제 + 결제 환불
 */
@Injectable()
export class OrderFacade {
  private readonly logger = new Logger(OrderFacade.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: PaymentRepository,
    private readonly processPaymentUseCase: ProcessPaymentUseCase,
    private readonly confirmStockUseCase: ConfirmStockUseCase,
    private readonly completeOrderUseCase: CompleteOrderUseCase,
    private readonly stockManagementService: StockManagementService,
  ) {}

  /**
   * 주문 결제 및 완료 처리 (보상 트랜잭션 적용)
   *
   * 순서:
   * 1. 결제 처리
   * 2. 재고 확정 (reserved → sold)
   * 3. 주문 완료 (PENDING → COMPLETED)
   *
   * 보상 트랜잭션:
   * - 각 단계 실패 시 이전 단계 롤백 수행
   * - 보상 실패 시 로깅 후 원본 에러 전파
   *
   * @param input 결제 입력 데이터
   * @param testFail 테스트용 강제 실패 플래그
   * @returns 결제 결과
   * @throws 각 단계 실패 시 해당 에러 (보상 후)
   */
  async completeOrder(
    input: ProcessPaymentInput,
    testFail = false,
  ): Promise<ProcessPaymentOutput> {
    this.logger.log(`주문 완료 프로세스 시작: orderId=${input.orderId}`);

    let paymentId: string | undefined;
    let orderItems: OrderItem[] | undefined;
    let stockConfirmed = false;

    try {
      // Step 1: 결제 처리 (Critical Point)
      const payment = await this.processPaymentUseCase.execute(
        input,
        testFail,
      );
      paymentId = payment.paymentId;
      this.logger.log(
        `결제 완료: paymentId=${paymentId}, orderId=${input.orderId}`,
      );

      // Step 2: Order 조회 (재고 확정에 필요한 OrderItem 정보)
      const order = await this.orderRepository.findById(input.orderId);
      if (!order) {
        throw new Error(`주문을 찾을 수 없습니다: ${input.orderId}`);
      }
      orderItems = order.items;

      // Step 3: 재고 확정 (reserved → sold)
      await this.confirmStockUseCase.execute(orderItems);
      stockConfirmed = true;
      this.logger.log(`재고 확정 완료: orderId=${input.orderId}`);

      // Step 4: 주문 완료 (PENDING → COMPLETED)
      await this.completeOrderUseCase.execute(input.orderId);
      this.logger.log(`주문 완료 처리: orderId=${input.orderId}`);

      return payment;
    } catch (error) {
      // 보상 트랜잭션 시작
      this.logger.error(
        `주문 완료 프로세스 실패, 보상 트랜잭션 시작: orderId=${input.orderId}`,
        error,
      );

      await this.compensate(paymentId, orderItems, stockConfirmed);

      // 원본 에러 재전파
      throw error;
    }
  }

  /**
   * 보상 트랜잭션 실행
   * 역순으로 실행: 재고 해제 → 결제 환불
   *
   * @param paymentId 환불할 결제 ID
   * @param orderItems 재고 해제할 주문 항목들
   * @param stockConfirmed 재고 확정 여부
   */
  private async compensate(
    paymentId: string | undefined,
    orderItems: OrderItem[] | undefined,
    stockConfirmed: boolean,
  ): Promise<void> {
    const compensations: string[] = [];

    try {
      // 보상 1: 재고 해제 (재고 확정이 완료된 경우)
      if (stockConfirmed && orderItems) {
        this.logger.warn(`보상 트랜잭션: 재고 해제 시작`);
        await this.releaseStockForItems(orderItems);
        compensations.push('재고 해제');
        this.logger.log(`보상 트랜잭션: 재고 해제 완료`);
      }

      // 보상 2: 결제 환불 (결제가 완료된 경우)
      if (paymentId) {
        this.logger.warn(`보상 트랜잭션: 결제 환불 시작 - paymentId=${paymentId}`);
        await this.paymentRepository.refund(paymentId);
        compensations.push('결제 환불');
        this.logger.log(`보상 트랜잭션: 결제 환불 완료 - paymentId=${paymentId}`);
      }

      if (compensations.length > 0) {
        this.logger.log(
          `보상 트랜잭션 완료: [${compensations.join(', ')}]`,
        );
      }
    } catch (compensationError) {
      // 보상 트랜잭션 실패는 심각한 문제
      this.logger.error(
        `❌ 보상 트랜잭션 실패 - 수동 개입 필요!`,
        {
          paymentId,
          orderItemsCount: orderItems?.length,
          stockConfirmed,
          completedCompensations: compensations,
          error: compensationError,
        },
      );
      // 보상 실패 시에도 원본 에러를 전파하기 위해 여기서는 throw하지 않음
    }
  }

  /**
   * 주문 항목들의 재고 해제
   * @param orderItems 주문 항목 배열
   */
  private async releaseStockForItems(orderItems: OrderItem[]): Promise<void> {
    for (const item of orderItems) {
      try {
        await this.stockManagementService.releaseStock(
          item.productId,
          item.productOptionId!,
          item.quantity,
        );
      } catch (error) {
        // 개별 재고 해제 실패는 로깅만 하고 계속 진행
        this.logger.error(
          `재고 해제 실패: productId=${item.productId}, optionId=${item.productOptionId}`,
          error,
        );
      }
    }
  }
}
