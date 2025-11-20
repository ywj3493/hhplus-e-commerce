import { v4 as uuidv4 } from 'uuid';
import { CartItem } from '@/order/domain/entities/cart-item.entity';
import { Price } from '@/product/domain/entities/price.vo';

/**
 * OrderItem 생성을 위한 데이터 인터페이스
 */
export interface OrderItemCreateData {
  orderId: string;
  productId: string;
  productName: string;
  productOptionId: string | null;
  productOptionName: string | null;
  price: Price;
  quantity: number;
}

/**
 * OrderItem 재구성을 위한 데이터 인터페이스
 */
export interface OrderItemData {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productOptionId: string | null;
  productOptionName: string | null;
  price: Price;
  quantity: number;
  createdAt: Date;
}

/**
 * OrderItem Entity
 * 주문 항목을 관리
 * BR-ORDER-02: 주문 시점의 상품 정보를 스냅샷으로 저장
 */
export class OrderItem {
  private readonly _id: string;
  private readonly _orderId: string;
  private readonly _productId: string;
  private readonly _productName: string; // Snapshot
  private readonly _productOptionId: string | null;
  private readonly _productOptionName: string | null; // Snapshot
  private readonly _price: Price; // Snapshot
  private readonly _quantity: number;
  private readonly _createdAt: Date;

  private constructor(
    id: string,
    orderId: string,
    productId: string,
    productName: string,
    productOptionId: string | null,
    productOptionName: string | null,
    price: Price,
    quantity: number,
    createdAt: Date,
  ) {
    this._id = id;
    this._orderId = orderId;
    this._productId = productId;
    this._productName = productName;
    this._productOptionId = productOptionId;
    this._productOptionName = productOptionName;
    this._price = price;
    this._quantity = quantity;
    this._createdAt = createdAt;

    this.validate();
  }

  /**
   * CartItem으로부터 OrderItem을 생성하는 팩토리 메서드
   * BR-ORDER-02: 상품 정보를 스냅샷으로 저장
   */
  static fromCartItem(
    orderId: string,
    cartItem: CartItem,
    productOptionName: string | null,
  ): OrderItem {
    return new OrderItem(
      uuidv4(),
      orderId,
      cartItem.productId,
      cartItem.productName, // Snapshot
      cartItem.productOptionId,
      productOptionName, // Snapshot
      cartItem.getPrice(), // Snapshot
      cartItem.quantity,
      new Date(),
    );
  }

  /**
   * 영속화된 데이터로부터 OrderItem을 재구성하는 팩토리 메서드
   */
  static reconstitute(data: OrderItemData): OrderItem {
    return new OrderItem(
      data.id,
      data.orderId,
      data.productId,
      data.productName,
      data.productOptionId,
      data.productOptionName,
      data.price,
      data.quantity,
      data.createdAt,
    );
  }

  /**
   * 주문 항목 생성 데이터로부터 OrderItem을 생성하는 팩토리 메서드
   */
  static create(data: OrderItemCreateData): OrderItem {
    return new OrderItem(
      uuidv4(),
      data.orderId,
      data.productId,
      data.productName,
      data.productOptionId,
      data.productOptionName,
      data.price,
      data.quantity,
      new Date(),
    );
  }

  private validate(): void {
    if (this._quantity < 1) {
      throw new Error('주문 수량은 1 이상이어야 합니다.');
    }
    if (this._price.amount < 0) {
      throw new Error('주문 항목 가격은 음수일 수 없습니다.');
    }
  }

  /**
   * 소계 계산 (가격 × 수량)
   */
  getSubtotal(): Price {
    return this._price.multiply(this._quantity);
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get orderId(): string {
    return this._orderId;
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

  get productOptionName(): string | null {
    return this._productOptionName;
  }

  get price(): Price {
    return this._price;
  }

  get quantity(): number {
    return this._quantity;
  }

  get createdAt(): Date {
    return this._createdAt;
  }
}
