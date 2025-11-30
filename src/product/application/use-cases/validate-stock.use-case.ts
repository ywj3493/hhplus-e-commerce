import { Injectable, Inject } from '@nestjs/common';
import { ProductRepository } from '@/product/domain/repositories/product.repository';
import { PRODUCT_REPOSITORY } from '@/product/domain/repositories/tokens';
import { StockManagementService } from '@/product/domain/services/stock-management.service';
import { ProductNotFoundException } from '@/product/domain/product.exceptions';

/**
 * ValidateStockUseCase
 * 재고 가용성 검증 Use Case (Application Layer)
 *
 * 책임:
 * - 상품 조회
 * - 도메인 서비스 호출 (StockManagementService)
 *
 * Note:
 * - 이 Use Case는 읽기 전용이므로 락이 필요 없음
 * - 장바구니 추가 시 재고 확인 용도
 *
 * BR-CART-02: 장바구니 추가 시 재고 확인
 */
@Injectable()
export class ValidateStockUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
    private readonly stockManagementService: StockManagementService,
  ) {}

  /**
   * 재고 가용성 검증 실행
   *
   * @param productId 상품 ID
   * @param optionId 옵션 ID
   * @param quantity 요청 수량
   * @throws ProductNotFoundException 상품 또는 옵션을 찾을 수 없을 때
   * @throws InsufficientStockException 재고 부족 시
   */
  async execute(
    productId: string,
    optionId: string,
    quantity: number,
  ): Promise<void> {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new ProductNotFoundException('상품을 찾을 수 없습니다.');
    }

    this.stockManagementService.validateStockAvailability(
      product,
      optionId,
      quantity,
    );
  }
}
