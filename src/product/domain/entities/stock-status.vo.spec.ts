import { StockStatus, StockStatusType } from '@/product/domain/entities/stock-status.vo';

describe('StockStatus', () => {
  describe('가용 수량으로부터 생성', () => {
    it('수량이 0보다 클 때 재고 있음 상태를 반환해야 함', () => {
      // Given
      const availableQuantity = 10;

      // When
      const status = StockStatus.fromAvailableQuantity(availableQuantity);

      // Then
      expect(status.status).toBe(StockStatusType.IN_STOCK);
      expect(status.isInStock()).toBe(true);
      expect(status.isOutOfStock()).toBe(false);
    });

    it('수량이 0일 때 품절 상태를 반환해야 함', () => {
      // Given
      const availableQuantity = 0;

      // When
      const status = StockStatus.fromAvailableQuantity(availableQuantity);

      // Then
      expect(status.status).toBe(StockStatusType.OUT_OF_STOCK);
      expect(status.isInStock()).toBe(false);
      expect(status.isOutOfStock()).toBe(true);
    });

    it('음수 수량에 대해 에러를 발생시켜야 함', () => {
      // Given
      const negativeQuantity = -1;

      // When & Then
      expect(() => StockStatus.fromAvailableQuantity(negativeQuantity)).toThrow(
        '가용 재고 수량은 음수일 수 없습니다',
      );
    });
  });

  describe('재고 있음 상태 생성', () => {
    it('재고 있음 상태를 생성해야 함', () => {
      // When
      const status = StockStatus.inStock();

      // Then
      expect(status.status).toBe(StockStatusType.IN_STOCK);
      expect(status.isInStock()).toBe(true);
    });
  });

  describe('품절 상태 생성', () => {
    it('품절 상태를 생성해야 함', () => {
      // When
      const status = StockStatus.outOfStock();

      // Then
      expect(status.status).toBe(StockStatusType.OUT_OF_STOCK);
      expect(status.isOutOfStock()).toBe(true);
    });
  });

  describe('동등성 비교', () => {
    it('같은 상태일 때 true를 반환해야 함', () => {
      // Given
      const status1 = StockStatus.inStock();
      const status2 = StockStatus.inStock();

      // When
      const result = status1.equals(status2);

      // Then
      expect(result).toBe(true);
    });

    it('다른 상태일 때 false를 반환해야 함', () => {
      // Given
      const status1 = StockStatus.inStock();
      const status2 = StockStatus.outOfStock();

      // When
      const result = status1.equals(status2);

      // Then
      expect(result).toBe(false);
    });
  });

  describe('문자열 변환', () => {
    it('재고 있음 상태일 때 "재고 있음"을 반환해야 함', () => {
      // Given
      const status = StockStatus.inStock();

      // When
      const result = status.toString();

      // Then
      expect(result).toBe('재고 있음');
    });

    it('품절 상태일 때 "품절"을 반환해야 함', () => {
      // Given
      const status = StockStatus.outOfStock();

      // When
      const result = status.toString();

      // Then
      expect(result).toBe('품절');
    });
  });
});
