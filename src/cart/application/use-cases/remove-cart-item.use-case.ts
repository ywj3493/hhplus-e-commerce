import { Injectable, Inject } from '@nestjs/common';
import { CartRepository } from '../../domain/repositories/cart.repository';
import { CartNotFoundException } from '../../domain/cart.exceptions';
import {
  RemoveCartItemInput,
  RemoveCartItemOutput,
} from '../dtos/remove-cart-item.dto';

/**
 * 장바구니 아이템 삭제 Use Case
 *
 * 흐름:
 * 1. Cart 조회
 * 2. Cart.removeItem() 호출
 * 3. Cart 저장
 * 4. Output DTO 반환
 */
@Injectable()
export class RemoveCartItemUseCase {
  constructor(
    @Inject('CartRepository')
    private readonly cartRepository: CartRepository,
  ) {}

  async execute(input: RemoveCartItemInput): Promise<RemoveCartItemOutput> {
    // 1. 장바구니 조회
    const cart = await this.cartRepository.findByUserId(input.userId);
    if (!cart) {
      throw new CartNotFoundException();
    }

    // 2. 아이템 삭제 (도메인 로직)
    cart.removeItem(input.cartItemId);

    // 3. 저장
    await this.cartRepository.save(cart);

    // 4. Output DTO 반환
    return RemoveCartItemOutput.success();
  }
}
