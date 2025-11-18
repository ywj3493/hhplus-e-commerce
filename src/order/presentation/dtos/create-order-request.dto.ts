import { IsString, IsOptional } from 'class-validator';

/**
 * 주문 생성 요청 DTO
 */
export class CreateOrderRequestDto {
  @IsString()
  @IsOptional()
  couponId?: string;
}
