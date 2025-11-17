import { Injectable, Inject } from '@nestjs/common';
import { CartRepository } from '../../domain/repositories/cart.repository';
import { CartStockValidationService } from '../../domain/services/cart-stock-validation.service';
import {
  CartNotFoundException,
  CartItemNotFoundException,
} from '../../domain/cart.exceptions';
import {
  UpdateCartItemInput,
  UpdateCartItemOutput,
} from '../dtos/update-cart-item.dto';

/**
 * 장바구니 아이템 수량 변경 Use Case
 *
 * 흐름:
 * 1. Cart 조회
 * 2. CartItem 존재 여부 확인
 * 3. 수량 증가 시만 재고 검증 (BR-CART-08)
 * 4. quantity = 0이면 아이템 삭제 (BR-CART-07)
 * 5. quantity > 0이면 Cart.updateItemQuantity() 호출
 * 6. Cart 저장
 * 7. Output DTO 반환
 */
@Injectable()
export class UpdateCartItemUseCase {
  constructor(
    @Inject('CartRepository')
    private readonly cartRepository: CartRepository,
    private readonly cartStockValidationService: CartStockValidationService,
  ) {}

  async execute(input: UpdateCartItemInput): Promise<UpdateCartItemOutput> {
    // 1. 장바구니 조회
    const cart = await this.cartRepository.findByUserId(input.userId);
    if (!cart) {
      throw new CartNotFoundException();
    }

    // 2. 아이템 존재 확인
    const item = cart.findItem(input.cartItemId);
    if (!item) {
      throw new CartItemNotFoundException();
    }

    // 3. BR-CART-07: 수량 0 이하면 삭제
    if (input.quantity <= 0) {
      cart.removeItem(input.cartItemId);
      await this.cartRepository.save(cart);
      return UpdateCartItemOutput.from(cart, input.cartItemId);
    }

    // 4. BR-CART-08: 수량 증가 시만 재고 검증
    if (input.quantity > item.quantity) {
      await this.cartStockValidationService.validateAvailability(
        item.productId,
        item.productOptionId,
        input.quantity,
      );
    }

    // 5. 수량 변경
    cart.updateItemQuantity(input.cartItemId, input.quantity);

    // 6. 저장
    await this.cartRepository.save(cart);

    // 7. Output DTO 반환
    return UpdateCartItemOutput.from(cart, input.cartItemId);
  }
}
