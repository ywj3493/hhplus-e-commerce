import { GetProductDetailUseCase } from './get-product-detail.use-case';
import { GetProductDetailInput } from '../dtos/get-product-detail.input';
import { IProductRepository } from '../../domain/repositories/product.repository';
import { Product } from '../../domain/entities/product.entity';
import { ProductOption } from '../../domain/entities/product-option.entity';
import { Stock } from '../../domain/entities/stock.entity';
import { Money } from '../../domain/entities/money.vo';
import { StockStatusType } from '../../domain/entities/stock-status.vo';
import { ProductNotFoundException } from '../../domain/product.exceptions';

describe('GetProductDetailUseCase', () => {
  let useCase: GetProductDetailUseCase;
  let mockRepository: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findPopular: jest.fn(),
      save: jest.fn(),
      exists: jest.fn(),
    };
    useCase = new GetProductDetailUseCase(mockRepository);
  });

  const createProductWithOptions = (): Product => {
    const colorOptions = [
      ProductOption.create(
        'opt-color-red',
        'product-1',
        'Color',
        'Red',
        Money.from(0),
        Stock.initialize('stock-red', 'opt-color-red', 50),
      ),
      ProductOption.create(
        'opt-color-blue',
        'product-1',
        'Color',
        'Blue',
        Money.from(0),
        Stock.create('stock-blue', 'opt-color-blue', 50, 0, 30, 20), // Out of stock
      ),
    ];

    const sizeOptions = [
      ProductOption.create(
        'opt-size-s',
        'product-1',
        'Size',
        'S',
        Money.from(0),
        Stock.create('stock-s', 'opt-size-s', 30, 0, 10, 20), // Out of stock
      ),
      ProductOption.create(
        'opt-size-m',
        'product-1',
        'Size',
        'M',
        Money.from(0),
        Stock.initialize('stock-m', 'opt-size-m', 40),
      ),
      ProductOption.create(
        'opt-size-l',
        'product-1',
        'Size',
        'L',
        Money.from(2000),
        Stock.initialize('stock-l', 'opt-size-l', 30),
      ),
    ];

    return Product.create(
      'product-1',
      'Test Product',
      Money.from(50000),
      'Test product with multiple options',
      'https://example.com/product-1.jpg',
      [...colorOptions, ...sizeOptions],
      new Date('2024-01-01'),
      new Date('2024-01-01'),
    );
  };

  describe('execute', () => {
    it('should return product detail with grouped options (BR-PROD-05)', async () => {
      // Given
      const input = new GetProductDetailInput('product-1');
      const product = createProductWithOptions();
      mockRepository.findById.mockResolvedValue(product);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(mockRepository.findById).toHaveBeenCalledWith('product-1');
      expect(output.id).toBe('product-1');
      expect(output.name).toBe('Test Product');
      expect(output.price.amount).toBe(50000);
      expect(output.description).toBe('Test product with multiple options');
      expect(output.imageUrl).toBe('https://example.com/product-1.jpg');
      expect(output.optionGroups).toHaveLength(2);
    });

    it('should group options by type correctly (BR-PROD-05)', async () => {
      // Given
      const input = new GetProductDetailInput('product-1');
      const product = createProductWithOptions();
      mockRepository.findById.mockResolvedValue(product);

      // When
      const output = await useCase.execute(input);

      // Then
      const colorGroup = output.optionGroups.find((g) => g.type === 'Color');
      const sizeGroup = output.optionGroups.find((g) => g.type === 'Size');

      expect(colorGroup).toBeDefined();
      expect(colorGroup?.options).toHaveLength(2);
      expect(colorGroup?.options.map((o) => o.name)).toEqual(['Red', 'Blue']);

      expect(sizeGroup).toBeDefined();
      expect(sizeGroup?.options).toHaveLength(3);
      expect(sizeGroup?.options.map((o) => o.name)).toEqual(['S', 'M', 'L']);
    });

    it('should include stock status for each option (BR-PROD-06)', async () => {
      // Given
      const input = new GetProductDetailInput('product-1');
      const product = createProductWithOptions();
      mockRepository.findById.mockResolvedValue(product);

      // When
      const output = await useCase.execute(input);

      // Then
      const colorGroup = output.optionGroups.find((g) => g.type === 'Color');
      expect(colorGroup?.options[0].stockStatus.status).toBe(StockStatusType.IN_STOCK); // Red
      expect(colorGroup?.options[1].stockStatus.status).toBe(StockStatusType.OUT_OF_STOCK); // Blue

      const sizeGroup = output.optionGroups.find((g) => g.type === 'Size');
      expect(sizeGroup?.options[0].stockStatus.status).toBe(StockStatusType.OUT_OF_STOCK); // S
      expect(sizeGroup?.options[1].stockStatus.status).toBe(StockStatusType.IN_STOCK); // M
      expect(sizeGroup?.options[2].stockStatus.status).toBe(StockStatusType.IN_STOCK); // L
    });

    it('should mark out-of-stock options as not selectable (BR-PROD-08)', async () => {
      // Given
      const input = new GetProductDetailInput('product-1');
      const product = createProductWithOptions();
      mockRepository.findById.mockResolvedValue(product);

      // When
      const output = await useCase.execute(input);

      // Then
      const colorGroup = output.optionGroups.find((g) => g.type === 'Color');
      expect(colorGroup?.options[0].isSelectable).toBe(true); // Red - in stock
      expect(colorGroup?.options[1].isSelectable).toBe(false); // Blue - out of stock

      const sizeGroup = output.optionGroups.find((g) => g.type === 'Size');
      expect(sizeGroup?.options[0].isSelectable).toBe(false); // S - out of stock
      expect(sizeGroup?.options[1].isSelectable).toBe(true); // M - in stock
      expect(sizeGroup?.options[2].isSelectable).toBe(true); // L - in stock
    });

    it('should include additional price for each option', async () => {
      // Given
      const input = new GetProductDetailInput('product-1');
      const product = createProductWithOptions();
      mockRepository.findById.mockResolvedValue(product);

      // When
      const output = await useCase.execute(input);

      // Then
      const sizeGroup = output.optionGroups.find((g) => g.type === 'Size');
      expect(sizeGroup?.options[0].additionalPrice.amount).toBe(0); // S
      expect(sizeGroup?.options[1].additionalPrice.amount).toBe(0); // M
      expect(sizeGroup?.options[2].additionalPrice.amount).toBe(2000); // L
    });

    it('should throw ProductNotFoundException when product not found', async () => {
      // Given
      const input = new GetProductDetailInput('non-existent');
      mockRepository.findById.mockResolvedValue(undefined);

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(ProductNotFoundException);
      await expect(useCase.execute(input)).rejects.toThrow('상품을 찾을 수 없습니다: non-existent');
    });

    it('should handle product with no options', async () => {
      // Given
      const input = new GetProductDetailInput('product-1');
      const product = Product.create(
        'product-1',
        'Product without options',
        Money.from(10000),
        'Description',
        'https://example.com/product.jpg',
        [], // No options
        new Date(),
        new Date(),
      );
      mockRepository.findById.mockResolvedValue(product);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.optionGroups).toHaveLength(0);
    });

    it('should handle product with single option type', async () => {
      // Given
      const input = new GetProductDetailInput('product-1');
      const option = ProductOption.create(
        'opt-1',
        'product-1',
        'Color',
        'Red',
        Money.from(0),
        Stock.initialize('stock-1', 'opt-1', 50),
      );
      const product = Product.create(
        'product-1',
        'Single Option Product',
        Money.from(10000),
        'Description',
        'https://example.com/product.jpg',
        [option],
        new Date(),
        new Date(),
      );
      mockRepository.findById.mockResolvedValue(product);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.optionGroups).toHaveLength(1);
      expect(output.optionGroups[0].type).toBe('Color');
      expect(output.optionGroups[0].options).toHaveLength(1);
    });
  });

  describe('input validation', () => {
    it('should validate product ID is required', () => {
      // When & Then
      expect(() => new GetProductDetailInput('')).toThrow('상품 ID는 필수입니다');
    });

    it('should validate product ID is not whitespace only', () => {
      // When & Then
      expect(() => new GetProductDetailInput('   ')).toThrow('상품 ID는 필수입니다');
    });

    it('should accept valid product ID', () => {
      // When & Then
      expect(() => new GetProductDetailInput('product-1')).not.toThrow();
    });
  });
});
