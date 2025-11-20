import { ApiProperty } from '@nestjs/swagger';
import { Cart } from '@/order/domain/entities/cart.entity';

export class GetCartInput {
  userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }
}

export class CartItemData {
  @ApiProperty({ description: '장바구니 아이템 ID', example: 'cart-item-1' })
  id: string;

  @ApiProperty({ description: '상품 ID', example: 'product-1' })
  productId: string;

  @ApiProperty({ description: '상품 이름', example: '맥북 프로 14인치' })
  productName: string;

  @ApiProperty({ description: '상품 옵션 ID', example: 'option-1', nullable: true })
  productOptionId: string | null;

  @ApiProperty({ description: '단가', example: 2490000 })
  price: number;

  @ApiProperty({ description: '수량', example: 2 })
  quantity: number;

  @ApiProperty({ description: '소계 (단가 × 수량)', example: 4980000 })
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
