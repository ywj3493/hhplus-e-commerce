import { ApiProperty } from '@nestjs/swagger';
import { AddCartItemOutput } from '@/order/application/dtos/add-cart-item.dto';
import { UpdateCartItemOutput } from '@/order/application/dtos/update-cart-item.dto';

export class CartItemResponseDto {
  @ApiProperty({ description: '장바구니 아이템 ID', example: 'cart-item-1' })
  cartItemId: string;

  @ApiProperty({ description: '수량', example: 2 })
  quantity: number;

  @ApiProperty({ description: '소계', example: 4980000 })
  subtotal: number;

  static from(
    output: AddCartItemOutput | UpdateCartItemOutput,
  ): CartItemResponseDto {
    const dto = new CartItemResponseDto();
    dto.cartItemId = output.cartItemId;
    dto.quantity = output.quantity;
    dto.subtotal = output.subtotal;
    return dto;
  }
}
