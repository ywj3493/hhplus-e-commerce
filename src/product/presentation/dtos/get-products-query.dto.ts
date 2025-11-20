import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Query parameters for GET /products endpoint
 * BR-PROD-02: Default page size - 10 items
 * BR-PROD-03: Maximum page size - 100 items
 */
export class GetProductsQuery {
  @ApiProperty({
    description: 'Page number (1-indexed)',
    minimum: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Page must be 1 or greater' })
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Page size must be between 1-100' })
  @Max(100, { message: 'Page size must be between 1-100' })
  limit?: number = 10;
}
