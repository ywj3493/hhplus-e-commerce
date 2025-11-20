import { Cart } from '@/order/domain/entities/cart.entity';
import { CartItemNotFoundException, InvalidQuantityException } from '@/order/domain/order.exceptions';

export interface AddCartItemInputData {
  userId: string;
  productId: string;
  productOptionId: string | null;
  quantity: number;
}

export class AddCartItemInput {
  userId: string;
  productId: string;
  productOptionId: string | null;
  quantity: number;

  constructor(data: AddCartItemInputData) {
    this.userId = data.userId;
    this.productId = data.productId;
    this.productOptionId = data.productOptionId;
    this.quantity = data.quantity;
    this.validate();
  }

  private validate(): void {
    if (this.quantity < 1) {
      throw new InvalidQuantityException('수량은 1 이상이어야 합니다.');
    }
  }
}

export class AddCartItemOutput {
  cartItemId: string;
  quantity: number;
  subtotal: number;

  constructor(cartItemId: string, quantity: number, subtotal: number) {
    this.cartItemId = cartItemId;
    this.quantity = quantity;
    this.subtotal = subtotal;
  }

  static from(cart: Cart, itemId: string): AddCartItemOutput {
    const item = cart.findItem(itemId);
    if (!item) {
      throw new CartItemNotFoundException();
    }

    return new AddCartItemOutput(
      item.id,
      item.quantity,
      item.getSubtotal().amount,
    );
  }
}
