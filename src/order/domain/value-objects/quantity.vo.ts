import { InvalidQuantityException } from '@/order/domain/order.exceptions';

/**
 * Quantity Value Object
 * 수량을 나타내는 불변 값 객체
 * CartItem과 OrderItem에서 공통으로 사용
 */
export class Quantity {
  private readonly _value: number;

  constructor(value: number) {
    this.validate(value);
    this._value = value;
  }

  private validate(value: number): void {
    if (!Number.isInteger(value)) {
      throw new InvalidQuantityException('수량은 정수여야 합니다.');
    }
    if (value < 1) {
      throw new InvalidQuantityException('수량은 1개 이상이어야 합니다.');
    }
  }

  get value(): number {
    return this._value;
  }

  /**
   * 다른 수량과 합산
   */
  add(other: Quantity): Quantity {
    return new Quantity(this._value + other.value);
  }

  /**
   * 수량 비교
   */
  equals(other: Quantity): boolean {
    return this._value === other.value;
  }

  /**
   * 수량이 특정 값보다 큰지 확인
   */
  isGreaterThan(value: number): boolean {
    return this._value > value;
  }

  /**
   * 수량이 특정 값보다 작거나 같은지 확인
   */
  isLessThanOrEqual(value: number): boolean {
    return this._value <= value;
  }
}
