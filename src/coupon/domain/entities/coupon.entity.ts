import { v4 as uuidv4 } from 'uuid';
import {
  CouponExhaustedException,
  CouponExpiredException,
} from '@/coupon/domain/coupon.exceptions';

/**
 * 쿠폰 타입
 * - PERCENTAGE: 퍼센트 할인 (예: 10%)
 * - FIXED: 정액 할인 (예: 5000원)
 */
export enum CouponType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

/**
 * 쿠폰 엔티티
 *
 * 비즈니스 규칙:
 * - BR-COUPON-02: 선착순 발급 (issuedQuantity >= totalQuantity 검증)
 * - BR-COUPON-03: 발급 기간 검증 (validFrom ~ validUntil)
 * - BR-COUPON-04: 최소 주문 금액 검증 (minAmount)
 */
export class Coupon {
  private readonly _id: string;
  private readonly _name: string;
  private readonly _description: string;
  private readonly _discountType: CouponType;
  private readonly _discountValue: number;
  private readonly _minAmount: number | null;
  private readonly _totalQuantity: number;
  private _issuedQuantity: number;
  private readonly _validFrom: Date;
  private readonly _validUntil: Date;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: string,
    name: string,
    description: string,
    discountType: CouponType,
    discountValue: number,
    minAmount: number | null,
    totalQuantity: number,
    issuedQuantity: number,
    validFrom: Date,
    validUntil: Date,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this._id = id;
    this._name = name;
    this._description = description;
    this._discountType = discountType;
    this._discountValue = discountValue;
    this._minAmount = minAmount;
    this._totalQuantity = totalQuantity;
    this._issuedQuantity = issuedQuantity;
    this._validFrom = validFrom;
    this._validUntil = validUntil;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;

    this.validate();
  }

  /**
   * 새로운 쿠폰 생성
   */
  static create(
    name: string,
    description: string,
    discountType: CouponType,
    discountValue: number,
    minAmount: number | null,
    totalQuantity: number,
    issuedQuantity: number,
    validFrom: Date,
    validUntil: Date,
  ): Coupon {
    const now = new Date();
    return new Coupon(
      uuidv4(),
      name,
      description,
      discountType,
      discountValue,
      minAmount,
      totalQuantity,
      issuedQuantity,
      validFrom,
      validUntil,
      now,
      now,
    );
  }

  /**
   * 기존 쿠폰 재구성 (영속성 계층에서 조회한 데이터로 생성)
   */
  static reconstitute(
    id: string,
    name: string,
    description: string,
    discountType: CouponType,
    discountValue: number,
    minAmount: number | null,
    totalQuantity: number,
    issuedQuantity: number,
    validFrom: Date,
    validUntil: Date,
    createdAt: Date,
    updatedAt: Date,
  ): Coupon {
    return new Coupon(
      id,
      name,
      description,
      discountType,
      discountValue,
      minAmount,
      totalQuantity,
      issuedQuantity,
      validFrom,
      validUntil,
      createdAt,
      updatedAt,
    );
  }

  private validate(): void {
    if (!this._id || this._id.trim() === '') {
      throw new Error('쿠폰 ID는 필수입니다');
    }
    if (!this._name || this._name.trim() === '') {
      throw new Error('쿠폰명은 필수입니다');
    }
    if (this._totalQuantity < 0) {
      throw new Error('총 수량은 0 이상이어야 합니다');
    }
    if (this._issuedQuantity < 0) {
      throw new Error('발급된 수량은 0 이상이어야 합니다');
    }
    if (this._discountValue <= 0) {
      throw new Error('할인 값은 0보다 커야 합니다');
    }
    if (this._minAmount !== null && this._minAmount < 0) {
      throw new Error('최소 주문 금액은 0 이상이어야 합니다');
    }
  }

  /**
   * 쿠폰 발급 수량 감소
   *
   * BR-COUPON-02: 선착순 발급 (수량 검증)
   * BR-COUPON-03: 발급 기간 검증
   *
   * @throws CouponExhaustedException 쿠폰 소진 시
   * @throws CouponExpiredException 발급 기간 외
   */
  decreaseQuantity(): void {
    // BR-COUPON-02: 수량 검증
    if (this._issuedQuantity >= this._totalQuantity) {
      throw new CouponExhaustedException('쿠폰이 모두 소진되었습니다.');
    }

    // BR-COUPON-03: 발급 기간 검증
    if (!this.isValid()) {
      throw new CouponExpiredException('쿠폰 발급 기간이 아닙니다.');
    }

    this._issuedQuantity++;
    this._updatedAt = new Date();
  }

  /**
   * 쿠폰이 유효한지 확인 (발급 기간 내인지)
   */
  isValid(): boolean {
    const now = new Date();
    return now >= this._validFrom && now <= this._validUntil;
  }

  /**
   * 주문 금액이 쿠폰 사용 가능 최소 금액을 만족하는지 확인
   * BR-COUPON-04: 최소 주문 금액 검증
   *
   * @param orderAmount 주문 금액
   * @returns 사용 가능 여부
   */
  canBeAppliedTo(orderAmount: number): boolean {
    if (this._minAmount === null) {
      return true; // 최소 금액 제한 없음
    }
    return orderAmount >= this._minAmount;
  }

  // Getters
  get id(): string {
    return this._id;
  }

  /**
   * 남은 쿠폰 수량 조회
   */
  get availableQuantity(): number {
    return this._totalQuantity - this._issuedQuantity;
  }

  get name(): string {
    return this._name;
  }

  get description(): string {
    return this._description;
  }

  get discountType(): CouponType {
    return this._discountType;
  }

  get discountValue(): number {
    return this._discountValue;
  }

  get minAmount(): number | null {
    return this._minAmount;
  }

  get totalQuantity(): number {
    return this._totalQuantity;
  }

  get issuedQuantity(): number {
    return this._issuedQuantity;
  }

  get validFrom(): Date {
    return this._validFrom;
  }

  get validUntil(): Date {
    return this._validUntil;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
