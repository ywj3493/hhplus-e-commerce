import { CreateOrderUseCase } from '@/order/application/use-cases/create-order.use-case';
import { OrderRepository } from '@/order/domain/repositories/order.repository';
import { CartRepository } from '@/order/domain/repositories/cart.repository';
import { CART_REPOSITORY } from '@/order/domain/repositories/tokens';
import { IProductRepository } from '@/product/domain/repositories/product.repository';
import { StockManagementService } from '@/product/domain/services/stock-management.service';
import { CouponApplicationService } from '@/coupon/application/services/coupon-application.service';
import { Cart } from '@/order/domain/entities/cart.entity';
import { CartItem } from '@/order/domain/entities/cart-item.entity';
import { Product } from '@/product/domain/entities/product.entity';
import { ProductOption } from '@/product/domain/entities/product-option.entity';
import { Stock } from '@/product/domain/entities/stock.entity';
import { Price } from '@/product/domain/entities/price.vo';
import { CreateOrderInput } from '@/order/application/dtos/create-order.dto';
import { EmptyCartException } from '@/order/domain/order.exceptions';

describe('CreateOrderUseCase', () => {
  let useCase: CreateOrderUseCase;
  let cartRepository: jest.Mocked<CartRepository>;
  let orderRepository: jest.Mocked<OrderRepository>;
  let productRepository: jest.Mocked<IProductRepository>;
  let stockManagementService: jest.Mocked<StockManagementService>;
  let couponApplicationService: jest.Mocked<CouponApplicationService>;

  beforeEach(() => {
    // Mock repositories
    cartRepository = {
      findByUserId: jest.fn(),
      save: jest.fn(),
      clearByUserId: jest.fn(),
    } as jest.Mocked<CartRepository>;

    orderRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      countByUserId: jest.fn(),
      findExpiredPendingOrders: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<OrderRepository>;

    productRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findPopular: jest.fn(),
      save: jest.fn(),
      exists: jest.fn(),
    } as jest.Mocked<IProductRepository>;

    // Mock services
    stockManagementService = {
      reserveStock: jest.fn(),
      releaseStock: jest.fn(),
      convertReservedToSold: jest.fn(),
    } as any;

    couponApplicationService = {
      applyCoupon: jest.fn(),
    } as any;

    // Create use case
    useCase = new CreateOrderUseCase(
      cartRepository,
      orderRepository,
      productRepository,
      stockManagementService,
      couponApplicationService,
    );
  });

  const createTestProduct = (): Product => {
    const stock = Stock.create('stock-1', 'option-1', 100, 50, 0, 0);
    const option = ProductOption.create(
      'option-1',
      'product-1',
      '색상',
      '레드',
      Price.from(0),
      stock,
    );

    return Product.create(
      'product-1',
      '테스트 상품',
      Price.from(10000),
      '설명',
      'https://example.com/image.jpg',
      [option],
      new Date(),
      new Date(),
    );
  };

  const createTestCartItems = (): CartItem[] => {
    const cartItem = CartItem.create({
      cartId: 'cart-1',
      productId: 'product-1',
      productName: '테스트 상품',
      productOptionId: 'option-1',
      price: Price.from(10000),
      quantity: 2,
    });

    return [cartItem];
  };

  describe('실행', () => {
    it('장바구니의 상품으로 주문을 생성해야 함', async () => {
      // Given
      const userId = 'user-1';
      const cartItems = createTestCartItems();
      const cart = Cart.create(userId);
      cartItems.forEach((item) => {
        cart.addItem({
          productId: item.productId,
          productName: item.productName,
          productOptionId: item.productOptionId,
          price: item.getPrice(),
          quantity: item.quantity,
        });
      });
      const product = createTestProduct();
      const input = new CreateOrderInput(userId);

      cartRepository.findByUserId.mockResolvedValue(cart);
      productRepository.findById.mockResolvedValue(product);
      orderRepository.save.mockImplementation((order) =>
        Promise.resolve(order),
      );

      // When
      const result = await useCase.execute(input);

      // Then
      expect(stockManagementService.reserveStock).toHaveBeenCalledWith(
        'product-1',
        'option-1',
        2,
      );
      expect(orderRepository.save).toHaveBeenCalled();
      expect(cartRepository.clearByUserId).toHaveBeenCalledWith(userId);
      expect(result.orderId).toBeDefined();
      expect(result.status).toBe('PENDING');
    });

    it('빈 장바구니는 EmptyCartException을 던져야 함', async () => {
      // Given
      const userId = 'user-1';
      const input = new CreateOrderInput(userId);
      const emptyCart = Cart.create(userId);

      cartRepository.findByUserId.mockResolvedValue(emptyCart);

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        EmptyCartException,
      );
    });

    it('BR-ORDER-02: 주문 시점의 상품 정보를 스냅샷으로 저장해야 함', async () => {
      // Given
      const userId = 'user-1';
      const cartItems = createTestCartItems();
      const cart = Cart.create(userId);
      cartItems.forEach((item) => {
        cart.addItem({
          productId: item.productId,
          productName: item.productName,
          productOptionId: item.productOptionId,
          price: item.getPrice(),
          quantity: item.quantity,
        });
      });
      const product = createTestProduct();
      const input = new CreateOrderInput(userId);

      cartRepository.findByUserId.mockResolvedValue(cart);
      productRepository.findById.mockResolvedValue(product);
      orderRepository.save.mockImplementation((order) =>
        Promise.resolve(order),
      );

      // When
      await useCase.execute(input);

      // Then
      const savedOrder = orderRepository.save.mock.calls[0][0];
      expect(savedOrder.items[0].productName).toBe('테스트 상품');
      expect(savedOrder.items[0].productOptionName).toBe('레드');
      expect(savedOrder.items[0].price.amount).toBe(10000);
    });

    it('재고 예약 실패 시 에러를 던져야 함', async () => {
      // Given
      const userId = 'user-1';
      const cartItems = createTestCartItems();
      const cart = Cart.create(userId);
      cartItems.forEach((item) => {
        cart.addItem({
          productId: item.productId,
          productName: item.productName,
          productOptionId: item.productOptionId,
          price: item.getPrice(),
          quantity: item.quantity,
        });
      });
      const product = createTestProduct();
      const input = new CreateOrderInput(userId);

      cartRepository.findByUserId.mockResolvedValue(cart);
      productRepository.findById.mockResolvedValue(product);
      stockManagementService.reserveStock.mockRejectedValue(
        new Error('재고 부족'),
      );

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow('재고 부족');
      expect(stockManagementService.releaseStock).not.toHaveBeenCalled();
    });
  });
});
