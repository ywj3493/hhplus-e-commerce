import { Cart } from '../../domain/entities/cart.entity';

export class GetCartInput {
  userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }
}

export interface CartItemData {
  id: string;
  productId: string;
  productName: string;
  productOptionId: string | null;
  price: number;
  quantity: number;
  subtotal: number;
}

export class GetCartOutput {
  items: CartItemData[];
  totalAmount: number;
  itemCount: number;

  constructor(items: CartItemData[], totalAmount: number, itemCount: number) {
    this.items = items;
    this.totalAmount = totalAmount;
    this.itemCount = itemCount;
  }

  static from(cart: Cart | null): GetCartOutput {
    // BR-CART-06: 빈 장바구니 처리
    if (!cart) {
      return new GetCartOutput([], 0, 0);
    }

    const items = cart.getItems().map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productOptionId: item.productOptionId,
      price: item.getPrice().amount,
      quantity: item.quantity,
      subtotal: item.getSubtotal().amount,
    }));

    return new GetCartOutput(
      items,
      cart.getTotalAmount().amount,
      items.length,
    );
  }
}
