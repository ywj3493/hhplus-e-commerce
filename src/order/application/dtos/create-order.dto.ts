/**
 * CreateOrderInput
 * 주문 생성 입력 DTO
 */
export class CreateOrderInput {
  constructor(
    public readonly userId: string,
    public readonly couponId?: string,
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.userId || this.userId.trim() === '') {
      throw new Error('사용자 ID는 필수입니다.');
    }
  }
}

/**
 * CreateOrderOutput
 * 주문 생성 결과 DTO
 */
export class CreateOrderOutput {
  constructor(
    public readonly orderId: string,
    public readonly status: string,
    public readonly totalAmount: number,
    public readonly discountAmount: number,
    public readonly finalAmount: number,
    public readonly reservationExpiresAt: Date,
  ) {}

  static from(
    orderId: string,
    status: string,
    totalAmount: number,
    discountAmount: number,
    finalAmount: number,
    reservationExpiresAt: Date,
  ): CreateOrderOutput {
    return new CreateOrderOutput(
      orderId,
      status,
      totalAmount,
      discountAmount,
      finalAmount,
      reservationExpiresAt,
    );
  }
}
