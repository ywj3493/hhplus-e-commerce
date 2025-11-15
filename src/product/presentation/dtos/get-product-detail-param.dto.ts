import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/**
 * Path parameters for GET /products/:id endpoint
 */
export class GetProductDetailParamDto {
  @ApiProperty({
    description: 'Product ID (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID('4', { message: 'Invalid product ID format' })
  id: string;
}
