import { Injectable, Inject } from '@nestjs/common';
import { CartRepository } from '../../domain/repositories/cart.repository';
import { CART_REPOSITORY } from '../../cart.module';
import { CartItem } from '../../domain/entities/cart-item.entity';

/**
 * CartCheckoutService
 *
 * 주문 생성 시 장바구니 관련 로직을 캡슐화하는 Application Service
 *
 * 책임:
 * 1. 장바구니 조회 및 검증
 * 2. 장바구니 아이템 반환
 * 3. 주문 완료 후 장바구니 비우기
 */
@Injectable()
export class CartCheckoutService {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,
  ) {}

  /**
   * 사용자의 장바구니 아이템 조회
   * @param userId 사용자 ID
   * @returns 장바구니 아이템 목록
   * @throws Error 장바구니가 비어있는 경우
   */
  async getCartItemsForCheckout(userId: string): Promise<CartItem[]> {
    const cart = await this.cartRepository.findByUserId(userId);

    if (!cart || cart.getItems().length === 0) {
      throw new Error('장바구니가 비어있습니다.');
    }

    return cart.getItems();
  }

  /**
   * 주문 완료 후 장바구니 비우기
   * @param userId 사용자 ID
   */
  async clearCartAfterCheckout(userId: string): Promise<void> {
    const cart = await this.cartRepository.findByUserId(userId);

    if (cart) {
      cart.clearAll();
      await this.cartRepository.save(cart);
    }
  }
}
