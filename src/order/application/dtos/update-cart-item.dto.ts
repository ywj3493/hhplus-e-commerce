import { Cart } from '@/order/domain/entities/cart.entity';
import { InvalidQuantityException } from '@/order/domain/order.exceptions';

export interface UpdateCartItemInputData {
  userId: string;
  cartItemId: string;
  quantity: number;
}

export class UpdateCartItemInput {
  userId: string;
  cartItemId: string;
  quantity: number;

  constructor(data: UpdateCartItemInputData) {
    this.userId = data.userId;
    this.cartItemId = data.cartItemId;
    this.quantity = data.quantity;
    this.validate();
  }

  private validate(): void {
    if (this.quantity < 0) {
      throw new InvalidQuantityException('수량은 0 이상이어야 합니다.');
    }
  }
}

export class UpdateCartItemOutput {
  cartItemId: string;
  quantity: number;
  subtotal: number;

  constructor(cartItemId: string, quantity: number, subtotal: number) {
    this.cartItemId = cartItemId;
    this.quantity = quantity;
    this.subtotal = subtotal;
  }

  static from(cart: Cart, itemId: string): UpdateCartItemOutput {
    const item = cart.findItem(itemId);

    // BR-CART-07: 수량이 0 이하가 되면 아이템 자동 삭제
    if (!item) {
      return new UpdateCartItemOutput(itemId, 0, 0);
    }

    return new UpdateCartItemOutput(
      item.id,
      item.quantity,
      item.getSubtotal().amount,
    );
  }
}
