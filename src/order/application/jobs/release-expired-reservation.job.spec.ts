import { ReleaseExpiredReservationJob } from '@/order/application/jobs/release-expired-reservation.job';
import { OrderRepository } from '@/order/domain/repositories/order.repository';
import { ReleaseStockUseCase } from '@/product/application/use-cases/release-stock.use-case';
import { OrderFixtures } from '@/order/infrastructure/fixtures/order.fixtures';
import { OrderStatus } from '@/order/domain/entities/order-status.enum';

describe('ReleaseExpiredReservationJob', () => {
  let job: ReleaseExpiredReservationJob;
  let orderRepository: jest.Mocked<OrderRepository>;
  let releaseStockUseCase: jest.Mocked<ReleaseStockUseCase>;

  beforeEach(() => {
    // Mock repository
    orderRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      countByUserId: jest.fn(),
      findExpiredPendingOrders: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<OrderRepository>;

    // Mock use case
    releaseStockUseCase = {
      execute: jest.fn(),
    } as any;

    // Create job
    job = new ReleaseExpiredReservationJob(
      orderRepository,
      releaseStockUseCase,
    );
  });

  describe('실행', () => {
    it('BR-ORDER-13: 만료된 PENDING 주문을 취소하고 재고를 해제해야 함', async () => {
      // Given
      const expiredOrder = OrderFixtures.createTestExpiredOrder('user-1');
      orderRepository.findExpiredPendingOrders.mockResolvedValue([
        expiredOrder,
      ]);

      // When
      await job.execute();

      // Then
      expect(orderRepository.findExpiredPendingOrders).toHaveBeenCalled();
      expect(releaseStockUseCase.execute).toHaveBeenCalledWith(
        'product-1',
        'option-1',
        1,
      );
      expect(orderRepository.save).toHaveBeenCalled();

      // 저장된 주문이 취소 상태인지 확인
      const savedOrder = orderRepository.save.mock.calls[0][0];
      expect(savedOrder.status).toBe(OrderStatus.CANCELED);
    });

    it('여러 만료된 주문을 처리해야 함', async () => {
      // Given
      const expiredOrders = [
        OrderFixtures.createTestExpiredOrder('user-1'),
        OrderFixtures.createTestExpiredOrder('user-2'),
        OrderFixtures.createTestExpiredOrder('user-3'),
      ];
      orderRepository.findExpiredPendingOrders.mockResolvedValue(
        expiredOrders,
      );

      // When
      await job.execute();

      // Then
      expect(releaseStockUseCase.execute).toHaveBeenCalledTimes(
        3,
      );
      expect(orderRepository.save).toHaveBeenCalledTimes(3);
    });

    it('만료된 주문이 없으면 아무 작업도 하지 않아야 함', async () => {
      // Given
      orderRepository.findExpiredPendingOrders.mockResolvedValue([]);

      // When
      await job.execute();

      // Then
      expect(releaseStockUseCase.execute).not.toHaveBeenCalled();
      expect(orderRepository.save).not.toHaveBeenCalled();
    });

    it('BR-ORDER-16: 개별 주문 처리 실패 시 다른 주문은 계속 처리해야 함', async () => {
      // Given
      const expiredOrders = [
        OrderFixtures.createTestExpiredOrder('user-1'),
        OrderFixtures.createTestExpiredOrder('user-2'),
        OrderFixtures.createTestExpiredOrder('user-3'),
      ];
      orderRepository.findExpiredPendingOrders.mockResolvedValue(
        expiredOrders,
      );

      // 두 번째 주문 처리 시 오류 발생
      releaseStockUseCase.execute
        .mockResolvedValueOnce(undefined) // 첫 번째 성공
        .mockRejectedValueOnce(new Error('Stock release failed')) // 두 번째 실패
        .mockResolvedValueOnce(undefined); // 세 번째 성공

      // When
      await job.execute();

      // Then
      expect(releaseStockUseCase.execute).toHaveBeenCalledTimes(
        3,
      );
      // 실패한 주문 제외하고 2개만 저장
      expect(orderRepository.save).toHaveBeenCalledTimes(2);
    });

    it('로그를 출력해야 함', async () => {
      // Given
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const expiredOrder = OrderFixtures.createTestExpiredOrder('user-1');
      orderRepository.findExpiredPendingOrders.mockResolvedValue([
        expiredOrder,
      ]);

      // When
      await job.execute();

      // Then
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
