import { Test, TestingModule } from '@nestjs/testing';
import { CartStockValidationService } from './cart-stock-validation.service';
import { IProductRepository, PRODUCT_REPOSITORY } from '../../../product/domain/repositories/product.repository';
import { Product } from '../../../product/domain/entities/product.entity';
import { ProductOption } from '../../../product/domain/entities/product-option.entity';
import { Stock } from '../../../product/domain/entities/stock.entity';
import { Money } from '../../../product/domain/entities/money.vo';
import { InsufficientStockException } from '../cart.exceptions';
import { ProductNotFoundException } from '../../../product/domain/product.exceptions';

describe('CartStockValidationService', () => {
  let service: CartStockValidationService;
  let productRepository: jest.Mocked<IProductRepository>;

  beforeEach(async () => {
    const mockProductRepository: jest.Mocked<IProductRepository> = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findPopular: jest.fn(),
      save: jest.fn(),
      exists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartStockValidationService,
        {
          provide: PRODUCT_REPOSITORY,
          useValue: mockProductRepository,
        },
      ],
    }).compile();

    service = module.get<CartStockValidationService>(CartStockValidationService);
    productRepository = module.get(PRODUCT_REPOSITORY);
  });

  const createTestProduct = (availableQuantity: number): Product => {
    const stock = Stock.create(
      'stock-1',
      'option-1',
      100,
      availableQuantity,
      0,
      100 - availableQuantity,
    );

    const option = ProductOption.create(
      'option-1',
      'product-1',
      '색상',
      '빨강',
      Money.from(0),
      stock,
    );

    return Product.create(
      'product-1',
      'Test Product',
      Money.from(10000),
      'Test Description',
      'https://example.com/image.jpg',
      [option],
      new Date(),
      new Date(),
    );
  };

  describe('재고 가용성 검증', () => {
    it('충분한 재고가 있을 때 검증을 통과해야 함 (BR-CART-02)', async () => {
      // Given
      const product = createTestProduct(10); // 가용 재고 10개
      productRepository.findById.mockResolvedValue(product);

      // When & Then
      await expect(
        service.validateAvailability('product-1', 'option-1', 5),
      ).resolves.not.toThrow();
    });

    it('재고가 부족할 때 InsufficientStockException을 발생시켜야 함 (BR-CART-02)', async () => {
      // Given
      const product = createTestProduct(3); // 가용 재고 3개
      productRepository.findById.mockResolvedValue(product);

      // When & Then
      await expect(
        service.validateAvailability('product-1', 'option-1', 5),
      ).rejects.toThrow(InsufficientStockException);
      await expect(
        service.validateAvailability('product-1', 'option-1', 5),
      ).rejects.toThrow('재고가 부족합니다. (요청: 5, 가용: 3)');
    });

    it('재고가 정확히 일치할 때 검증을 통과해야 함', async () => {
      // Given
      const product = createTestProduct(5); // 가용 재고 5개
      productRepository.findById.mockResolvedValue(product);

      // When & Then
      await expect(
        service.validateAvailability('product-1', 'option-1', 5),
      ).resolves.not.toThrow();
    });

    it('상품을 찾을 수 없을 때 ProductNotFoundException을 발생시켜야 함', async () => {
      // Given
      productRepository.findById.mockResolvedValue(null);

      // When & Then
      await expect(
        service.validateAvailability('product-1', 'option-1', 5),
      ).rejects.toThrow(ProductNotFoundException);
      await expect(
        service.validateAvailability('product-1', 'option-1', 5),
      ).rejects.toThrow('상품을 찾을 수 없습니다.');
    });

    it('상품 옵션을 찾을 수 없을 때 ProductNotFoundException을 발생시켜야 함', async () => {
      // Given
      const product = createTestProduct(10);
      productRepository.findById.mockResolvedValue(product);

      // When & Then
      await expect(
        service.validateAvailability('product-1', 'non-existent-option', 5),
      ).rejects.toThrow(ProductNotFoundException);
      await expect(
        service.validateAvailability('product-1', 'non-existent-option', 5),
      ).rejects.toThrow('상품 옵션을 찾을 수 없습니다.');
    });

    it('재고가 0일 때 InsufficientStockException을 발생시켜야 함', async () => {
      // Given
      const product = createTestProduct(0); // 품절
      productRepository.findById.mockResolvedValue(product);

      // When & Then
      await expect(
        service.validateAvailability('product-1', 'option-1', 1),
      ).rejects.toThrow(InsufficientStockException);
      await expect(
        service.validateAvailability('product-1', 'option-1', 1),
      ).rejects.toThrow('재고가 부족합니다. (요청: 1, 가용: 0)');
    });
  });
});
