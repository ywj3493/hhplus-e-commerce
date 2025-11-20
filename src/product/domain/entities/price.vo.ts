/**
 * Price Value Object
 * 비즈니스 규칙을 포함한 금액 값 객체
 */
export class Price {
  private readonly _amount: number;

  private constructor(amount: number) {
    this._amount = amount;
  }

  /**
   * Price 인스턴스를 생성하는 팩토리 메서드
   * @param amount - 금액 (KRW)
   * @throws Error 금액이 음수인 경우
   */
  static from(amount: number): Price {
    if (amount < 0) {
      throw new Error('금액은 음수일 수 없습니다');
    }
    return new Price(amount);
  }

  get amount(): number {
    return this._amount;
  }

  /**
   * 두 금액을 더하기
   */
  add(other: Price): Price {
    return Price.from(this._amount + other._amount);
  }

  /**
   * 금액에 수량을 곱하기
   */
  multiply(quantity: number): Price {
    if (quantity < 0) {
      throw new Error('수량은 음수일 수 없습니다');
    }
    return Price.from(this._amount * quantity);
  }

  /**
   * 동등성 비교
   */
  equals(other: Price): boolean {
    return this._amount === other._amount;
  }

  /**
   * KRW 문자열로 포맷팅
   */
  toString(): string {
    return `${this._amount.toLocaleString('ko-KR')} 원`;
  }
}
