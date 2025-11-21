import { StockStatus } from '@/product/domain/entities/stock-status.vo';

/**
 * Stock Entity
 * 상품 및 상품 옵션의 재고를 관리
 * BR-PROD-04: availableQuantity를 기반으로 재고 상태 계산
 *
 * 구조:
 * - productId: 필수 (상품 ID)
 * - productOptionId: 선택 (옵션이 없는 상품은 null)
 */
export class Stock {
  private readonly _id: string;
  private readonly _productId: string;
  private readonly _productOptionId: string | null;
  private _totalQuantity: number;
  private _availableQuantity: number;
  private _reservedQuantity: number;
  private _soldQuantity: number;
  private _version: number;

  private constructor(
    id: string,
    productId: string,
    productOptionId: string | null,
    totalQuantity: number,
    availableQuantity: number,
    reservedQuantity: number,
    soldQuantity: number,
    version: number = 0,
  ) {
    this._id = id;
    this._productId = productId;
    this._productOptionId = productOptionId;
    this._totalQuantity = totalQuantity;
    this._availableQuantity = availableQuantity;
    this._reservedQuantity = reservedQuantity;
    this._soldQuantity = soldQuantity;
    this._version = version;

    this.validate();
  }

  /**
   * Stock 인스턴스를 생성하는 팩토리 메서드
   */
  static create(
    id: string,
    productId: string,
    productOptionId: string | null,
    totalQuantity: number,
    availableQuantity: number,
    reservedQuantity: number,
    soldQuantity: number,
    version: number = 0,
  ): Stock {
    return new Stock(
      id,
      productId,
      productOptionId,
      totalQuantity,
      availableQuantity,
      reservedQuantity,
      soldQuantity,
      version,
    );
  }

  /**
   * 초기 재고를 생성하는 팩토리 메서드
   */
  static initialize(id: string, productId: string, productOptionId: string | null, totalQuantity: number): Stock {
    return new Stock(id, productId, productOptionId, totalQuantity, totalQuantity, 0, 0);
  }

  private validate(): void {
    if (!this._productId || this._productId.trim() === '') {
      throw new Error('상품 ID는 필수입니다');
    }
    if (this._totalQuantity < 0) {
      throw new Error('총 재고 수량은 음수일 수 없습니다');
    }
    if (this._availableQuantity < 0) {
      throw new Error('가용 재고 수량은 음수일 수 없습니다');
    }
    if (this._reservedQuantity < 0) {
      throw new Error('예약 재고 수량은 음수일 수 없습니다');
    }
    if (this._soldQuantity < 0) {
      throw new Error('판매 재고 수량은 음수일 수 없습니다');
    }
    if (this._availableQuantity + this._reservedQuantity + this._soldQuantity > this._totalQuantity) {
      throw new Error('가용, 예약, 판매 재고의 합은 총 재고를 초과할 수 없습니다');
    }
  }

  /**
   * 가용 재고 수량을 기반으로 재고 상태 조회
   * BR-PROD-04: availableQuantity > 0이면 "재고 있음", 아니면 "품절"
   */
  getStatus(): StockStatus {
    return StockStatus.fromAvailableQuantity(this._availableQuantity);
  }

  /**
   * 재고 가용 여부 확인
   */
  isAvailable(): boolean {
    return this._availableQuantity > 0;
  }

  /**
   * 주문을 위한 재고 예약
   */
  reserve(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('예약 수량은 양수여야 합니다');
    }
    if (quantity > this._availableQuantity) {
      throw new Error('가용 재고가 부족합니다');
    }
    this._availableQuantity -= quantity;
    this._reservedQuantity += quantity;
    this._version += 1; // 버전 증가
  }

  /**
   * 예약된 재고 복원 (예: 주문 취소 시)
   */
  restoreReserved(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('복원 수량은 양수여야 합니다');
    }
    if (quantity > this._reservedQuantity) {
      throw new Error('복원 수량이 예약 수량을 초과합니다');
    }
    this._reservedQuantity -= quantity;
    this._availableQuantity += quantity;
    this._version += 1; // 버전 증가
  }

  /**
   * 예약된 재고를 판매로 전환 (예: 결제 완료 시)
   */
  sell(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('판매 수량은 양수여야 합니다');
    }
    if (quantity > this._reservedQuantity) {
      throw new Error('판매 수량이 예약 수량을 초과합니다');
    }
    this._reservedQuantity -= quantity;
    this._soldQuantity += quantity;
    this._version += 1; // 버전 증가
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get productId(): string {
    return this._productId;
  }

  get productOptionId(): string | null {
    return this._productOptionId;
  }

  get totalQuantity(): number {
    return this._totalQuantity;
  }

  get availableQuantity(): number {
    return this._availableQuantity;
  }

  get reservedQuantity(): number {
    return this._reservedQuantity;
  }

  get soldQuantity(): number {
    return this._soldQuantity;
  }

  get version(): number {
    return this._version;
  }
}
