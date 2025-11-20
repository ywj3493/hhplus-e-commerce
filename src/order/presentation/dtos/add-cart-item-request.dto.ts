import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator';

export class AddCartItemRequestDto {
  @ApiProperty({ description: '상품 ID', example: 'product-1' })
  @IsString()
  @IsNotEmpty({ message: '상품 ID는 필수입니다.' })
  productId: string;

  @ApiProperty({ description: '상품 옵션 ID (선택)', example: 'option-1', required: false })
  @IsString()
  @IsOptional()
  productOptionId?: string;

  @ApiProperty({ description: '수량', example: 2, minimum: 1 })
  @IsNumber()
  @Min(1, { message: '수량은 1 이상이어야 합니다.' })
  quantity: number;
}
