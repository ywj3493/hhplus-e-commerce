import { Inject, Injectable } from '@nestjs/common';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../domain/repositories/product.repository';
import { ProductNotFoundException } from '../../domain/exceptions/product-not-found.exception';
import { GetProductDetailInput } from '../dtos/get-product-detail.input';
import {
  GetProductDetailOutput,
  ProductOptionDetail,
  ProductOptionGroup,
} from '../dtos/get-product-detail.output';

/**
 * Get Product Detail Use Case
 * UC-PROD-02: Product Detail Retrieval
 * Orchestrates product detail retrieval with grouped options
 */
@Injectable()
export class GetProductDetailUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  /**
   * Execute use case
   * @param input - Product ID
   * @returns Product detail with grouped options
   * @throws ProductNotFoundException if product not found
   */
  async execute(input: GetProductDetailInput): Promise<GetProductDetailOutput> {
    // Fetch product from repository
    const product = await this.productRepository.findById(input.productId);

    if (!product) {
      throw new ProductNotFoundException(input.productId);
    }

    // Get grouped options from domain (BR-PROD-05: grouped by type)
    const groupedOptions = product.getGroupedOptions();

    // Map to output DTOs
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
                opt.stockStatus, // BR-PROD-06: Stock status per option
                opt.isSelectable, // BR-PROD-08: Selectability based on stock
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
