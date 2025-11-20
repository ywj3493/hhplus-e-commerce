import { GetOrderOutput, OrderItemData } from '@/order/application/dtos/get-order.dto';
import { CreateOrderOutput } from '@/order/application/dtos/create-order.dto';

/**
 * 주문 생성 응답 DTO
 */
export class CreateOrderResponseDto {
  orderId: string;
  status: string;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
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
  orderId: string;
  status: string;
  items: OrderItemData[];
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  createdAt: Date;
  reservationExpiresAt: Date;
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
