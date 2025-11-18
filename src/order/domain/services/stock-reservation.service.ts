import { Injectable, Inject } from '@nestjs/common';
import { CartItem } from '../../../cart/domain/entities/cart-item.entity';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../../product/domain/repositories/product.repository';
import { OrderItem } from '../entities/order-item.entity';

/**
 * StockReservationService
 * 재고 예약 및 해제를 담당하는 Domain Service
 * BR-ORDER-01: 재고 예약 기간 관리
 * BR-ORDER-14: 재고 해제 (reserved → available)
 */
@Injectable()
export class StockReservationService {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  /**
   * 장바구니 아이템들의 재고 예약
   * @param cartItems - 장바구니 아이템 목록
   * @throws Error 재고가 부족한 경우
   */
  async reserveStockForCart(cartItems: CartItem[]): Promise<void> {
    for (const cartItem of cartItems) {
      const product = await this.productRepository.findById(
        cartItem.productId,
      );

      if (!product) {
        throw new Error(`상품을 찾을 수 없습니다: ${cartItem.productId}`);
      }

      // 옵션이 있는 경우
      if (cartItem.productOptionId) {
        const option = product.options.find(
          (opt) => opt.id === cartItem.productOptionId,
        );

        if (!option) {
          throw new Error(
            `상품 옵션을 찾을 수 없습니다: ${cartItem.productOptionId}`,
          );
        }

        // Stock Entity의 reserve() 메서드 호출
        option.stock.reserve(cartItem.quantity);
      } else {
        // 옵션이 없는 경우 - 현재 구조상 모든 상품은 옵션을 가지고 있음
        // 기본 옵션이 있다고 가정
        if (product.options.length === 0) {
          throw new Error('상품에 재고 정보가 없습니다.');
        }

        // 첫 번째 옵션의 재고를 사용
        product.options[0].stock.reserve(cartItem.quantity);
      }

      // 변경된 상품 저장
      await this.productRepository.save(product);
    }
  }

  /**
   * 주문 아이템들의 예약된 재고 해제
   * BR-ORDER-14: 예약된 재고를 구매 가능 재고로 복원
   * @param orderItems - 주문 아이템 목록
   */
  async releaseReservedStock(orderItems: OrderItem[]): Promise<void> {
    for (const orderItem of orderItems) {
      const product = await this.productRepository.findById(
        orderItem.productId,
      );

      if (!product) {
        // 로깅만 하고 계속 진행 (데이터 정합성 문제)
        console.warn(
          `재고 해제 실패: 상품을 찾을 수 없습니다: ${orderItem.productId}`,
        );
        continue;
      }

      // 옵션이 있는 경우
      if (orderItem.productOptionId) {
        const option = product.options.find(
          (opt) => opt.id === orderItem.productOptionId,
        );

        if (!option) {
          console.warn(
            `재고 해제 실패: 옵션을 찾을 수 없습니다: ${orderItem.productOptionId}`,
          );
          continue;
        }

        // Stock Entity의 restoreReserved() 메서드 호출
        try {
          option.stock.restoreReserved(orderItem.quantity);
        } catch (error) {
          console.error(
            `재고 복원 중 오류 발생: ${orderItem.productOptionId}`,
            error,
          );
          continue;
        }
      } else {
        // 옵션이 없는 경우
        if (product.options.length === 0) {
          console.warn('상품에 재고 정보가 없습니다.');
          continue;
        }

        try {
          product.options[0].stock.restoreReserved(orderItem.quantity);
        } catch (error) {
          console.error(`재고 복원 중 오류 발생: ${orderItem.productId}`, error);
          continue;
        }
      }

      // 변경된 상품 저장
      await this.productRepository.save(product);
    }
  }

  /**
   * 예약된 재고를 판매로 전환 (결제 완료 시)
   * @param orderItems - 주문 아이템 목록
   */
  async convertReservedToSold(orderItems: OrderItem[]): Promise<void> {
    for (const orderItem of orderItems) {
      const product = await this.productRepository.findById(
        orderItem.productId,
      );

      if (!product) {
        throw new Error(`상품을 찾을 수 없습니다: ${orderItem.productId}`);
      }

      // 옵션이 있는 경우
      if (orderItem.productOptionId) {
        const option = product.options.find(
          (opt) => opt.id === orderItem.productOptionId,
        );

        if (!option) {
          throw new Error(
            `상품 옵션을 찾을 수 없습니다: ${orderItem.productOptionId}`,
          );
        }

        // Stock Entity의 sell() 메서드 호출
        option.stock.sell(orderItem.quantity);
      } else {
        // 옵션이 없는 경우
        if (product.options.length === 0) {
          throw new Error('상품에 재고 정보가 없습니다.');
        }

        product.options[0].stock.sell(orderItem.quantity);
      }

      // 변경된 상품 저장
      await this.productRepository.save(product);
    }
  }
}
