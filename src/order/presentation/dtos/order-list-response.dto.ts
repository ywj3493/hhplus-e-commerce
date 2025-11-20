import { GetOrdersOutput } from '@/order/application/dtos/get-orders.dto';

/**
 * 주문 목록 응답 DTO
 */
export class OrderListResponseDto {
  orders: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };

  static from(output: GetOrdersOutput): OrderListResponseDto {
    const dto = new OrderListResponseDto();
    dto.orders = output.orders;
    dto.pagination = output.pagination;
    return dto;
  }
}
