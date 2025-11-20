import { Order } from '@/order/domain/entities/order.entity';

/**
 * OrderSummaryData
 * 주문 목록용 요약 데이터
 */
export class OrderSummaryData {
  constructor(
    public readonly orderId: string,
    public readonly status: string,
    public readonly totalAmount: number,
    public readonly discountAmount: number,
    public readonly finalAmount: number,
    public readonly itemCount: number,
    public readonly createdAt: Date,
    public readonly reservationExpiresAt: Date,
  ) {}

  static from(order: Order): OrderSummaryData {
    return new OrderSummaryData(
      order.id,
      order.status,
      order.totalAmount,
      order.discountAmount,
      order.finalAmount,
      order.items.length,
      order.createdAt,
      order.reservationExpiresAt,
    );
  }
}

/**
 * PaginationData
 * 페이지네이션 메타데이터
 */
export class PaginationData {
  constructor(
    public readonly page: number,
    public readonly limit: number,
    public readonly total: number,
  ) {}
}

/**
 * GetOrdersInput
 * 주문 목록 조회 입력 DTO
 */
export class GetOrdersInput {
  constructor(
    public readonly userId: string,
    public readonly page: number = 1,
    public readonly limit: number = 10,
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.userId || this.userId.trim() === '') {
      throw new Error('사용자 ID는 필수입니다.');
    }
    if (this.page < 1) {
      throw new Error('페이지는 1 이상이어야 합니다.');
    }
    if (this.limit < 1) {
      throw new Error('페이지 크기는 1 이상이어야 합니다.');
    }
    // BR-ORDER-11: 최대 페이지 크기 100
    if (this.limit > 100) {
      throw new Error('페이지 크기는 최대 100까지 가능합니다.');
    }
  }
}

/**
 * GetOrdersOutput
 * 주문 목록 조회 결과 DTO
 */
export class GetOrdersOutput {
  constructor(
    public readonly orders: OrderSummaryData[],
    public readonly pagination: PaginationData,
  ) {}

  static from(
    orders: Order[],
    page: number,
    limit: number,
    total: number,
  ): GetOrdersOutput {
    const orderSummaries = orders.map((order) => OrderSummaryData.from(order));
    const pagination = new PaginationData(page, limit, total);

    return new GetOrdersOutput(orderSummaries, pagination);
  }
}
