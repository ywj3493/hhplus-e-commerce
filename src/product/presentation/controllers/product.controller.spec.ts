import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductController } from './product.controller';
import { GetProductsUseCase } from '../../application/use-cases/get-products.use-case';
import { GetProductDetailUseCase } from '../../application/use-cases/get-product-detail.use-case';
import { GetProductsOutput, ProductListItem } from '../../application/dtos/get-products.output';
import {
  GetProductDetailOutput,
  ProductOptionGroup,
  ProductOptionDetail,
} from '../../application/dtos/get-product-detail.output';
import { Money } from '../../domain/entities/money.vo';
import { StockStatus } from '../../domain/entities/stock-status.vo';
import { ProductNotFoundException } from '../../domain/product.exceptions';

describe('ProductController', () => {
  let controller: ProductController;
  let getProductsUseCase: jest.Mocked<GetProductsUseCase>;
  let getProductDetailUseCase: jest.Mocked<GetProductDetailUseCase>;

  beforeEach(async () => {
    const mockGetProductsUseCase = {
      execute: jest.fn(),
    };

    const mockGetProductDetailUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: GetProductsUseCase,
          useValue: mockGetProductsUseCase,
        },
        {
          provide: GetProductDetailUseCase,
          useValue: mockGetProductDetailUseCase,
        },
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    getProductsUseCase = module.get(GetProductsUseCase);
    getProductDetailUseCase = module.get(GetProductDetailUseCase);
  });

  describe('getProducts', () => {
    it('should return paginated product list', async () => {
      // Given
      const query = { page: 1, limit: 10 };
      const useCaseOutput = new GetProductsOutput(
        [
          new ProductListItem('prod-1', 'Product 1', 10000, 'https://example.com/1.jpg', StockStatus.inStock()),
          new ProductListItem('prod-2', 'Product 2', 20000, 'https://example.com/2.jpg', StockStatus.outOfStock()),
        ],
        2,
        1,
        10,
        1,
      );
      getProductsUseCase.execute.mockResolvedValue(useCaseOutput);

      // When
      const response = await controller.getProducts(query);

      // Then
      expect(getProductsUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({
        page: 1,
        limit: 10,
      }));
      expect(response.items).toHaveLength(2);
      expect(response.items[0]).toEqual({
        id: 'prod-1',
        name: 'Product 1',
        price: 10000,
        imageUrl: 'https://example.com/1.jpg',
        stockStatus: 'In Stock',
      });
      expect(response.items[1].stockStatus).toBe('Out of Stock');
      expect(response.total).toBe(2);
      expect(response.page).toBe(1);
      expect(response.limit).toBe(10);
      expect(response.totalPages).toBe(1);
    });

    it('should use default pagination values', async () => {
      // Given
      const query = {};
      const useCaseOutput = new GetProductsOutput([], 0, 1, 10, 0);
      getProductsUseCase.execute.mockResolvedValue(useCaseOutput);

      // When
      await controller.getProducts(query);

      // Then
      expect(getProductsUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({
        page: 1,
        limit: 10,
      }));
    });

    it('should throw BadRequestException for invalid page', async () => {
      // Given
      const query = { page: 0, limit: 10 };

      // When & Then
      await expect(controller.getProducts(query)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid limit', async () => {
      // Given
      const query = { page: 1, limit: 101 };

      // When & Then
      await expect(controller.getProducts(query)).rejects.toThrow(BadRequestException);
    });

    it('should handle custom pagination values', async () => {
      // Given
      const query = { page: 2, limit: 20 };
      const useCaseOutput = new GetProductsOutput([], 0, 2, 20, 0);
      getProductsUseCase.execute.mockResolvedValue(useCaseOutput);

      // When
      await controller.getProducts(query);

      // Then
      expect(getProductsUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({
        page: 2,
        limit: 20,
      }));
    });

    it('should return empty list when no products exist', async () => {
      // Given
      const query = { page: 1, limit: 10 };
      const useCaseOutput = new GetProductsOutput([], 0, 1, 10, 0);
      getProductsUseCase.execute.mockResolvedValue(useCaseOutput);

      // When
      const response = await controller.getProducts(query);

      // Then
      expect(response.items).toHaveLength(0);
      expect(response.total).toBe(0);
    });
  });

  describe('getProductDetail', () => {
    it('should return product detail with grouped options', async () => {
      // Given
      const param = { id: '550e8400-e29b-41d4-a716-446655440001' };
      const useCaseOutput = new GetProductDetailOutput(
        '550e8400-e29b-41d4-a716-446655440001',
        'Test Product',
        Money.from(50000),
        'Test description',
        'https://example.com/product.jpg',
        [
          new ProductOptionGroup('Color', [
            new ProductOptionDetail('opt-1', 'Red', Money.from(0), StockStatus.inStock(), true),
            new ProductOptionDetail('opt-2', 'Blue', Money.from(0), StockStatus.outOfStock(), false),
          ]),
          new ProductOptionGroup('Size', [
            new ProductOptionDetail('opt-3', 'S', Money.from(0), StockStatus.outOfStock(), false),
            new ProductOptionDetail('opt-4', 'M', Money.from(0), StockStatus.inStock(), true),
            new ProductOptionDetail('opt-5', 'L', Money.from(2000), StockStatus.inStock(), true),
          ]),
        ],
      );
      getProductDetailUseCase.execute.mockResolvedValue(useCaseOutput);

      // When
      const response = await controller.getProductDetail(param);

      // Then
      expect(getProductDetailUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({
        productId: '550e8400-e29b-41d4-a716-446655440001',
      }));
      expect(response.id).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(response.name).toBe('Test Product');
      expect(response.price).toBe(50000);
      expect(response.description).toBe('Test description');
      expect(response.imageUrl).toBe('https://example.com/product.jpg');
      expect(response.optionGroups).toHaveLength(2);
    });

    it('should map option groups correctly', async () => {
      // Given
      const param = { id: '550e8400-e29b-41d4-a716-446655440001' };
      const useCaseOutput = new GetProductDetailOutput(
        '550e8400-e29b-41d4-a716-446655440001',
        'Test Product',
        Money.from(50000),
        'Test description',
        'https://example.com/product.jpg',
        [
          new ProductOptionGroup('Color', [
            new ProductOptionDetail('opt-1', 'Red', Money.from(0), StockStatus.inStock(), true),
          ]),
        ],
      );
      getProductDetailUseCase.execute.mockResolvedValue(useCaseOutput);

      // When
      const response = await controller.getProductDetail(param);

      // Then
      const colorGroup = response.optionGroups[0];
      expect(colorGroup.type).toBe('Color');
      expect(colorGroup.options).toHaveLength(1);
      expect(colorGroup.options[0]).toEqual({
        id: 'opt-1',
        name: 'Red',
        additionalPrice: 0,
        stockStatus: 'In Stock',
        isSelectable: true,
      });
    });

    it('should throw NotFoundException when product not found', async () => {
      // Given
      const param = { id: '550e8400-e29b-41d4-a716-446655440001' };
      getProductDetailUseCase.execute.mockRejectedValue(
        new ProductNotFoundException('550e8400-e29b-41d4-a716-446655440001'),
      );

      // When & Then
      await expect(controller.getProductDetail(param)).rejects.toThrow(NotFoundException);
      await expect(controller.getProductDetail(param)).rejects.toThrow('Product not found');
    });

    it('should handle product with no options', async () => {
      // Given
      const param = { id: '550e8400-e29b-41d4-a716-446655440001' };
      const useCaseOutput = new GetProductDetailOutput(
        '550e8400-e29b-41d4-a716-446655440001',
        'Product without options',
        Money.from(10000),
        'Description',
        'https://example.com/product.jpg',
        [], // No options
      );
      getProductDetailUseCase.execute.mockResolvedValue(useCaseOutput);

      // When
      const response = await controller.getProductDetail(param);

      // Then
      expect(response.optionGroups).toHaveLength(0);
    });

    it('should convert Money to number in response', async () => {
      // Given
      const param = { id: '550e8400-e29b-41d4-a716-446655440001' };
      const useCaseOutput = new GetProductDetailOutput(
        '550e8400-e29b-41d4-a716-446655440001',
        'Test Product',
        Money.from(75000),
        'Description',
        'https://example.com/product.jpg',
        [
          new ProductOptionGroup('Size', [
            new ProductOptionDetail('opt-1', 'L', Money.from(3000), StockStatus.inStock(), true),
          ]),
        ],
      );
      getProductDetailUseCase.execute.mockResolvedValue(useCaseOutput);

      // When
      const response = await controller.getProductDetail(param);

      // Then
      expect(response.price).toBe(75000);
      expect(response.optionGroups[0].options[0].additionalPrice).toBe(3000);
    });

    it('should convert StockStatus to string in response', async () => {
      // Given
      const param = { id: '550e8400-e29b-41d4-a716-446655440001' };
      const useCaseOutput = new GetProductDetailOutput(
        '550e8400-e29b-41d4-a716-446655440001',
        'Test Product',
        Money.from(10000),
        'Description',
        'https://example.com/product.jpg',
        [
          new ProductOptionGroup('Color', [
            new ProductOptionDetail('opt-1', 'Red', Money.from(0), StockStatus.inStock(), true),
            new ProductOptionDetail('opt-2', 'Blue', Money.from(0), StockStatus.outOfStock(), false),
          ]),
        ],
      );
      getProductDetailUseCase.execute.mockResolvedValue(useCaseOutput);

      // When
      const response = await controller.getProductDetail(param);

      // Then
      expect(response.optionGroups[0].options[0].stockStatus).toBe('In Stock');
      expect(response.optionGroups[0].options[1].stockStatus).toBe('Out of Stock');
    });

    it('should include isSelectable field', async () => {
      // Given
      const param = { id: '550e8400-e29b-41d4-a716-446655440001' };
      const useCaseOutput = new GetProductDetailOutput(
        '550e8400-e29b-41d4-a716-446655440001',
        'Test Product',
        Money.from(10000),
        'Description',
        'https://example.com/product.jpg',
        [
          new ProductOptionGroup('Size', [
            new ProductOptionDetail('opt-1', 'S', Money.from(0), StockStatus.outOfStock(), false),
            new ProductOptionDetail('opt-2', 'M', Money.from(0), StockStatus.inStock(), true),
          ]),
        ],
      );
      getProductDetailUseCase.execute.mockResolvedValue(useCaseOutput);

      // When
      const response = await controller.getProductDetail(param);

      // Then
      expect(response.optionGroups[0].options[0].isSelectable).toBe(false);
      expect(response.optionGroups[0].options[1].isSelectable).toBe(true);
    });
  });
});
