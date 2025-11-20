import { Injectable } from '@nestjs/common';
import {
  OrderRepository,
  Pagination,
} from '@/order/domain/repositories/order.repository';
import { Order } from '@/order/domain/entities/order.entity';
import { OrderStatus } from '@/order/domain/entities/order-status.enum';

/**
 * 인메모리 주문 저장소
 *
 * 주의사항:
 * - Map<orderId, Order> 형태로 데이터 저장
 * - Deep copy를 통한 불변성 보장
 * - 서버 재시작 시 데이터 초기화됨
 */
@Injectable()
export class InMemoryOrderRepository implements OrderRepository {
  private orders: Map<string, Order> = new Map();

  /**
   * ID로 주문 조회
   */
  async findById(id: string): Promise<Order | null> {
    const order = this.orders.get(id);
    return order ? this.deepCopy(order) : null;
  }

  /**
   * 사용자 ID로 주문 목록 조회 (페이지네이션)
   * BR-ORDER-09: 최신 주문부터 표시 (created_at DESC)
   */
  async findByUserId(
    userId: string,
    pagination: Pagination,
  ): Promise<Order[]> {
    const userOrders = Array.from(this.orders.values())
      .filter((order) => order.userId === userId)
      // BR-ORDER-09: 최신순 정렬
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // 페이지네이션 적용
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;

    return userOrders
      .slice(startIndex, endIndex)
      .map((order) => this.deepCopy(order));
  }

  /**
   * 사용자 ID로 주문 개수 조회
   */
  async countByUserId(userId: string): Promise<number> {
    return Array.from(this.orders.values()).filter(
      (order) => order.userId === userId,
    ).length;
  }

  /**
   * 만료된 PENDING 주문 조회
   * BR-ORDER-13: 예약 시간이 만료된 주문 자동 취소
   */
  async findExpiredPendingOrders(): Promise<Order[]> {
    const now = new Date();

    return Array.from(this.orders.values())
      .filter(
        (order) =>
          order.status === OrderStatus.PENDING &&
          order.reservationExpiresAt < now,
      )
      .map((order) => this.deepCopy(order));
  }

  /**
   * 주문 저장 (생성 및 수정)
   */
  async save(order: Order): Promise<Order> {
    this.orders.set(order.id, this.deepCopy(order));
    return this.deepCopy(order);
  }

  /**
   * 테스트용: 전체 데이터 초기화
   */
  clear(): void {
    this.orders.clear();
  }

  /**
   * 테스트용: 초기 데이터 시딩
   */
  seed(orders: Order[]): void {
    orders.forEach((order) => {
      this.orders.set(order.id, this.deepCopy(order));
    });
  }

  /**
   * Deep copy를 통한 불변성 보장
   */
  private deepCopy(order: Order): Order {
    return Order.reconstitute({
      id: order.id,
      userId: order.userId,
      status: order.status,
      items: order.items.map((item) => item), // OrderItem은 불변 객체이므로 그대로 복사
      totalAmount: order.totalAmount,
      discountAmount: order.discountAmount,
      finalAmount: order.finalAmount,
      userCouponId: order.userCouponId,
      reservationExpiresAt: new Date(order.reservationExpiresAt),
      createdAt: new Date(order.createdAt),
      paidAt: order.paidAt ? new Date(order.paidAt) : null,
      updatedAt: new Date(order.updatedAt),
    });
  }
}
