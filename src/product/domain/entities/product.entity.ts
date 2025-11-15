import { Money } from '../value-objects/money.vo';
import { StockStatus } from '../value-objects/stock-status.vo';
import { ProductOption } from './product-option.entity';

/**
 * Grouped options by type
 * BR-PROD-05: Options grouped by type field
 */
export interface GroupedOptions {
  type: string;
  options: Array<{
    id: string;
    name: string;
    additionalPrice: Money;
    stockStatus: StockStatus;
    isSelectable: boolean;
  }>;
}

/**
 * Product Entity
 * Main aggregate root for product domain
 * BR-PROD-05: Options grouped by type
 */
export class Product {
  private readonly _id: string;
  private readonly _name: string;
  private readonly _price: Money;
  private readonly _description: string;
  private readonly _imageUrl: string;
  private readonly _options: ProductOption[];
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  private constructor(
    id: string,
    name: string,
    price: Money,
    description: string,
    imageUrl: string,
    options: ProductOption[],
    createdAt: Date,
    updatedAt: Date,
  ) {
    this._id = id;
    this._name = name;
    this._price = price;
    this._description = description;
    this._imageUrl = imageUrl;
    this._options = options;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;

    this.validate();
  }

  /**
   * Factory method to create Product instance
   */
  static create(
    id: string,
    name: string,
    price: Money,
    description: string,
    imageUrl: string,
    options: ProductOption[],
    createdAt: Date,
    updatedAt: Date,
  ): Product {
    return new Product(id, name, price, description, imageUrl, options, createdAt, updatedAt);
  }

  private validate(): void {
    if (!this._id || this._id.trim() === '') {
      throw new Error('Product ID is required');
    }
    if (!this._name || this._name.trim() === '') {
      throw new Error('Product name is required');
    }
    if (!this._imageUrl || this._imageUrl.trim() === '') {
      throw new Error('Product image URL is required');
    }
  }

  /**
   * Get overall stock status
   * Product is in stock if at least one option is available
   * BR-PROD-04: Stock status calculation
   */
  getStockStatus(): StockStatus {
    if (this._options.length === 0) {
      return StockStatus.outOfStock();
    }

    const hasAvailableOption = this._options.some((option) => option.isSelectable());
    return hasAvailableOption ? StockStatus.inStock() : StockStatus.outOfStock();
  }

  /**
   * Group options by type
   * BR-PROD-05: Options grouped by type field
   */
  getGroupedOptions(): GroupedOptions[] {
    const grouped = new Map<string, ProductOption[]>();

    // Group options by type
    for (const option of this._options) {
      const existing = grouped.get(option.type) || [];
      existing.push(option);
      grouped.set(option.type, existing);
    }

    // Convert to GroupedOptions array
    return Array.from(grouped.entries()).map(([type, options]) => ({
      type,
      options: options.map((opt) => ({
        id: opt.id,
        name: opt.name,
        additionalPrice: opt.additionalPrice,
        stockStatus: opt.getStockStatus(),
        isSelectable: opt.isSelectable(),
      })),
    }));
  }

  /**
   * Find option by ID
   */
  findOption(optionId: string): ProductOption | undefined {
    return this._options.find((opt) => opt.id === optionId);
  }

  /**
   * Calculate total price with option
   * BR-PROD-07: Total amount calculation = (Product price + Option additional price) × Quantity
   */
  calculateTotalPrice(optionId: string, quantity: number): Money {
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    const option = this.findOption(optionId);
    if (!option) {
      throw new Error(`Option not found: ${optionId}`);
    }

    const unitPrice = option.calculatePrice(this._price);
    return unitPrice.multiply(quantity);
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get price(): Money {
    return this._price;
  }

  get description(): string {
    return this._description;
  }

  get imageUrl(): string {
    return this._imageUrl;
  }

  get options(): ProductOption[] {
    return [...this._options]; // Return copy to maintain immutability
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
