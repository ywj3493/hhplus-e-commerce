import { Order } from '@/order/domain/entities/order.entity';
import { OrderItem } from '@/order/domain/entities/order-item.entity';
import { OrderStatus } from '@/order/domain/entities/order-status.enum';
import { Money } from '@/product/domain/entities/money.vo';
import {
  MinimumOrderAmountException,
  OrderAlreadyCompletedException,
  InvalidOrderStateException,
} from '@/order/domain/order.exceptions';

describe('Order Entity', () => {
  // 테스트용 OrderItem 생성 헬퍼
  const createTestOrderItem = (
    orderId: string,
    price: number = 10000,
    quantity: number = 1,
  ): OrderItem => {
    return OrderItem.create({
      orderId,
      productId: 'product-1',
      productName: '테스트 상품',
      productOptionId: 'option-1',
      productOptionName: '레드',
      price: Money.from(price),
      quantity,
    });
  };

  describe('생성', () => {
    it('유효한 데이터로 주문을 생성해야 함', () => {
      // Given
      const items = [createTestOrderItem('temp-id', 10000, 2)];

      // When
      const order = Order.create({
        userId: 'user-1',
        items,
        userCouponId: null,
        discountAmount: 0,
      });

      // Then
      expect(order.id).toBeDefined();
      expect(order.userId).toBe('user-1');
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.totalAmount).toBe(20000); // 10000 × 2
      expect(order.discountAmount).toBe(0);
      expect(order.finalAmount).toBe(20000);
      expect(order.userCouponId).toBeNull();
      expect(order.reservationExpiresAt).toBeDefined();
      expect(order.createdAt).toBeDefined();
      expect(order.paidAt).toBeNull();
    });

    it('BR-ORDER-01: 재고 예약 기간은 10분이어야 함', () => {
      // Given
      const items = [createTestOrderItem('temp-id')];
      const before = new Date();

      // When
      const order = Order.create({
        userId: 'user-1',
        items,
        userCouponId: null,
        discountAmount: 0,
      });

      // Then
      const expectedExpiration = new Date(before.getTime() + 10 * 60 * 1000);
      const diff = Math.abs(
        order.reservationExpiresAt.getTime() - expectedExpiration.getTime(),
      );
      expect(diff).toBeLessThan(1000); // 1초 이내 오차 허용
    });

    it('쿠폰 할인을 적용하여 생성해야 함', () => {
      // Given
      const items = [createTestOrderItem('temp-id', 10000, 2)];

      // When
      const order = Order.create({
        userId: 'user-1',
        items,
        userCouponId: 'coupon-1',
        discountAmount: 3000,
      });

      // Then
      expect(order.totalAmount).toBe(20000);
      expect(order.discountAmount).toBe(3000);
      expect(order.finalAmount).toBe(17000);
      expect(order.userCouponId).toBe('coupon-1');
    });

    it('BR-ORDER-05: 최종 금액이 0 이하이면 예외를 던져야 함', () => {
      // Given
      const items = [createTestOrderItem('temp-id', 10000, 1)];

      // When & Then
      expect(() =>
        Order.create({
          userId: 'user-1',
          items,
          userCouponId: 'coupon-1',
          discountAmount: 10000, // 총액과 동일한 할인
        }),
      ).toThrow(MinimumOrderAmountException);
    });

    it('BR-ORDER-05: 최종 금액이 음수이면 예외를 던져야 함', () => {
      // Given
      const items = [createTestOrderItem('temp-id', 10000, 1)];

      // When & Then
      expect(() =>
        Order.create({
          userId: 'user-1',
          items,
          userCouponId: 'coupon-1',
          discountAmount: 15000, // 총액보다 큰 할인
        }),
      ).toThrow(MinimumOrderAmountException);
    });

    it('주문 항목이 없으면 예외를 던져야 함', () => {
      // Given
      const items: OrderItem[] = [];

      // When & Then
      expect(() =>
        Order.create({
          userId: 'user-1',
          items,
          userCouponId: null,
          discountAmount: 0,
        }),
      ).toThrow('주문 항목은 최소 1개 이상이어야 합니다.');
    });

    it('reconstitute로 영속화된 데이터로부터 재구성해야 함', () => {
      // Given
      const items = [createTestOrderItem('order-1')];
      const data = {
        id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.COMPLETED,
        items,
        totalAmount: 10000,
        discountAmount: 1000,
        finalAmount: 9000,
        userCouponId: 'coupon-1',
        reservationExpiresAt: new Date(),
        createdAt: new Date(),
        paidAt: new Date(),
        updatedAt: new Date(),
      };

      // When
      const order = Order.reconstitute(data);

      // Then
      expect(order.id).toBe('order-1');
      expect(order.status).toBe(OrderStatus.COMPLETED);
      expect(order.paidAt).toBeDefined();
    });
  });

  describe('총액 계산', () => {
    it('단일 아이템의 소계를 총액으로 계산해야 함', () => {
      // Given
      const items = [createTestOrderItem('temp-id', 10000, 2)];

      // When
      const order = Order.create({
        userId: 'user-1',
        items,
        userCouponId: null,
        discountAmount: 0,
      });

      // Then
      expect(order.totalAmount).toBe(20000);
    });

    it('여러 아이템의 소계 합을 총액으로 계산해야 함', () => {
      // Given
      const items = [
        createTestOrderItem('temp-id', 10000, 2), // 20000
        createTestOrderItem('temp-id', 5000, 3), // 15000
        createTestOrderItem('temp-id', 8000, 1), // 8000
      ];

      // When
      const order = Order.create({
        userId: 'user-1',
        items,
        userCouponId: null,
        discountAmount: 0,
      });

      // Then
      expect(order.totalAmount).toBe(43000); // 20000 + 15000 + 8000
    });
  });

  describe('할인 계산', () => {
    it('BR-ORDER-04: 정률 쿠폰 할인을 계산해야 함', () => {
      // Given
      const totalAmount = 20000;
      const discountRate = 15; // 15%

      // When
      const discountAmount = Order.calculateDiscountAmount(
        totalAmount,
        'PERCENTAGE',
        discountRate,
      );

      // Then
      expect(discountAmount).toBe(3000); // 20000 × 0.15
    });

    it('BR-ORDER-04: 정액 쿠폰 할인을 계산해야 함 (할인액 < 총액)', () => {
      // Given
      const totalAmount = 20000;
      const discountValue = 3000;

      // When
      const discountAmount = Order.calculateDiscountAmount(
        totalAmount,
        'FIXED',
        discountValue,
      );

      // Then
      expect(discountAmount).toBe(3000);
    });

    it('BR-ORDER-04: 정액 쿠폰 할인이 총액을 초과하지 않아야 함', () => {
      // Given
      const totalAmount = 20000;
      const discountValue = 25000; // 총액보다 큼

      // When
      const discountAmount = Order.calculateDiscountAmount(
        totalAmount,
        'FIXED',
        discountValue,
      );

      // Then
      expect(discountAmount).toBe(20000); // min(25000, 20000)
    });
  });

  describe('주문 완료', () => {
    it('PENDING 상태의 주문을 COMPLETED로 변경해야 함', () => {
      // Given
      const items = [createTestOrderItem('temp-id')];
      const order = Order.create({
        userId: 'user-1',
        items,
        userCouponId: null,
        discountAmount: 0,
      });

      // When
      order.complete();

      // Then
      expect(order.status).toBe(OrderStatus.COMPLETED);
      expect(order.paidAt).toBeDefined();
    });

    it('이미 완료된 주문은 예외를 던져야 함', () => {
      // Given
      const items = [createTestOrderItem('temp-id')];
      const order = Order.create({
        userId: 'user-1',
        items,
        userCouponId: null,
        discountAmount: 0,
      });
      order.complete();

      // When & Then
      expect(() => order.complete()).toThrow(OrderAlreadyCompletedException);
    });

    it('CANCELED 상태의 주문은 완료할 수 없어야 함', () => {
      // Given
      const items = [createTestOrderItem('order-1')];
      const order = Order.reconstitute({
        id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.CANCELED,
        items,
        totalAmount: 10000,
        discountAmount: 0,
        finalAmount: 10000,
        userCouponId: null,
        reservationExpiresAt: new Date(),
        createdAt: new Date(),
        paidAt: null,
        updatedAt: new Date(),
      });

      // When & Then
      expect(() => order.complete()).toThrow(InvalidOrderStateException);
    });
  });

  describe('주문 취소', () => {
    it('PENDING 상태의 주문을 CANCELED로 변경해야 함', () => {
      // Given
      const items = [createTestOrderItem('temp-id')];
      const order = Order.create({
        userId: 'user-1',
        items,
        userCouponId: null,
        discountAmount: 0,
      });

      // When
      order.cancel();

      // Then
      expect(order.status).toBe(OrderStatus.CANCELED);
    });

    it('완료된 주문은 취소할 수 없어야 함', () => {
      // Given
      const items = [createTestOrderItem('temp-id')];
      const order = Order.create({
        userId: 'user-1',
        items,
        userCouponId: null,
        discountAmount: 0,
      });
      order.complete();

      // When & Then
      expect(() => order.cancel()).toThrow(InvalidOrderStateException);
    });

    it('이미 취소된 주문은 예외를 던져야 함', () => {
      // Given
      const items = [createTestOrderItem('temp-id')];
      const order = Order.create({
        userId: 'user-1',
        items,
        userCouponId: null,
        discountAmount: 0,
      });
      order.cancel();

      // When & Then
      expect(() => order.cancel()).toThrow(InvalidOrderStateException);
    });
  });

  describe('예약 만료 확인', () => {
    it('BR-ORDER-13: 예약 시간이 지나면 만료되어야 함', () => {
      // Given
      const items = [createTestOrderItem('order-1')];
      const pastDate = new Date(Date.now() - 11 * 60 * 1000); // 11분 전
      const order = Order.reconstitute({
        id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.PENDING,
        items,
        totalAmount: 10000,
        discountAmount: 0,
        finalAmount: 10000,
        userCouponId: null,
        reservationExpiresAt: pastDate,
        createdAt: new Date(),
        paidAt: null,
        updatedAt: new Date(),
      });

      // When
      const expired = order.isExpired();

      // Then
      expect(expired).toBe(true);
    });

    it('예약 시간이 남아있으면 만료되지 않아야 함', () => {
      // Given
      const items = [createTestOrderItem('order-1')];
      const futureDate = new Date(Date.now() + 5 * 60 * 1000); // 5분 후
      const order = Order.reconstitute({
        id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.PENDING,
        items,
        totalAmount: 10000,
        discountAmount: 0,
        finalAmount: 10000,
        userCouponId: null,
        reservationExpiresAt: futureDate,
        createdAt: new Date(),
        paidAt: null,
        updatedAt: new Date(),
      });

      // When
      const expired = order.isExpired();

      // Then
      expect(expired).toBe(false);
    });

    it('PENDING 상태이고 만료된 주문을 확인해야 함', () => {
      // Given
      const items = [createTestOrderItem('order-1')];
      const pastDate = new Date(Date.now() - 11 * 60 * 1000);
      const order = Order.reconstitute({
        id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.PENDING,
        items,
        totalAmount: 10000,
        discountAmount: 0,
        finalAmount: 10000,
        userCouponId: null,
        reservationExpiresAt: pastDate,
        createdAt: new Date(),
        paidAt: null,
        updatedAt: new Date(),
      });

      // When
      const pendingAndExpired = order.isPendingAndExpired();

      // Then
      expect(pendingAndExpired).toBe(true);
    });

    it('완료된 주문은 만료 확인에서 false를 반환해야 함', () => {
      // Given
      const items = [createTestOrderItem('order-1')];
      const pastDate = new Date(Date.now() - 11 * 60 * 1000);
      const order = Order.reconstitute({
        id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.COMPLETED,
        items,
        totalAmount: 10000,
        discountAmount: 0,
        finalAmount: 10000,
        userCouponId: null,
        reservationExpiresAt: pastDate,
        createdAt: new Date(),
        paidAt: new Date(),
        updatedAt: new Date(),
      });

      // When
      const pendingAndExpired = order.isPendingAndExpired();

      // Then
      expect(pendingAndExpired).toBe(false);
    });
  });

  describe('불변성', () => {
    it('items getter는 배열의 복사본을 반환해야 함', () => {
      // Given
      const items = [createTestOrderItem('temp-id')];
      const order = Order.create({
        userId: 'user-1',
        items,
        userCouponId: null,
        discountAmount: 0,
      });

      // When
      const retrievedItems = order.items;

      // Then
      expect(retrievedItems).not.toBe(items); // 다른 참조
      expect(retrievedItems).toEqual(items); // 같은 내용
    });
  });
});
