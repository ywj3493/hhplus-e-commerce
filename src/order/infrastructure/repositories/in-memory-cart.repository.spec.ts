import { InMemoryCartRepository } from '@/order/infrastructure/repositories/in-memory-cart.repository';
import { Cart } from '@/order/domain/entities/cart.entity';
import { Money } from '@/product/domain/entities/money.vo';

describe('InMemoryCartRepository', () => {
  let repository: InMemoryCartRepository;

  beforeEach(() => {
    repository = new InMemoryCartRepository();
  });

  describe('사용자별 조회', () => {
    it('존재하는 장바구니를 조회해야 함', async () => {
      // Given
      const cart = Cart.create('user-1');
      cart.addItem({
        productId: 'prod-1',
        productName: 'Product 1',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 2,
      });
      await repository.save(cart);

      // When
      const found = await repository.findByUserId('user-1');

      // Then
      expect(found).toBeDefined();
      expect(found?.userId).toBe('user-1');
      expect(found?.getItems()).toHaveLength(1);
    });

    it('존재하지 않는 장바구니 조회 시 null을 반환해야 함', async () => {
      // When
      const found = await repository.findByUserId('non-existent-user');

      // Then
      expect(found).toBeNull();
    });
  });

  describe('저장', () => {
    it('새 장바구니를 저장해야 함', async () => {
      // Given
      const cart = Cart.create('user-1');
      cart.addItem({
        productId: 'prod-1',
        productName: 'Product 1',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 2,
      });

      // When
      const saved = await repository.save(cart);

      // Then
      expect(saved.id).toBeDefined();
      expect(saved.userId).toBe('user-1');
      expect(saved.getItems()).toHaveLength(1);
    });

    it('기존 장바구니를 업데이트해야 함', async () => {
      // Given
      const cart = Cart.create('user-1');
      cart.addItem({
        productId: 'prod-1',
        productName: 'Product 1',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 2,
      });
      const saved = await repository.save(cart);

      // When
      saved.addItem({
        productId: 'prod-2',
        productName: 'Product 2',
        productOptionId: 'opt-2',
        price: Money.from(20000),
        quantity: 1,
      });
      const updated = await repository.save(saved);

      // Then
      expect(updated.id).toBe(saved.id);
      expect(updated.getItems()).toHaveLength(2);
    });

    it('저장 시 불변성을 유지해야 함 (deep copy)', async () => {
      // Given
      const cart = Cart.create('user-1');
      cart.addItem({
        productId: 'prod-1',
        productName: 'Product 1',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 2,
      });

      // When
      const saved = await repository.save(cart);
      saved.addItem({
        productId: 'prod-2',
        productName: 'Product 2',
        productOptionId: 'opt-2',
        price: Money.from(20000),
        quantity: 1,
      });

      // Then
      const found = await repository.findByUserId('user-1');
      expect(found?.getItems()).toHaveLength(1); // 원본은 변경되지 않아야 함
    });
  });

  describe('전체 삭제', () => {
    it('사용자의 장바구니를 삭제해야 함', async () => {
      // Given
      const cart = Cart.create('user-1');
      cart.addItem({
        productId: 'prod-1',
        productName: 'Product 1',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 2,
      });
      await repository.save(cart);

      // When
      await repository.clearByUserId('user-1');

      // Then
      const found = await repository.findByUserId('user-1');
      expect(found).toBeNull();
    });

    it('존재하지 않는 사용자의 장바구니 삭제 시 아무 일도 발생하지 않아야 함', async () => {
      // When & Then
      await expect(
        repository.clearByUserId('non-existent-user'),
      ).resolves.not.toThrow();
    });
  });

  describe('격리', () => {
    it('서로 다른 사용자의 장바구니는 독립적이어야 함', async () => {
      // Given
      const cart1 = Cart.create('user-1');
      cart1.addItem({
        productId: 'prod-1',
        productName: 'Product 1',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 2,
      });

      const cart2 = Cart.create('user-2');
      cart2.addItem({
        productId: 'prod-2',
        productName: 'Product 2',
        productOptionId: 'opt-2',
        price: Money.from(20000),
        quantity: 1,
      });

      // When
      await repository.save(cart1);
      await repository.save(cart2);

      // Then
      const found1 = await repository.findByUserId('user-1');
      const found2 = await repository.findByUserId('user-2');

      expect(found1?.getItems()).toHaveLength(1);
      expect(found2?.getItems()).toHaveLength(1);
      expect(found1?.getItems()[0].productId).toBe('prod-1');
      expect(found2?.getItems()[0].productId).toBe('prod-2');
    });
  });
});
