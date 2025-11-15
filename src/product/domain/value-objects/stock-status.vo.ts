/**
 * Stock Status Value Object
 * Represents the availability status of a product/option
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
   * Create StockStatus based on available quantity
   * BR-PROD-04: "In Stock" if availableQuantity > 0, else "Out of Stock"
   */
  static fromAvailableQuantity(availableQuantity: number): StockStatus {
    if (availableQuantity < 0) {
      throw new Error('Available quantity cannot be negative');
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
    return this._status === StockStatusType.IN_STOCK ? 'In Stock' : 'Out of Stock';
  }
}
