import { Price } from '@/product/domain/entities/price.vo';

describe('Price', () => {
  describe('생성', () => {
    it('유효한 금액으로 Price 인스턴스를 생성해야 함', () => {
      // Given
      const amount = 10000;

      // When
      const price = Price.from(amount);

      // Then
      expect(price.amount).toBe(10000);
    });

    it('음수 금액에 대해 에러를 발생시켜야 함', () => {
      // Given
      const negativeAmount = -1000;

      // When & Then
      expect(() => Price.from(negativeAmount)).toThrow('금액은 음수일 수 없습니다');
    });

    it('0원으로 Price 인스턴스를 생성해야 함', () => {
      // Given
      const zeroAmount = 0;

      // When
      const price = Price.from(zeroAmount);

      // Then
      expect(price.amount).toBe(0);
    });
  });

  describe('덧셈', () => {
    it('두 금액을 더해야 함', () => {
      // Given
      const price1 = Price.from(10000);
      const price2 = Price.from(5000);

      // When
      const result = price1.add(price2);

      // Then
      expect(result.amount).toBe(15000);
    });

    it('원본 값을 수정하지 않아야 함', () => {
      // Given
      const price1 = Price.from(10000);
      const price2 = Price.from(5000);

      // When
      price1.add(price2);

      // Then
      expect(price1.amount).toBe(10000);
      expect(price2.amount).toBe(5000);
    });
  });

  describe('곱셈', () => {
    it('금액에 수량을 곱해야 함', () => {
      // Given
      const price = Price.from(10000);
      const quantity = 3;

      // When
      const result = price.multiply(quantity);

      // Then
      expect(result.amount).toBe(30000);
    });

    it('음수 수량에 대해 에러를 발생시켜야 함', () => {
      // Given
      const price = Price.from(10000);
      const negativeQuantity = -1;

      // When & Then
      expect(() => price.multiply(negativeQuantity)).toThrow('수량은 음수일 수 없습니다');
    });

    it('수량이 0일 때 0원을 반환해야 함', () => {
      // Given
      const price = Price.from(10000);
      const zeroQuantity = 0;

      // When
      const result = price.multiply(zeroQuantity);

      // Then
      expect(result.amount).toBe(0);
    });
  });

  describe('동등성 비교', () => {
    it('같은 금액일 때 true를 반환해야 함', () => {
      // Given
      const price1 = Price.from(10000);
      const price2 = Price.from(10000);

      // When
      const result = price1.equals(price2);

      // Then
      expect(result).toBe(true);
    });

    it('다른 금액일 때 false를 반환해야 함', () => {
      // Given
      const price1 = Price.from(10000);
      const price2 = Price.from(5000);

      // When
      const result = price1.equals(price2);

      // Then
      expect(result).toBe(false);
    });
  });

  describe('문자열 변환', () => {
    it('한국 원화 형식으로 포맷해야 함', () => {
      // Given
      const price = Price.from(10000);

      // When
      const result = price.toString();

      // Then
      expect(result).toBe('10,000 원');
    });
  });
});
