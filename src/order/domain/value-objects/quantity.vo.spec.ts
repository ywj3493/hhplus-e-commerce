import { Quantity } from '@/order/domain/value-objects/quantity.vo';
import { InvalidQuantityException } from '@/order/domain/order.exceptions';

describe('Quantity', () => {
  describe('생성', () => {
    it('유효한 수량으로 인스턴스를 생성해야 함', () => {
      // Given
      const value = 5;

      // When
      const quantity = new Quantity(value);

      // Then
      expect(quantity.value).toBe(5);
    });

    it('1개 이상의 수량으로 생성 가능해야 함', () => {
      // Given & When & Then
      expect(() => new Quantity(1)).not.toThrow();
      expect(() => new Quantity(100)).not.toThrow();
      expect(() => new Quantity(1000)).not.toThrow();
    });
  });

  describe('검증', () => {
    it('0 이하의 수량으로 생성 시 예외를 발생시켜야 함', () => {
      // Given & When & Then
      expect(() => new Quantity(0)).toThrow(InvalidQuantityException);
      expect(() => new Quantity(0)).toThrow('수량은 1개 이상이어야 합니다.');
    });

    it('음수 수량으로 생성 시 예외를 발생시켜야 함', () => {
      // Given & When & Then
      expect(() => new Quantity(-1)).toThrow(InvalidQuantityException);
      expect(() => new Quantity(-10)).toThrow(InvalidQuantityException);
    });

    it('정수가 아닌 수량으로 생성 시 예외를 발생시켜야 함', () => {
      // Given & When & Then
      expect(() => new Quantity(1.5)).toThrow(InvalidQuantityException);
      expect(() => new Quantity(1.5)).toThrow('수량은 정수여야 합니다.');
    });
  });

  describe('add', () => {
    it('두 수량을 합산한 새로운 Quantity를 반환해야 함', () => {
      // Given
      const quantity1 = new Quantity(3);
      const quantity2 = new Quantity(5);

      // When
      const result = quantity1.add(quantity2);

      // Then
      expect(result.value).toBe(8);
      expect(result).not.toBe(quantity1); // 불변성 확인
      expect(result).not.toBe(quantity2);
    });

    it('여러 수량을 합산할 수 있어야 함', () => {
      // Given
      const quantity1 = new Quantity(1);
      const quantity2 = new Quantity(2);
      const quantity3 = new Quantity(3);

      // When
      const result = quantity1.add(quantity2).add(quantity3);

      // Then
      expect(result.value).toBe(6);
    });
  });

  describe('equals', () => {
    it('같은 값의 수량이면 true를 반환해야 함', () => {
      // Given
      const quantity1 = new Quantity(5);
      const quantity2 = new Quantity(5);

      // When & Then
      expect(quantity1.equals(quantity2)).toBe(true);
    });

    it('다른 값의 수량이면 false를 반환해야 함', () => {
      // Given
      const quantity1 = new Quantity(5);
      const quantity2 = new Quantity(3);

      // When & Then
      expect(quantity1.equals(quantity2)).toBe(false);
    });
  });

  describe('isGreaterThan', () => {
    it('수량이 주어진 값보다 크면 true를 반환해야 함', () => {
      // Given
      const quantity = new Quantity(10);

      // When & Then
      expect(quantity.isGreaterThan(5)).toBe(true);
      expect(quantity.isGreaterThan(9)).toBe(true);
    });

    it('수량이 주어진 값보다 작거나 같으면 false를 반환해야 함', () => {
      // Given
      const quantity = new Quantity(10);

      // When & Then
      expect(quantity.isGreaterThan(10)).toBe(false);
      expect(quantity.isGreaterThan(11)).toBe(false);
    });
  });

  describe('isLessThanOrEqual', () => {
    it('수량이 주어진 값보다 작거나 같으면 true를 반환해야 함', () => {
      // Given
      const quantity = new Quantity(10);

      // When & Then
      expect(quantity.isLessThanOrEqual(10)).toBe(true);
      expect(quantity.isLessThanOrEqual(15)).toBe(true);
    });

    it('수량이 주어진 값보다 크면 false를 반환해야 함', () => {
      // Given
      const quantity = new Quantity(10);

      // When & Then
      expect(quantity.isLessThanOrEqual(5)).toBe(false);
      expect(quantity.isLessThanOrEqual(9)).toBe(false);
    });
  });

  describe('불변성', () => {
    it('Quantity 인스턴스는 불변이어야 함', () => {
      // Given
      const quantity = new Quantity(5);
      const originalValue = quantity.value;

      // When
      const newQuantity = quantity.add(new Quantity(3));

      // Then
      expect(quantity.value).toBe(originalValue); // 원본은 변경되지 않음
      expect(newQuantity.value).toBe(8); // 새 인스턴스 생성
    });
  });
});
