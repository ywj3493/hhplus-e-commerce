import { GetProductsUseCase } from './get-products.use-case';
import { GetProductsInput } from '../dtos/get-products.input';
import { IProductRepository, PaginationResult } from '../../domain/repositories/product.repository';
import { Product } from '../../domain/entities/product.entity';
import { ProductOption } from '../../domain/entities/product-option.entity';
import { Stock } from '../../domain/entities/stock.entity';
import { Money } from '../../domain/entities/money.vo';
import { StockStatusType } from '../../domain/entities/stock-status.vo';

describe('GetProductsUseCase', () => {
  let useCase: GetProductsUseCase;
  let mockRepository: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findPopular: jest.fn(),
      save: jest.fn(),
      exists: jest.fn(),
    };
    useCase = new GetProductsUseCase(mockRepository);
  });

  const createTestProduct = (
    id: string,
    name: string,
    price: number,
    availableQuantity: number,
  ): Product => {
    const option = ProductOption.create(
      `opt-${id}`,
      id,
      'Default',
      'Standard',
      Money.from(0),
      Stock.initialize(`stock-${id}`, `opt-${id}`, availableQuantity),
    );
    return Product.create(
      id,
      name,
      Money.from(price),
      `Description for ${name}`,
      `https://example.com/${id}.jpg`,
      [option],
      new Date('2024-01-01'),
      new Date('2024-01-01'),
    );
  };

  describe('execute', () => {
    it('should return paginated product list with stock status', async () => {
      // Given
      const input = new GetProductsInput(1, 10);
      const products = [
        createTestProduct('prod-1', 'Product 1', 10000, 50),
        createTestProduct('prod-2', 'Product 2', 20000, 30),
        createTestProduct('prod-3', 'Product 3', 30000, 0), // Out of stock
      ];
      const paginationResult: PaginationResult<Product> = {
        items: products,
        total: 3,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      mockRepository.findAll.mockResolvedValue(paginationResult);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(mockRepository.findAll).toHaveBeenCalledWith(1, 10);
      expect(output.items).toHaveLength(3);
      expect(output.items[0].id).toBe('prod-1');
      expect(output.items[0].name).toBe('Product 1');
      expect(output.items[0].price).toBe(10000);
      expect(output.items[0].stockStatus.status).toBe(StockStatusType.IN_STOCK);
      expect(output.items[2].stockStatus.status).toBe(StockStatusType.OUT_OF_STOCK);
      expect(output.total).toBe(3);
      expect(output.page).toBe(1);
      expect(output.limit).toBe(10);
      expect(output.totalPages).toBe(1);
    });

    it('should handle default pagination values (BR-PROD-02)', async () => {
      // Given: Default page=1, limit=10
      const input = new GetProductsInput();
      const paginationResult: PaginationResult<Product> = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
      mockRepository.findAll.mockResolvedValue(paginationResult);

      // When
      await useCase.execute(input);

      // Then
      expect(mockRepository.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should handle custom pagination values', async () => {
      // Given
      const input = new GetProductsInput(2, 20);
      const paginationResult: PaginationResult<Product> = {
        items: [],
        total: 0,
        page: 2,
        limit: 20,
        totalPages: 0,
      };
      mockRepository.findAll.mockResolvedValue(paginationResult);

      // When
      await useCase.execute(input);

      // Then
      expect(mockRepository.findAll).toHaveBeenCalledWith(2, 20);
    });

    it('should return empty list when no products exist', async () => {
      // Given
      const input = new GetProductsInput(1, 10);
      const paginationResult: PaginationResult<Product> = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
      mockRepository.findAll.mockResolvedValue(paginationResult);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.items).toHaveLength(0);
      expect(output.total).toBe(0);
    });

    it('should map product imageUrl correctly', async () => {
      // Given
      const input = new GetProductsInput(1, 10);
      const products = [createTestProduct('prod-1', 'Product 1', 10000, 50)];
      const paginationResult: PaginationResult<Product> = {
        items: products,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      mockRepository.findAll.mockResolvedValue(paginationResult);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.items[0].imageUrl).toBe('https://example.com/prod-1.jpg');
    });
  });

  describe('input validation', () => {
    it('should validate page must be 1 or greater', () => {
      // When & Then
      expect(() => new GetProductsInput(0, 10)).toThrow('페이지는 1 이상이어야 합니다');
    });

    it('should validate page size minimum (BR-PROD-03)', () => {
      // When & Then
      expect(() => new GetProductsInput(1, 0)).toThrow('페이지 크기는 1-100 사이여야 합니다');
    });

    it('should validate page size maximum (BR-PROD-03)', () => {
      // When & Then
      expect(() => new GetProductsInput(1, 101)).toThrow('페이지 크기는 1-100 사이여야 합니다');
    });

    it('should accept page size at boundary values', () => {
      // When & Then
      expect(() => new GetProductsInput(1, 1)).not.toThrow();
      expect(() => new GetProductsInput(1, 100)).not.toThrow();
    });
  });
});
