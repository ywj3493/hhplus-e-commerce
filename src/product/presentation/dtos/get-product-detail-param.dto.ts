import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Path parameters for GET /products/:id endpoint
 */
export class GetProductDetailParam {
  @ApiProperty({
    description: 'Product ID',
    example: 'product-001',
  })
  @IsString({ message: 'Invalid product ID format' })
  @IsNotEmpty({ message: 'Product ID is required' })
  id: string;
}
