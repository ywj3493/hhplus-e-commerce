import { Money } from '@/product/domain/entities/money.vo';

describe('Money', () => {
  describe('생성', () => {
    it('유효한 금액으로 Money 인스턴스를 생성해야 함', () => {
      // Given
      const amount = 10000;

      // When
      const money = Money.from(amount);

      // Then
      expect(money.amount).toBe(10000);
    });

    it('음수 금액에 대해 에러를 발생시켜야 함', () => {
      // Given
      const negativeAmount = -1000;

      // When & Then
      expect(() => Money.from(negativeAmount)).toThrow('금액은 음수일 수 없습니다');
    });

    it('0원으로 Money 인스턴스를 생성해야 함', () => {
      // Given
      const zeroAmount = 0;

      // When
      const money = Money.from(zeroAmount);

      // Then
      expect(money.amount).toBe(0);
    });
  });

  describe('덧셈', () => {
    it('두 금액을 더해야 함', () => {
      // Given
      const money1 = Money.from(10000);
      const money2 = Money.from(5000);

      // When
      const result = money1.add(money2);

      // Then
      expect(result.amount).toBe(15000);
    });

    it('원본 값을 수정하지 않아야 함', () => {
      // Given
      const money1 = Money.from(10000);
      const money2 = Money.from(5000);

      // When
      money1.add(money2);

      // Then
      expect(money1.amount).toBe(10000);
      expect(money2.amount).toBe(5000);
    });
  });

  describe('곱셈', () => {
    it('금액에 수량을 곱해야 함', () => {
      // Given
      const money = Money.from(10000);
      const quantity = 3;

      // When
      const result = money.multiply(quantity);

      // Then
      expect(result.amount).toBe(30000);
    });

    it('음수 수량에 대해 에러를 발생시켜야 함', () => {
      // Given
      const money = Money.from(10000);
      const negativeQuantity = -1;

      // When & Then
      expect(() => money.multiply(negativeQuantity)).toThrow('수량은 음수일 수 없습니다');
    });

    it('수량이 0일 때 0원을 반환해야 함', () => {
      // Given
      const money = Money.from(10000);
      const zeroQuantity = 0;

      // When
      const result = money.multiply(zeroQuantity);

      // Then
      expect(result.amount).toBe(0);
    });
  });

  describe('동등성 비교', () => {
    it('같은 금액일 때 true를 반환해야 함', () => {
      // Given
      const money1 = Money.from(10000);
      const money2 = Money.from(10000);

      // When
      const result = money1.equals(money2);

      // Then
      expect(result).toBe(true);
    });

    it('다른 금액일 때 false를 반환해야 함', () => {
      // Given
      const money1 = Money.from(10000);
      const money2 = Money.from(5000);

      // When
      const result = money1.equals(money2);

      // Then
      expect(result).toBe(false);
    });
  });

  describe('문자열 변환', () => {
    it('한국 원화 형식으로 포맷해야 함', () => {
      // Given
      const money = Money.from(10000);

      // When
      const result = money.toString();

      // Then
      expect(result).toBe('10,000 원');
    });
  });
});
