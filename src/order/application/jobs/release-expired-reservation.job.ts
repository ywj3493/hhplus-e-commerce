import { Injectable, Inject } from '@nestjs/common';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { StockReservationService } from '../../domain/services/stock-reservation.service';
import { ORDER_REPOSITORY } from '../use-cases/create-order.use-case';

/**
 * ReleaseExpiredReservationJob
 * 만료된 주문의 재고 예약 해제 배치 작업
 *
 * BR-ORDER-13: 주문 생성 후 10분 경과 시 자동 취소
 * BR-ORDER-14: 예약된 재고를 구매 가능 재고로 복원 (reserved → available)
 * BR-ORDER-15: 1분마다 실행하여 실시간성 보장
 * BR-ORDER-16: 각 주문별로 재고 해제와 주문 취소를 원자적으로 처리
 *
 * 주의: In-memory 구현에서는 트랜잭션이 없으므로 순차 처리로 시뮬레이션
 */
@Injectable()
export class ReleaseExpiredReservationJob {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    private readonly stockReservationService: StockReservationService,
  ) {}

  /**
   * 만료된 주문 처리 실행
   * BR-ORDER-15: 1분마다 실행 (스케줄러에서 호출)
   */
  async execute(): Promise<void> {
    const startTime = Date.now();
    console.log('[ReleaseExpiredReservationJob] Starting...');

    try {
      // 1. 만료된 PENDING 주문 조회
      const expiredOrders =
        await this.orderRepository.findExpiredPendingOrders();

      if (expiredOrders.length === 0) {
        console.log('[ReleaseExpiredReservationJob] No expired orders found.');
        return;
      }

      console.log(
        `[ReleaseExpiredReservationJob] Found ${expiredOrders.length} expired orders.`,
      );

      let successCount = 0;
      let failureCount = 0;

      // 2. BR-ORDER-16: 각 주문별로 재고 해제 및 취소 처리
      for (const order of expiredOrders) {
        try {
          // 재고 해제
          await this.stockReservationService.releaseReservedStock(order.items);

          // 주문 취소
          order.cancel();

          // 주문 저장
          await this.orderRepository.save(order);

          successCount++;
          console.log(
            `[ReleaseExpiredReservationJob] Order ${order.id} canceled and stock released.`,
          );
        } catch (error) {
          failureCount++;
          console.error(
            `[ReleaseExpiredReservationJob] Failed to process order ${order.id}:`,
            error,
          );
        }
      }

      const elapsedTime = Date.now() - startTime;
      console.log(
        `[ReleaseExpiredReservationJob] Completed in ${elapsedTime}ms. Success: ${successCount}, Failure: ${failureCount}`,
      );
    } catch (error) {
      console.error('[ReleaseExpiredReservationJob] Error:', error);
      throw error;
    }
  }
}
