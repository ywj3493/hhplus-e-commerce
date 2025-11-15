/**
 * 상품 상세 조회 Use Case Input DTO
 */
export class GetProductDetailInput {
  readonly productId: string;

  constructor(productId: string) {
    this.productId = productId;
    this.validate();
  }

  private validate(): void {
    if (!this.productId || this.productId.trim() === '') {
      throw new Error('상품 ID는 필수입니다');
    }
  }
}
