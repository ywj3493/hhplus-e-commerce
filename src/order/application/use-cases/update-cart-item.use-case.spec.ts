import { Test, TestingModule } from '@nestjs/testing';
import { UpdateCartItemUseCase } from '@/order/application/use-cases/update-cart-item.use-case';
import { CartRepository } from '@/order/domain/repositories/cart.repository';
import { CART_REPOSITORY } from '@/order/domain/repositories/tokens';
import { StockManagementService } from '@/product/domain/services/stock-management.service';
import { UpdateCartItemInput } from '@/order/application/dtos/update-cart-item.dto';
import { CartNotFoundException, CartItemNotFoundException } from '@/order/domain/order.exceptions';
import { createTestCart } from '@/order/infrastructure/fixtures/cart.fixtures';
import { Price } from '@/product/domain/entities/price.vo';

describe('UpdateCartItemUseCase', () => {
  let useCase: UpdateCartItemUseCase;
  let cartRepository: jest.Mocked<CartRepository>;
  let stockManagementService: jest.Mocked<StockManagementService>;

  beforeEach(async () => {
    const mockCartRepository: jest.Mocked<CartRepository> = {
      findByUserId: jest.fn(),
      save: jest.fn(),
      clearByUserId: jest.fn(),
    };

    const mockStockValidationService: Partial<StockManagementService> = {
      validateStockAvailability: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateCartItemUseCase,
        {
          provide: CART_REPOSITORY,
          useValue: mockCartRepository,
        },
        {
          provide: StockManagementService,
          useValue: mockStockValidationService,
        },
      ],
    }).compile();

    useCase = module.get<UpdateCartItemUseCase>(UpdateCartItemUseCase);
    cartRepository = module.get(CART_REPOSITORY);
    stockManagementService = module.get(StockManagementService);
  });

  describe('실행', () => {
    it('장바구니 아이템 수량을 증가시켜야 함', async () => {
      // Given
      const cart = createTestCart('user-1');
      const addedItemId = cart.addItem({
        productId: 'prod-1',
        productName: '상품 A',
        productOptionId: 'opt-1',
        price: Price.from(10000),
        quantity: 2,
      });

      const input = new UpdateCartItemInput({
        userId: 'user-1',
        cartItemId: addedItemId,
        quantity: 5,
      });

      cartRepository.findByUserId.mockResolvedValue(cart);
      stockManagementService.validateStockAvailability.mockResolvedValue();
      cartRepository.save.mockImplementation(async (cart) => cart);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.cartItemId).toBe(addedItemId);
      expect(output.quantity).toBe(5);
      expect(output.subtotal).toBe(50000);
      expect(stockManagementService.validateStockAvailability).toHaveBeenCalledWith(
        'prod-1',
        'opt-1',
        5,
      );
      expect(cartRepository.save).toHaveBeenCalled();
    });

    it('장바구니 아이템 수량을 감소시켜야 함', async () => {
      // Given
      const cart = createTestCart('user-1');
      const addedItemId = cart.addItem({
        productId: 'prod-1',
        productName: '상품 A',
        productOptionId: 'opt-1',
        price: Price.from(10000),
        quantity: 5,
      });

      const input = new UpdateCartItemInput({
        userId: 'user-1',
        cartItemId: addedItemId,
        quantity: 2,
      });

      cartRepository.findByUserId.mockResolvedValue(cart);
      cartRepository.save.mockImplementation(async (cart) => cart);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.cartItemId).toBe(addedItemId);
      expect(output.quantity).toBe(2);
      expect(output.subtotal).toBe(20000);
      // 수량 감소 시 재고 검증 안 함
      expect(stockManagementService.validateStockAvailability).not.toHaveBeenCalled();
      expect(cartRepository.save).toHaveBeenCalled();
    });

    it('수량 증가 시만 재고 검증을 수행해야 함 (BR-CART-08)', async () => {
      // Given
      const cart = createTestCart('user-1');
      const addedItemId = cart.addItem({
        productId: 'prod-1',
        productName: '상품 A',
        productOptionId: 'opt-1',
        price: Price.from(10000),
        quantity: 3,
      });

      const input = new UpdateCartItemInput({
        userId: 'user-1',
        cartItemId: addedItemId,
        quantity: 7,
      });

      cartRepository.findByUserId.mockResolvedValue(cart);
      stockManagementService.validateStockAvailability.mockResolvedValue();
      cartRepository.save.mockImplementation(async (cart) => cart);

      // When
      await useCase.execute(input);

      // Then
      expect(stockManagementService.validateStockAvailability).toHaveBeenCalledWith(
        'prod-1',
        'opt-1',
        7,
      );
    });

    it('수량 0 이하면 아이템을 삭제해야 함 (BR-CART-07)', async () => {
      // Given
      const cart = createTestCart('user-1');
      const addedItemId = cart.addItem({
        productId: 'prod-1',
        productName: '상품 A',
        productOptionId: 'opt-1',
        price: Price.from(10000),
        quantity: 2,
      });

      const input = new UpdateCartItemInput({
        userId: 'user-1',
        cartItemId: addedItemId,
        quantity: 0,
      });

      cartRepository.findByUserId.mockResolvedValue(cart);
      cartRepository.save.mockImplementation(async (cart) => cart);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.cartItemId).toBe(addedItemId);
      expect(output.quantity).toBe(0);
      expect(cart.getItems()).toHaveLength(0);
      expect(cartRepository.save).toHaveBeenCalled();
      // 삭제 시 재고 검증 안 함
      expect(stockManagementService.validateStockAvailability).not.toHaveBeenCalled();
    });

    it('음수 수량을 입력하면 InvalidQuantityException을 발생시켜야 함', async () => {
      // Given
      const cart = createTestCart('user-1');
      const addedItemId = cart.addItem({
        productId: 'prod-1',
        productName: '상품 A',
        productOptionId: 'opt-1',
        price: Price.from(10000),
        quantity: 2,
      });

      // When & Then
      expect(() => new UpdateCartItemInput({
        userId: 'user-1',
        cartItemId: addedItemId,
        quantity: -1,
      })).toThrow('수량은 0 이상이어야 합니다.');
    });

    it('장바구니가 존재하지 않으면 CartNotFoundException을 발생시켜야 함', async () => {
      // Given
      const input = new UpdateCartItemInput({
        userId: 'user-1',
        cartItemId: 'item-1',
        quantity: 5,
      });

      cartRepository.findByUserId.mockResolvedValue(null);

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        CartNotFoundException,
      );
      await expect(useCase.execute(input)).rejects.toThrow(
        '장바구니를 찾을 수 없습니다.',
      );
    });

    it('아이템이 존재하지 않으면 CartItemNotFoundException을 발생시켜야 함', async () => {
      // Given
      const cart = createTestCart('user-1');
      const input = new UpdateCartItemInput({
        userId: 'user-1',
        cartItemId: 'nonexistent-item',
        quantity: 5,
      });

      cartRepository.findByUserId.mockResolvedValue(cart);

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        CartItemNotFoundException,
      );
      await expect(useCase.execute(input)).rejects.toThrow(
        '장바구니 아이템을 찾을 수 없습니다.',
      );
    });
  });
});
