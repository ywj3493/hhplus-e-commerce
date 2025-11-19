import { Test, TestingModule } from '@nestjs/testing';
import { RemoveCartItemUseCase } from './remove-cart-item.use-case';
import { CartRepository } from '../../domain/repositories/cart.repository';
import { RemoveCartItemInput } from '../dtos/remove-cart-item.dto';
import { CartNotFoundException } from '../../domain/order.exceptions';
import { createTestCart } from '../../infrastructure/fixtures/cart.fixtures';
import { Money } from '../../../product/domain/entities/money.vo';

describe('RemoveCartItemUseCase', () => {
  let useCase: RemoveCartItemUseCase;
  let cartRepository: jest.Mocked<CartRepository>;

  beforeEach(async () => {
    const mockCartRepository: jest.Mocked<CartRepository> = {
      findByUserId: jest.fn(),
      save: jest.fn(),
      clearByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveCartItemUseCase,
        {
          provide: 'CartRepository',
          useValue: mockCartRepository,
        },
      ],
    }).compile();

    useCase = module.get<RemoveCartItemUseCase>(RemoveCartItemUseCase);
    cartRepository = module.get('CartRepository');
  });

  describe('실행', () => {
    it('장바구니 아이템을 삭제해야 함', async () => {
      // Given
      const cart = createTestCart('user-1');
      const addedItemId = cart.addItem({
        productId: 'prod-1',
        productName: '상품 A',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 2,
      });

      const input = new RemoveCartItemInput({
        userId: 'user-1',
        cartItemId: addedItemId,
      });

      cartRepository.findByUserId.mockResolvedValue(cart);
      cartRepository.save.mockImplementation(async (cart) => cart);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.success).toBe(true);
      expect(cart.getItems()).toHaveLength(0);
      expect(cartRepository.save).toHaveBeenCalled();
    });

    it('여러 아이템 중 특정 아이템만 삭제해야 함', async () => {
      // Given
      const cart = createTestCart('user-1');
      const item1Id = cart.addItem({
        productId: 'prod-1',
        productName: '상품 A',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 2,
      });
      cart.addItem({
        productId: 'prod-2',
        productName: '상품 B',
        productOptionId: 'opt-2',
        price: Money.from(5000),
        quantity: 3,
      });

      const input = new RemoveCartItemInput({
        userId: 'user-1',
        cartItemId: item1Id,
      });

      cartRepository.findByUserId.mockResolvedValue(cart);
      cartRepository.save.mockImplementation(async (cart) => cart);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.success).toBe(true);
      expect(cart.getItems()).toHaveLength(1);
      expect(cart.getItems()[0].productId).toBe('prod-2');
      expect(cartRepository.save).toHaveBeenCalled();
    });

    it('존재하지 않는 아이템을 삭제하려고 하면 CartItemNotFoundException을 발생시켜야 함', async () => {
      // Given
      const cart = createTestCart('user-1');
      cart.addItem({
        productId: 'prod-1',
        productName: '상품 A',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 2,
      });

      const input = new RemoveCartItemInput({
        userId: 'user-1',
        cartItemId: 'nonexistent-item',
      });

      cartRepository.findByUserId.mockResolvedValue(cart);

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow('장바구니 아이템을 찾을 수 없습니다.');
    });

    it('장바구니가 존재하지 않으면 CartNotFoundException을 발생시켜야 함', async () => {
      // Given
      const input = new RemoveCartItemInput({
        userId: 'user-1',
        cartItemId: 'item-1',
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

    it('마지막 아이템을 삭제하면 빈 장바구니가 되어야 함', async () => {
      // Given
      const cart = createTestCart('user-1');
      const addedItemId = cart.addItem({
        productId: 'prod-1',
        productName: '상품 A',
        productOptionId: 'opt-1',
        price: Money.from(10000),
        quantity: 2,
      });

      const input = new RemoveCartItemInput({
        userId: 'user-1',
        cartItemId: addedItemId,
      });

      cartRepository.findByUserId.mockResolvedValue(cart);
      cartRepository.save.mockImplementation(async (cart) => cart);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.success).toBe(true);
      expect(cart.getItems()).toHaveLength(0);
      expect(cart.getTotalAmount().amount).toBe(0);
    });
  });
});
