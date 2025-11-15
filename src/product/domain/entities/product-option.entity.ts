import { Money } from '../value-objects/money.vo';
import { StockStatus } from '../value-objects/stock-status.vo';
import { Stock } from './stock.entity';

/**
 * ProductOption Entity
 * Represents a product option with type, name, price, and stock
 * BR-PROD-05: Options are grouped by type field
 * BR-PROD-06: Stock status is displayed per option
 */
export class ProductOption {
  private readonly _id: string;
  private readonly _productId: string;
  private readonly _type: string;
  private readonly _name: string;
  private readonly _additionalPrice: Money;
  private readonly _stock: Stock;

  private constructor(
    id: string,
    productId: string,
    type: string,
    name: string,
    additionalPrice: Money,
    stock: Stock,
  ) {
    this._id = id;
    this._productId = productId;
    this._type = type;
    this._name = name;
    this._additionalPrice = additionalPrice;
    this._stock = stock;

    this.validate();
  }

  /**
   * Factory method to create ProductOption instance
   */
  static create(
    id: string,
    productId: string,
    type: string,
    name: string,
    additionalPrice: Money,
    stock: Stock,
  ): ProductOption {
    return new ProductOption(id, productId, type, name, additionalPrice, stock);
  }

  private validate(): void {
    if (!this._id || this._id.trim() === '') {
      throw new Error('Option ID is required');
    }
    if (!this._productId || this._productId.trim() === '') {
      throw new Error('Product ID is required');
    }
    if (!this._type || this._type.trim() === '') {
      throw new Error('Option type is required');
    }
    if (!this._name || this._name.trim() === '') {
      throw new Error('Option name is required');
    }
  }

  /**
   * Calculate total price (base + additional)
   * Used in BR-PROD-07: Total amount calculation
   */
  calculatePrice(basePrice: Money): Money {
    return basePrice.add(this._additionalPrice);
  }

  /**
   * Get stock status
   * BR-PROD-06: Stock status displayed per option
   */
  getStockStatus(): StockStatus {
    return this._stock.getStatus();
  }

  /**
   * Check if option is selectable
   * BR-PROD-08: Out-of-stock options cannot be selected
   */
  isSelectable(): boolean {
    return this._stock.isAvailable();
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get productId(): string {
    return this._productId;
  }

  get type(): string {
    return this._type;
  }

  get name(): string {
    return this._name;
  }

  get additionalPrice(): Money {
    return this._additionalPrice;
  }

  get stock(): Stock {
    return this._stock;
  }
}
