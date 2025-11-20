import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductController } from '@/product/presentation/controllers/product.controller';
import { GetProductsUseCase } from '@/product/application/use-cases/get-products.use-case';
import { GetProductDetailUseCase } from '@/product/application/use-cases/get-product-detail.use-case';
import { GetProductsOutput, ProductListItem } from '@/product/application/dtos/get-products.dto';
import {
  GetProductDetailOutput,
  ProductOptionGroup,
  ProductOptionDetail,
} from '@/product/application/dtos/get-product-detail.dto';
import { Price } from '@/product/domain/entities/price.vo';
import { StockStatus } from '@/product/domain/entities/stock-status.vo';
import { ProductNotFoundException } from '@/product/domain/product.exceptions';

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
    it('페이지네이션된 상품 목록을 반환해야 함', async () => {
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
        stockStatus: '재고 있음',
      });
      expect(response.items[1].stockStatus).toBe('품절');
      expect(response.total).toBe(2);
      expect(response.page).toBe(1);
      expect(response.limit).toBe(10);
      expect(response.totalPages).toBe(1);
    });

    it('기본 페이지네이션 값을 사용해야 함', async () => {
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

    it('유효하지 않은 페이지에 대해 BadRequestException을 던져야 함', async () => {
      // Given
      const query = { page: 0, limit: 10 };

      // When & Then
      await expect(controller.getProducts(query)).rejects.toThrow(BadRequestException);
    });

    it('유효하지 않은 limit에 대해 BadRequestException을 던져야 함', async () => {
      // Given
      const query = { page: 1, limit: 101 };

      // When & Then
      await expect(controller.getProducts(query)).rejects.toThrow(BadRequestException);
    });

    it('사용자 정의 페이지네이션 값을 처리해야 함', async () => {
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

    it('상품이 없을 때 빈 목록을 반환해야 함', async () => {
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
    it('그룹화된 옵션과 함께 상품 상세를 반환해야 함', async () => {
      // Given
      const param = { id: '550e8400-e29b-41d4-a716-446655440001' };
      const useCaseOutput = new GetProductDetailOutput(
        '550e8400-e29b-41d4-a716-446655440001',
        'Test Product',
        Price.from(50000),
        'Test description',
        'https://example.com/product.jpg',
        [
          new ProductOptionGroup('Color', [
            new ProductOptionDetail('opt-1', 'Red', Price.from(0), StockStatus.inStock(), true),
            new ProductOptionDetail('opt-2', 'Blue', Price.from(0), StockStatus.outOfStock(), false),
          ]),
          new ProductOptionGroup('Size', [
            new ProductOptionDetail('opt-3', 'S', Price.from(0), StockStatus.outOfStock(), false),
            new ProductOptionDetail('opt-4', 'M', Price.from(0), StockStatus.inStock(), true),
            new ProductOptionDetail('opt-5', 'L', Price.from(2000), StockStatus.inStock(), true),
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

    it('옵션 그룹을 올바르게 매핑해야 함', async () => {
      // Given
      const param = { id: '550e8400-e29b-41d4-a716-446655440001' };
      const useCaseOutput = new GetProductDetailOutput(
        '550e8400-e29b-41d4-a716-446655440001',
        'Test Product',
        Price.from(50000),
        'Test description',
        'https://example.com/product.jpg',
        [
          new ProductOptionGroup('Color', [
            new ProductOptionDetail('opt-1', 'Red', Price.from(0), StockStatus.inStock(), true),
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
        stockStatus: '재고 있음',
        isSelectable: true,
      });
    });

    it('상품을 찾을 수 없을 때 NotFoundException을 던져야 함', async () => {
      // Given
      const param = { id: '550e8400-e29b-41d4-a716-446655440001' };
      getProductDetailUseCase.execute.mockRejectedValue(
        new ProductNotFoundException('550e8400-e29b-41d4-a716-446655440001'),
      );

      // When & Then
      await expect(controller.getProductDetail(param)).rejects.toThrow(NotFoundException);
      await expect(controller.getProductDetail(param)).rejects.toThrow('Product not found');
    });

    it('옵션이 없는 상품을 처리해야 함', async () => {
      // Given
      const param = { id: '550e8400-e29b-41d4-a716-446655440001' };
      const useCaseOutput = new GetProductDetailOutput(
        '550e8400-e29b-41d4-a716-446655440001',
        'Product without options',
        Price.from(10000),
        'Description',
        'https://example.com/product.jpg',
        [], // 옵션 없음
      );
      getProductDetailUseCase.execute.mockResolvedValue(useCaseOutput);

      // When
      const response = await controller.getProductDetail(param);

      // Then
      expect(response.optionGroups).toHaveLength(0);
    });

    it('응답에서 Price를 number로 변환해야 함', async () => {
      // Given
      const param = { id: '550e8400-e29b-41d4-a716-446655440001' };
      const useCaseOutput = new GetProductDetailOutput(
        '550e8400-e29b-41d4-a716-446655440001',
        'Test Product',
        Price.from(75000),
        'Description',
        'https://example.com/product.jpg',
        [
          new ProductOptionGroup('Size', [
            new ProductOptionDetail('opt-1', 'L', Price.from(3000), StockStatus.inStock(), true),
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

    it('응답에서 StockStatus를 문자열로 변환해야 함', async () => {
      // Given
      const param = { id: '550e8400-e29b-41d4-a716-446655440001' };
      const useCaseOutput = new GetProductDetailOutput(
        '550e8400-e29b-41d4-a716-446655440001',
        'Test Product',
        Price.from(10000),
        'Description',
        'https://example.com/product.jpg',
        [
          new ProductOptionGroup('Color', [
            new ProductOptionDetail('opt-1', 'Red', Price.from(0), StockStatus.inStock(), true),
            new ProductOptionDetail('opt-2', 'Blue', Price.from(0), StockStatus.outOfStock(), false),
          ]),
        ],
      );
      getProductDetailUseCase.execute.mockResolvedValue(useCaseOutput);

      // When
      const response = await controller.getProductDetail(param);

      // Then
      expect(response.optionGroups[0].options[0].stockStatus).toBe('재고 있음');
      expect(response.optionGroups[0].options[1].stockStatus).toBe('품절');
    });

    it('isSelectable 필드를 포함해야 함', async () => {
      // Given
      const param = { id: '550e8400-e29b-41d4-a716-446655440001' };
      const useCaseOutput = new GetProductDetailOutput(
        '550e8400-e29b-41d4-a716-446655440001',
        'Test Product',
        Price.from(10000),
        'Description',
        'https://example.com/product.jpg',
        [
          new ProductOptionGroup('Size', [
            new ProductOptionDetail('opt-1', 'S', Price.from(0), StockStatus.outOfStock(), false),
            new ProductOptionDetail('opt-2', 'M', Price.from(0), StockStatus.inStock(), true),
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
