import { Injectable } from '@nestjs/common';
import { Product } from '@/product/domain/entities/product.entity';
import {
  ProductNotFoundException,
  InsufficientStockException,
} from '@/product/domain/product.exceptions';

/**
 * StockManagementService
 * 재고 관리를 담당하는 순수 도메인 서비스
 *
 * 책임:
 * - 재고 예약 비즈니스 로직 (주문 생성 시)
 * - 재고 해제 비즈니스 로직 (주문 취소/만료 시)
 * - 판매 확정 비즈니스 로직 (결제 완료 시)
 * - 재고 가용성 검증 (장바구니 추가 시)
 *
 * BR-ORDER-02: 주문 생성 시 재고 예약
 * BR-ORDER-14: 예약 취소/만료 시 재고 해제
 * BR-PAYMENT-02: 결제 완료 시 reserved → sold
 * BR-CART-02: 장바구니 추가 시 재고 확인
 *
 * Note:
 * - 이 서비스는 순수 도메인 로직만 포함합니다.
 * - 동시성 제어(분산락, 비관락, 트랜잭션)는 Application Layer(Use Case)에서 처리합니다.
 * - 인프라스트럭처 의존성이 없어 테스트가 용이합니다.
 */
@Injectable()
export class StockManagementService {
  /**
   * 재고 예약
   * BR-ORDER-02: 주문 생성 시 재고 예약
   *
   * @param product 상품 엔티티 (락 획득된 상태여야 함)
   * @param optionId 옵션 ID
   * @param quantity 예약 수량
   * @throws ProductNotFoundException 옵션을 찾을 수 없을 때
   * @throws InsufficientStockException 재고 부족 시
   */
  reserveStock(product: Product, optionId: string, quantity: number): void {
    const option = product.findOption(optionId);
    if (!option) {
      throw new ProductNotFoundException(
        `옵션을 찾을 수 없습니다: ${optionId}`,
      );
    }

    // Stock Entity의 reserve() 메서드 호출
    option.stock.reserve(quantity);
  }

  /**
   * 예약 재고 해제
   * BR-ORDER-14: 예약 취소/만료 시 reserved → available
   *
   * @param product 상품 엔티티 (락 획득된 상태여야 함)
   * @param optionId 옵션 ID
   * @param quantity 해제 수량
   * @returns true: 성공, false: 옵션을 찾을 수 없음
   */
  releaseStock(product: Product, optionId: string, quantity: number): boolean {
    const option = product.findOption(optionId);
    if (!option) {
      return false;
    }

    option.stock.restoreReserved(quantity);
    return true;
  }

  /**
   * 판매 확정
   * BR-PAYMENT-02: 결제 완료 시 reserved → sold
   *
   * @param product 상품 엔티티 (락 획득된 상태여야 함)
   * @param optionId 옵션 ID
   * @param quantity 판매 수량
   * @throws ProductNotFoundException 옵션을 찾을 수 없을 때
   */
  confirmSale(product: Product, optionId: string, quantity: number): void {
    const option = product.findOption(optionId);
    if (!option) {
      throw new ProductNotFoundException(
        `옵션을 찾을 수 없습니다: ${optionId}`,
      );
    }

    // Stock Entity의 sell() 메서드 호출
    option.stock.sell(quantity);
  }

  /**
   * 재고 가용성 검증
   * BR-CART-02: 장바구니 추가 시 재고 확인
   *
   * @param product 상품 엔티티
   * @param optionId 옵션 ID
   * @param quantity 요청 수량
   * @throws ProductNotFoundException 옵션을 찾을 수 없을 때
   * @throws InsufficientStockException 재고 부족 시
   */
  validateStockAvailability(
    product: Product,
    optionId: string,
    quantity: number,
  ): void {
    const option = product.findOption(optionId);
    if (!option) {
      throw new ProductNotFoundException('상품 옵션을 찾을 수 없습니다.');
    }

    if (option.stock.availableQuantity < quantity) {
      throw new InsufficientStockException(
        `재고가 부족합니다. (요청: ${quantity}, 가용: ${option.stock.availableQuantity})`,
      );
    }
  }
}
