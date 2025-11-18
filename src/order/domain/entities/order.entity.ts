import { v4 as uuidv4 } from 'uuid';
import { OrderStatus } from './order-status.enum';
import { OrderItem } from './order-item.entity';
import { Money } from '../../../product/domain/entities/money.vo';
import {
  OrderAlreadyCompletedException,
  InvalidOrderStateException,
  MinimumOrderAmountException,
} from '../order.exceptions';

/**
 * Order 생성을 위한 데이터 인터페이스
 */
export interface OrderCreateData {
  userId: string;
  items: OrderItem[];
  userCouponId: string | null;
  discountAmount: number;
}

/**
 * Order 재구성을 위한 데이터 인터페이스
 */
export interface OrderData {
  id: string;
  userId: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  userCouponId: string | null;
  reservationExpiresAt: Date;
  createdAt: Date;
  paidAt: Date | null;
  updatedAt: Date;
}

/**
 * Order Entity
 * 주문 Aggregate Root
 */
export class Order {
  private readonly _id: string;
  private readonly _userId: string;
  private _status: OrderStatus;
  private readonly _items: OrderItem[];
  private readonly _totalAmount: number;
  private readonly _discountAmount: number;
  private readonly _finalAmount: number;
  private readonly _userCouponId: string | null;
  private readonly _reservationExpiresAt: Date;
  private readonly _createdAt: Date;
  private _paidAt: Date | null;
  private _updatedAt: Date;

  // BR-ORDER-01: 재고 예약 기간 (10분)
  private static readonly RESERVATION_MINUTES = 10;

  private constructor(
    id: string,
    userId: string,
    status: OrderStatus,
    items: OrderItem[],
    totalAmount: number,
    discountAmount: number,
    finalAmount: number,
    userCouponId: string | null,
    reservationExpiresAt: Date,
    createdAt: Date,
    paidAt: Date | null,
    updatedAt: Date,
  ) {
    this._id = id;
    this._userId = userId;
    this._status = status;
    this._items = items;
    this._totalAmount = totalAmount;
    this._discountAmount = discountAmount;
    this._finalAmount = finalAmount;
    this._userCouponId = userCouponId;
    this._reservationExpiresAt = reservationExpiresAt;
    this._createdAt = createdAt;
    this._paidAt = paidAt;
    this._updatedAt = updatedAt;

    this.validate();
  }

  /**
   * Order 인스턴스를 생성하는 팩토리 메서드
   * BR-ORDER-01: 재고 예약 기간 10분
   * BR-ORDER-04: 쿠폰 할인 계산
   * BR-ORDER-05: 최소 주문 금액 검증
   */
  static create(data: OrderCreateData): Order {
    // 주문 항목 검증
    if (data.items.length === 0) {
      throw new Error('주문 항목은 최소 1개 이상이어야 합니다.');
    }

    const now = new Date();
    const reservationExpiresAt = new Date(
      now.getTime() + Order.RESERVATION_MINUTES * 60 * 1000,
    );

    const totalAmount = Order.calculateTotalAmount(data.items);
    const finalAmount = totalAmount - data.discountAmount;

    // BR-ORDER-05: 최소 주문 금액 검증
    if (finalAmount <= 0) {
      throw new MinimumOrderAmountException();
    }

    return new Order(
      uuidv4(),
      data.userId,
      OrderStatus.PENDING,
      data.items,
      totalAmount,
      data.discountAmount,
      finalAmount,
      data.userCouponId,
      reservationExpiresAt,
      now,
      null,
      now,
    );
  }

  /**
   * 영속화된 데이터로부터 Order를 재구성하는 팩토리 메서드
   */
  static reconstitute(data: OrderData): Order {
    return new Order(
      data.id,
      data.userId,
      data.status,
      data.items,
      data.totalAmount,
      data.discountAmount,
      data.finalAmount,
      data.userCouponId,
      data.reservationExpiresAt,
      data.createdAt,
      data.paidAt,
      data.updatedAt,
    );
  }

  private validate(): void {
    if (this._totalAmount < 0) {
      throw new Error('총 금액은 음수일 수 없습니다.');
    }
    if (this._discountAmount < 0) {
      throw new Error('할인 금액은 음수일 수 없습니다.');
    }
    if (this._finalAmount < 0) {
      throw new Error('최종 금액은 음수일 수 없습니다.');
    }
  }

  /**
   * 주문 항목들의 총액 계산
   */
  private static calculateTotalAmount(items: OrderItem[]): number {
    return items.reduce((sum, item) => sum + item.getSubtotal().amount, 0);
  }

  /**
   * 쿠폰 할인 금액 계산
   * BR-ORDER-04: 정률/정액 할인 계산
   */
  static calculateDiscountAmount(
    totalAmount: number,
    discountType: 'PERCENTAGE' | 'FIXED',
    discountValue: number,
  ): number {
    if (discountType === 'PERCENTAGE') {
      // 정률 쿠폰: 총액 × (할인율 / 100)
      return Math.floor(totalAmount * (discountValue / 100));
    } else {
      // 정액 쿠폰: min(할인금액, 총액)
      return Math.min(discountValue, totalAmount);
    }
  }

  /**
   * 주문 완료 처리 (결제 완료)
   * PENDING → COMPLETED
   */
  complete(): void {
    if (this._status === OrderStatus.COMPLETED) {
      throw new OrderAlreadyCompletedException();
    }
    if (this._status !== OrderStatus.PENDING) {
      throw new InvalidOrderStateException(
        'PENDING 상태의 주문만 완료할 수 있습니다.',
      );
    }
    if (this.isExpired()) {
      throw new InvalidOrderStateException(
        '예약 시간이 만료된 주문은 완료할 수 없습니다.',
      );
    }

    this._status = OrderStatus.COMPLETED;
    this._paidAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * 주문 취소 처리
   * PENDING → CANCELED
   */
  cancel(): void {
    if (this._status === OrderStatus.COMPLETED) {
      throw new InvalidOrderStateException(
        '완료된 주문은 취소할 수 없습니다.',
      );
    }
    if (this._status === OrderStatus.CANCELED) {
      throw new InvalidOrderStateException('이미 취소된 주문입니다.');
    }

    this._status = OrderStatus.CANCELED;
    this._updatedAt = new Date();
  }

  /**
   * 재고 예약 시간이 만료되었는지 확인
   * BR-ORDER-13: 10분 경과 시 만료
   */
  isExpired(): boolean {
    return new Date() > this._reservationExpiresAt;
  }

  /**
   * 주문이 PENDING 상태이고 만료되었는지 확인
   */
  isPendingAndExpired(): boolean {
    return this._status === OrderStatus.PENDING && this.isExpired();
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  get status(): OrderStatus {
    return this._status;
  }

  get items(): OrderItem[] {
    return [...this._items]; // 불변성 보장
  }

  get totalAmount(): number {
    return this._totalAmount;
  }

  get discountAmount(): number {
    return this._discountAmount;
  }

  get finalAmount(): number {
    return this._finalAmount;
  }

  get userCouponId(): string | null {
    return this._userCouponId;
  }

  get reservationExpiresAt(): Date {
    return this._reservationExpiresAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get paidAt(): Date | null {
    return this._paidAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
