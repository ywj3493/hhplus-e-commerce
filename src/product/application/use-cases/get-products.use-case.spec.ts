import { GetProductsUseCase } from '@/product/application/use-cases/get-products.use-case';
import { GetProductsInput } from '@/product/application/dtos/get-products.dto';
import { ProductRepository, PaginationResult } from '@/product/domain/repositories/product.repository';
import { Product } from '@/product/domain/entities/product.entity';
import { ProductOption } from '@/product/domain/entities/product-option.entity';
import { Stock } from '@/product/domain/entities/stock.entity';
import { Price } from '@/product/domain/entities/price.vo';
import { StockStatusType } from '@/product/domain/entities/stock-status.vo';

describe('GetProductsUseCase', () => {
  let useCase: GetProductsUseCase;
  let mockRepository: jest.Mocked<ProductRepository>;

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
      Price.from(0),
      Stock.initialize(`stock-${id}`, id, `opt-${id}`, availableQuantity),
    );
    return Product.create(
      id,
      name,
      Price.from(price),
      `Description for ${name}`,
      `https://example.com/${id}.jpg`,
      'category-test', // categoryId
      [option],
      new Date('2024-01-01'),
      new Date('2024-01-01'),
    );
  };

  describe('실행', () => {
    it('재고 상태가 포함된 페이지네이션 상품 목록을 반환해야 함', async () => {
      // Given
      const input = new GetProductsInput(1, 10);
      const products = [
        createTestProduct('prod-1', 'Product 1', 10000, 50),
        createTestProduct('prod-2', 'Product 2', 20000, 30),
        createTestProduct('prod-3', 'Product 3', 30000, 0), // 품절
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

    it('기본 페이지네이션 값을 처리해야 함 (BR-PROD-02)', async () => {
      // Given: 기본값 page=1, limit=10
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

    it('커스텀 페이지네이션 값을 처리해야 함', async () => {
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

    it('상품이 없을 때 빈 목록을 반환해야 함', async () => {
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

    it('상품 이미지 URL을 올바르게 매핑해야 함', async () => {
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

  describe('입력 검증', () => {
    it('페이지는 1 이상이어야 함', () => {
      // When & Then
      expect(() => new GetProductsInput(0, 10)).toThrow('페이지는 1 이상이어야 합니다');
    });

    it('페이지 크기 최소값을 검증해야 함 (BR-PROD-03)', () => {
      // When & Then
      expect(() => new GetProductsInput(1, 0)).toThrow('페이지 크기는 1-100 사이여야 합니다');
    });

    it('페이지 크기 최대값을 검증해야 함 (BR-PROD-03)', () => {
      // When & Then
      expect(() => new GetProductsInput(1, 101)).toThrow('페이지 크기는 1-100 사이여야 합니다');
    });

    it('경계값의 페이지 크기를 허용해야 함', () => {
      // When & Then
      expect(() => new GetProductsInput(1, 1)).not.toThrow();
      expect(() => new GetProductsInput(1, 100)).not.toThrow();
    });
  });
});
