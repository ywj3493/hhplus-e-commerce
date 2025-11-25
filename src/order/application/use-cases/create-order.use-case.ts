import { Injectable, Inject, Logger } from '@nestjs/common';
import type { OrderRepository } from '@/order/domain/repositories/order.repository';
import type { CartRepository } from '@/order/domain/repositories/cart.repository';
import { ORDER_REPOSITORY, CART_REPOSITORY } from '@/order/domain/repositories/tokens';
import { Order } from '@/order/domain/entities/order.entity';
import { OrderItem } from '@/order/domain/entities/order-item.entity';
import { StockManagementService } from '@/product/domain/services/stock-management.service';
import { CouponApplyService } from '@/coupon/application/services/coupon-apply.service';
import type { ProductRepository } from '@/product/domain/repositories/product.repository';
import { PRODUCT_REPOSITORY } from '@/product/domain/repositories/tokens';
import { CreateOrderInput, CreateOrderOutput } from '@/order/application/dtos/create-order.dto';
import { EmptyCartException } from '@/order/domain/order.exceptions';
import { OptimisticLockException } from '@/product/domain/exceptions/optimistic-lock.exception';

/**
 * CreateOrderUseCase
 * 주문 생성 Use Case
 *
 * 플로우:
 * 1. 장바구니 조회 및 검증 (CartRepository)
 * 2. 재고 예약 (Product 도메인 서비스) - 낙관적 락 + 재시도
 * 3. 쿠폰 적용 (CouponApplyService)
 * 4. Order.create() 호출
 * 5. 장바구니 비우기 (CartRepository)
 *
 * 재시도 정책:
 * - 최대 3회 재시도
 * - Exponential Backoff (50ms → 100ms → 200ms)
 * - OptimisticLockException 발생 시에만 재시도
 */
@Injectable()
export class CreateOrderUseCase {
  private readonly logger = new Logger(CreateOrderUseCase.name);
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY_MS = 50;

  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
    private readonly stockManagementService: StockManagementService,
    private readonly couponApplicationService: CouponApplyService,
  ) {}

  async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
    // 재시도 루프
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        return await this.executeWithRetry(input, attempt);
      } catch (error) {
        // OptimisticLockException이고 마지막 시도가 아니면 재시도
        if (
          error instanceof OptimisticLockException &&
          attempt < this.MAX_RETRIES - 1
        ) {
          const delayMs = this.BASE_DELAY_MS * Math.pow(2, attempt);
          this.logger.warn(
            `재고 예약 충돌 발생. ${delayMs}ms 후 재시도합니다. (시도 ${attempt + 1}/${this.MAX_RETRIES})`,
          );
          await this.sleep(delayMs);
          continue;
        }
        // 다른 에러거나 마지막 시도면 그대로 throw
        throw error;
      }
    }

    // 이 코드에는 도달하지 않지만 TypeScript를 위한 fallback
    throw new Error('주문 생성에 실패했습니다.');
  }

  /**
   * 재시도 가능한 주문 생성 로직
   */
  private async executeWithRetry(
    input: CreateOrderInput,
    attempt: number,
  ): Promise<CreateOrderOutput> {
    // 1. 장바구니 조회 및 검증
    const cart = await this.cartRepository.findByUserId(input.userId);
    if (!cart || cart.getItems().length === 0) {
      throw new EmptyCartException('장바구니가 비어있습니다.');
    }

    const cartItems = cart.getItems();

    // 2. 재고 예약 (Product 도메인 서비스) - OptimisticLockException 발생 가능
    for (const cartItem of cartItems) {
      await this.stockManagementService.reserveStock(
        cartItem.productId,
        cartItem.productOptionId,
        cartItem.quantity,
      );
    }

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

        // CouponApplyService를 통한 쿠폰 적용
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
      for (const cartItem of cartItems) {
        await this.stockManagementService.releaseStock(
          cartItem.productId,
          cartItem.productOptionId,
          cartItem.quantity,
        );
      }
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

  /**
   * 지정된 시간(ms) 동안 대기
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
