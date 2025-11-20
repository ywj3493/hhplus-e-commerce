import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

/**
 * 주문 생성 요청 DTO
 */
export class CreateOrderRequestDto {
  @ApiProperty({ description: '쿠폰 ID (선택)', example: 'user-coupon-1', required: false })
  @IsString()
  @IsOptional()
  couponId?: string;
}
