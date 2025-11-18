/**
 * 주문 상태
 * - PENDING: 결제 대기 중 (재고 예약됨)
 * - COMPLETED: 결제 완료 (재고 판매 전환)
 * - CANCELED: 주문 취소 (재고 복원)
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
}
