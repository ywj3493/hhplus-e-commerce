import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 페이지네이션 쿼리 DTO
 */
export class PaginationQueryDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(100) // BR-ORDER-11: 최대 페이지 크기 100
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10; // BR-ORDER-10: 기본 페이지 크기 10
}
