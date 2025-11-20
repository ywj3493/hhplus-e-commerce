import { Test, TestingModule } from '@nestjs/testing';
import { AddCartItemUseCase } from '@/order/application/use-cases/add-cart-item.use-case';
import { CartRepository } from '@/order/domain/repositories/cart.repository';
import { CART_REPOSITORY } from '@/order/domain/repositories/tokens';
import { ProductRepository } from '@/product/domain/repositories/product.repository';
import { PRODUCT_REPOSITORY } from '@/product/domain/repositories/tokens';
import { StockManagementService } from '@/product/domain/services/stock-management.service';
import { Cart } from '@/order/domain/entities/cart.entity';
import { Product } from '@/product/domain/entities/product.entity';
import { ProductOption } from '@/product/domain/entities/product-option.entity';
import { Stock } from '@/product/domain/entities/stock.entity';
import { Price } from '@/product/domain/entities/price.vo';
import { AddCartItemInput } from '@/order/application/dtos/add-cart-item.dto';
import { ProductNotFoundException } from '@/product/domain/product.exceptions';

describe('AddCartItemUseCase', () => {
  let useCase: AddCartItemUseCase;
  let cartRepository: jest.Mocked<CartRepository>;
  let productRepository: jest.Mocked<ProductRepository>;
  let stockManagementService: jest.Mocked<StockManagementService>;

  beforeEach(async () => {
    const mockCartRepository: jest.Mocked<CartRepository> = {
      findByUserId: jest.fn(),
      save: jest.fn(),
      clearByUserId: jest.fn(),
    };

    const mockProductRepository: jest.Mocked<ProductRepository> = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findPopular: jest.fn(),
      save: jest.fn(),
      exists: jest.fn(),
    };

    const mockStockManagementService: Partial<StockManagementService> = {
      validateStockAvailability: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddCartItemUseCase,
        {
          provide: CART_REPOSITORY,
          useValue: mockCartRepository,
        },
        {
          provide: PRODUCT_REPOSITORY,
          useValue: mockProductRepository,
        },
        {
          provide: StockManagementService,
          useValue: mockStockManagementService,
        },
      ],
    }).compile();

    useCase = module.get<AddCartItemUseCase>(AddCartItemUseCase);
    cartRepository = module.get(CART_REPOSITORY);
    productRepository = module.get(PRODUCT_REPOSITORY);
    stockManagementService = module.get(StockManagementService);
  });

  const createTestProduct = (): Product => {
    const stock = Stock.create('stock-1', 'option-1', 100, 50, 0, 50);
    const option = ProductOption.create(
      'option-1',
      'product-1',
      '색상',
      '빨강',
      Price.from(0),
      stock,
    );

    return Product.create(
      'product-1',
      'Test Product',
      Price.from(10000),
      'Test Description',
      'https://example.com/image.jpg',
      'category-test', // categoryId
      [option],
      new Date(),
      new Date(),
    );
  };

  describe('실행', () => {
    it('새 장바구니에 상품을 추가해야 함', async () => {
      // Given
      const product = createTestProduct();
      const input = new AddCartItemInput({
        userId: 'user-1',
        productId: 'product-1',
        productOptionId: 'option-1',
        quantity: 2,
      });

      productRepository.findById.mockResolvedValue(product);
      cartRepository.findByUserId.mockResolvedValue(null); // 장바구니 없음
      stockManagementService.validateStockAvailability.mockResolvedValue();
      cartRepository.save.mockImplementation(async (cart) => cart);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.cartItemId).toBeDefined();
      expect(output.quantity).toBe(2);
      expect(output.subtotal).toBe(20000);
      expect(cartRepository.save).toHaveBeenCalled();
    });

    it('기존 장바구니에 상품을 추가해야 함', async () => {
      // Given
      const product = createTestProduct();
      const existingCart = Cart.create('user-1');
      const input = new AddCartItemInput({
        userId: 'user-1',
        productId: 'product-1',
        productOptionId: 'option-1',
        quantity: 3,
      });

      productRepository.findById.mockResolvedValue(product);
      cartRepository.findByUserId.mockResolvedValue(existingCart);
      stockManagementService.validateStockAvailability.mockResolvedValue();
      cartRepository.save.mockImplementation(async (cart) => cart);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.cartItemId).toBeDefined();
      expect(output.quantity).toBe(3);
      expect(output.subtotal).toBe(30000);
      expect(cartRepository.save).toHaveBeenCalled();
    });

    it('상품이 존재하지 않을 때 ProductNotFoundException을 발생시켜야 함', async () => {
      // Given
      const input = new AddCartItemInput({
        userId: 'user-1',
        productId: 'nonexistent-product',
        productOptionId: 'option-1',
        quantity: 2,
      });

      productRepository.findById.mockResolvedValue(null);

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        ProductNotFoundException,
      );
      await expect(useCase.execute(input)).rejects.toThrow(
        '상품을 찾을 수 없습니다.',
      );
    });

    it('재고 검증을 수행해야 함 (BR-CART-02)', async () => {
      // Given
      const product = createTestProduct();
      const input = new AddCartItemInput({
        userId: 'user-1',
        productId: 'product-1',
        productOptionId: 'option-1',
        quantity: 5,
      });

      productRepository.findById.mockResolvedValue(product);
      cartRepository.findByUserId.mockResolvedValue(null);
      stockManagementService.validateStockAvailability.mockResolvedValue();
      cartRepository.save.mockImplementation(async (cart) => cart);

      // When
      await useCase.execute(input);

      // Then
      expect(stockManagementService.validateStockAvailability).toHaveBeenCalledWith(
        'product-1',
        'option-1',
        5,
      );
    });

    it('중복 상품 추가 시 수량을 증가시켜야 함 (BR-CART-01)', async () => {
      // Given
      const product = createTestProduct();
      const existingCart = Cart.create('user-1');
      existingCart.addItem({
        productId: 'product-1',
        productName: 'Test Product',
        productOptionId: 'option-1',
        price: Price.from(10000),
        quantity: 2,
      });

      const input = new AddCartItemInput({
        userId: 'user-1',
        productId: 'product-1',
        productOptionId: 'option-1',
        quantity: 3,
      });

      productRepository.findById.mockResolvedValue(product);
      cartRepository.findByUserId.mockResolvedValue(existingCart);
      stockManagementService.validateStockAvailability.mockResolvedValue();
      cartRepository.save.mockImplementation(async (cart) => cart);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.quantity).toBe(5); // 2 + 3
      expect(output.subtotal).toBe(50000);
    });
  });
});
