import { v4 as uuidv4 } from 'uuid';
import { PaymentMethod } from '@/order/domain/entities/payment-method.enum';
import { PaymentStatus } from '@/order/domain/entities/payment-status.enum';

/**
 * Payment 엔티티 생성 데이터
 */
export interface PaymentCreateData {
  orderId: string;
  userId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionId: string;
}

/**
 * Payment 엔티티 재구성 데이터
 */
export interface PaymentData extends PaymentCreateData {
  id: string;
  status: PaymentStatus;
  createdAt: Date;
  refundedAt?: Date;
}

/**
 * Payment 엔티티
 *
 * 주문에 대한 결제 정보를 나타냅니다.
 */
export class Payment {
  private readonly _id: string;
  private readonly _orderId: string;
  private readonly _userId: string;
  private readonly _amount: number;
  private readonly _paymentMethod: PaymentMethod;
  private readonly _transactionId: string;
  private _status: PaymentStatus;
  private readonly _createdAt: Date;
  private _refundedAt?: Date;

  private constructor(data: PaymentData) {
    this._id = data.id;
    this._orderId = data.orderId;
    this._userId = data.userId;
    this._amount = data.amount;
    this._paymentMethod = data.paymentMethod;
    this._transactionId = data.transactionId;
    this._status = data.status;
    this._createdAt = data.createdAt;
    this._refundedAt = data.refundedAt;

    this.validate();
  }

  /**
   * 새로운 Payment 생성
   */
  static create(data: PaymentCreateData): Payment {
    return new Payment({
      id: uuidv4(),
      ...data,
      status: PaymentStatus.COMPLETED,
      createdAt: new Date(),
    });
  }

  /**
   * 기존 Payment 재구성 (DB에서 로드)
   */
  static reconstitute(data: PaymentData): Payment {
    return new Payment(data);
  }

  /**
   * 유효성 검증
   */
  private validate(): void {
    if (!this._id || this._id.trim() === '') {
      throw new Error('결제 ID는 필수입니다.');
    }

    if (!this._orderId || this._orderId.trim() === '') {
      throw new Error('주문 ID는 필수입니다.');
    }

    if (!this._userId || this._userId.trim() === '') {
      throw new Error('사용자 ID는 필수입니다.');
    }

    if (this._amount <= 0) {
      throw new Error('결제 금액은 0보다 커야 합니다.');
    }

    if (!Object.values(PaymentMethod).includes(this._paymentMethod)) {
      throw new Error('유효하지 않은 결제 방법입니다.');
    }

    if (!this._transactionId || this._transactionId.trim() === '') {
      throw new Error('거래 번호는 필수입니다.');
    }
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get orderId(): string {
    return this._orderId;
  }

  get userId(): string {
    return this._userId;
  }

  get amount(): number {
    return this._amount;
  }

  get paymentMethod(): PaymentMethod {
    return this._paymentMethod;
  }

  get transactionId(): string {
    return this._transactionId;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get status(): PaymentStatus {
    return this._status;
  }

  get refundedAt(): Date | undefined {
    return this._refundedAt;
  }

  /**
   * 결제 환불 처리
   *
   * @throws {Error} 이미 환불된 결제인 경우
   */
  refund(): void {
    if (this._status === PaymentStatus.REFUNDED) {
      throw new Error('이미 환불된 결제입니다.');
    }

    this._status = PaymentStatus.REFUNDED;
    this._refundedAt = new Date();
  }

  /**
   * 환불 가능 여부 확인
   */
  canRefund(): boolean {
    return this._status === PaymentStatus.COMPLETED;
  }
}
