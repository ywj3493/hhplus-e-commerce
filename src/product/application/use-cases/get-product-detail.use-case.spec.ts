import { GetProductDetailUseCase } from '@/product/application/use-cases/get-product-detail.use-case';
import { GetProductDetailInput } from '@/product/application/dtos/get-product-detail.dto';
import { IProductRepository } from '@/product/domain/repositories/product.repository';
import { Product } from '@/product/domain/entities/product.entity';
import { ProductOption } from '@/product/domain/entities/product-option.entity';
import { Stock } from '@/product/domain/entities/stock.entity';
import { Price } from '@/product/domain/entities/price.vo';
import { StockStatusType } from '@/product/domain/entities/stock-status.vo';
import { ProductNotFoundException } from '@/product/domain/product.exceptions';

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
        Price.from(0),
        Stock.initialize('stock-red', 'opt-color-red', 50),
      ),
      ProductOption.create(
        'opt-color-blue',
        'product-1',
        'Color',
        'Blue',
        Price.from(0),
        Stock.create('stock-blue', 'opt-color-blue', 50, 0, 30, 20), // 품절
      ),
    ];

    const sizeOptions = [
      ProductOption.create(
        'opt-size-s',
        'product-1',
        'Size',
        'S',
        Price.from(0),
        Stock.create('stock-s', 'opt-size-s', 30, 0, 10, 20), // 품절
      ),
      ProductOption.create(
        'opt-size-m',
        'product-1',
        'Size',
        'M',
        Price.from(0),
        Stock.initialize('stock-m', 'opt-size-m', 40),
      ),
      ProductOption.create(
        'opt-size-l',
        'product-1',
        'Size',
        'L',
        Price.from(2000),
        Stock.initialize('stock-l', 'opt-size-l', 30),
      ),
    ];

    return Product.create(
      'product-1',
      'Test Product',
      Price.from(50000),
      'Test product with multiple options',
      'https://example.com/product-1.jpg',
      [...colorOptions, ...sizeOptions],
      new Date('2024-01-01'),
      new Date('2024-01-01'),
    );
  };

  describe('실행', () => {
    it('그룹화된 옵션이 포함된 상품 상세 정보를 반환해야 함 (BR-PROD-05)', async () => {
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

    it('옵션을 타입별로 올바르게 그룹화해야 함 (BR-PROD-05)', async () => {
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

    it('각 옵션의 재고 상태를 포함해야 함 (BR-PROD-06)', async () => {
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

    it('품절된 옵션을 선택 불가로 표시해야 함 (BR-PROD-08)', async () => {
      // Given
      const input = new GetProductDetailInput('product-1');
      const product = createProductWithOptions();
      mockRepository.findById.mockResolvedValue(product);

      // When
      const output = await useCase.execute(input);

      // Then
      const colorGroup = output.optionGroups.find((g) => g.type === 'Color');
      expect(colorGroup?.options[0].isSelectable).toBe(true); // Red - 재고 있음
      expect(colorGroup?.options[1].isSelectable).toBe(false); // Blue - 품절

      const sizeGroup = output.optionGroups.find((g) => g.type === 'Size');
      expect(sizeGroup?.options[0].isSelectable).toBe(false); // S - 품절
      expect(sizeGroup?.options[1].isSelectable).toBe(true); // M - 재고 있음
      expect(sizeGroup?.options[2].isSelectable).toBe(true); // L - 재고 있음
    });

    it('각 옵션의 추가 금액을 포함해야 함', async () => {
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

    it('상품을 찾을 수 없을 때 ProductNotFoundException을 발생시켜야 함', async () => {
      // Given
      const input = new GetProductDetailInput('non-existent');
      mockRepository.findById.mockResolvedValue(undefined);

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(ProductNotFoundException);
      await expect(useCase.execute(input)).rejects.toThrow('상품을 찾을 수 없습니다: non-existent');
    });

    it('옵션이 없는 상품을 처리해야 함', async () => {
      // Given
      const input = new GetProductDetailInput('product-1');
      const product = Product.create(
        'product-1',
        'Product without options',
        Price.from(10000),
        'Description',
        'https://example.com/product.jpg',
        [], // 옵션 없음
        new Date(),
        new Date(),
      );
      mockRepository.findById.mockResolvedValue(product);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.optionGroups).toHaveLength(0);
    });

    it('단일 옵션 타입만 있는 상품을 처리해야 함', async () => {
      // Given
      const input = new GetProductDetailInput('product-1');
      const option = ProductOption.create(
        'opt-1',
        'product-1',
        'Color',
        'Red',
        Price.from(0),
        Stock.initialize('stock-1', 'opt-1', 50),
      );
      const product = Product.create(
        'product-1',
        'Single Option Product',
        Price.from(10000),
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

  describe('입력 검증', () => {
    it('상품 ID가 필수임을 검증해야 함', () => {
      // When & Then
      expect(() => new GetProductDetailInput('')).toThrow('상품 ID는 필수입니다');
    });

    it('상품 ID가 공백만 있을 수 없음을 검증해야 함', () => {
      // When & Then
      expect(() => new GetProductDetailInput('   ')).toThrow('상품 ID는 필수입니다');
    });

    it('유효한 상품 ID를 허용해야 함', () => {
      // When & Then
      expect(() => new GetProductDetailInput('product-1')).not.toThrow();
    });
  });
});
