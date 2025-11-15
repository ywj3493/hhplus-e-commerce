/**
 * 상품 목록 조회 Use Case Input DTO
 * BR-PROD-02: 기본 페이지 크기 - 10개 항목
 * BR-PROD-03: 최대 페이지 크기 - 100개 항목
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
      throw new Error('페이지는 1 이상이어야 합니다');
    }
    if (this.limit < 1 || this.limit > 100) {
      throw new Error('페이지 크기는 1-100 사이여야 합니다');
    }
  }
}
