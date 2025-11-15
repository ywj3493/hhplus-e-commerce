/**
 * Get Products Use Case Input DTO
 * BR-PROD-02: Default page size - 10 items
 * BR-PROD-03: Maximum page size - 100 items
 */
export class GetProductsInput {
  readonly page: number;
  readonly limit: number;

  constructor(page: number = 1, limit: number = 10) {
    this.page = page;
    this.limit = limit;
    this.validate();
  }

  private validate(): void {
    if (this.page < 1) {
      throw new Error('Page must be 1 or greater');
    }
    if (this.limit < 1 || this.limit > 100) {
      throw new Error('Page size must be between 1-100');
    }
  }
}
