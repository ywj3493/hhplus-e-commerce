import { ProductOption } from './product-option.entity';
import { Stock } from './stock.entity';
import { Money } from '../value-objects/money.vo';
import { StockStatusType } from '../value-objects/stock-status.vo';

describe('ProductOption', () => {
  describe('create', () => {
    it('should create ProductOption with valid parameters', () => {
      // Given
      const id = 'option-1';
      const productId = 'product-1';
      const type = 'Color';
      const name = 'Red';
      const additionalPrice = Money.from(0);
      const stock = Stock.initialize('stock-1', 'option-1', 100);

      // When
      const option = ProductOption.create(id, productId, type, name, additionalPrice, stock);

      // Then
      expect(option.id).toBe(id);
      expect(option.productId).toBe(productId);
      expect(option.type).toBe(type);
      expect(option.name).toBe(name);
      expect(option.additionalPrice).toBe(additionalPrice);
      expect(option.stock).toBe(stock);
    });

    it('should throw error when option ID is empty', () => {
      // Given
      const stock = Stock.initialize('stock-1', 'option-1', 100);
      const additionalPrice = Money.from(0);

      // When & Then
      expect(() =>
        ProductOption.create('', 'product-1', 'Color', 'Red', additionalPrice, stock),
      ).toThrow('Option ID is required');
    });

    it('should throw error when product ID is empty', () => {
      // Given
      const stock = Stock.initialize('stock-1', 'option-1', 100);
      const additionalPrice = Money.from(0);

      // When & Then
      expect(() =>
        ProductOption.create('option-1', '', 'Color', 'Red', additionalPrice, stock),
      ).toThrow('Product ID is required');
    });

    it('should throw error when type is empty', () => {
      // Given
      const stock = Stock.initialize('stock-1', 'option-1', 100);
      const additionalPrice = Money.from(0);

      // When & Then
      expect(() =>
        ProductOption.create('option-1', 'product-1', '', 'Red', additionalPrice, stock),
      ).toThrow('Option type is required');
    });

    it('should throw error when name is empty', () => {
      // Given
      const stock = Stock.initialize('stock-1', 'option-1', 100);
      const additionalPrice = Money.from(0);

      // When & Then
      expect(() =>
        ProductOption.create('option-1', 'product-1', 'Color', '', additionalPrice, stock),
      ).toThrow('Option name is required');
    });
  });

  describe('calculatePrice', () => {
    it('should calculate price with no additional price', () => {
      // Given
      const basePrice = Money.from(10000);
      const additionalPrice = Money.from(0);
      const stock = Stock.initialize('stock-1', 'option-1', 100);
      const option = ProductOption.create(
        'option-1',
        'product-1',
        'Color',
        'Red',
        additionalPrice,
        stock,
      );

      // When
      const totalPrice = option.calculatePrice(basePrice);

      // Then
      expect(totalPrice.amount).toBe(10000);
    });

    it('should calculate price with additional price', () => {
      // Given
      const basePrice = Money.from(10000);
      const additionalPrice = Money.from(1000);
      const stock = Stock.initialize('stock-1', 'option-1', 100);
      const option = ProductOption.create(
        'option-1',
        'product-1',
        'Size',
        'L',
        additionalPrice,
        stock,
      );

      // When
      const totalPrice = option.calculatePrice(basePrice);

      // Then
      expect(totalPrice.amount).toBe(11000);
    });
  });

  describe('getStockStatus', () => {
    it('should return IN_STOCK when stock is available', () => {
      // Given
      const additionalPrice = Money.from(0);
      const stock = Stock.initialize('stock-1', 'option-1', 100);
      const option = ProductOption.create(
        'option-1',
        'product-1',
        'Color',
        'Red',
        additionalPrice,
        stock,
      );

      // When
      const status = option.getStockStatus();

      // Then
      expect(status.status).toBe(StockStatusType.IN_STOCK);
    });

    it('should return OUT_OF_STOCK when stock is not available', () => {
      // Given
      const additionalPrice = Money.from(0);
      const stock = Stock.create('stock-1', 'option-1', 100, 0, 50, 50);
      const option = ProductOption.create(
        'option-1',
        'product-1',
        'Color',
        'Red',
        additionalPrice,
        stock,
      );

      // When
      const status = option.getStockStatus();

      // Then
      expect(status.status).toBe(StockStatusType.OUT_OF_STOCK);
    });
  });

  describe('isSelectable', () => {
    it('should return true when stock is available (BR-PROD-08)', () => {
      // Given
      const additionalPrice = Money.from(0);
      const stock = Stock.initialize('stock-1', 'option-1', 100);
      const option = ProductOption.create(
        'option-1',
        'product-1',
        'Color',
        'Red',
        additionalPrice,
        stock,
      );

      // When
      const selectable = option.isSelectable();

      // Then
      expect(selectable).toBe(true);
    });

    it('should return false when stock is not available (BR-PROD-08)', () => {
      // Given
      const additionalPrice = Money.from(0);
      const stock = Stock.create('stock-1', 'option-1', 100, 0, 50, 50);
      const option = ProductOption.create(
        'option-1',
        'product-1',
        'Size',
        'S',
        additionalPrice,
        stock,
      );

      // When
      const selectable = option.isSelectable();

      // Then
      expect(selectable).toBe(false);
    });
  });

  describe('option variations', () => {
    it('should create color option without additional price', () => {
      // Given
      const additionalPrice = Money.from(0);
      const stock = Stock.initialize('stock-1', 'option-1', 50);

      // When
      const option = ProductOption.create(
        'option-1',
        'product-1',
        'Color',
        'Blue',
        additionalPrice,
        stock,
      );

      // Then
      expect(option.type).toBe('Color');
      expect(option.name).toBe('Blue');
      expect(option.additionalPrice.amount).toBe(0);
    });

    it('should create size option with additional price', () => {
      // Given
      const additionalPrice = Money.from(1000);
      const stock = Stock.initialize('stock-1', 'option-1', 30);

      // When
      const option = ProductOption.create(
        'option-1',
        'product-1',
        'Size',
        'L',
        additionalPrice,
        stock,
      );

      // Then
      expect(option.type).toBe('Size');
      expect(option.name).toBe('L');
      expect(option.additionalPrice.amount).toBe(1000);
    });
  });
});
