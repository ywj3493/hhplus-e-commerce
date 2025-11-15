/**
 * Stock Status Value Object
 * 상품/옵션의 재고 상태를 나타내는 값 객체
 */
export enum StockStatusType {
  IN_STOCK = 'IN_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

export class StockStatus {
  private readonly _status: StockStatusType;

  private constructor(status: StockStatusType) {
    this._status = status;
  }

  /**
   * 가용 재고 수량을 기반으로 재고 상태 생성
   * BR-PROD-04: availableQuantity > 0이면 "재고 있음", 아니면 "품절"
   */
  static fromAvailableQuantity(availableQuantity: number): StockStatus {
    if (availableQuantity < 0) {
      throw new Error('가용 재고 수량은 음수일 수 없습니다');
    }
    return new StockStatus(
      availableQuantity > 0 ? StockStatusType.IN_STOCK : StockStatusType.OUT_OF_STOCK,
    );
  }

  static inStock(): StockStatus {
    return new StockStatus(StockStatusType.IN_STOCK);
  }

  static outOfStock(): StockStatus {
    return new StockStatus(StockStatusType.OUT_OF_STOCK);
  }

  get status(): StockStatusType {
    return this._status;
  }

  isInStock(): boolean {
    return this._status === StockStatusType.IN_STOCK;
  }

  isOutOfStock(): boolean {
    return this._status === StockStatusType.OUT_OF_STOCK;
  }

  equals(other: StockStatus): boolean {
    return this._status === other._status;
  }

  toString(): string {
    return this._status === StockStatusType.IN_STOCK ? '재고 있음' : '품절';
  }
}
