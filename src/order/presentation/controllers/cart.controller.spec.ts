import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from '@/order/presentation/controllers/cart.controller';
import { AddCartItemUseCase } from '@/order/application/use-cases/add-cart-item.use-case';
import { GetCartUseCase } from '@/order/application/use-cases/get-cart.use-case';
import { UpdateCartItemUseCase } from '@/order/application/use-cases/update-cart-item.use-case';
import { RemoveCartItemUseCase } from '@/order/application/use-cases/remove-cart-item.use-case';
import { ClearCartUseCase } from '@/order/application/use-cases/clear-cart.use-case';
import { AddCartItemOutput } from '@/order/application/dtos/add-cart-item.dto';
import { GetCartOutput, CartItemData } from '@/order/application/dtos/get-cart.dto';
import { UpdateCartItemOutput } from '@/order/application/dtos/update-cart-item.dto';
import { RemoveCartItemOutput } from '@/order/application/dtos/remove-cart-item.dto';
import { ClearCartOutput } from '@/order/application/dtos/clear-cart.dto';

describe('CartController', () => {
  let controller: CartController;
  let addCartItemUseCase: jest.Mocked<AddCartItemUseCase>;
  let getCartUseCase: jest.Mocked<GetCartUseCase>;
  let updateCartItemUseCase: jest.Mocked<UpdateCartItemUseCase>;
  let removeCartItemUseCase: jest.Mocked<RemoveCartItemUseCase>;
  let clearCartUseCase: jest.Mocked<ClearCartUseCase>;

  // Mock request object with authenticated user
  const mockRequest = {
    user: {
      userId: 'user-001',
      name: '테스트 유저 1',
    },
  };

  beforeEach(async () => {
    const mockAddCartItemUseCase = {
      execute: jest.fn(),
    };

    const mockGetCartUseCase = {
      execute: jest.fn(),
    };

    const mockUpdateCartItemUseCase = {
      execute: jest.fn(),
    };

    const mockRemoveCartItemUseCase = {
      execute: jest.fn(),
    };

    const mockClearCartUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: AddCartItemUseCase,
          useValue: mockAddCartItemUseCase,
        },
        {
          provide: GetCartUseCase,
          useValue: mockGetCartUseCase,
        },
        {
          provide: UpdateCartItemUseCase,
          useValue: mockUpdateCartItemUseCase,
        },
        {
          provide: RemoveCartItemUseCase,
          useValue: mockRemoveCartItemUseCase,
        },
        {
          provide: ClearCartUseCase,
          useValue: mockClearCartUseCase,
        },
      ],
    }).compile();

    controller = module.get<CartController>(CartController);
    addCartItemUseCase = module.get(AddCartItemUseCase);
    getCartUseCase = module.get(GetCartUseCase);
    updateCartItemUseCase = module.get(UpdateCartItemUseCase);
    removeCartItemUseCase = module.get(RemoveCartItemUseCase);
    clearCartUseCase = module.get(ClearCartUseCase);
  });

  describe('addCartItem', () => {
    it('장바구니에 상품을 추가해야 함', async () => {
      // Given
      const request = {
        productId: 'prod-1',
        productOptionId: 'opt-1',
        quantity: 2,
      };
      const useCaseOutput = new AddCartItemOutput('item-1', 2, 20000);
      addCartItemUseCase.execute.mockResolvedValue(useCaseOutput);

      // When
      const response = await controller.addItem(request, mockRequest);

      // Then
      expect(addCartItemUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-001',
          productId: 'prod-1',
          productOptionId: 'opt-1',
          quantity: 2,
        }),
      );
      expect(response.cartItemId).toBe('item-1');
      expect(response.quantity).toBe(2);
      expect(response.subtotal).toBe(20000);
    });
  });

  describe('getCart', () => {
    it('장바구니 정보를 조회해야 함', async () => {
      // Given
      const items: CartItemData[] = [
        { id: 'item-1', productId: 'prod-1', productName: 'Product 1', productOptionId: 'opt-1', price: 10000, quantity: 2, subtotal: 20000 },
        { id: 'item-2', productId: 'prod-2', productName: 'Product 2', productOptionId: 'opt-2', price: 15000, quantity: 1, subtotal: 15000 },
      ];
      const useCaseOutput = new GetCartOutput(items, 35000, 2);
      getCartUseCase.execute.mockResolvedValue(useCaseOutput);

      // When
      const response = await controller.getCart(mockRequest);

      // Then
      expect(getCartUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-001',
        }),
      );
      expect(response.items).toHaveLength(2);
      expect(response.totalAmount).toBe(35000);
      expect(response.items[0]).toEqual({
        id: 'item-1',
        productId: 'prod-1',
        productName: 'Product 1',
        productOptionId: 'opt-1',
        price: 10000,
        quantity: 2,
        subtotal: 20000,
      });
    });

    it('빈 장바구니를 조회해야 함 (BR-CART-06)', async () => {
      // Given
      const useCaseOutput = new GetCartOutput([], 0, 0);
      getCartUseCase.execute.mockResolvedValue(useCaseOutput);

      // When
      const response = await controller.getCart(mockRequest);

      // Then
      expect(response.items).toHaveLength(0);
      expect(response.totalAmount).toBe(0);
    });
  });

  describe('updateCartItem', () => {
    it('장바구니 아이템 수량을 변경해야 함', async () => {
      // Given
      const param = { id: 'item-1' };
      const request = { quantity: 5 };
      const useCaseOutput = new UpdateCartItemOutput('item-1', 5, 50000);
      updateCartItemUseCase.execute.mockResolvedValue(useCaseOutput);

      // When
      const response = await controller.updateItem(param, request, mockRequest);

      // Then
      expect(updateCartItemUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-001',
          cartItemId: 'item-1',
          quantity: 5,
        }),
      );
      expect(response.cartItemId).toBe('item-1');
      expect(response.quantity).toBe(5);
      expect(response.subtotal).toBe(50000);
    });

    it('수량이 0이면 아이템을 삭제해야 함 (BR-CART-07)', async () => {
      // Given
      const param = { id: 'item-1' };
      const request = { quantity: 0 };
      const useCaseOutput = new UpdateCartItemOutput('item-1', 0, 0);
      updateCartItemUseCase.execute.mockResolvedValue(useCaseOutput);

      // When
      const response = await controller.updateItem(param, request, mockRequest);

      // Then
      expect(response.cartItemId).toBe('item-1');
      expect(response.quantity).toBe(0);
      expect(response.subtotal).toBe(0);
    });
  });

  describe('removeCartItem', () => {
    it('장바구니 아이템을 삭제해야 함', async () => {
      // Given
      const param = { id: 'item-1' };
      const useCaseOutput = RemoveCartItemOutput.success();
      removeCartItemUseCase.execute.mockResolvedValue(useCaseOutput);

      // When
      const response = await controller.removeItem(param, mockRequest);

      // Then
      expect(removeCartItemUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-001',
          cartItemId: 'item-1',
        }),
      );
      expect(response).toBeUndefined(); // removeItem returns void
    });
  });

  describe('clearCart', () => {
    it('장바구니를 비워야 함', async () => {
      // Given
      const useCaseOutput = ClearCartOutput.success(3);
      clearCartUseCase.execute.mockResolvedValue(useCaseOutput);

      // When
      const response = await controller.clearCart(mockRequest);

      // Then
      expect(clearCartUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-001',
        }),
      );
      expect(response).toBeUndefined(); // clearCart returns void
    });

    it('장바구니가 없어도 성공해야 함 (BR-CART-14)', async () => {
      // Given
      const useCaseOutput = ClearCartOutput.success(0);
      clearCartUseCase.execute.mockResolvedValue(useCaseOutput);

      // When
      const response = await controller.clearCart(mockRequest);

      // Then
      expect(response).toBeUndefined(); // clearCart returns void
    });
  });
});
