import { IsString, IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator';

export class AddCartItemRequestDto {
  @IsString()
  @IsNotEmpty({ message: '상품 ID는 필수입니다.' })
  productId: string;

  @IsString()
  @IsOptional()
  productOptionId?: string;

  @IsNumber()
  @Min(1, { message: '수량은 1 이상이어야 합니다.' })
  quantity: number;
}
