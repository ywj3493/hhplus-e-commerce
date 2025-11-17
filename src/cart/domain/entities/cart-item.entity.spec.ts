import { Cart } from './cart.entity';
import { Money } from '../../../product/domain/entities/money.vo';
import { InvalidQuantityException } from '../cart.exceptions';

describe('CartItem', () => {
  describe('생성', () => {
    it('유효한 파라미터로 CartItem 인스턴스를 생성해야 함', () => {
      // Given
      const cart = Cart.create('user-1');
      const productId = 'prod-1';
      const productName = 'Test Product';
      const productOptionId = 'opt-1';
      const price = Money.from(10000);
      const quantity = 2;

      // When
      const itemId = cart.addItem({
        productId,
        productName,
        productOptionId,
        price,
        quantity,
      });

      // Then
      const item = cart.findItem(itemId);
      expect(item).toBeDefined();
      expect(item!.productId).toBe(productId);
      expect(item!.productName).toBe(productName);
      expect(item!.productOptionId).toBe(productOptionId);
      expect(item!.getPrice()).toBe(price);
      expect(item!.quantity).toBe(quantity);
      expect(item!.getSubtotal().amount).toBe(20000);
    });
  });

  describe('상품 동일성 검사', () => {
    it('동일한 상품과 옵션이면 true를 반환해야 함', () => {
      // Given
      const cart = Cart.create('user-1');
      const itemId = cart.addItem({
        productId: 'prod-1',
        productName: 'Test',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 1,
      });
      const item = cart.findItem(itemId)!;

      // When
      const result = item.isSameProduct('prod-1', 'opt-1');

      // Then
      expect(result).toBe(true);
    });

    it('다른 상품이면 false를 반환해야 함', () => {
      // Given
      const cart = Cart.create('user-1');
      const itemId = cart.addItem({
        productId: 'prod-1',
        productName: 'Test',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 1,
      });
      const item = cart.findItem(itemId)!;

      // When
      const result = item.isSameProduct('prod-2', 'opt-1');

      // Then
      expect(result).toBe(false);
    });

    it('다른 옵션이면 false를 반환해야 함', () => {
      // Given
      const cart = Cart.create('user-1');
      const itemId = cart.addItem({
        productId: 'prod-1',
        productName: 'Test',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 1,
      });
      const item = cart.findItem(itemId)!;

      // When
      const result = item.isSameProduct('prod-1', 'opt-2');

      // Then
      expect(result).toBe(false);
    });
  });

  describe('수량 증가', () => {
    it('기존 수량에 새 수량을 더해야 함', () => {
      // Given
      const cart = Cart.create('user-1');
      const itemId = cart.addItem({
        productId: 'prod-1',
        productName: 'Test',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 2,
      });
      const item = cart.findItem(itemId)!;

      // When
      item.increaseQuantity(3);

      // Then
      expect(item.quantity).toBe(5);
      expect(item.getSubtotal().amount).toBe(50000);
    });

    it('0 이하의 수량으로 증가 시도 시 에러를 발생시켜야 함', () => {
      // Given
      const cart = Cart.create('user-1');
      const itemId = cart.addItem({
        productId: 'prod-1',
        productName: 'Test',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 2,
      });
      const item = cart.findItem(itemId)!;

      // When & Then
      expect(() => item.increaseQuantity(0)).toThrow(InvalidQuantityException);
      expect(() => item.increaseQuantity(-1)).toThrow(InvalidQuantityException);
    });
  });

  describe('수량 변경', () => {
    it('새 수량으로 업데이트해야 함 (BR-CART-03)', () => {
      // Given
      const cart = Cart.create('user-1');
      const itemId = cart.addItem({
        productId: 'prod-1',
        productName: 'Test',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 2,
      });
      const item = cart.findItem(itemId)!;

      // When
      item.updateQuantity(5);

      // Then
      expect(item.quantity).toBe(5);
      expect(item.getSubtotal().amount).toBe(50000);
    });

    it('수량이 1 미만일 때 에러를 발생시켜야 함 (BR-CART-03)', () => {
      // Given
      const cart = Cart.create('user-1');
      const itemId = cart.addItem({
        productId: 'prod-1',
        productName: 'Test',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 2,
      });
      const item = cart.findItem(itemId)!;

      // When & Then
      expect(() => item.updateQuantity(0)).toThrow(InvalidQuantityException);
      expect(() => item.updateQuantity(-1)).toThrow(InvalidQuantityException);
    });
  });

  describe('소계 계산', () => {
    it('가격 x 수량으로 소계를 계산해야 함', () => {
      // Given
      const cart = Cart.create('user-1');
      const price = Money.from(15000);
      const quantity = 4;
      const itemId = cart.addItem({
        productId: 'prod-1',
        productName: 'Test',
        productOptionId: 'opt-1',
        price,
        quantity,
      });
      const item = cart.findItem(itemId)!;

      // When
      const subtotal = item.getSubtotal();

      // Then
      expect(subtotal.amount).toBe(60000);
    });
  });
});
