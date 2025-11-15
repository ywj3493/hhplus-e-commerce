/**
 * Get Product Detail Use Case Input DTO
 */
export class GetProductDetailInput {
  readonly productId: string;

  constructor(productId: string) {
    this.productId = productId;
    this.validate();
  }

  private validate(): void {
    if (!this.productId || this.productId.trim() === '') {
      throw new Error('Product ID is required');
    }
  }
}
