import { ApiProperty } from '@nestjs/swagger';

/**
 * Product option in detail response
 */
export class ProductOptionDto {
  @ApiProperty({ description: 'Option ID', example: 'opt-color-red' })
  id: string;

  @ApiProperty({ description: 'Option name', example: 'Red' })
  name: string;

  @ApiProperty({ description: 'Additional price in KRW', example: 0 })
  additionalPrice: number;

  @ApiProperty({ description: 'Stock status', enum: ['In Stock', 'Out of Stock'], example: 'In Stock' })
  stockStatus: string;

  @ApiProperty({ description: 'Whether option is selectable', example: true })
  isSelectable: boolean;
}

/**
 * Grouped options by type
 */
export class ProductOptionGroupDto {
  @ApiProperty({ description: 'Option type', example: 'Color' })
  type: string;

  @ApiProperty({ description: 'Options in this group', type: [ProductOptionDto] })
  options: ProductOptionDto[];
}

/**
 * Product detail response
 */
export class ProductDetailResponseDto {
  @ApiProperty({ description: 'Product ID (UUID)', example: '550e8400-e29b-41d4-a716-446655440001' })
  id: string;

  @ApiProperty({ description: 'Product name', example: 'Basic T-Shirt' })
  name: string;

  @ApiProperty({ description: 'Product price in KRW', example: 29000 })
  price: number;

  @ApiProperty({ description: 'Product description', example: 'Comfortable cotton t-shirt' })
  description: string;

  @ApiProperty({ description: 'Product image URL', example: 'https://example.com/images/tshirt.jpg' })
  imageUrl: string;

  @ApiProperty({ description: 'Grouped options by type', type: [ProductOptionGroupDto] })
  optionGroups: ProductOptionGroupDto[];
}
