import { ApiProperty } from '@nestjs/swagger';
import { Order } from '@/order/domain/entities/order.entity';
import { OrderItem } from '@/order/domain/entities/order-item.entity';

/**
 * OrderItemData
 * 주문 항목 데이터 (중첩 DTO)
 */
export class OrderItemData {
  @ApiProperty({ description: '상품 ID', example: 'product-1' })
  public readonly productId: string;

  @ApiProperty({ description: '상품 이름', example: '맥북 프로 14인치' })
  public readonly productName: string;

  @ApiProperty({ description: '상품 옵션 ID', example: 'option-1', nullable: true })
  public readonly productOptionId: string | null;

  @ApiProperty({ description: '상품 옵션 이름', example: 'M3 Pro, 18GB, 512GB', nullable: true })
  public readonly productOptionName: string | null;

  @ApiProperty({ description: '단가', example: 2490000 })
  public readonly price: number;

  @ApiProperty({ description: '수량', example: 2 })
  public readonly quantity: number;

  @ApiProperty({ description: '소계', example: 4980000 })
  public readonly subtotal: number;

  constructor(
    productId: string,
    productName: string,
    productOptionId: string | null,
    productOptionName: string | null,
    price: number,
    quantity: number,
    subtotal: number,
  ) {
    this.productId = productId;
    this.productName = productName;
    this.productOptionId = productOptionId;
    this.productOptionName = productOptionName;
    this.price = price;
    this.quantity = quantity;
    this.subtotal = subtotal;
  }

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
