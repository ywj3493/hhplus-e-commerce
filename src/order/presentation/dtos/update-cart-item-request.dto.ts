import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class UpdateCartItemRequestDto {
  @ApiProperty({ description: '수량 (0이면 삭제)', example: 3, minimum: 0 })
  @IsNumber()
  @Min(0, { message: '수량은 0 이상이어야 합니다.' })
  quantity: number;
}
