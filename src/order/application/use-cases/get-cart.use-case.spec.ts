import { Test, TestingModule } from '@nestjs/testing';
import { GetCartUseCase } from './get-cart.use-case';
import { CartRepository } from '../../domain/repositories/cart.repository';
import { GetCartInput } from '../dtos/get-cart.dto';
import { createTestCart, createTestCartWithItems } from '../../infrastructure/fixtures/cart.fixtures';

describe('GetCartUseCase', () => {
  let useCase: GetCartUseCase;
  let cartRepository: jest.Mocked<CartRepository>;

  beforeEach(async () => {
    const mockCartRepository: jest.Mocked<CartRepository> = {
      findByUserId: jest.fn(),
      save: jest.fn(),
      clearByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCartUseCase,
        {
          provide: 'CartRepository',
          useValue: mockCartRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetCartUseCase>(GetCartUseCase);
    cartRepository = module.get('CartRepository');
  });

  describe('실행', () => {
    it('존재하는 장바구니를 반환해야 함', async () => {
      // Given
      const cart = createTestCartWithItems('user-1');
      const input = new GetCartInput('user-1');

      cartRepository.findByUserId.mockResolvedValue(cart);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.items).toHaveLength(2);
      expect(output.totalAmount).toBeGreaterThan(0);
      expect(output.itemCount).toBe(2);
      expect(cartRepository.findByUserId).toHaveBeenCalledWith('user-1');
    });

    it('장바구니가 없을 때 빈 장바구니를 반환해야 함 (BR-CART-06)', async () => {
      // Given
      const input = new GetCartInput('user-1');

      cartRepository.findByUserId.mockResolvedValue(null);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.items).toHaveLength(0);
      expect(output.totalAmount).toBe(0);
      expect(output.itemCount).toBe(0);
      expect(cartRepository.findByUserId).toHaveBeenCalledWith('user-1');
    });

    it('빈 장바구니를 반환해야 함', async () => {
      // Given
      const emptyCart = createTestCart('user-1');
      const input = new GetCartInput('user-1');

      cartRepository.findByUserId.mockResolvedValue(emptyCart);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.items).toHaveLength(0);
      expect(output.totalAmount).toBe(0);
      expect(output.itemCount).toBe(0);
    });

    it('장바구니의 전체 금액을 올바르게 계산해야 함', async () => {
      // Given
      const cart = createTestCartWithItems('user-1');
      const input = new GetCartInput('user-1');

      cartRepository.findByUserId.mockResolvedValue(cart);

      // When
      const output = await useCase.execute(input);

      // Then
      // 상품 A: 10000 * 2 = 20000
      // 상품 B: 5000 * 3 = 15000
      // 합계: 35000
      expect(output.totalAmount).toBe(35000);
    });
  });
});
