import { GetCartOutput, CartItemData } from '@/order/application/dtos/get-cart.dto';

export class CartResponseDto {
  items: CartItemData[];
  totalAmount: number;
  itemCount: number;

  static from(output: GetCartOutput): CartResponseDto {
    const dto = new CartResponseDto();
    dto.items = output.items;
    dto.totalAmount = output.totalAmount;
    dto.itemCount = output.itemCount;
    return dto;
  }
}
