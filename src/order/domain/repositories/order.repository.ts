import { Order } from '../entities/order.entity';

/**
 * Pagination 인터페이스
 */
export interface Pagination {
  page: number;
  limit: number;
}

/**
 * OrderRepository 인터페이스
 * Domain Layer에서 정의하고 Infrastructure Layer에서 구현
 */
export interface OrderRepository {
  /**
   * ID로 주문 조회
   */
  findById(id: string): Promise<Order | null>;

  /**
   * 사용자 ID로 주문 목록 조회 (페이지네이션)
   * BR-ORDER-09: 최신 주문부터 표시 (created_at DESC)
   */
  findByUserId(userId: string, pagination: Pagination): Promise<Order[]>;

  /**
   * 사용자 ID로 주문 개수 조회
   */
  countByUserId(userId: string): Promise<number>;

  /**
   * 만료된 PENDING 주문 조회
   * BR-ORDER-13: 예약 시간이 만료된 주문 자동 취소
   */
  findExpiredPendingOrders(): Promise<Order[]>;

  /**
   * 주문 저장 (생성 및 수정)
   */
  save(order: Order): Promise<Order>;
}
