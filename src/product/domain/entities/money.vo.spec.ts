import { Money } from './money.vo';

describe('Money', () => {
  describe('from', () => {
    it('should create Money with valid amount', () => {
      // Given
      const amount = 10000;

      // When
      const money = Money.from(amount);

      // Then
      expect(money.amount).toBe(10000);
    });

    it('should throw error for negative amount', () => {
      // Given
      const negativeAmount = -1000;

      // When & Then
      expect(() => Money.from(negativeAmount)).toThrow('금액은 음수일 수 없습니다');
    });

    it('should create Money with zero amount', () => {
      // Given
      const zeroAmount = 0;

      // When
      const money = Money.from(zeroAmount);

      // Then
      expect(money.amount).toBe(0);
    });
  });

  describe('add', () => {
    it('should add two money values', () => {
      // Given
      const money1 = Money.from(10000);
      const money2 = Money.from(5000);

      // When
      const result = money1.add(money2);

      // Then
      expect(result.amount).toBe(15000);
    });

    it('should not modify original values', () => {
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

  describe('multiply', () => {
    it('should multiply money by quantity', () => {
      // Given
      const money = Money.from(10000);
      const quantity = 3;

      // When
      const result = money.multiply(quantity);

      // Then
      expect(result.amount).toBe(30000);
    });

    it('should throw error for negative quantity', () => {
      // Given
      const money = Money.from(10000);
      const negativeQuantity = -1;

      // When & Then
      expect(() => money.multiply(negativeQuantity)).toThrow('수량은 음수일 수 없습니다');
    });

    it('should return zero for zero quantity', () => {
      // Given
      const money = Money.from(10000);
      const zeroQuantity = 0;

      // When
      const result = money.multiply(zeroQuantity);

      // Then
      expect(result.amount).toBe(0);
    });
  });

  describe('equals', () => {
    it('should return true for equal amounts', () => {
      // Given
      const money1 = Money.from(10000);
      const money2 = Money.from(10000);

      // When
      const result = money1.equals(money2);

      // Then
      expect(result).toBe(true);
    });

    it('should return false for different amounts', () => {
      // Given
      const money1 = Money.from(10000);
      const money2 = Money.from(5000);

      // When
      const result = money1.equals(money2);

      // Then
      expect(result).toBe(false);
    });
  });

  describe('toString', () => {
    it('should format as KRW string', () => {
      // Given
      const money = Money.from(10000);

      // When
      const result = money.toString();

      // Then
      expect(result).toBe('10,000 원');
    });
  });
});
