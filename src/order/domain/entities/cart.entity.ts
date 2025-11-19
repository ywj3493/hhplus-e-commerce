import { v4 as uuidv4 } from 'uuid';
import { CartItem } from './cart-item.entity';
import { Money } from '../../../product/domain/entities/money.vo';
import { CartItemNotFoundException } from '../order.exceptions';

export interface AddItemData {
  productId: string;
  productName: string;
  productOptionId: string | null;
  price: Money;
  quantity: number;
}

export interface CartData {
  id: string;
  userId: string;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
}

export class Cart {
  private readonly _id: string;
  private readonly _userId: string;
  private _items: CartItem[];
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: string,
    userId: string,
    items: CartItem[],
    createdAt: Date,
    updatedAt: Date,
  ) {
    this._id = id;
    this._userId = userId;
    this._items = items;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  /**
   * Cart 인스턴스를 생성하는 팩토리 메서드
   */
  static create(userId: string): Cart {
    return new Cart(
      uuidv4(),
      userId,
      [],
      new Date(),
      new Date(),
    );
  }

  /**
   * 영속화된 데이터로부터 Cart를 재구성하는 팩토리 메서드
   */
  static reconstitute(data: CartData): Cart {
    return new Cart(
      data.id,
      data.userId,
      data.items,
      data.createdAt,
      data.updatedAt,
    );
  }

  /**
   * 장바구니에 아이템 추가
   * BR-CART-01: 동일 상품+옵션이 있으면 수량만 증가
   *
   * @returns 추가된 아이템 ID (신규 아이템 생성 또는 기존 아이템)
   */
  addItem(itemData: AddItemData): string {
    // BR-CART-01: 중복 아이템 처리
    const existingItem = this._items.find((item) =>
      item.isSameProduct(itemData.productId, itemData.productOptionId),
    );

    if (existingItem) {
      existingItem.increaseQuantity(itemData.quantity);
      this._updatedAt = new Date();
      return existingItem.id;
    } else {
      const newItem = CartItem.create({
        cartId: this._id,
        productId: itemData.productId,
        productName: itemData.productName,
        productOptionId: itemData.productOptionId,
        price: itemData.price,
        quantity: itemData.quantity,
      });
      this._items.push(newItem);
      this._updatedAt = new Date();
      return newItem.id;
    }
  }

  /**
   * 아이템 수량 변경
   * BR-CART-07: 수량이 0 이하가 되면 아이템 자동 삭제
   */
  updateItemQuantity(itemId: string, quantity: number): void {
    const item = this.findItem(itemId);
    if (!item) {
      throw new CartItemNotFoundException();
    }

    // BR-CART-07: 수량이 0 이하면 아이템 삭제
    if (quantity <= 0) {
      this.removeItem(itemId);
      return;
    }

    item.updateQuantity(quantity);
    this._updatedAt = new Date();
  }

  /**
   * 아이템 삭제
   */
  removeItem(itemId: string): void {
    const index = this._items.findIndex((item) => item.id === itemId);
    if (index === -1) {
      throw new CartItemNotFoundException();
    }

    this._items.splice(index, 1);
    this._updatedAt = new Date();
  }

  /**
   * 장바구니 전체 비우기
   * @returns 삭제된 아이템 개수
   */
  clearAll(): number {
    const deletedCount = this._items.length;
    this._items = [];
    this._updatedAt = new Date();
    return deletedCount;
  }

  /**
   * 총 금액 계산
   * BR-CART-05: 총 금액 = Σ (아이템 가격 × 수량)
   */
  getTotalAmount(): Money {
    if (this._items.length === 0) {
      return Money.from(0);
    }

    return this._items.reduce(
      (sum, item) => sum.add(item.getSubtotal()),
      Money.from(0),
    );
  }

  /**
   * 특정 아이템 찾기
   */
  findItem(itemId: string): CartItem | undefined {
    return this._items.find((item) => item.id === itemId);
  }

  /**
   * 아이템 목록 반환
   */
  getItems(): CartItem[] {
    return [...this._items]; // 불변성 보장
  }

  // Getters for simple fields
  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
