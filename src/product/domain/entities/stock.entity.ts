import { StockStatus } from '../value-objects/stock-status.vo';

/**
 * Stock Entity
 * Manages product option inventory
 * BR-PROD-04: Stock status calculation based on availableQuantity
 */
export class Stock {
  private readonly _id: string;
  private readonly _productOptionId: string;
  private _totalQuantity: number;
  private _availableQuantity: number;
  private _reservedQuantity: number;
  private _soldQuantity: number;

  private constructor(
    id: string,
    productOptionId: string,
    totalQuantity: number,
    availableQuantity: number,
    reservedQuantity: number,
    soldQuantity: number,
  ) {
    this._id = id;
    this._productOptionId = productOptionId;
    this._totalQuantity = totalQuantity;
    this._availableQuantity = availableQuantity;
    this._reservedQuantity = reservedQuantity;
    this._soldQuantity = soldQuantity;

    this.validate();
  }

  /**
   * Factory method to create Stock instance
   */
  static create(
    id: string,
    productOptionId: string,
    totalQuantity: number,
    availableQuantity: number,
    reservedQuantity: number,
    soldQuantity: number,
  ): Stock {
    return new Stock(
      id,
      productOptionId,
      totalQuantity,
      availableQuantity,
      reservedQuantity,
      soldQuantity,
    );
  }

  /**
   * Factory method for initial stock
   */
  static initialize(id: string, productOptionId: string, totalQuantity: number): Stock {
    return new Stock(id, productOptionId, totalQuantity, totalQuantity, 0, 0);
  }

  private validate(): void {
    if (this._totalQuantity < 0) {
      throw new Error('Total quantity cannot be negative');
    }
    if (this._availableQuantity < 0) {
      throw new Error('Available quantity cannot be negative');
    }
    if (this._reservedQuantity < 0) {
      throw new Error('Reserved quantity cannot be negative');
    }
    if (this._soldQuantity < 0) {
      throw new Error('Sold quantity cannot be negative');
    }
    if (this._availableQuantity + this._reservedQuantity + this._soldQuantity > this._totalQuantity) {
      throw new Error('Sum of available, reserved, and sold quantity cannot exceed total quantity');
    }
  }

  /**
   * Get stock status based on available quantity
   * BR-PROD-04: "In Stock" if availableQuantity > 0, else "Out of Stock"
   */
  getStatus(): StockStatus {
    return StockStatus.fromAvailableQuantity(this._availableQuantity);
  }

  /**
   * Check if stock is available
   */
  isAvailable(): boolean {
    return this._availableQuantity > 0;
  }

  /**
   * Reserve stock for order
   */
  reserve(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Reserve quantity must be positive');
    }
    if (quantity > this._availableQuantity) {
      throw new Error('Insufficient available quantity');
    }
    this._availableQuantity -= quantity;
    this._reservedQuantity += quantity;
  }

  /**
   * Restore reserved stock (e.g., on order cancellation)
   */
  restoreReserved(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Restore quantity must be positive');
    }
    if (quantity > this._reservedQuantity) {
      throw new Error('Restore quantity exceeds reserved quantity');
    }
    this._reservedQuantity -= quantity;
    this._availableQuantity += quantity;
  }

  /**
   * Convert reserved stock to sold (e.g., on payment completion)
   */
  sell(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Sell quantity must be positive');
    }
    if (quantity > this._reservedQuantity) {
      throw new Error('Sell quantity exceeds reserved quantity');
    }
    this._reservedQuantity -= quantity;
    this._soldQuantity += quantity;
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get productOptionId(): string {
    return this._productOptionId;
  }

  get totalQuantity(): number {
    return this._totalQuantity;
  }

  get availableQuantity(): number {
    return this._availableQuantity;
  }

  get reservedQuantity(): number {
    return this._reservedQuantity;
  }

  get soldQuantity(): number {
    return this._soldQuantity;
  }
}
