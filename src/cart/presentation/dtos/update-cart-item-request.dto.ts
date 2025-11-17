import { IsNumber, Min } from 'class-validator';

export class UpdateCartItemRequestDto {
  @IsNumber()
  @Min(0, { message: '수량은 0 이상이어야 합니다.' })
  quantity: number;
}
