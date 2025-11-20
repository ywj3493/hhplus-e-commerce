import { ApiProperty } from '@nestjs/swagger';
import { GetCartOutput, CartItemData } from '@/order/application/dtos/get-cart.dto';

export class CartResponseDto {
  @ApiProperty({ description: '장바구니 아이템 목록', type: [CartItemData] })
  items: CartItemData[];

  @ApiProperty({ description: '총 금액', example: 4980000 })
  totalAmount: number;

  @ApiProperty({ description: '아이템 개수', example: 2 })
  itemCount: number;

  static from(output: GetCartOutput): CartResponseDto {
    const dto = new CartResponseDto();
    dto.items = output.items;
    dto.totalAmount = output.totalAmount;
    dto.itemCount = output.itemCount;
    return dto;
  }
}
