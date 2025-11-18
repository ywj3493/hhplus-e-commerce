import { Test, TestingModule } from '@nestjs/testing';
import { StockReservationService } from './stock-reservation.service';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../../product/domain/repositories/product.repository';
import { Product } from '../../../product/domain/entities/product.entity';
import { ProductOption } from '../../../product/domain/entities/product-option.entity';
import { Stock } from '../../../product/domain/entities/stock.entity';
import { Money } from '../../../product/domain/entities/money.vo';
import { CartItem } from '../../../cart/domain/entities/cart-item.entity';
import { OrderItem } from '../entities/order-item.entity';

describe('StockReservationService', () => {
  let service: StockReservationService;
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
        StockReservationService,
        {
          provide: PRODUCT_REPOSITORY,
          useValue: mockProductRepository,
        },
      ],
    }).compile();

    service = module.get<StockReservationService>(StockReservationService);
    productRepository = module.get(PRODUCT_REPOSITORY);
  });

  const createTestProduct = (
    productId: string,
    optionId: string,
    availableQuantity: number,
    reservedQuantity: number = 0,
  ): Product => {
    const stock = Stock.create(
      'stock-1',
      optionId,
      100,
      availableQuantity,
      reservedQuantity,
      0,
    );

    const option = ProductOption.create(
      optionId,
      productId,
      '색상',
      '레드',
      Money.from(0),
      stock,
    );

    return Product.create(
      productId,
      'Test Product',
      Money.from(10000),
      'Test Description',
      'https://example.com/image.jpg',
      [option],
      new Date(),
      new Date(),
    );
  };

  describe('장바구니 재고 예약', () => {
    it('충분한 재고가 있을 때 예약을 성공해야 함', async () => {
      // Given
      const product = createTestProduct('product-1', 'option-1', 10);
      productRepository.findById.mockResolvedValue(product);

      const cartItem = CartItem.create({
        cartId: 'cart-1',
        productId: 'product-1',
        productName: 'Test Product',
        productOptionId: 'option-1',
        price: Money.from(10000),
        quantity: 3,
      });

      // When
      await service.reserveStockForCart([cartItem]);

      // Then
      expect(productRepository.findById).toHaveBeenCalledWith('product-1');
      expect(productRepository.save).toHaveBeenCalledWith(product);
      expect(product.options[0].stock.availableQuantity).toBe(7); // 10 - 3
      expect(product.options[0].stock.reservedQuantity).toBe(3);
    });

    it('여러 장바구니 아이템의 재고를 예약해야 함', async () => {
      // Given
      const product1 = createTestProduct('product-1', 'option-1', 10);
      const product2 = createTestProduct('product-2', 'option-2', 5);
      productRepository.findById
        .mockResolvedValueOnce(product1)
        .mockResolvedValueOnce(product2);

      const cartItems = [
        CartItem.create({
          cartId: 'cart-1',
          productId: 'product-1',
          productName: 'Product 1',
          productOptionId: 'option-1',
          price: Money.from(10000),
          quantity: 2,
        }),
        CartItem.create({
          cartId: 'cart-1',
          productId: 'product-2',
          productName: 'Product 2',
          productOptionId: 'option-2',
          price: Money.from(20000),
          quantity: 1,
        }),
      ];

      // When
      await service.reserveStockForCart(cartItems);

      // Then
      expect(productRepository.findById).toHaveBeenCalledTimes(2);
      expect(productRepository.save).toHaveBeenCalledTimes(2);
      expect(product1.options[0].stock.availableQuantity).toBe(8); // 10 - 2
      expect(product2.options[0].stock.availableQuantity).toBe(4); // 5 - 1
    });

    it('재고가 부족하면 예외를 던져야 함', async () => {
      // Given
      const product = createTestProduct('product-1', 'option-1', 2);
      productRepository.findById.mockResolvedValue(product);

      const cartItem = CartItem.create({
        cartId: 'cart-1',
        productId: 'product-1',
        productName: 'Test Product',
        productOptionId: 'option-1',
        price: Money.from(10000),
        quantity: 5, // 재고보다 많음
      });

      // When & Then
      await expect(service.reserveStockForCart([cartItem])).rejects.toThrow(
        '가용 재고가 부족합니다',
      );
    });

    it('상품을 찾을 수 없으면 예외를 던져야 함', async () => {
      // Given
      productRepository.findById.mockResolvedValue(undefined);

      const cartItem = CartItem.create({
        cartId: 'cart-1',
        productId: 'non-existent',
        productName: 'Test Product',
        productOptionId: 'option-1',
        price: Money.from(10000),
        quantity: 1,
      });

      // When & Then
      await expect(service.reserveStockForCart([cartItem])).rejects.toThrow(
        '상품을 찾을 수 없습니다',
      );
    });

    it('옵션을 찾을 수 없으면 예외를 던져야 함', async () => {
      // Given
      const product = createTestProduct('product-1', 'option-1', 10);
      productRepository.findById.mockResolvedValue(product);

      const cartItem = CartItem.create({
        cartId: 'cart-1',
        productId: 'product-1',
        productName: 'Test Product',
        productOptionId: 'non-existent-option',
        price: Money.from(10000),
        quantity: 1,
      });

      // When & Then
      await expect(service.reserveStockForCart([cartItem])).rejects.toThrow(
        '상품 옵션을 찾을 수 없습니다',
      );
    });
  });

  describe('예약된 재고 해제', () => {
    it('BR-ORDER-14: 예약된 재고를 복원해야 함', async () => {
      // Given
      const product = createTestProduct('product-1', 'option-1', 5, 3); // available: 5, reserved: 3
      productRepository.findById.mockResolvedValue(product);

      const orderItem = OrderItem.create({
        orderId: 'order-1',
        productId: 'product-1',
        productName: 'Test Product',
        productOptionId: 'option-1',
        productOptionName: '레드',
        price: Money.from(10000),
        quantity: 3,
      });

      // When
      await service.releaseReservedStock([orderItem]);

      // Then
      expect(productRepository.findById).toHaveBeenCalledWith('product-1');
      expect(productRepository.save).toHaveBeenCalledWith(product);
      expect(product.options[0].stock.availableQuantity).toBe(8); // 5 + 3
      expect(product.options[0].stock.reservedQuantity).toBe(0); // 3 - 3
    });

    it('여러 주문 아이템의 재고를 해제해야 함', async () => {
      // Given
      const product1 = createTestProduct('product-1', 'option-1', 5, 2);
      const product2 = createTestProduct('product-2', 'option-2', 3, 1);
      productRepository.findById
        .mockResolvedValueOnce(product1)
        .mockResolvedValueOnce(product2);

      const orderItems = [
        OrderItem.create({
          orderId: 'order-1',
          productId: 'product-1',
          productName: 'Product 1',
          productOptionId: 'option-1',
          productOptionName: '레드',
          price: Money.from(10000),
          quantity: 2,
        }),
        OrderItem.create({
          orderId: 'order-1',
          productId: 'product-2',
          productName: 'Product 2',
          productOptionId: 'option-2',
          productOptionName: '블루',
          price: Money.from(20000),
          quantity: 1,
        }),
      ];

      // When
      await service.releaseReservedStock(orderItems);

      // Then
      expect(productRepository.findById).toHaveBeenCalledTimes(2);
      expect(productRepository.save).toHaveBeenCalledTimes(2);
      expect(product1.options[0].stock.availableQuantity).toBe(7); // 5 + 2
      expect(product2.options[0].stock.availableQuantity).toBe(4); // 3 + 1
    });

    it('상품을 찾을 수 없어도 예외를 던지지 않고 로그만 남겨야 함', async () => {
      // Given
      productRepository.findById.mockResolvedValue(undefined);
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      const orderItem = OrderItem.create({
        orderId: 'order-1',
        productId: 'non-existent',
        productName: 'Test Product',
        productOptionId: 'option-1',
        productOptionName: '레드',
        price: Money.from(10000),
        quantity: 1,
      });

      // When & Then
      await expect(
        service.releaseReservedStock([orderItem]),
      ).resolves.not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('예약된 재고를 판매로 전환', () => {
    it('예약된 재고를 판매 재고로 전환해야 함', async () => {
      // Given
      const product = createTestProduct('product-1', 'option-1', 5, 3); // available: 5, reserved: 3
      productRepository.findById.mockResolvedValue(product);

      const orderItem = OrderItem.create({
        orderId: 'order-1',
        productId: 'product-1',
        productName: 'Test Product',
        productOptionId: 'option-1',
        productOptionName: '레드',
        price: Money.from(10000),
        quantity: 3,
      });

      // When
      await service.convertReservedToSold([orderItem]);

      // Then
      expect(productRepository.findById).toHaveBeenCalledWith('product-1');
      expect(productRepository.save).toHaveBeenCalledWith(product);
      expect(product.options[0].stock.reservedQuantity).toBe(0); // 3 - 3
      expect(product.options[0].stock.soldQuantity).toBe(3); // 0 + 3
    });

    it('여러 주문 아이템을 판매로 전환해야 함', async () => {
      // Given
      const product1 = createTestProduct('product-1', 'option-1', 5, 2);
      const product2 = createTestProduct('product-2', 'option-2', 3, 1);
      productRepository.findById
        .mockResolvedValueOnce(product1)
        .mockResolvedValueOnce(product2);

      const orderItems = [
        OrderItem.create({
          orderId: 'order-1',
          productId: 'product-1',
          productName: 'Product 1',
          productOptionId: 'option-1',
          productOptionName: '레드',
          price: Money.from(10000),
          quantity: 2,
        }),
        OrderItem.create({
          orderId: 'order-1',
          productId: 'product-2',
          productName: 'Product 2',
          productOptionId: 'option-2',
          productOptionName: '블루',
          price: Money.from(20000),
          quantity: 1,
        }),
      ];

      // When
      await service.convertReservedToSold(orderItems);

      // Then
      expect(productRepository.findById).toHaveBeenCalledTimes(2);
      expect(productRepository.save).toHaveBeenCalledTimes(2);
      expect(product1.options[0].stock.soldQuantity).toBe(2);
      expect(product2.options[0].stock.soldQuantity).toBe(1);
    });

    it('상품을 찾을 수 없으면 예외를 던져야 함', async () => {
      // Given
      productRepository.findById.mockResolvedValue(undefined);

      const orderItem = OrderItem.create({
        orderId: 'order-1',
        productId: 'non-existent',
        productName: 'Test Product',
        productOptionId: 'option-1',
        productOptionName: '레드',
        price: Money.from(10000),
        quantity: 1,
      });

      // When & Then
      await expect(service.convertReservedToSold([orderItem])).rejects.toThrow(
        '상품을 찾을 수 없습니다',
      );
    });
  });
});
