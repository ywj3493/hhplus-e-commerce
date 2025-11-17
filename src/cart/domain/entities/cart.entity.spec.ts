import { Cart } from './cart.entity';
import { CartItem } from './cart-item.entity';
import { Money } from '../../../product/domain/entities/money.vo';
import {
  CartItemNotFoundException,
  InsufficientStockException,
} from '../cart.exceptions';

describe('Cart', () => {
  describe('생성', () => {
    it('유효한 userId로 새 Cart를 생성해야 함', () => {
      // Given
      const userId = 'user-1';

      // When
      const cart = Cart.create(userId);

      // Then
      expect(cart.userId).toBe(userId);
      expect(cart.getItems()).toHaveLength(0);
      expect(cart.getTotalAmount().amount).toBe(0);
    });
  });

  describe('재구성', () => {
    it('저장된 데이터로 Cart를 재구성해야 함', () => {
      // Given
      const id = 'cart-1';
      const userId = 'user-1';
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-02');

      // 먼저 실제 장바구니를 만들어서 아이템을 추가
      const tempCart = Cart.create(userId);
      tempCart.addItem({
        productId: 'prod-1',
        productName: 'Product 1',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 2,
      });
      const items = tempCart.getItems();

      // When
      const cart = Cart.reconstitute({
        id,
        userId,
        items,
        createdAt,
        updatedAt,
      });

      // Then
      expect(cart.id).toBe(id);
      expect(cart.userId).toBe(userId);
      expect(cart.getItems()).toHaveLength(1);
      expect(cart.getTotalAmount().amount).toBe(20000);
    });
  });

  describe('아이템 추가', () => {
    it('새 상품을 장바구니에 추가해야 함', () => {
      // Given
      const cart = Cart.create('user-1');

      // When
      const itemId = cart.addItem({
        productId: 'prod-1',
        productName: 'Product 1',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 2,
      });

      // Then
      expect(itemId).toBeDefined();
      expect(cart.getItems()).toHaveLength(1);
      expect(cart.getTotalAmount().amount).toBe(20000);
    });

    it('중복 상품 추가 시 수량을 증가시켜야 함 (BR-CART-01)', () => {
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
      cart.addItem({
        productId: 'prod-1',
        productName: 'Product 1',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 3,
      });

      // Then
      expect(cart.getItems()).toHaveLength(1);
      const item = cart.getItems()[0];
      expect(item.quantity).toBe(5);
      expect(cart.getTotalAmount().amount).toBe(50000);
    });

    it('다른 옵션의 같은 상품은 별도 아이템으로 추가해야 함', () => {
      // Given
      const cart = Cart.create('user-1');
      cart.addItem({
        productId: 'prod-1',
        productName: 'Product 1',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 1,
      });

      // When
      cart.addItem({
        productId: 'prod-1',
        productName: 'Product 1',
        productOptionId: 'opt-2',
        price: Money.from(12000),
        quantity: 1,
      });

      // Then
      expect(cart.getItems()).toHaveLength(2);
      expect(cart.getTotalAmount().amount).toBe(22000);
    });
  });

  describe('아이템 수량 변경', () => {
    it('아이템 수량을 변경해야 함', () => {
      // Given
      const cart = Cart.create('user-1');
      const itemId = cart.addItem({
        productId: 'prod-1',
        productName: 'Product 1',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 2,
      });

      // When
      cart.updateItemQuantity(itemId, 5);

      // Then
      const item = cart.findItem(itemId);
      expect(item?.quantity).toBe(5);
      expect(cart.getTotalAmount().amount).toBe(50000);
    });

    it('수량이 0 이하가 되면 아이템을 삭제해야 함 (BR-CART-07)', () => {
      // Given
      const cart = Cart.create('user-1');
      const itemId = cart.addItem({
        productId: 'prod-1',
        productName: 'Product 1',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 2,
      });

      // When
      cart.updateItemQuantity(itemId, 0);

      // Then
      expect(cart.getItems()).toHaveLength(0);
      expect(cart.getTotalAmount().amount).toBe(0);
    });

    it('존재하지 않는 아이템 수량 변경 시 에러를 발생시켜야 함', () => {
      // Given
      const cart = Cart.create('user-1');

      // When & Then
      expect(() => cart.updateItemQuantity('nonexistent-id', 5)).toThrow(
        CartItemNotFoundException,
      );
    });
  });

  describe('아이템 삭제', () => {
    it('지정한 아이템을 삭제해야 함', () => {
      // Given
      const cart = Cart.create('user-1');
      const itemId = cart.addItem({
        productId: 'prod-1',
        productName: 'Product 1',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 2,
      });

      // When
      cart.removeItem(itemId);

      // Then
      expect(cart.getItems()).toHaveLength(0);
      expect(cart.getTotalAmount().amount).toBe(0);
    });

    it('존재하지 않는 아이템 삭제 시 에러를 발생시켜야 함', () => {
      // Given
      const cart = Cart.create('user-1');

      // When & Then
      expect(() => cart.removeItem('nonexistent-id')).toThrow(CartItemNotFoundException);
    });
  });

  describe('전체 삭제', () => {
    it('모든 아이템을 삭제해야 함', () => {
      // Given
      const cart = Cart.create('user-1');
      cart.addItem({
        productId: 'prod-1',
        productName: 'Product 1',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 2,
      });
      cart.addItem({
        productId: 'prod-2',
        productName: 'Product 2',
        productOptionId: 'opt-2',
        price: Money.from(20000),
        quantity: 1,
      });

      // When
      const deletedCount = cart.clearAll();

      // Then
      expect(deletedCount).toBe(2);
      expect(cart.getItems()).toHaveLength(0);
      expect(cart.getTotalAmount().amount).toBe(0);
    });

    it('빈 장바구니 전체 삭제 시 0을 반환해야 함', () => {
      // Given
      const cart = Cart.create('user-1');

      // When
      const deletedCount = cart.clearAll();

      // Then
      expect(deletedCount).toBe(0);
    });
  });

  describe('총액 계산', () => {
    it('모든 아이템의 소계를 합산해야 함 (BR-CART-05)', () => {
      // Given
      const cart = Cart.create('user-1');
      cart.addItem({
        productId: 'prod-1',
        productName: 'Product 1',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 2,
      });
      cart.addItem({
        productId: 'prod-2',
        productName: 'Product 2',
        productOptionId: 'opt-2',
        price: Money.from(20000),
        quantity: 3,
      });

      // When
      const total = cart.getTotalAmount();

      // Then
      expect(total.amount).toBe(80000); // 20000 + 60000
    });

    it('빈 장바구니의 총액은 0이어야 함', () => {
      // Given
      const cart = Cart.create('user-1');

      // When
      const total = cart.getTotalAmount();

      // Then
      expect(total.amount).toBe(0);
    });
  });

  describe('아이템 찾기', () => {
    it('ID로 아이템을 찾아야 함', () => {
      // Given
      const cart = Cart.create('user-1');
      const itemId = cart.addItem({
        productId: 'prod-1',
        productName: 'Product 1',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 2,
      });

      // When
      const item = cart.findItem(itemId);

      // Then
      expect(item).toBeDefined();
      expect(item?.id).toBe(itemId);
    });

    it('존재하지 않는 ID로 찾을 때 undefined를 반환해야 함', () => {
      // Given
      const cart = Cart.create('user-1');

      // When
      const item = cart.findItem('nonexistent-id');

      // Then
      expect(item).toBeUndefined();
    });
  });
});
