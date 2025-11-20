import { v4 as uuidv4 } from 'uuid';
import { Money } from '@/product/domain/entities/money.vo';
import { InvalidQuantityException } from '@/order/domain/order.exceptions';

export interface CartItemCreateData {
  cartId: string;
  productId: string;
  productName: string;
  productOptionId: string | null;
  price: Money;
  quantity: number;
}

export interface CartItemData {
  id: string;
  cartId: string;
  productId: string;
  productName: string;
  productOptionId: string | null;
  price: Money;
  quantity: number;
}

export class CartItem {
  private readonly _id: string;
  private readonly _cartId: string;
  private readonly _productId: string;
  private readonly _productName: string;
  private readonly _productOptionId: string | null;
  private readonly _price: Money;
  private _quantity: number;

  private constructor(
    id: string,
    cartId: string,
    productId: string,
    productName: string,
    productOptionId: string | null,
    price: Money,
    quantity: number,
  ) {
    this._id = id;
    this._cartId = cartId;
    this._productId = productId;
    this._productName = productName;
    this._productOptionId = productOptionId;
    this._price = price;
    this._quantity = quantity;
  }

  /**
   * CartItem 인스턴스를 생성하는 팩토리 메서드
   * BR-CART-03: 수량은 1 이상이어야 함
   */
  static create(data: CartItemCreateData): CartItem {
    const item = new CartItem(
      uuidv4(),
      data.cartId,
      data.productId,
      data.productName,
      data.productOptionId,
      data.price,
      data.quantity,
    );

    item.validate();
    return item;
  }

  /**
   * 영속화된 데이터로부터 CartItem을 재구성하는 팩토리 메서드
   * 이미 검증된 데이터이므로 검증을 수행하지 않음
   */
  static reconstitute(data: CartItemData): CartItem {
    return new CartItem(
      data.id,
      data.cartId,
      data.productId,
      data.productName,
      data.productOptionId,
      data.price,
      data.quantity,
    );
  }

  /**
   * BR-CART-03: 수량은 1 이상이어야 함
   */
  private validate(): void {
    if (this._quantity < 1) {
      throw new InvalidQuantityException('수량은 1 이상이어야 합니다.');
    }
  }

  /**
   * 동일한 상품인지 확인 (상품 ID + 옵션 ID)
   */
  isSameProduct(productId: string, productOptionId: string | null): boolean {
    return (
      this._productId === productId &&
      this._productOptionId === productOptionId
    );
  }

  /**
   * 수량 증가
   */
  increaseQuantity(amount: number): void {
    if (amount <= 0) {
      throw new InvalidQuantityException('증가량은 1 이상이어야 합니다.');
    }
    this._quantity += amount;
  }

  /**
   * 수량 변경
   * BR-CART-03: 수량은 1 이상이어야 함
   */
  updateQuantity(quantity: number): void {
    if (quantity < 1) {
      throw new InvalidQuantityException('수량은 1 이상이어야 합니다.');
    }
    this._quantity = quantity;
  }

  /**
   * 소계 계산 (가격 × 수량)
   */
  getSubtotal(): Money {
    return this._price.multiply(this._quantity);
  }

  /**
   * 가격 반환 (Money VO)
   */
  getPrice(): Money {
    return this._price;
  }

  // Getters for simple fields
  get id(): string {
    return this._id;
  }

  get cartId(): string {
    return this._cartId;
  }

  get productId(): string {
    return this._productId;
  }

  get productName(): string {
    return this._productName;
  }

  get productOptionId(): string | null {
    return this._productOptionId;
  }

  get quantity(): number {
    return this._quantity;
  }
}
