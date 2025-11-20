import { AddCartItemOutput } from '@/order/application/dtos/add-cart-item.dto';
import { UpdateCartItemOutput } from '@/order/application/dtos/update-cart-item.dto';

export class CartItemResponseDto {
  cartItemId: string;
  quantity: number;
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
