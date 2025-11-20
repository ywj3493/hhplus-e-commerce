import { Injectable, Inject } from '@nestjs/common';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '@/product/domain/repositories/product.repository';
import { InsufficientStockException } from '@/order/domain/order.exceptions';
import { ProductNotFoundException } from '@/product/domain/product.exceptions';

/**
 * 장바구니 재고 검증 도메인 서비스
 *
 * 목적: 재고 검증 로직을 도메인 서비스로 분리하여
 *      Application Layer의 비즈니스 로직 누출 방지
 *
 * 책임:
 * - Product 조회 (ProductRepository 사용)
 * - ProductOption을 통한 Stock 조회
 * - 재고 가용성 검증 (BR-CART-02)
 * - 재고 부족 시 예외 발생
 */
@Injectable()
export class CartStockValidationService {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  /**
   * 요청한 수량이 재고 범위 내인지 검증
   *
   * BR-CART-02: 재고를 초과할 수 없음
   *
   * @param productId 상품 ID
   * @param productOptionId 상품 옵션 ID
   * @param requestedQuantity 요청 수량
   * @throws ProductNotFoundException 상품 또는 옵션을 찾을 수 없을 때
   * @throws InsufficientStockException 재고 부족 시
   */
  async validateAvailability(
    productId: string,
    productOptionId: string | null,
    requestedQuantity: number,
  ): Promise<void> {
    // 1. Product 조회
    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new ProductNotFoundException('상품을 찾을 수 없습니다.');
    }

    // 2. ProductOption 찾기
    const option = product
      .options
      .find((opt) => opt.id === productOptionId);
    if (!option) {
      throw new ProductNotFoundException('상품 옵션을 찾을 수 없습니다.');
    }

    // 3. Stock 재고 검증
    const stock = option.stock;
    if (stock.availableQuantity < requestedQuantity) {
      throw new InsufficientStockException(
        `재고가 부족합니다. (요청: ${requestedQuantity}, 가용: ${stock.availableQuantity})`,
      );
    }
  }
}
