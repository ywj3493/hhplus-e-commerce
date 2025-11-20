import { Order } from '@/order/domain/entities/order.entity';
import { OrderItem } from '@/order/domain/entities/order-item.entity';
import { OrderStatus } from '@/order/domain/entities/order-status.enum';
import { Price } from '@/product/domain/entities/price.vo';

/**
 * Order Fixtures
 * 테스트용 Order 데이터 생성 헬퍼
 */
export class OrderFixtures {
  /**
   * 테스트용 OrderItem 생성
   */
  static createTestOrderItem(
    orderId: string,
    productId: string = 'product-1',
    productName: string = '테스트 상품',
    productOptionId: string | null = 'option-1',
    productOptionName: string | null = '레드',
    price: number = 10000,
    quantity: number = 1,
  ): OrderItem {
    return OrderItem.create({
      orderId,
      productId,
      productName,
      productOptionId,
      productOptionName,
      price: Price.from(price),
      quantity,
    });
  }

  /**
   * 테스트용 PENDING 주문 생성
   */
  static createTestPendingOrder(
    userId: string = 'user-1',
    items?: OrderItem[],
  ): Order {
    const orderId = 'order-1';
    const orderItems =
      items || [OrderFixtures.createTestOrderItem(orderId, 'product-1')];

    return Order.create({
      userId,
      items: orderItems,
      userCouponId: null,
      discountAmount: 0,
    });
  }

  /**
   * 테스트용 COMPLETED 주문 생성
   */
  static createTestCompletedOrder(
    userId: string = 'user-1',
    items?: OrderItem[],
  ): Order {
    const orderId = 'order-completed';
    const orderItems =
      items || [OrderFixtures.createTestOrderItem(orderId, 'product-1')];

    const order = Order.reconstitute({
      id: orderId,
      userId,
      status: OrderStatus.COMPLETED,
      items: orderItems,
      totalAmount: 10000,
      discountAmount: 0,
      finalAmount: 10000,
      userCouponId: null,
      reservationExpiresAt: new Date(Date.now() - 5 * 60 * 1000), // 5분 전 만료
      createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10분 전 생성
      paidAt: new Date(Date.now() - 2 * 60 * 1000), // 2분 전 결제
      updatedAt: new Date(),
    });

    return order;
  }

  /**
   * 테스트용 만료된 PENDING 주문 생성
   */
  static createTestExpiredOrder(
    userId: string = 'user-1',
    items?: OrderItem[],
  ): Order {
    const orderId = 'order-expired';
    const orderItems =
      items || [OrderFixtures.createTestOrderItem(orderId, 'product-1')];

    return Order.reconstitute({
      id: orderId,
      userId,
      status: OrderStatus.PENDING,
      items: orderItems,
      totalAmount: 10000,
      discountAmount: 0,
      finalAmount: 10000,
      userCouponId: null,
      reservationExpiresAt: new Date(Date.now() - 1 * 60 * 1000), // 1분 전 만료
      createdAt: new Date(Date.now() - 11 * 60 * 1000), // 11분 전 생성
      paidAt: null,
      updatedAt: new Date(),
    });
  }

  /**
   * 테스트용 쿠폰 적용 주문 생성
   */
  static createTestOrderWithCoupon(
    userId: string = 'user-1',
    couponId: string = 'coupon-1',
    discountAmount: number = 3000,
  ): Order {
    const orderId = 'order-with-coupon';
    const orderItems = [OrderFixtures.createTestOrderItem(orderId)];

    return Order.create({
      userId,
      items: orderItems,
      userCouponId: couponId,
      discountAmount,
    });
  }

  /**
   * 테스트용 여러 아이템을 가진 주문 생성
   */
  static createTestOrderWithMultipleItems(
    userId: string = 'user-1',
  ): Order {
    const orderId = 'order-multi';
    const orderItems = [
      OrderFixtures.createTestOrderItem(orderId, 'product-1', '상품 1', 'option-1', '레드', 10000, 2),
      OrderFixtures.createTestOrderItem(orderId, 'product-2', '상품 2', 'option-2', '블루', 20000, 1),
      OrderFixtures.createTestOrderItem(orderId, 'product-3', '상품 3', null, null, 15000, 3),
    ];

    return Order.create({
      userId,
      items: orderItems,
      userCouponId: null,
      discountAmount: 0,
    });
  }
}
