import { GetOrdersUseCase } from '@/order/application/use-cases/get-orders.use-case';
import { OrderRepository } from '@/order/domain/repositories/order.repository';
import { OrderFixtures } from '@/order/infrastructure/fixtures/order.fixtures';
import { GetOrdersInput } from '@/order/application/dtos/get-orders.dto';

describe('GetOrdersUseCase', () => {
  let useCase: GetOrdersUseCase;
  let orderRepository: jest.Mocked<OrderRepository>;

  beforeEach(() => {
    // Mock repository
    orderRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      countByUserId: jest.fn(),
      findExpiredPendingOrders: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<OrderRepository>;

    // Create use case
    useCase = new GetOrdersUseCase(orderRepository);
  });

  describe('실행', () => {
    it('사용자 ID로 주문 목록을 조회해야 함', async () => {
      // Given
      const orders = [
        OrderFixtures.createTestPendingOrder('user-1'),
        OrderFixtures.createTestCompletedOrder('user-1'),
      ];
      const input = new GetOrdersInput('user-1', 1, 10);

      orderRepository.findByUserId.mockResolvedValue(orders);
      orderRepository.countByUserId.mockResolvedValue(2);

      // When
      const result = await useCase.execute(input);

      // Then
      expect(orderRepository.findByUserId).toHaveBeenCalledWith('user-1', {
        page: 1,
        limit: 10,
      });
      expect(orderRepository.countByUserId).toHaveBeenCalledWith('user-1');
      expect(result.orders).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(2);
    });

    it('BR-ORDER-10: 기본 페이지 크기는 10이어야 함', async () => {
      // Given
      const orders = [OrderFixtures.createTestPendingOrder('user-1')];
      const input = new GetOrdersInput('user-1'); // page, limit 생략

      orderRepository.findByUserId.mockResolvedValue(orders);
      orderRepository.countByUserId.mockResolvedValue(1);

      // When
      const result = await useCase.execute(input);

      // Then
      expect(result.pagination.limit).toBe(10); // 기본값
    });

    it('페이지네이션이 적용되어야 함', async () => {
      // Given
      const orders = [
        OrderFixtures.createTestPendingOrder('user-1'),
        OrderFixtures.createTestPendingOrder('user-1'),
      ];
      const input = new GetOrdersInput('user-1', 2, 5); // 2페이지, 5개씩

      orderRepository.findByUserId.mockResolvedValue(orders);
      orderRepository.countByUserId.mockResolvedValue(12); // 총 12개

      // When
      const result = await useCase.execute(input);

      // Then
      expect(orderRepository.findByUserId).toHaveBeenCalledWith('user-1', {
        page: 2,
        limit: 5,
      });
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(5);
      expect(result.pagination.total).toBe(12);
    });

    it('BR-ORDER-11: 페이지 크기가 100을 초과하면 예외를 던져야 함', () => {
      // When & Then
      expect(() => new GetOrdersInput('user-1', 1, 101)).toThrow(
        '페이지 크기는 최대 100까지 가능합니다.',
      );
    });

    it('주문이 없는 경우 빈 배열을 반환해야 함', async () => {
      // Given
      const input = new GetOrdersInput('user-1', 1, 10);

      orderRepository.findByUserId.mockResolvedValue([]);
      orderRepository.countByUserId.mockResolvedValue(0);

      // When
      const result = await useCase.execute(input);

      // Then
      expect(result.orders).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });
});
