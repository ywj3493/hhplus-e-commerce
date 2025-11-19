import { Injectable, Inject } from '@nestjs/common';
import { CartRepository } from '../../domain/repositories/cart.repository';
import { GetCartInput, GetCartOutput } from '../dtos/get-cart.dto';

/**
 * 장바구니 조회 Use Case
 *
 * 흐름:
 * 1. Cart 조회 (userId로)
 * 2. 없으면 빈 장바구니 반환 (BR-CART-06)
 * 3. Output DTO 생성
 */
@Injectable()
export class GetCartUseCase {
  constructor(
    @Inject('CartRepository')
    private readonly cartRepository: CartRepository,
  ) {}

  async execute(input: GetCartInput): Promise<GetCartOutput> {
    // 1. 장바구니 조회
    const cart = await this.cartRepository.findByUserId(input.userId);

    // 2 & 3. Output DTO 생성 (빈 장바구니 처리 포함)
    return GetCartOutput.from(cart);
  }
}
