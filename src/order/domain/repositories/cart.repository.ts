import { Cart } from '../entities/cart.entity';

export interface CartRepository {
  /**
   * 사용자 ID로 장바구니 조회
   */
  findByUserId(userId: string): Promise<Cart | null>;

  /**
   * 장바구니 저장 (생성 또는 업데이트)
   */
  save(cart: Cart): Promise<Cart>;

  /**
   * 사용자의 장바구니 전체 삭제
   */
  clearByUserId(userId: string): Promise<void>;
}
