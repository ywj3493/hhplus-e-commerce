import { Inject, Injectable } from '@nestjs/common';
import { ProductRepository } from '@/product/domain/repositories/product.repository';
import { PRODUCT_REPOSITORY } from '@/product/domain/repositories/tokens';
import { ProductNotFoundException } from '@/product/domain/product.exceptions';
import { GetProductDetailInput } from '@/product/application/dtos/get-product-detail.dto';
import {
  GetProductDetailOutput,
  ProductOptionDetail,
  ProductOptionGroup,
} from '@/product/application/dtos/get-product-detail.dto';

/**
 * 상품 상세 조회 Use Case
 * UC-PROD-02: 상품 상세 조회
 * 그룹화된 옵션과 함께 상품 상세 정보 조회를 조정
 */
@Injectable()
export class GetProductDetailUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
  ) {}

  /**
   * Use Case 실행
   * @param input - 상품 ID
   * @returns 그룹화된 옵션과 함께 상품 상세 정보
   * @throws ProductNotFoundException 상품을 찾을 수 없는 경우
   */
  async execute(input: GetProductDetailInput): Promise<GetProductDetailOutput> {
    // Repository에서 상품 조회
    const product = await this.productRepository.findById(input.productId);

    if (!product) {
      throw new ProductNotFoundException(input.productId);
    }

    // 도메인에서 그룹화된 옵션 조회 (BR-PROD-05: 타입별 그룹화)
    const groupedOptions = product.getGroupedOptions();

    // Output DTO로 매핑
    const optionGroups = groupedOptions.map(
      (group) =>
        new ProductOptionGroup(
          group.type,
          group.options.map(
            (opt) =>
              new ProductOptionDetail(
                opt.id,
                opt.name,
                opt.additionalPrice,
                opt.stockStatus, // BR-PROD-06: 옵션별 재고 상태
                opt.isSelectable, // BR-PROD-08: 재고 기반 선택 가능 여부
              ),
          ),
        ),
    );

    return new GetProductDetailOutput(
      product.id,
      product.name,
      product.price,
      product.description,
      product.imageUrl,
      optionGroups,
    );
  }
}
