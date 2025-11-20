import { InMemoryOrderRepository } from '@/order/infrastructure/repositories/in-memory-order.repository';
import { OrderFixtures } from '@/order/infrastructure/fixtures/order.fixtures';
import { OrderStatus } from '@/order/domain/entities/order-status.enum';

describe('InMemoryOrderRepository', () => {
  let repository: InMemoryOrderRepository;

  beforeEach(() => {
    repository = new InMemoryOrderRepository();
  });

  afterEach(() => {
    repository.clear();
  });

  describe('주문 저장 및 조회', () => {
    it('주문을 저장하고 ID로 조회해야 함', async () => {
      // Given
      const order = OrderFixtures.createTestPendingOrder('user-1');

      // When
      const savedOrder = await repository.save(order);
      const foundOrder = await repository.findById(order.id);

      // Then
      expect(savedOrder).toBeDefined();
      expect(foundOrder).toBeDefined();
      expect(foundOrder?.id).toBe(order.id);
      expect(foundOrder?.userId).toBe('user-1');
      expect(foundOrder?.status).toBe(OrderStatus.PENDING);
    });

    it('존재하지 않는 주문 조회 시 null을 반환해야 함', async () => {
      // When
      const foundOrder = await repository.findById('non-existent-id');

      // Then
      expect(foundOrder).toBeNull();
    });

    it('주문 업데이트 시 기존 데이터를 덮어써야 함', async () => {
      // Given
      const order = OrderFixtures.createTestPendingOrder('user-1');
      await repository.save(order);

      // 주문 완료 처리
      order.complete();

      // When
      await repository.save(order);
      const foundOrder = await repository.findById(order.id);

      // Then
      expect(foundOrder?.status).toBe(OrderStatus.COMPLETED);
      expect(foundOrder?.paidAt).toBeDefined();
    });
  });

  describe('사용자별 주문 조회', () => {
    it('사용자 ID로 주문 목록을 조회해야 함', async () => {
      // Given
      const user1Order1 = OrderFixtures.createTestPendingOrder('user-1');
      const user1Order2 = OrderFixtures.createTestOrderWithCoupon('user-1');
      const user2Order = OrderFixtures.createTestPendingOrder('user-2');

      await repository.save(user1Order1);
      await repository.save(user1Order2);
      await repository.save(user2Order);

      // When
      const user1Orders = await repository.findByUserId('user-1', {
        page: 1,
        limit: 10,
      });

      // Then
      expect(user1Orders).toHaveLength(2);
      expect(user1Orders.every((order) => order.userId === 'user-1')).toBe(
        true,
      );
    });

    it('BR-ORDER-09: 최신 주문부터 표시해야 함 (created_at DESC)', async () => {
      // Given
      const oldOrder = OrderFixtures.createTestCompletedOrder('user-1');
      const newOrder = OrderFixtures.createTestPendingOrder('user-1');

      // 순서대로 저장 (오래된 것부터)
      await repository.save(oldOrder);
      await new Promise((resolve) => setTimeout(resolve, 10)); // 시간 차이 보장
      await repository.save(newOrder);

      // When
      const orders = await repository.findByUserId('user-1', {
        page: 1,
        limit: 10,
      });

      // Then
      expect(orders).toHaveLength(2);
      expect(orders[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        orders[1].createdAt.getTime(),
      );
    });

    it('페이지네이션이 적용되어야 함', async () => {
      // Given
      for (let i = 0; i < 15; i++) {
        const order = OrderFixtures.createTestPendingOrder(`user-1`);
        await repository.save(order);
      }

      // When - Page 1 (limit: 10)
      const page1Orders = await repository.findByUserId('user-1', {
        page: 1,
        limit: 10,
      });

      // When - Page 2 (limit: 10)
      const page2Orders = await repository.findByUserId('user-1', {
        page: 2,
        limit: 10,
      });

      // Then
      expect(page1Orders).toHaveLength(10);
      expect(page2Orders).toHaveLength(5);
    });

    it('사용자별 주문 개수를 조회해야 함', async () => {
      // Given
      for (let i = 0; i < 7; i++) {
        const order = OrderFixtures.createTestPendingOrder('user-1');
        await repository.save(order);
      }

      for (let i = 0; i < 3; i++) {
        const order = OrderFixtures.createTestPendingOrder('user-2');
        await repository.save(order);
      }

      // When
      const user1Count = await repository.countByUserId('user-1');
      const user2Count = await repository.countByUserId('user-2');

      // Then
      expect(user1Count).toBe(7);
      expect(user2Count).toBe(3);
    });
  });

  describe('만료된 주문 조회', () => {
    it('BR-ORDER-13: 만료된 PENDING 주문을 조회해야 함', async () => {
      // Given
      const expiredOrder = OrderFixtures.createTestExpiredOrder('user-1');
      const pendingOrder = OrderFixtures.createTestPendingOrder('user-2');
      const completedOrder = OrderFixtures.createTestCompletedOrder('user-3');

      await repository.save(expiredOrder);
      await repository.save(pendingOrder);
      await repository.save(completedOrder);

      // When
      const expiredOrders = await repository.findExpiredPendingOrders();

      // Then
      expect(expiredOrders).toHaveLength(1);
      expect(expiredOrders[0].id).toBe(expiredOrder.id);
      expect(expiredOrders[0].status).toBe(OrderStatus.PENDING);
      expect(expiredOrders[0].isExpired()).toBe(true);
    });

    it('만료되지 않은 PENDING 주문은 조회되지 않아야 함', async () => {
      // Given
      const pendingOrder = OrderFixtures.createTestPendingOrder('user-1');
      await repository.save(pendingOrder);

      // When
      const expiredOrders = await repository.findExpiredPendingOrders();

      // Then
      expect(expiredOrders).toHaveLength(0);
    });

    it('COMPLETED나 CANCELED 주문은 조회되지 않아야 함', async () => {
      // Given
      const completedOrder = OrderFixtures.createTestCompletedOrder('user-1');
      await repository.save(completedOrder);

      // When
      const expiredOrders = await repository.findExpiredPendingOrders();

      // Then
      expect(expiredOrders).toHaveLength(0);
    });
  });

  describe('불변성 보장', () => {
    it('저장된 주문을 수정해도 저장소의 데이터는 변경되지 않아야 함', async () => {
      // Given
      const order = OrderFixtures.createTestPendingOrder('user-1');
      await repository.save(order);

      // When - 조회한 주문을 수정
      const foundOrder = await repository.findById(order.id);
      foundOrder?.complete();

      // Then - 저장소의 원본은 여전히 PENDING
      const originalOrder = await repository.findById(order.id);
      expect(originalOrder?.status).toBe(OrderStatus.PENDING);
    });
  });

  describe('테스트 헬퍼', () => {
    it('clear()로 모든 데이터를 삭제해야 함', async () => {
      // Given
      await repository.save(OrderFixtures.createTestPendingOrder('user-1'));
      await repository.save(OrderFixtures.createTestPendingOrder('user-2'));

      // When
      repository.clear();

      // Then
      const user1Count = await repository.countByUserId('user-1');
      const user2Count = await repository.countByUserId('user-2');
      expect(user1Count).toBe(0);
      expect(user2Count).toBe(0);
    });

    it('seed()로 초기 데이터를 설정해야 함', async () => {
      // Given
      const orders = [
        OrderFixtures.createTestPendingOrder('user-1'),
        OrderFixtures.createTestPendingOrder('user-2'),
        OrderFixtures.createTestCompletedOrder('user-3'),
      ];

      // When
      repository.seed(orders);

      // Then
      const user1Orders = await repository.findByUserId('user-1', {
        page: 1,
        limit: 10,
      });
      const user2Orders = await repository.findByUserId('user-2', {
        page: 1,
        limit: 10,
      });
      const user3Orders = await repository.findByUserId('user-3', {
        page: 1,
        limit: 10,
      });

      expect(user1Orders).toHaveLength(1);
      expect(user2Orders).toHaveLength(1);
      expect(user3Orders).toHaveLength(1);
    });
  });
});
