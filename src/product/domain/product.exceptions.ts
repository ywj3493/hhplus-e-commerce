/**
 * Product 도메인 예외 클래스
 * Product 도메인에서 발생하는 모든 예외를 정의
 */

/**
 * 상품을 찾을 수 없을 때 발생하는 예외
 */
export class ProductNotFoundException extends Error {
  constructor(productId: string) {
    super(`상품을 찾을 수 없습니다: ${productId}`);
    this.name = 'ProductNotFoundException';
  }
}

/**
 * 잘못된 상품 ID 형식일 때 발생하는 예외
 */
export class InvalidProductIdException extends Error {
  constructor(productId: string) {
    super(`잘못된 상품 ID 형식입니다: ${productId}`);
    this.name = 'InvalidProductIdException';
  }
}

/**
 * 재고 부족 시 발생하는 예외
 */
export class InsufficientStockException extends Error {
  constructor(requestedQuantity: number, availableQuantity: number) {
    super(`재고 부족: 요청 ${requestedQuantity}, 재고 ${availableQuantity}`);
    this.name = 'InsufficientStockException';
  }
}
