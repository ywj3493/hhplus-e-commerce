import { ApiProperty } from '@nestjs/swagger';

/**
 * Product item in list response
 */
export class ProductItemDto {
  @ApiProperty({ description: 'Product ID (UUID)', example: '550e8400-e29b-41d4-a716-446655440001' })
  id: string;

  @ApiProperty({ description: 'Product name', example: 'Basic T-Shirt' })
  name: string;

  @ApiProperty({ description: 'Product price in KRW', example: 29000 })
  price: number;

  @ApiProperty({ description: 'Product image URL', example: 'https://example.com/images/tshirt.jpg' })
  imageUrl: string;

  @ApiProperty({ description: 'Stock status', enum: ['In Stock', 'Out of Stock'], example: 'In Stock' })
  stockStatus: string;
}

/**
 * Product list response with pagination
 */
export class ProductListResponseDto {
  @ApiProperty({ description: 'List of products', type: [ProductItemDto] })
  items: ProductItemDto[];

  @ApiProperty({ description: 'Total number of products', example: 50 })
  total: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Number of items per page', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Total number of pages', example: 5 })
  totalPages: number;
}
