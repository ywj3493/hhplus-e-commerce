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
import { GetProductsInput } from '../../application/dtos/get-products.input';
import { GetProductDetailInput } from '../../application/dtos/get-product-detail.input';
import { GetProductsQueryDto } from '../dtos/get-products-query.dto';
import { ProductListResponseDto } from '../dtos/product-list-response.dto';
import { GetProductDetailParamDto } from '../dtos/get-product-detail-param.dto';
import { ProductDetailResponseDto } from '../dtos/product-detail-response.dto';
import { ProductNotFoundException } from '../../domain/exceptions/product-not-found.exception';

/**
 * Product Controller
 * Handles HTTP requests for product operations
 */
@ApiTags('products')
@Controller('products')
export class ProductController {
  constructor(
    private readonly getProductsUseCase: GetProductsUseCase,
    private readonly getProductDetailUseCase: GetProductDetailUseCase,
  ) {}

  /**
   * Get product list with pagination
   * UC-PROD-01: Product List Retrieval
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
    type: ProductListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid pagination parameters',
  })
  async getProducts(@Query() query: GetProductsQueryDto): Promise<ProductListResponseDto> {
    try {
      // Map HTTP DTO to Use Case input
      const input = new GetProductsInput(query.page, query.limit);

      // Execute use case
      const output = await this.getProductsUseCase.execute(input);

      // Map Use Case output to HTTP response
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
   * Get product detail by ID
   * UC-PROD-02: Product Detail Retrieval
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
    type: ProductDetailResponseDto,
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
    @Param() param: GetProductDetailParamDto,
  ): Promise<ProductDetailResponseDto> {
    try {
      // Map HTTP DTO to Use Case input
      const input = new GetProductDetailInput(param.id);

      // Execute use case
      const output = await this.getProductDetailUseCase.execute(input);

      // Map Use Case output to HTTP response
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
