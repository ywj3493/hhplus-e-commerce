import { Injectable } from '@nestjs/common';
import {
  OrderRepository,
  Pagination,
} from '@/order/domain/repositories/order.repository';
import { Order, OrderData } from '@/order/domain/entities/order.entity';
import {
  OrderItem,
  OrderItemData,
} from '@/order/domain/entities/order-item.entity';
import { OrderStatus } from '@/order/domain/entities/order-status.enum';
import { Price } from '@/product/domain/entities/price.vo';
import { PrismaService } from '@/common/infrastructure/persistance/prisma.service';
import { Order as PrismaOrder, OrderItem as PrismaOrderItem } from '@prisma/client';

/**
 * Prisma Order 모델 + OrderItem 포함
 */
type PrismaOrderWithItems = PrismaOrder & {
  items: PrismaOrderItem[];
};

/**
 * OrderPrismaRepository
 * Prisma를 사용한 Order Repository 구현체
 *
 * 주요 기능:
 * - Order Aggregate (Order + OrderItems) 조회
 * - 페이지네이션 지원
 * - 만료된 주문 조회
 */
@Injectable()
export class OrderPrismaRepository implements OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ID로 주문 조회 (주문 항목 포함)
   * @param id - 주문 ID
   * @returns Order 애그리거트 또는 null
   */
  async findById(id: string): Promise<Order | null> {
    const orderModel = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!orderModel) {
      return null;
    }

    return this.toDomain(orderModel);
  }

  /**
   * 사용자 ID로 주문 목록 조회 (페이지네이션)
   * BR-ORDER-09: 최신 주문부터 표시 (createdAt DESC)
   * @param userId - 사용자 ID
   * @param pagination - 페이지네이션 정보
   * @returns 주문 목록
   */
  async findByUserId(userId: string, pagination: Pagination): Promise<Order[]> {
    const skip = (pagination.page - 1) * pagination.limit;

    const orders = await this.prisma.order.findMany({
      where: { userId },
      skip,
      take: pagination.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
      },
    });

    return orders.map((order) => this.toDomain(order));
  }

  /**
   * 사용자 ID로 주문 개수 조회
   * @param userId - 사용자 ID
   * @returns 주문 개수
   */
  async countByUserId(userId: string): Promise<number> {
    return this.prisma.order.count({
      where: { userId },
    });
  }

  /**
   * 만료된 PENDING 주문 조회
   * BR-ORDER-13: 예약 시간이 만료된 주문 자동 취소
   * @returns 만료된 주문 목록
   */
  async findExpiredPendingOrders(): Promise<Order[]> {
    const now = new Date();

    const orders = await this.prisma.order.findMany({
      where: {
        status: 'PENDING',
        reservationExpiresAt: {
          lt: now,
        },
      },
      include: {
        items: true,
      },
    });

    return orders.map((order) => this.toDomain(order));
  }

  /**
   * 주문 저장 (생성 또는 업데이트)
   * @param order - Order 도메인 엔티티
   * @returns 저장된 주문
   */
  async save(order: Order): Promise<Order> {
    const orderData = {
      userId: order.userId,
      status: order.status,
      totalAmount: order.totalAmount,
      discountAmount: order.discountAmount,
      finalAmount: order.finalAmount,
      userCouponId: order.userCouponId,
      reservationExpiresAt: order.reservationExpiresAt,
      paidAt: order.paidAt,
      updatedAt: new Date(),
    };

    // OrderItem 데이터 준비
    const itemsData = order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productOptionId: item.productOptionId,
      productOptionName: item.productOptionName,
      quantity: item.quantity,
      unitPrice: item.price.amount,
      totalPrice: item.price.amount * item.quantity,
      createdAt: item.createdAt,
    }));

    // 기존 주문 확인
    const existingOrder = await this.prisma.order.findUnique({
      where: { id: order.id },
    });

    let savedOrder;

    if (existingOrder) {
      // 기존 주문 업데이트 (items는 변경하지 않음)
      savedOrder = await this.prisma.order.update({
        where: { id: order.id },
        data: orderData,
        include: {
          items: true,
        },
      });
    } else {
      // 새 주문 생성
      savedOrder = await this.prisma.order.create({
        data: {
          id: order.id,
          ...orderData,
          createdAt: order.createdAt,
          items: {
            create: itemsData,
          },
        },
        include: {
          items: true,
        },
      });
    }

    return this.toDomain(savedOrder);
  }

  /**
   * Prisma Order 모델을 Domain Order 엔티티로 변환
   * @param prismaOrder - Prisma Order 모델
   * @returns Order 도메인 엔티티
   */
  private toDomain(prismaOrder: PrismaOrderWithItems): Order {
    // OrderItem 변환
    const items = prismaOrder.items.map((item) => {
      const itemData: OrderItemData = {
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        productName: item.productName,
        productOptionId: item.productOptionId,
        productOptionName: item.productOptionName,
        price: Price.from(Number(item.unitPrice)),
        quantity: item.quantity,
        createdAt: item.createdAt,
      };
      return OrderItem.reconstitute(itemData);
    });

    // Order 재구성
    const orderData: OrderData = {
      id: prismaOrder.id,
      userId: prismaOrder.userId,
      status: prismaOrder.status as OrderStatus,
      items,
      totalAmount: Number(prismaOrder.totalAmount),
      discountAmount: Number(prismaOrder.discountAmount),
      finalAmount: Number(prismaOrder.finalAmount),
      userCouponId: prismaOrder.userCouponId,
      reservationExpiresAt: prismaOrder.reservationExpiresAt,
      createdAt: prismaOrder.createdAt,
      paidAt: prismaOrder.paidAt,
      updatedAt: prismaOrder.updatedAt,
    };

    return Order.reconstitute(orderData);
  }
}
