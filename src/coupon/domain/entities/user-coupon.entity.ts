import { v4 as uuidv4 } from 'uuid';
import { Coupon } from './coupon.entity';

/**
 * 쿠폰 상태
 * - AVAILABLE: 사용 가능
 * - USED: 사용 완료
 * - EXPIRED: 기간 만료
 */
export enum CouponStatus {
  AVAILABLE = 'AVAILABLE',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
}

/**
 * 사용자 쿠폰 엔티티
 *
 * 비즈니스 규칙:
 * - BR-COUPON-05: 사용 가능 상태 분류 (isUsed = false AND 유효기간 내)
 * - BR-COUPON-06: 사용 완료 상태 분류 (isUsed = true)
 * - BR-COUPON-08: 1회만 사용 가능
 */
export class UserCoupon {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _couponId: string;
  private _isUsed: boolean;
  private _usedAt: Date | null;
  private readonly _issuedAt: Date;
  private readonly _expiresAt: Date;

  private constructor(
    id: string,
    userId: string,
    couponId: string,
    isUsed: boolean,
    usedAt: Date | null,
    issuedAt: Date,
    expiresAt: Date,
  ) {
    this._id = id;
    this._userId = userId;
    this._couponId = couponId;
    this._isUsed = isUsed;
    this._usedAt = usedAt;
    this._issuedAt = issuedAt;
    this._expiresAt = expiresAt;

    this.validate();
  }

  /**
   * 새로운 사용자 쿠폰 생성
   */
  static create(userId: string, coupon: Coupon): UserCoupon {
    const now = new Date();
    // 쿠폰 만료일은 쿠폰의 유효기간 종료일과 동일
    const expiresAt = coupon.validUntil;

    return new UserCoupon(uuidv4(), userId, coupon.id, false, null, now, expiresAt);
  }

  /**
   * 기존 사용자 쿠폰 재구성 (영속성 계층에서 조회한 데이터로 생성)
   */
  static reconstitute(
    id: string,
    userId: string,
    couponId: string,
    isUsed: boolean,
    usedAt: Date | null,
    issuedAt: Date,
    expiresAt: Date,
  ): UserCoupon {
    return new UserCoupon(id, userId, couponId, isUsed, usedAt, issuedAt, expiresAt);
  }

  private validate(): void {
    if (!this._id || this._id.trim() === '') {
      throw new Error('사용자 쿠폰 ID는 필수입니다');
    }
    if (!this._userId || this._userId.trim() === '') {
      throw new Error('사용자 ID는 필수입니다');
    }
    if (!this._couponId || this._couponId.trim() === '') {
      throw new Error('쿠폰 ID는 필수입니다');
    }
  }

  /**
   * 쿠폰 사용 처리
   *
   * BR-COUPON-08: 1회만 사용 가능
   *
   * @throws Error 이미 사용된 쿠폰인 경우
   */
  use(): void {
    // BR-COUPON-08: 1회만 사용 가능
    if (this._isUsed) {
      throw new Error('이미 사용된 쿠폰입니다.');
    }

    this._isUsed = true;
    this._usedAt = new Date();
  }

  /**
   * 쿠폰이 사용 가능한지 확인
   *
   * BR-COUPON-05: 사용되지 않았고 유효기간 내인 경우만 사용 가능
   */
  isAvailable(): boolean {
    return !this._isUsed && !this.isExpired();
  }

  /**
   * 쿠폰이 만료되었는지 확인
   */
  isExpired(): boolean {
    const now = new Date();
    return now > this._expiresAt;
  }

  /**
   * 쿠폰 상태 조회
   *
   * BR-COUPON-05: AVAILABLE 상태
   * BR-COUPON-06: USED 상태
   * EXPIRED: 만료 상태
   */
  getStatus(): CouponStatus {
    if (this._isUsed) {
      return CouponStatus.USED;
    }

    if (this.isExpired()) {
      return CouponStatus.EXPIRED;
    }

    return CouponStatus.AVAILABLE;
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  get couponId(): string {
    return this._couponId;
  }

  get isUsed(): boolean {
    return this._isUsed;
  }

  get usedAt(): Date | null {
    return this._usedAt;
  }

  get issuedAt(): Date {
    return this._issuedAt;
  }

  get expiresAt(): Date {
    return this._expiresAt;
  }
}
