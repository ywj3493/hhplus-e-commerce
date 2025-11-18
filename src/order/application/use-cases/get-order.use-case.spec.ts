import { GetOrderUseCase } from './get-order.use-case';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { OrderFixtures } from '../../infrastructure/fixtures/order.fixtures';
import {
  OrderNotFoundException,
  OrderOwnershipException,
} from '../../domain/order.exceptions';
import { GetOrderInput } from '../dtos/get-order.dto';

describe('GetOrderUseCase', () => {
  let useCase: GetOrderUseCase;
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
    useCase = new GetOrderUseCase(orderRepository);
  });

  describe('실행', () => {
    it('유효한 주문 ID와 사용자 ID로 주문을 조회해야 함', async () => {
      // Given
      const order = OrderFixtures.createTestPendingOrder('user-1');
      const input = new GetOrderInput(order.id, 'user-1');

      orderRepository.findById.mockResolvedValue(order);

      // When
      const result = await useCase.execute(input);

      // Then
      expect(orderRepository.findById).toHaveBeenCalledWith(order.id);
      expect(result.orderId).toBe(order.id);
      expect(result.status).toBe(order.status);
      expect(result.totalAmount).toBe(order.totalAmount);
      expect(result.items).toBeDefined();
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('존재하지 않는 주문 ID는 OrderNotFoundException을 던져야 함', async () => {
      // Given
      const input = new GetOrderInput('non-existent-order', 'user-1');
      orderRepository.findById.mockResolvedValue(null);

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        OrderNotFoundException,
      );
    });

    it('BR-ORDER-06: 다른 사용자의 주문 조회 시 OrderOwnershipException을 던져야 함', async () => {
      // Given
      const order = OrderFixtures.createTestPendingOrder('user-1');
      const input = new GetOrderInput(order.id, 'user-2'); // 다른 사용자

      orderRepository.findById.mockResolvedValue(order);

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        OrderOwnershipException,
      );
    });

    it('BR-ORDER-07: 주문 시점의 상품 정보(스냅샷)를 반환해야 함', async () => {
      // Given
      const order = OrderFixtures.createTestPendingOrder('user-1');
      const input = new GetOrderInput(order.id, 'user-1');

      orderRepository.findById.mockResolvedValue(order);

      // When
      const result = await useCase.execute(input);

      // Then
      const firstItem = result.items[0];
      expect(firstItem.productName).toBe('테스트 상품'); // Snapshot
      expect(firstItem.productOptionName).toBeDefined(); // Snapshot
      expect(firstItem.price).toBeDefined(); // Snapshot
    });
  });
});
