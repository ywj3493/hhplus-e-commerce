import { Injectable, Inject } from '@nestjs/common';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { Order } from '../../domain/entities/order.entity';
import { OrderItem } from '../../domain/entities/order-item.entity';
import { StockReservationService } from '../../domain/services/stock-reservation.service';
import { CartCheckoutService } from '../../../cart/application/services/cart-checkout.service';
import { CouponApplicationService } from '../../../coupon/application/services/coupon-application.service';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../../product/domain/repositories/product.repository';
import { CreateOrderInput, CreateOrderOutput } from '../dtos/create-order.dto';
import { EmptyCartException } from '../../domain/order.exceptions';

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

/**
 * CreateOrderUseCase
 * 주문 생성 Use Case
 *
 * 플로우:
 * 1. 장바구니 조회 및 검증 (CartCheckoutService)
 * 2. 재고 예약 (StockReservationService)
 * 3. 쿠폰 적용 (CouponApplicationService)
 * 4. Order.create() 호출
 * 5. 장바구니 비우기 (CartCheckoutService)
 */
@Injectable()
export class CreateOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    private readonly stockReservationService: StockReservationService,
    private readonly cartCheckoutService: CartCheckoutService,
    private readonly couponApplicationService: CouponApplicationService,
  ) {}

  async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
    // 1. 장바구니 조회 및 검증 (Application Service)
    let cartItems;
    try {
      cartItems = await this.cartCheckoutService.getCartItemsForCheckout(
        input.userId,
      );
    } catch (error) {
      throw new EmptyCartException();
    }

    // 2. 재고 예약
    await this.stockReservationService.reserveStockForCart(cartItems);

    try {
      // 3. 쿠폰 적용 (Application Service)
      let discountAmount = 0;
      let userCouponId: string | null = null;

      if (input.couponId) {
        // 총액 계산을 위한 임시 OrderItem 생성
        const tempOrderItems = await this.convertCartItemsToOrderItems(
          'temp-id',
          cartItems,
        );
        const totalAmount = tempOrderItems.reduce(
          (sum, item) => sum + item.getSubtotal().amount,
          0,
        );

        // CouponApplicationService를 통한 쿠폰 적용
        const couponResult = await this.couponApplicationService.applyCoupon(
          input.userId,
          input.couponId,
          totalAmount,
        );

        discountAmount = couponResult.discountAmount;
        userCouponId = couponResult.userCouponId;
      }

      // 4. OrderItem 생성 (Snapshot 패턴)
      const orderItems = await this.convertCartItemsToOrderItems(
        'temp-id',
        cartItems,
      );

      // 5. Order 생성
      const order = Order.create({
        userId: input.userId,
        items: orderItems,
        userCouponId,
        discountAmount,
      });

      // OrderItem의 orderId 업데이트
      const finalOrderItems = await this.convertCartItemsToOrderItems(
        order.id,
        cartItems,
      );
      const finalOrder = Order.reconstitute({
        id: order.id,
        userId: order.userId,
        status: order.status,
        items: finalOrderItems,
        totalAmount: order.totalAmount,
        discountAmount: order.discountAmount,
        finalAmount: order.finalAmount,
        userCouponId: order.userCouponId,
        reservationExpiresAt: order.reservationExpiresAt,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        updatedAt: order.updatedAt,
      });

      // 6. Order 저장
      const savedOrder = await this.orderRepository.save(finalOrder);

      // 7. 장바구니 비우기 (Application Service)
      await this.cartCheckoutService.clearCartAfterCheckout(input.userId);

      // 8. Output DTO 반환
      return CreateOrderOutput.from(
        savedOrder.id,
        savedOrder.status,
        savedOrder.totalAmount,
        savedOrder.discountAmount,
        savedOrder.finalAmount,
        savedOrder.reservationExpiresAt,
      );
    } catch (error) {
      // 오류 발생 시 예약된 재고 해제
      const orderItems = await this.convertCartItemsToOrderItems(
        'rollback',
        cartItems,
      );
      await this.stockReservationService.releaseReservedStock(orderItems);
      throw error;
    }
  }

  /**
   * CartItem을 OrderItem으로 변환 (Snapshot 패턴)
   * BR-ORDER-02: 주문 시점의 상품 정보를 저장
   */
  private async convertCartItemsToOrderItems(
    orderId: string,
    cartItems: any[],
  ): Promise<OrderItem[]> {
    const orderItems: OrderItem[] = [];

    for (const cartItem of cartItems) {
      // 상품 정보 조회 (옵션 이름 가져오기)
      const product = await this.productRepository.findById(
        cartItem.productId,
      );

      if (!product) {
        throw new Error(`상품을 찾을 수 없습니다: ${cartItem.productId}`);
      }

      let productOptionName: string | null = null;
      if (cartItem.productOptionId) {
        const option = product.findOption(cartItem.productOptionId);
        if (!option) {
          throw new Error(
            `상품 옵션을 찾을 수 없습니다: ${cartItem.productOptionId}`,
          );
        }
        productOptionName = option.name;
      }

      // OrderItem 생성 (Snapshot)
      const orderItem = OrderItem.fromCartItem(
        orderId,
        cartItem,
        productOptionName,
      );
      orderItems.push(orderItem);
    }

    return orderItems;
  }
}
