import { Injectable, Inject } from '@nestjs/common';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { Order } from '../../domain/entities/order.entity';
import { OrderItem } from '../../domain/entities/order-item.entity';
import { StockReservationService } from '../../domain/services/stock-reservation.service';
import { CartRepository } from '../../../cart/domain/repositories/cart.repository';
import { UserCouponRepository } from '../../../coupon/domain/repositories/user-coupon.repository';
import { CouponRepository } from '../../../coupon/domain/repositories/coupon.repository';
import { CouponService } from '../../../coupon/domain/services/coupon.service';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../../product/domain/repositories/product.repository';
import { CreateOrderInput, CreateOrderOutput } from '../dtos/create-order.dto';
import { EmptyCartException } from '../../domain/order.exceptions';

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
export const CART_REPOSITORY = Symbol('CART_REPOSITORY');
export const USER_COUPON_REPOSITORY = Symbol('USER_COUPON_REPOSITORY');
export const COUPON_REPOSITORY = Symbol('COUPON_REPOSITORY');

/**
 * CreateOrderUseCase
 * 주문 생성 Use Case
 *
 * 플로우:
 * 1. 장바구니 조회 및 검증
 * 2. 재고 예약 (StockReservationService)
 * 3. 쿠폰 검증 및 사용 (CouponService)
 * 4. Order.create() 호출
 * 5. 장바구니 비우기
 */
@Injectable()
export class CreateOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,
    @Inject(USER_COUPON_REPOSITORY)
    private readonly userCouponRepository: UserCouponRepository,
    @Inject(COUPON_REPOSITORY)
    private readonly couponRepository: CouponRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    private readonly stockReservationService: StockReservationService,
    private readonly couponService: CouponService,
  ) {}

  async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
    // 1. 장바구니 조회 및 검증
    const cart = await this.cartRepository.findByUserId(input.userId);
    if (!cart || cart.getItems().length === 0) {
      throw new EmptyCartException();
    }

    const cartItems = cart.getItems();

    // 2. 재고 예약
    await this.stockReservationService.reserveStockForCart(cartItems);

    try {
      // 3. 쿠폰 검증 및 할인 계산
      let discountAmount = 0;
      let userCouponId: string | null = null;

      if (input.couponId) {
        // UserCoupon 조회
        const userCoupon = await this.userCouponRepository.findById(
          input.couponId,
        );

        if (!userCoupon) {
          throw new Error('쿠폰을 찾을 수 없습니다.');
        }

        // BR-ORDER-06 유사: 소유권 검증
        if (userCoupon.userId !== input.userId) {
          throw new Error('본인의 쿠폰만 사용할 수 있습니다.');
        }

        // 쿠폰 검증 및 사용
        this.couponService.validateAndUseCoupon(userCoupon);

        // Coupon 엔티티 조회 (할인 계산용)
        const coupon = await this.couponRepository.findById(
          userCoupon.couponId,
        );

        if (!coupon) {
          throw new Error('쿠폰 정보를 찾을 수 없습니다.');
        }

        // 총액 계산을 위한 임시 OrderItem 생성
        const tempOrderItems = await this.convertCartItemsToOrderItems(
          'temp-id',
          cartItems,
        );
        const totalAmount = tempOrderItems.reduce(
          (sum, item) => sum + item.getSubtotal().amount,
          0,
        );

        // BR-ORDER-04: 할인 금액 계산
        discountAmount = this.couponService.calculateDiscount(
          coupon,
          totalAmount,
        );
        userCouponId = userCoupon.id;

        // 쿠폰 사용 상태 저장
        await this.userCouponRepository.save(userCoupon);
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

      // 7. 장바구니 비우기
      await this.cartRepository.clearByUserId(input.userId);

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
