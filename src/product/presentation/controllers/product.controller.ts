import {
  Controller,
  Get,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetProductsUseCase } from '../../application/use-cases/get-products.use-case';
import { GetProductDetailUseCase } from '../../application/use-cases/get-product-detail.use-case';
import { GetProductsInput } from '../../application/dtos/get-products.dto';
import { GetProductDetailInput } from '../../application/dtos/get-product-detail.dto';
import { GetProductsQuery } from '../dtos/get-products-query.dto';
import { ProductListResponse } from '../dtos/product-list-response.dto';
import { GetProductDetailParam } from '../dtos/get-product-detail-param.dto';
import { ProductDetailResponse } from '../dtos/product-detail-response.dto';
import { ProductNotFoundException } from '../../domain/product.exceptions';

/**
 * Product Controller
 * 상품 관련 HTTP 요청을 처리
 */
@ApiTags('products')
@Controller('products')
export class ProductController {
  constructor(
    private readonly getProductsUseCase: GetProductsUseCase,
    private readonly getProductDetailUseCase: GetProductDetailUseCase,
  ) {}

  /**
   * 페이지네이션을 사용한 상품 목록 조회
   * UC-PROD-01: 상품 목록 조회
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get product list',
    description: 'Retrieve paginated product list with stock status',
  })
  @ApiResponse({
    status: 200,
    description: 'Product list retrieved successfully',
    type: ProductListResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid pagination parameters',
  })
  async getProducts(@Query() query: GetProductsQuery): Promise<ProductListResponse> {
    try {
      // HTTP DTO를 Use Case input으로 매핑
      const input = new GetProductsInput(query.page, query.limit);

      // Use case 실행
      const output = await this.getProductsUseCase.execute(input);

      // Use Case output을 HTTP response로 매핑
      return {
        items: output.items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          imageUrl: item.imageUrl,
          stockStatus: item.stockStatus.toString(),
        })),
        total: output.total,
        page: output.page,
        limit: output.limit,
        totalPages: output.totalPages,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * ID로 상품 상세 조회
   * UC-PROD-02: 상품 상세 조회
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get product detail',
    description: 'Retrieve product detail with grouped options',
  })
  @ApiResponse({
    status: 200,
    description: 'Product detail retrieved successfully',
    type: ProductDetailResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid product ID format',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async getProductDetail(
    @Param() param: GetProductDetailParam,
  ): Promise<ProductDetailResponse> {
    try {
      // HTTP DTO를 Use Case input으로 매핑
      const input = new GetProductDetailInput(param.id);

      // Use case 실행
      const output = await this.getProductDetailUseCase.execute(input);

      // Use Case output을 HTTP response로 매핑
      return {
        id: output.id,
        name: output.name,
        price: output.price.amount,
        description: output.description,
        imageUrl: output.imageUrl,
        optionGroups: output.optionGroups.map((group) => ({
          type: group.type,
          options: group.options.map((opt) => ({
            id: opt.id,
            name: opt.name,
            additionalPrice: opt.additionalPrice.amount,
            stockStatus: opt.stockStatus.toString(),
            isSelectable: opt.isSelectable,
          })),
        })),
      };
    } catch (error) {
      if (error instanceof ProductNotFoundException) {
        throw new NotFoundException('Product not found');
      }
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
