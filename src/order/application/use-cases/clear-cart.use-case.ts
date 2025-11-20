import { Injectable, Inject } from '@nestjs/common';
import { CartRepository } from '@/order/domain/repositories/cart.repository';
import { ClearCartInput, ClearCartOutput } from '@/order/application/dtos/clear-cart.dto';

/**
 * 장바구니 전체 삭제 Use Case
 *
 * 흐름:
 * 1. Cart 조회
 * 2. 없으면 성공 반환 (BR-CART-14)
 * 3. Cart.clearAll() 호출
 * 4. Cart 저장
 * 5. Output DTO 반환
 */
@Injectable()
export class ClearCartUseCase {
  constructor(
    @Inject('CartRepository')
    private readonly cartRepository: CartRepository,
  ) {}

  async execute(input: ClearCartInput): Promise<ClearCartOutput> {
    // 1. 장바구니 조회
    const cart = await this.cartRepository.findByUserId(input.userId);

    // 2. BR-CART-14: 없으면 성공 반환
    if (!cart) {
      return ClearCartOutput.success(0);
    }

    // 삭제할 아이템 개수 기록
    const deletedCount = cart.getItems().length;

    // 3. 전체 삭제 (도메인 로직)
    cart.clearAll();

    // 4. 저장
    await this.cartRepository.save(cart);

    // 5. Output DTO 반환
    return ClearCartOutput.success(deletedCount);
  }
}
