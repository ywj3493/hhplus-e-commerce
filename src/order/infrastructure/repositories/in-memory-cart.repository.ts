import { Injectable } from '@nestjs/common';
import { CartRepository } from '@/order/domain/repositories/cart.repository';
import { Cart } from '@/order/domain/entities/cart.entity';

/**
 * 인메모리 장바구니 저장소
 *
 * 주의사항:
 * - Map<userId, Cart> 형태로 데이터 저장
 * - Deep copy를 통한 불변성 보장
 * - 서버 재시작 시 데이터 초기화됨
 */
@Injectable()
export class InMemoryCartRepository implements CartRepository {
  private carts: Map<string, Cart> = new Map();

  /**
   * 사용자 ID로 장바구니 조회
   */
  async findByUserId(userId: string): Promise<Cart | null> {
    const cart = this.carts.get(userId);
    return cart ? this.deepCopy(cart) : null;
  }

  /**
   * 장바구니 저장 (생성 또는 업데이트)
   */
  async save(cart: Cart): Promise<Cart> {
    this.carts.set(cart.userId, this.deepCopy(cart));
    return this.deepCopy(cart);
  }

  /**
   * 사용자의 장바구니 전체 삭제
   */
  async clearByUserId(userId: string): Promise<void> {
    this.carts.delete(userId);
  }

  /**
   * 테스트용: 전체 데이터 초기화
   */
  clear(): void {
    this.carts.clear();
  }

  /**
   * Deep copy를 통한 불변성 보장
   */
  private deepCopy(cart: Cart): Cart {
    return Cart.reconstitute({
      id: cart.id,
      userId: cart.userId,
      items: cart.getItems().map((item) => item),
      createdAt: new Date(cart.createdAt),
      updatedAt: new Date(cart.updatedAt),
    });
  }
}
