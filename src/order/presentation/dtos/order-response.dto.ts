import { ApiProperty } from '@nestjs/swagger';
import { GetOrderOutput, OrderItemData } from '@/order/application/dtos/get-order.dto';
import { CreateOrderOutput } from '@/order/application/dtos/create-order.dto';

/**
 * 주문 생성 응답 DTO
 */
export class CreateOrderResponseDto {
  @ApiProperty({ description: '주문 ID', example: 'order-1' })
  orderId: string;

  @ApiProperty({ description: '주문 상태', example: 'PENDING_PAYMENT' })
  status: string;

  @ApiProperty({ description: '총 금액', example: 4980000 })
  totalAmount: number;

  @ApiProperty({ description: '할인 금액', example: 498000 })
  discountAmount: number;

  @ApiProperty({ description: '최종 결제 금액', example: 4482000 })
  finalAmount: number;

  @ApiProperty({ description: '재고 예약 만료 시간', example: '2025-01-15T10:05:00.000Z' })
  reservationExpiresAt: Date;

  static from(output: CreateOrderOutput): CreateOrderResponseDto {
    const dto = new CreateOrderResponseDto();
    dto.orderId = output.orderId;
    dto.status = output.status;
    dto.totalAmount = output.totalAmount;
    dto.discountAmount = output.discountAmount;
    dto.finalAmount = output.finalAmount;
    dto.reservationExpiresAt = output.reservationExpiresAt;
    return dto;
  }
}

/**
 * 주문 상세 응답 DTO
 */
export class OrderResponseDto {
  @ApiProperty({ description: '주문 ID', example: 'order-1' })
  orderId: string;

  @ApiProperty({ description: '주문 상태', example: 'COMPLETED' })
  status: string;

  @ApiProperty({ description: '주문 항목 목록', type: [OrderItemData] })
  items: OrderItemData[];

  @ApiProperty({ description: '총 금액', example: 4980000 })
  totalAmount: number;

  @ApiProperty({ description: '할인 금액', example: 498000 })
  discountAmount: number;

  @ApiProperty({ description: '최종 결제 금액', example: 4482000 })
  finalAmount: number;

  @ApiProperty({ description: '주문 생성 시간', example: '2025-01-15T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: '재고 예약 만료 시간', example: '2025-01-15T10:05:00.000Z' })
  reservationExpiresAt: Date;

  @ApiProperty({ description: '결제 완료 시간', example: '2025-01-15T10:03:00.000Z', nullable: true })
  paidAt: Date | null;

  static from(output: GetOrderOutput): OrderResponseDto {
    const dto = new OrderResponseDto();
    dto.orderId = output.orderId;
    dto.status = output.status;
    dto.items = output.items;
    dto.totalAmount = output.totalAmount;
    dto.discountAmount = output.discountAmount;
    dto.finalAmount = output.finalAmount;
    dto.createdAt = output.createdAt;
    dto.reservationExpiresAt = output.reservationExpiresAt;
    dto.paidAt = output.paidAt;
    return dto;
  }
}
