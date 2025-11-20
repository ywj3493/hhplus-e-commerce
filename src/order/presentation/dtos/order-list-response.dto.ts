import { ApiProperty } from '@nestjs/swagger';
import { GetOrdersOutput } from '@/order/application/dtos/get-orders.dto';

/**
 * 페이지네이션 정보
 */
class PaginationInfo {
  @ApiProperty({ description: '현재 페이지', example: 1 })
  page: number;

  @ApiProperty({ description: '페이지당 항목 수', example: 10 })
  limit: number;

  @ApiProperty({ description: '전체 항목 수', example: 42 })
  total: number;
}

/**
 * 주문 목록 응답 DTO
 */
export class OrderListResponseDto {
  @ApiProperty({ description: '주문 목록', type: 'array', example: [] })
  orders: any[];

  @ApiProperty({ description: '페이지네이션 정보', type: PaginationInfo })
  pagination: PaginationInfo;

  static from(output: GetOrdersOutput): OrderListResponseDto {
    const dto = new OrderListResponseDto();
    dto.orders = output.orders;
    dto.pagination = output.pagination;
    return dto;
  }
}
