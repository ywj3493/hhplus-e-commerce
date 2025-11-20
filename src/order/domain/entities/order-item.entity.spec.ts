import { OrderItem } from '@/order/domain/entities/order-item.entity';
import { Price } from '@/product/domain/entities/price.vo';
import { CartItem } from '@/order/domain/entities/cart-item.entity';

describe('OrderItem Entity', () => {
  describe('생성', () => {
    it('fromCartItem으로 CartItem으로부터 스냅샷을 생성해야 함', () => {
      // Given
      const cartItem = CartItem.create({
        cartId: 'cart-1',
        productId: 'product-1',
        productName: '테스트 상품',
        productOptionId: 'option-1',
        price: Price.from(10000),
        quantity: 2,
      });
      const orderId = 'order-1';
      const productOptionName = '레드';

      // When
      const orderItem = OrderItem.fromCartItem(
        orderId,
        cartItem,
        productOptionName,
      );

      // Then
      expect(orderItem.id).toBeDefined();
      expect(orderItem.orderId).toBe(orderId);
      expect(orderItem.productId).toBe('product-1');
      expect(orderItem.productName).toBe('테스트 상품');
      expect(orderItem.productOptionId).toBe('option-1');
      expect(orderItem.productOptionName).toBe('레드');
      expect(orderItem.price.amount).toBe(10000);
      expect(orderItem.quantity).toBe(2);
    });

    it('create로 직접 데이터를 사용해 생성해야 함', () => {
      // Given
      const createData = {
        orderId: 'order-1',
        productId: 'product-1',
        productName: '테스트 상품',
        productOptionId: 'option-1',
        productOptionName: '블루',
        price: Price.from(15000),
        quantity: 3,
      };

      // When
      const orderItem = OrderItem.create(createData);

      // Then
      expect(orderItem.id).toBeDefined();
      expect(orderItem.orderId).toBe('order-1');
      expect(orderItem.productName).toBe('테스트 상품');
      expect(orderItem.productOptionName).toBe('블루');
      expect(orderItem.quantity).toBe(3);
    });

    it('reconstitute로 영속화된 데이터로부터 재구성해야 함', () => {
      // Given
      const data = {
        id: 'item-1',
        orderId: 'order-1',
        productId: 'product-1',
        productName: '테스트 상품',
        productOptionId: 'option-1',
        productOptionName: '그린',
        price: Price.from(20000),
        quantity: 1,
        createdAt: new Date(),
      };

      // When
      const orderItem = OrderItem.reconstitute(data);

      // Then
      expect(orderItem.id).toBe('item-1');
      expect(orderItem.orderId).toBe('order-1');
      expect(orderItem.productName).toBe('테스트 상품');
      expect(orderItem.productOptionName).toBe('그린');
      expect(orderItem.quantity).toBe(1);
      expect(orderItem.createdAt).toBeInstanceOf(Date);
    });

    it('수량이 1 미만이면 예외를 던져야 함', () => {
      // Given
      const createData = {
        orderId: 'order-1',
        productId: 'product-1',
        productName: '테스트 상품',
        productOptionId: null,
        productOptionName: null,
        price: Price.from(10000),
        quantity: 0, // 잘못된 수량
      };

      // When & Then
      expect(() => OrderItem.create(createData)).toThrow(
        '주문 수량은 1 이상이어야 합니다.',
      );
    });
  });

  describe('소계 계산', () => {
    it('가격 × 수량으로 소계를 계산해야 함', () => {
      // Given
      const orderItem = OrderItem.create({
        orderId: 'order-1',
        productId: 'product-1',
        productName: '테스트 상품',
        productOptionId: null,
        productOptionName: null,
        price: Price.from(10000),
        quantity: 3,
      });

      // When
      const subtotal = orderItem.getSubtotal();

      // Then
      expect(subtotal.amount).toBe(30000);
    });

    it('수량이 1인 경우 가격과 동일한 소계를 반환해야 함', () => {
      // Given
      const orderItem = OrderItem.create({
        orderId: 'order-1',
        productId: 'product-1',
        productName: '테스트 상품',
        productOptionId: null,
        productOptionName: null,
        price: Price.from(15000),
        quantity: 1,
      });

      // When
      const subtotal = orderItem.getSubtotal();

      // Then
      expect(subtotal.amount).toBe(15000);
    });
  });

  describe('스냅샷 패턴', () => {
    it('주문 시점의 상품 정보를 불변으로 저장해야 함', () => {
      // Given
      const cartItem = CartItem.create({
        cartId: 'cart-1',
        productId: 'product-1',
        productName: '원본 상품명',
        productOptionId: 'option-1',
        price: Price.from(10000),
        quantity: 1,
      });

      // When
      const orderItem = OrderItem.fromCartItem('order-1', cartItem, '원본 옵션명');

      // Then - 스냅샷이 저장됨
      expect(orderItem.productName).toBe('원본 상품명');
      expect(orderItem.productOptionName).toBe('원본 옵션명');
      expect(orderItem.price.amount).toBe(10000);
    });
  });
});
