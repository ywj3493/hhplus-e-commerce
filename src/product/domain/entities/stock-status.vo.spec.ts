import { StockStatus, StockStatusType } from './stock-status.vo';

describe('StockStatus', () => {
  describe('fromAvailableQuantity', () => {
    it('should return IN_STOCK when quantity is greater than 0', () => {
      // Given
      const availableQuantity = 10;

      // When
      const status = StockStatus.fromAvailableQuantity(availableQuantity);

      // Then
      expect(status.status).toBe(StockStatusType.IN_STOCK);
      expect(status.isInStock()).toBe(true);
      expect(status.isOutOfStock()).toBe(false);
    });

    it('should return OUT_OF_STOCK when quantity is 0', () => {
      // Given
      const availableQuantity = 0;

      // When
      const status = StockStatus.fromAvailableQuantity(availableQuantity);

      // Then
      expect(status.status).toBe(StockStatusType.OUT_OF_STOCK);
      expect(status.isInStock()).toBe(false);
      expect(status.isOutOfStock()).toBe(true);
    });

    it('should throw error for negative quantity', () => {
      // Given
      const negativeQuantity = -1;

      // When & Then
      expect(() => StockStatus.fromAvailableQuantity(negativeQuantity)).toThrow(
        '가용 재고 수량은 음수일 수 없습니다',
      );
    });
  });

  describe('inStock', () => {
    it('should create IN_STOCK status', () => {
      // When
      const status = StockStatus.inStock();

      // Then
      expect(status.status).toBe(StockStatusType.IN_STOCK);
      expect(status.isInStock()).toBe(true);
    });
  });

  describe('outOfStock', () => {
    it('should create OUT_OF_STOCK status', () => {
      // When
      const status = StockStatus.outOfStock();

      // Then
      expect(status.status).toBe(StockStatusType.OUT_OF_STOCK);
      expect(status.isOutOfStock()).toBe(true);
    });
  });

  describe('equals', () => {
    it('should return true for same status', () => {
      // Given
      const status1 = StockStatus.inStock();
      const status2 = StockStatus.inStock();

      // When
      const result = status1.equals(status2);

      // Then
      expect(result).toBe(true);
    });

    it('should return false for different status', () => {
      // Given
      const status1 = StockStatus.inStock();
      const status2 = StockStatus.outOfStock();

      // When
      const result = status1.equals(status2);

      // Then
      expect(result).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return "재고 있음" for IN_STOCK status', () => {
      // Given
      const status = StockStatus.inStock();

      // When
      const result = status.toString();

      // Then
      expect(result).toBe('재고 있음');
    });

    it('should return "품절" for OUT_OF_STOCK status', () => {
      // Given
      const status = StockStatus.outOfStock();

      // When
      const result = status.toString();

      // Then
      expect(result).toBe('품절');
    });
  });
});
