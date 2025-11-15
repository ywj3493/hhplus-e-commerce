import { Product } from './product.entity';
import { ProductOption } from './product-option.entity';
import { Stock } from './stock.entity';
import { Money } from './money.vo';
import { StockStatusType } from './stock-status.vo';

describe('Product', () => {
  const createTestProduct = (options: ProductOption[] = []): Product => {
    return Product.create(
      'product-1',
      'Test Product',
      Money.from(10000),
      'Test Description',
      'https://example.com/image.jpg',
      options,
      new Date('2024-01-01'),
      new Date('2024-01-01'),
    );
  };

  const createTestOption = (
    id: string,
    type: string,
    name: string,
    additionalPrice: number,
    availableQuantity: number,
  ): ProductOption => {
    const stock = Stock.create(
      `stock-${id}`,
      id,
      100,
      availableQuantity,
      0,
      100 - availableQuantity,
    );
    return ProductOption.create(
      id,
      'product-1',
      type,
      name,
      Money.from(additionalPrice),
      stock,
    );
  };

  describe('create', () => {
    it('should create Product with valid parameters', () => {
      // Given
      const id = 'product-1';
      const name = 'Test Product';
      const price = Money.from(10000);
      const description = 'Test Description';
      const imageUrl = 'https://example.com/image.jpg';
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-01');

      // When
      const product = Product.create(
        id,
        name,
        price,
        description,
        imageUrl,
        [],
        createdAt,
        updatedAt,
      );

      // Then
      expect(product.id).toBe(id);
      expect(product.name).toBe(name);
      expect(product.price).toBe(price);
      expect(product.description).toBe(description);
      expect(product.imageUrl).toBe(imageUrl);
      expect(product.options).toHaveLength(0);
      expect(product.createdAt).toEqual(createdAt);
      expect(product.updatedAt).toEqual(updatedAt);
    });

    it('should throw error when product ID is empty', () => {
      // When & Then
      expect(() =>
        Product.create(
          '',
          'Test',
          Money.from(10000),
          'Desc',
          'https://example.com/image.jpg',
          [],
          new Date(),
          new Date(),
        ),
      ).toThrow('Product ID is required');
    });

    it('should throw error when product name is empty', () => {
      // When & Then
      expect(() =>
        Product.create(
          'product-1',
          '',
          Money.from(10000),
          'Desc',
          'https://example.com/image.jpg',
          [],
          new Date(),
          new Date(),
        ),
      ).toThrow('Product name is required');
    });

    it('should throw error when image URL is empty', () => {
      // When & Then
      expect(() =>
        Product.create(
          'product-1',
          'Test',
          Money.from(10000),
          'Desc',
          '',
          [],
          new Date(),
          new Date(),
        ),
      ).toThrow('Product image URL is required');
    });
  });

  describe('getStockStatus', () => {
    it('should return IN_STOCK when at least one option is available (BR-PROD-04)', () => {
      // Given
      const options = [
        createTestOption('option-1', 'Color', 'Red', 0, 10), // Available
        createTestOption('option-2', 'Color', 'Blue', 0, 0), // Out of stock
      ];
      const product = createTestProduct(options);

      // When
      const status = product.getStockStatus();

      // Then
      expect(status.status).toBe(StockStatusType.IN_STOCK);
    });

    it('should return OUT_OF_STOCK when all options are unavailable', () => {
      // Given
      const options = [
        createTestOption('option-1', 'Color', 'Red', 0, 0),
        createTestOption('option-2', 'Color', 'Blue', 0, 0),
      ];
      const product = createTestProduct(options);

      // When
      const status = product.getStockStatus();

      // Then
      expect(status.status).toBe(StockStatusType.OUT_OF_STOCK);
    });

    it('should return OUT_OF_STOCK when product has no options', () => {
      // Given
      const product = createTestProduct([]);

      // When
      const status = product.getStockStatus();

      // Then
      expect(status.status).toBe(StockStatusType.OUT_OF_STOCK);
    });
  });

  describe('getGroupedOptions', () => {
    it('should group options by type (BR-PROD-05)', () => {
      // Given
      const options = [
        createTestOption('option-1', 'Color', 'Red', 0, 10),
        createTestOption('option-2', 'Color', 'Blue', 0, 5),
        createTestOption('option-3', 'Size', 'S', 0, 0),
        createTestOption('option-4', 'Size', 'M', 0, 20),
        createTestOption('option-5', 'Size', 'L', 1000, 15),
      ];
      const product = createTestProduct(options);

      // When
      const grouped = product.getGroupedOptions();

      // Then
      expect(grouped).toHaveLength(2);

      const colorGroup = grouped.find((g) => g.type === 'Color');
      expect(colorGroup).toBeDefined();
      expect(colorGroup?.options).toHaveLength(2);
      expect(colorGroup?.options.map((o) => o.name)).toEqual(['Red', 'Blue']);

      const sizeGroup = grouped.find((g) => g.type === 'Size');
      expect(sizeGroup).toBeDefined();
      expect(sizeGroup?.options).toHaveLength(3);
      expect(sizeGroup?.options.map((o) => o.name)).toEqual(['S', 'M', 'L']);
    });

    it('should include stock status for each option (BR-PROD-06)', () => {
      // Given
      const options = [
        createTestOption('option-1', 'Color', 'Red', 0, 10), // In stock
        createTestOption('option-2', 'Color', 'Blue', 0, 0), // Out of stock
      ];
      const product = createTestProduct(options);

      // When
      const grouped = product.getGroupedOptions();

      // Then
      const colorGroup = grouped.find((g) => g.type === 'Color');
      expect(colorGroup?.options[0].stockStatus.status).toBe(StockStatusType.IN_STOCK);
      expect(colorGroup?.options[1].stockStatus.status).toBe(StockStatusType.OUT_OF_STOCK);
    });

    it('should include additional price for each option', () => {
      // Given
      const options = [
        createTestOption('option-1', 'Size', 'S', 0, 10),
        createTestOption('option-2', 'Size', 'M', 0, 10),
        createTestOption('option-3', 'Size', 'L', 1000, 10),
      ];
      const product = createTestProduct(options);

      // When
      const grouped = product.getGroupedOptions();

      // Then
      const sizeGroup = grouped.find((g) => g.type === 'Size');
      expect(sizeGroup?.options[0].additionalPrice.amount).toBe(0);
      expect(sizeGroup?.options[1].additionalPrice.amount).toBe(0);
      expect(sizeGroup?.options[2].additionalPrice.amount).toBe(1000);
    });

    it('should mark out-of-stock options as not selectable (BR-PROD-08)', () => {
      // Given
      const options = [
        createTestOption('option-1', 'Size', 'S', 0, 0), // Out of stock
        createTestOption('option-2', 'Size', 'M', 0, 10), // In stock
      ];
      const product = createTestProduct(options);

      // When
      const grouped = product.getGroupedOptions();

      // Then
      const sizeGroup = grouped.find((g) => g.type === 'Size');
      expect(sizeGroup?.options[0].isSelectable).toBe(false);
      expect(sizeGroup?.options[1].isSelectable).toBe(true);
    });

    it('should return empty array when product has no options', () => {
      // Given
      const product = createTestProduct([]);

      // When
      const grouped = product.getGroupedOptions();

      // Then
      expect(grouped).toHaveLength(0);
    });
  });

  describe('findOption', () => {
    it('should find option by ID', () => {
      // Given
      const options = [
        createTestOption('option-1', 'Color', 'Red', 0, 10),
        createTestOption('option-2', 'Color', 'Blue', 0, 5),
      ];
      const product = createTestProduct(options);

      // When
      const found = product.findOption('option-2');

      // Then
      expect(found).toBeDefined();
      expect(found?.name).toBe('Blue');
    });

    it('should return undefined when option not found', () => {
      // Given
      const options = [createTestOption('option-1', 'Color', 'Red', 0, 10)];
      const product = createTestProduct(options);

      // When
      const found = product.findOption('non-existent');

      // Then
      expect(found).toBeUndefined();
    });
  });

  describe('calculateTotalPrice', () => {
    it('should calculate total price correctly (BR-PROD-07)', () => {
      // Given: Product price 10,000 KRW
      const options = [
        createTestOption('option-1', 'Size', 'L', 1000, 10), // +1,000 KRW
      ];
      const product = createTestProduct(options);
      const quantity = 3;

      // When: (10,000 + 1,000) × 3
      const totalPrice = product.calculateTotalPrice('option-1', quantity);

      // Then: = 33,000 KRW
      expect(totalPrice.amount).toBe(33000);
    });

    it('should calculate with no additional price', () => {
      // Given
      const options = [
        createTestOption('option-1', 'Color', 'Red', 0, 10), // +0 KRW
      ];
      const product = createTestProduct(options);
      const quantity = 2;

      // When: (10,000 + 0) × 2
      const totalPrice = product.calculateTotalPrice('option-1', quantity);

      // Then: = 20,000 KRW
      expect(totalPrice.amount).toBe(20000);
    });

    it('should throw error for non-existent option', () => {
      // Given
      const product = createTestProduct([]);

      // When & Then
      expect(() => product.calculateTotalPrice('non-existent', 1)).toThrow(
        'Option not found: non-existent',
      );
    });

    it('should throw error for zero quantity', () => {
      // Given
      const options = [createTestOption('option-1', 'Color', 'Red', 0, 10)];
      const product = createTestProduct(options);

      // When & Then
      expect(() => product.calculateTotalPrice('option-1', 0)).toThrow(
        'Quantity must be positive',
      );
    });

    it('should throw error for negative quantity', () => {
      // Given
      const options = [createTestOption('option-1', 'Color', 'Red', 0, 10)];
      const product = createTestProduct(options);

      // When & Then
      expect(() => product.calculateTotalPrice('option-1', -1)).toThrow(
        'Quantity must be positive',
      );
    });
  });

  describe('options immutability', () => {
    it('should return copy of options to maintain immutability', () => {
      // Given
      const options = [createTestOption('option-1', 'Color', 'Red', 0, 10)];
      const product = createTestProduct(options);

      // When
      const retrievedOptions = product.options;
      retrievedOptions.push(createTestOption('option-2', 'Color', 'Blue', 0, 5));

      // Then: Original product options should not be modified
      expect(product.options).toHaveLength(1);
    });
  });
});
