import { Stock } from './stock.entity';
import { StockStatusType } from './stock-status.vo';

describe('Stock', () => {
  describe('create', () => {
    it('should create Stock with valid parameters', () => {
      // Given
      const id = 'stock-1';
      const productOptionId = 'option-1';
      const totalQuantity = 100;
      const availableQuantity = 80;
      const reservedQuantity = 10;
      const soldQuantity = 10;

      // When
      const stock = Stock.create(
        id,
        productOptionId,
        totalQuantity,
        availableQuantity,
        reservedQuantity,
        soldQuantity,
      );

      // Then
      expect(stock.id).toBe(id);
      expect(stock.productOptionId).toBe(productOptionId);
      expect(stock.totalQuantity).toBe(100);
      expect(stock.availableQuantity).toBe(80);
      expect(stock.reservedQuantity).toBe(10);
      expect(stock.soldQuantity).toBe(10);
    });

    it('should throw error when quantities sum exceeds total', () => {
      // Given
      const id = 'stock-1';
      const productOptionId = 'option-1';
      const totalQuantity = 100;
      const availableQuantity = 80;
      const reservedQuantity = 20;
      const soldQuantity = 20; // 80 + 20 + 20 = 120 > 100

      // When & Then
      expect(() =>
        Stock.create(
          id,
          productOptionId,
          totalQuantity,
          availableQuantity,
          reservedQuantity,
          soldQuantity,
        ),
      ).toThrow('Sum of available, reserved, and sold quantity cannot exceed total quantity');
    });

    it('should throw error for negative total quantity', () => {
      // Given
      const id = 'stock-1';
      const productOptionId = 'option-1';
      const totalQuantity = -1;

      // When & Then
      expect(() =>
        Stock.create(id, productOptionId, totalQuantity, 0, 0, 0),
      ).toThrow('Total quantity cannot be negative');
    });

    it('should throw error for negative available quantity', () => {
      // Given
      const id = 'stock-1';
      const productOptionId = 'option-1';

      // When & Then
      expect(() =>
        Stock.create(id, productOptionId, 100, -1, 0, 0),
      ).toThrow('Available quantity cannot be negative');
    });
  });

  describe('initialize', () => {
    it('should create initial stock with all quantity available', () => {
      // Given
      const id = 'stock-1';
      const productOptionId = 'option-1';
      const totalQuantity = 100;

      // When
      const stock = Stock.initialize(id, productOptionId, totalQuantity);

      // Then
      expect(stock.totalQuantity).toBe(100);
      expect(stock.availableQuantity).toBe(100);
      expect(stock.reservedQuantity).toBe(0);
      expect(stock.soldQuantity).toBe(0);
    });
  });

  describe('getStatus', () => {
    it('should return IN_STOCK when available quantity > 0', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 50, 0, 0);

      // When
      const status = stock.getStatus();

      // Then
      expect(status.status).toBe(StockStatusType.IN_STOCK);
    });

    it('should return OUT_OF_STOCK when available quantity is 0', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 0, 50, 50);

      // When
      const status = stock.getStatus();

      // Then
      expect(status.status).toBe(StockStatusType.OUT_OF_STOCK);
    });
  });

  describe('isAvailable', () => {
    it('should return true when available quantity > 0', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 50, 0, 0);

      // When
      const result = stock.isAvailable();

      // Then
      expect(result).toBe(true);
    });

    it('should return false when available quantity is 0', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 0, 50, 50);

      // When
      const result = stock.isAvailable();

      // Then
      expect(result).toBe(false);
    });
  });

  describe('reserve', () => {
    it('should reserve stock successfully', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 100, 0, 0);
      const reserveQuantity = 10;

      // When
      stock.reserve(reserveQuantity);

      // Then
      expect(stock.availableQuantity).toBe(90);
      expect(stock.reservedQuantity).toBe(10);
    });

    it('should throw error when reserve quantity exceeds available', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 50, 0, 0);
      const reserveQuantity = 60;

      // When & Then
      expect(() => stock.reserve(reserveQuantity)).toThrow('Insufficient available quantity');
    });

    it('should throw error for zero quantity', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 50, 0, 0);

      // When & Then
      expect(() => stock.reserve(0)).toThrow('Reserve quantity must be positive');
    });

    it('should throw error for negative quantity', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 50, 0, 0);

      // When & Then
      expect(() => stock.reserve(-1)).toThrow('Reserve quantity must be positive');
    });
  });

  describe('restoreReserved', () => {
    it('should restore reserved stock successfully', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 80, 20, 0);
      const restoreQuantity = 10;

      // When
      stock.restoreReserved(restoreQuantity);

      // Then
      expect(stock.availableQuantity).toBe(90);
      expect(stock.reservedQuantity).toBe(10);
    });

    it('should throw error when restore quantity exceeds reserved', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 80, 20, 0);
      const restoreQuantity = 30;

      // When & Then
      expect(() => stock.restoreReserved(restoreQuantity)).toThrow(
        'Restore quantity exceeds reserved quantity',
      );
    });

    it('should throw error for zero quantity', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 80, 20, 0);

      // When & Then
      expect(() => stock.restoreReserved(0)).toThrow('Restore quantity must be positive');
    });
  });

  describe('sell', () => {
    it('should convert reserved to sold successfully', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 80, 20, 0);
      const sellQuantity = 10;

      // When
      stock.sell(sellQuantity);

      // Then
      expect(stock.reservedQuantity).toBe(10);
      expect(stock.soldQuantity).toBe(10);
      expect(stock.availableQuantity).toBe(80);
    });

    it('should throw error when sell quantity exceeds reserved', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 80, 20, 0);
      const sellQuantity = 30;

      // When & Then
      expect(() => stock.sell(sellQuantity)).toThrow('Sell quantity exceeds reserved quantity');
    });

    it('should throw error for zero quantity', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 80, 20, 0);

      // When & Then
      expect(() => stock.sell(0)).toThrow('Sell quantity must be positive');
    });
  });

  describe('stock flow scenario', () => {
    it('should handle complete order flow: reserve -> sell', () => {
      // Given: Initial stock
      const stock = Stock.initialize('stock-1', 'option-1', 100);
      expect(stock.availableQuantity).toBe(100);

      // When: Customer reserves 10 items
      stock.reserve(10);

      // Then: Available decreased, reserved increased
      expect(stock.availableQuantity).toBe(90);
      expect(stock.reservedQuantity).toBe(10);

      // When: Payment completes, convert to sold
      stock.sell(10);

      // Then: Reserved converted to sold
      expect(stock.availableQuantity).toBe(90);
      expect(stock.reservedQuantity).toBe(0);
      expect(stock.soldQuantity).toBe(10);
    });

    it('should handle order cancellation: reserve -> restore', () => {
      // Given: Initial stock
      const stock = Stock.initialize('stock-1', 'option-1', 100);

      // When: Customer reserves 10 items
      stock.reserve(10);
      expect(stock.availableQuantity).toBe(90);
      expect(stock.reservedQuantity).toBe(10);

      // When: Order is cancelled, restore reserved
      stock.restoreReserved(10);

      // Then: Stock restored to available
      expect(stock.availableQuantity).toBe(100);
      expect(stock.reservedQuantity).toBe(0);
      expect(stock.soldQuantity).toBe(0);
    });
  });
});
