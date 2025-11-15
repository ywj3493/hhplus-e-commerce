/**
 * Money Value Object
 * Represents monetary values with business rules
 */
export class Money {
  private readonly _amount: number;

  private constructor(amount: number) {
    this._amount = amount;
  }

  /**
   * Factory method to create Money instance
   * @param amount - Amount in KRW
   * @throws Error if amount is negative
   */
  static from(amount: number): Money {
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }
    return new Money(amount);
  }

  get amount(): number {
    return this._amount;
  }

  /**
   * Add two money values
   */
  add(other: Money): Money {
    return Money.from(this._amount + other._amount);
  }

  /**
   * Multiply money by quantity
   */
  multiply(quantity: number): Money {
    if (quantity < 0) {
      throw new Error('Quantity cannot be negative');
    }
    return Money.from(this._amount * quantity);
  }

  /**
   * Check equality
   */
  equals(other: Money): boolean {
    return this._amount === other._amount;
  }

  /**
   * Format as KRW string
   */
  toString(): string {
    return `${this._amount.toLocaleString('ko-KR')} KRW`;
  }
}
