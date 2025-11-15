export class InvalidProductIdException extends Error {
  constructor(productId: string) {
    super(`Invalid product ID format: ${productId}`);
    this.name = 'InvalidProductIdException';
  }
}
