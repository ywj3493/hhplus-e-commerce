import { Test, TestingModule } from '@nestjs/testing';
import { ClearCartUseCase } from '@/order/application/use-cases/clear-cart.use-case';
import { CartRepository } from '@/order/domain/repositories/cart.repository';
import { ClearCartInput } from '@/order/application/dtos/clear-cart.dto';
import { createTestCart, createTestCartWithItems } from '@/order/infrastructure/fixtures/cart.fixtures';
import { Money } from '@/product/domain/entities/money.vo';

describe('ClearCartUseCase', () => {
  let useCase: ClearCartUseCase;
  let cartRepository: jest.Mocked<CartRepository>;

  beforeEach(async () => {
    const mockCartRepository: jest.Mocked<CartRepository> = {
      findByUserId: jest.fn(),
      save: jest.fn(),
      clearByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClearCartUseCase,
        {
          provide: 'CartRepository',
          useValue: mockCartRepository,
        },
      ],
    }).compile();

    useCase = module.get<ClearCartUseCase>(ClearCartUseCase);
    cartRepository = module.get('CartRepository');
  });

  describe('실행', () => {
    it('장바구니의 모든 아이템을 삭제해야 함', async () => {
      // Given
      const cart = createTestCartWithItems('user-1');
      const input = new ClearCartInput('user-1');

      cartRepository.findByUserId.mockResolvedValue(cart);
      cartRepository.save.mockImplementation(async (cart) => cart);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.success).toBe(true);
      expect(output.deletedCount).toBe(2); // createTestCartWithItems는 2개 아이템 생성
      expect(cart.getItems()).toHaveLength(0);
      expect(cart.getTotalAmount().amount).toBe(0);
      expect(cartRepository.save).toHaveBeenCalled();
    });

    it('여러 개의 아이템이 있는 장바구니를 비워야 함', async () => {
      // Given
      const cart = createTestCart('user-1');
      cart.addItem({
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
      cart.addItem({
        productId: 'prod-3',
        productName: '상품 C',
        productOptionId: null,
        price: Money.from(7000),
        quantity: 1,
      });

      const input = new ClearCartInput('user-1');

      cartRepository.findByUserId.mockResolvedValue(cart);
      cartRepository.save.mockImplementation(async (cart) => cart);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.success).toBe(true);
      expect(output.deletedCount).toBe(3);
      expect(cart.getItems()).toHaveLength(0);
    });

    it('빈 장바구니를 비우려고 해도 성공을 반환해야 함', async () => {
      // Given
      const cart = createTestCart('user-1');
      const input = new ClearCartInput('user-1');

      cartRepository.findByUserId.mockResolvedValue(cart);
      cartRepository.save.mockImplementation(async (cart) => cart);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.success).toBe(true);
      expect(output.deletedCount).toBe(0);
      expect(cart.getItems()).toHaveLength(0);
    });

    it('장바구니가 존재하지 않으면 성공을 반환해야 함 (BR-CART-14)', async () => {
      // Given
      const input = new ClearCartInput('user-1');

      cartRepository.findByUserId.mockResolvedValue(null);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.success).toBe(true);
      expect(output.deletedCount).toBe(0);
      expect(cartRepository.save).not.toHaveBeenCalled(); // 장바구니 없으면 저장 안 함
    });

    it('아이템 삭제 후 총 금액이 0이 되어야 함', async () => {
      // Given
      const cart = createTestCartWithItems('user-1');
      const input = new ClearCartInput('user-1');

      const initialTotal = cart.getTotalAmount().amount;
      expect(initialTotal).toBeGreaterThan(0); // 초기에는 금액이 있음

      cartRepository.findByUserId.mockResolvedValue(cart);
      cartRepository.save.mockImplementation(async (cart) => cart);

      // When
      await useCase.execute(input);

      // Then
      expect(cart.getTotalAmount().amount).toBe(0);
    });

    it('정확한 삭제 개수를 반환해야 함', async () => {
      // Given
      const cart = createTestCart('user-1');
      for (let i = 1; i <= 5; i++) {
        cart.addItem({
          productId: `prod-${i}`,
          productName: `상품 ${i}`,
          productOptionId: `opt-${i}`,
          price: Money.from(10000),
          quantity: 1,
        });
      }

      const input = new ClearCartInput('user-1');

      cartRepository.findByUserId.mockResolvedValue(cart);
      cartRepository.save.mockImplementation(async (cart) => cart);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.deletedCount).toBe(5);
      expect(cart.getItems()).toHaveLength(0);
    });
  });
});
