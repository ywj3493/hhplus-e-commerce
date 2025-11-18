import { Order } from '../../domain/entities/order.entity';
import { OrderItem } from '../../domain/entities/order-item.entity';

/**
 * OrderItemData
 * 주문 항목 데이터 (중첩 DTO)
 */
export class OrderItemData {
  constructor(
    public readonly productId: string,
    public readonly productName: string,
    public readonly productOptionId: string | null,
    public readonly productOptionName: string | null,
    public readonly price: number,
    public readonly quantity: number,
    public readonly subtotal: number,
  ) {}

  static from(item: OrderItem): OrderItemData {
    return new OrderItemData(
      item.productId,
      item.productName,
      item.productOptionId,
      item.productOptionName,
      item.price.amount,
      item.quantity,
      item.getSubtotal().amount,
    );
  }
}

/**
 * GetOrderInput
 * 주문 조회 입력 DTO
 */
export class GetOrderInput {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.orderId || this.orderId.trim() === '') {
      throw new Error('주문 ID는 필수입니다.');
    }
    if (!this.userId || this.userId.trim() === '') {
      throw new Error('사용자 ID는 필수입니다.');
    }
  }
}

/**
 * GetOrderOutput
 * 주문 조회 결과 DTO
 */
export class GetOrderOutput {
  constructor(
    public readonly orderId: string,
    public readonly status: string,
    public readonly items: OrderItemData[],
    public readonly totalAmount: number,
    public readonly discountAmount: number,
    public readonly finalAmount: number,
    public readonly createdAt: Date,
    public readonly reservationExpiresAt: Date,
    public readonly paidAt: Date | null,
  ) {}

  static from(order: Order): GetOrderOutput {
    return new GetOrderOutput(
      order.id,
      order.status,
      order.items.map((item) => OrderItemData.from(item)),
      order.totalAmount,
      order.discountAmount,
      order.finalAmount,
      order.createdAt,
      order.reservationExpiresAt,
      order.paidAt,
    );
  }
}
