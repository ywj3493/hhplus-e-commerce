import { Test, TestingModule } from '@nestjs/testing';
import { OrderPrismaRepository } from '@/order/infrastructure/repositories/order-prisma.repository';
import { PrismaService } from '@/common/infrastructure/prisma/prisma.service';
import { Order } from '@/order/domain/entities/order.entity';
import { OrderItem } from '@/order/domain/entities/order-item.entity';
import { OrderStatus } from '@/order/domain/entities/order-status.enum';
import { Price } from '@/product/domain/entities/price.vo';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllTables,
  type TestDbConfig,
} from '../../utils/test-database';

describe('OrderPrismaRepository 통합 테스트', () => {
  let db: TestDbConfig;
  let prismaService: PrismaService;
  let repository: OrderPrismaRepository;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    // 공유 DB 설정
    db = await setupTestDatabase({ isolated: false });

    // NestJS 테스트 모듈 생성
    moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: db.prisma,
        },
        OrderPrismaRepository,
      ],
    }).compile();

    prismaService = moduleRef.get<PrismaService>(PrismaService);
    repository = moduleRef.get<OrderPrismaRepository>(OrderPrismaRepository);
  }, 120000); // 120초 timeout

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  beforeEach(async () => {
    // 각 테스트 전에 데이터 정리
    await clearAllTables(prismaService);
  });

  describe('findById', () => {
    it('존재하는 주문 ID로 조회 시 Order 애그리거트를 반환해야 함', async () => {
      // Given: 사용자 생성
      await prismaService.user.create({
        data: {
          id: 'test-user',
          name: '테스트 사용자',
          email: 'test@example.com',
        },
      });

      // And: 카테고리 및 상품 생성
      await prismaService.category.create({
        data: { id: 'test-category', name: '테스트 카테고리' },
      });

      await prismaService.product.create({
        data: {
          id: 'test-product',
          name: '테스트 상품',
          description: '테스트 설명',
          price: 10000,
          imageUrl: 'https://example.com/image.jpg',
          categoryId: 'test-category',
          hasOptions: false,
        },
      });

      // And: 주문 생성 (OrderItem 포함)
      const reservationExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await prismaService.order.create({
        data: {
          id: 'test-order',
          userId: 'test-user',
          status: 'PENDING',
          totalAmount: 10000,
          discountAmount: 0,
          finalAmount: 10000,
          userCouponId: null,
          reservationExpiresAt,
          paidAt: null,
          items: {
            create: {
              id: 'test-order-item',
              productId: 'test-product',
              productName: '테스트 상품', // 스냅샷
              productOptionId: null,
              productOptionName: null,
              quantity: 1,
              unitPrice: 10000,
              totalPrice: 10000,
            },
          },
        },
      });

      // When: ID로 주문 조회
      const result = await repository.findById('test-order');

      // Then: Order 엔티티가 반환되어야 함
      expect(result).toBeInstanceOf(Order);
      expect(result?.id).toBe('test-order');
      expect(result?.userId).toBe('test-user');
      expect(result?.status).toBe(OrderStatus.PENDING);
      expect(result?.totalAmount).toBe(10000);
      expect(result?.finalAmount).toBe(10000);
      expect(result?.items).toHaveLength(1);
      expect(result?.items[0]).toBeInstanceOf(OrderItem);
      expect(result?.items[0].productName).toBe('테스트 상품'); // 스냅샷 검증
    });

    it('존재하지 않는 주문 ID로 조회 시 null을 반환해야 함', async () => {
      // Given: 데이터베이스에 주문이 없음

      // When: 존재하지 않는 ID로 조회
      const result = await repository.findById('non-existent-id');

      // Then: null이 반환되어야 함
      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('사용자 ID로 주문 목록을 최신순으로 조회해야 함', async () => {
      // Given: 사용자 생성
      await prismaService.user.create({
        data: {
          id: 'test-user',
          name: '테스트 사용자',
          email: 'test@example.com',
        },
      });

      // And: 카테고리 및 상품 생성
      await prismaService.category.create({
        data: { id: 'test-category', name: '테스트 카테고리' },
      });

      await prismaService.product.create({
        data: {
          id: 'test-product',
          name: '테스트 상품',
          description: '테스트 설명',
          price: 10000,
          imageUrl: 'https://example.com/image.jpg',
          categoryId: 'test-category',
          hasOptions: false,
        },
      });

      // And: 3개 주문 생성 (서로 다른 시간)
      const now = new Date();
      for (let i = 1; i <= 3; i++) {
        await prismaService.order.create({
          data: {
            id: `order-${i}`,
            userId: 'test-user',
            status: 'PENDING',
            totalAmount: 10000 * i,
            discountAmount: 0,
            finalAmount: 10000 * i,
            userCouponId: null,
            reservationExpiresAt: new Date(now.getTime() + 10 * 60 * 1000),
            paidAt: null,
            createdAt: new Date(now.getTime() + i * 1000), // 1초씩 차이
            items: {
              create: {
                id: `order-item-${i}`,
                productId: 'test-product',
                productName: '테스트 상품',
                productOptionId: null,
                productOptionName: null,
                quantity: i,
                unitPrice: 10000,
                totalPrice: 10000 * i,
              },
            },
          },
        });
      }

      // When: 사용자 ID로 주문 조회 (페이지 1, 한계 10)
      const result = await repository.findByUserId('test-user', {
        page: 1,
        limit: 10,
      });

      // Then: 최신순으로 3개 주문이 반환되어야 함
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('order-3'); // 가장 최근
      expect(result[1].id).toBe('order-2');
      expect(result[2].id).toBe('order-1'); // 가장 오래됨
    });

    it('페이지네이션을 적용하여 주문을 조회해야 함', async () => {
      // Given: 사용자 생성
      await prismaService.user.create({
        data: {
          id: 'test-user',
          name: '테스트 사용자',
          email: 'test@example.com',
        },
      });

      // And: 카테고리 및 상품 생성
      await prismaService.category.create({
        data: { id: 'test-category', name: '테스트 카테고리' },
      });

      await prismaService.product.create({
        data: {
          id: 'test-product',
          name: '테스트 상품',
          description: '테스트 설명',
          price: 10000,
          imageUrl: 'https://example.com/image.jpg',
          categoryId: 'test-category',
          hasOptions: false,
        },
      });

      // And: 5개 주문 생성
      const now = new Date();
      for (let i = 1; i <= 5; i++) {
        await prismaService.order.create({
          data: {
            id: `order-${i}`,
            userId: 'test-user',
            status: 'PENDING',
            totalAmount: 10000,
            discountAmount: 0,
            finalAmount: 10000,
            userCouponId: null,
            reservationExpiresAt: new Date(now.getTime() + 10 * 60 * 1000),
            paidAt: null,
            createdAt: new Date(now.getTime() + i * 1000),
            items: {
              create: {
                id: `order-item-${i}`,
                productId: 'test-product',
                productName: '테스트 상품',
                productOptionId: null,
                productOptionName: null,
                quantity: 1,
                unitPrice: 10000,
                totalPrice: 10000,
              },
            },
          },
        });
      }

      // When: 페이지 2, 한계 2로 조회
      const result = await repository.findByUserId('test-user', {
        page: 2,
        limit: 2,
      });

      // Then: 3번째와 2번째 주문이 반환되어야 함 (최신순)
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('order-3');
      expect(result[1].id).toBe('order-2');
    });
  });

  describe('countByUserId', () => {
    it('사용자 ID로 주문 개수를 조회해야 함', async () => {
      // Given: 사용자 생성
      await prismaService.user.create({
        data: {
          id: 'test-user',
          name: '테스트 사용자',
          email: 'test@example.com',
        },
      });

      // And: 카테고리 및 상품 생성
      await prismaService.category.create({
        data: { id: 'test-category', name: '테스트 카테고리' },
      });

      await prismaService.product.create({
        data: {
          id: 'test-product',
          name: '테스트 상품',
          description: '테스트 설명',
          price: 10000,
          imageUrl: 'https://example.com/image.jpg',
          categoryId: 'test-category',
          hasOptions: false,
        },
      });

      // And: 3개 주문 생성
      for (let i = 1; i <= 3; i++) {
        await prismaService.order.create({
          data: {
            id: `order-${i}`,
            userId: 'test-user',
            status: 'PENDING',
            totalAmount: 10000,
            discountAmount: 0,
            finalAmount: 10000,
            userCouponId: null,
            reservationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
            paidAt: null,
            items: {
              create: {
                id: `order-item-${i}`,
                productId: 'test-product',
                productName: '테스트 상품',
                productOptionId: null,
                productOptionName: null,
                quantity: 1,
                unitPrice: 10000,
                totalPrice: 10000,
              },
            },
          },
        });
      }

      // When: 사용자 ID로 주문 개수 조회
      const result = await repository.countByUserId('test-user');

      // Then: 3이 반환되어야 함
      expect(result).toBe(3);
    });
  });

  describe('findExpiredPendingOrders', () => {
    it('만료된 PENDING 주문을 조회해야 함', async () => {
      // Given: 사용자 생성
      await prismaService.user.create({
        data: {
          id: 'test-user',
          name: '테스트 사용자',
          email: 'test@example.com',
        },
      });

      // And: 카테고리 및 상품 생성
      await prismaService.category.create({
        data: { id: 'test-category', name: '테스트 카테고리' },
      });

      await prismaService.product.create({
        data: {
          id: 'test-product',
          name: '테스트 상품',
          description: '테스트 설명',
          price: 10000,
          imageUrl: 'https://example.com/image.jpg',
          categoryId: 'test-category',
          hasOptions: false,
        },
      });

      // And: 만료된 주문 생성 (예약 만료 시간이 과거)
      await prismaService.order.create({
        data: {
          id: 'expired-order',
          userId: 'test-user',
          status: 'PENDING',
          totalAmount: 10000,
          discountAmount: 0,
          finalAmount: 10000,
          userCouponId: null,
          reservationExpiresAt: new Date(Date.now() - 1000), // 1초 전 만료
          paidAt: null,
          items: {
            create: {
              id: 'expired-order-item',
              productId: 'test-product',
              productName: '테스트 상품',
              productOptionId: null,
              productOptionName: null,
              quantity: 1,
              unitPrice: 10000,
              totalPrice: 10000,
            },
          },
        },
      });

      // And: 만료되지 않은 주문 생성
      await prismaService.order.create({
        data: {
          id: 'active-order',
          userId: 'test-user',
          status: 'PENDING',
          totalAmount: 10000,
          discountAmount: 0,
          finalAmount: 10000,
          userCouponId: null,
          reservationExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10분 후
          paidAt: null,
          items: {
            create: {
              id: 'active-order-item',
              productId: 'test-product',
              productName: '테스트 상품',
              productOptionId: null,
              productOptionName: null,
              quantity: 1,
              unitPrice: 10000,
              totalPrice: 10000,
            },
          },
        },
      });

      // When: 만료된 주문 조회
      const result = await repository.findExpiredPendingOrders();

      // Then: 만료된 주문만 반환되어야 함
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('expired-order');
    });

    it('PAID 상태의 주문은 만료 여부와 관계없이 조회되지 않아야 함', async () => {
      // Given: 사용자 생성
      await prismaService.user.create({
        data: {
          id: 'test-user',
          name: '테스트 사용자',
          email: 'test@example.com',
        },
      });

      // And: 카테고리 및 상품 생성
      await prismaService.category.create({
        data: { id: 'test-category', name: '테스트 카테고리' },
      });

      await prismaService.product.create({
        data: {
          id: 'test-product',
          name: '테스트 상품',
          description: '테스트 설명',
          price: 10000,
          imageUrl: 'https://example.com/image.jpg',
          categoryId: 'test-category',
          hasOptions: false,
        },
      });

      // And: PAID 상태의 주문 생성 (예약 시간은 과거)
      await prismaService.order.create({
        data: {
          id: 'paid-order',
          userId: 'test-user',
          status: 'PAID',
          totalAmount: 10000,
          discountAmount: 0,
          finalAmount: 10000,
          userCouponId: null,
          reservationExpiresAt: new Date(Date.now() - 1000),
          paidAt: new Date(),
          items: {
            create: {
              id: 'paid-order-item',
              productId: 'test-product',
              productName: '테스트 상품',
              productOptionId: null,
              productOptionName: null,
              quantity: 1,
              unitPrice: 10000,
              totalPrice: 10000,
            },
          },
        },
      });

      // When: 만료된 주문 조회
      const result = await repository.findExpiredPendingOrders();

      // Then: 조회되지 않아야 함
      expect(result).toHaveLength(0);
    });
  });

  describe('save', () => {
    it('새로운 주문을 저장해야 함', async () => {
      // Given: 사용자 생성
      await prismaService.user.create({
        data: {
          id: 'test-user',
          name: '테스트 사용자',
          email: 'test@example.com',
        },
      });

      // And: 카테고리 및 상품 생성
      await prismaService.category.create({
        data: { id: 'test-category', name: '테스트 카테고리' },
      });

      await prismaService.product.create({
        data: {
          id: 'test-product',
          name: '테스트 상품',
          description: '테스트 설명',
          price: 10000,
          imageUrl: 'https://example.com/image.jpg',
          categoryId: 'test-category',
          hasOptions: false,
        },
      });

      // And: OrderItem 생성
      const orderItem = OrderItem.create({
        orderId: 'new-order',
        productId: 'test-product',
        productName: '테스트 상품',
        productOptionId: null,
        productOptionName: null,
        price: Price.from(10000),
        quantity: 1,
      });

      // And: Order 생성
      const order = Order.create({
        userId: 'test-user',
        items: [orderItem],
        userCouponId: null,
        discountAmount: 0,
      });

      // When: 주문 저장
      const result = await repository.save(order);

      // Then: 저장된 주문이 반환되어야 함
      expect(result).toBeInstanceOf(Order);
      expect(result.id).toBe(order.id);
      expect(result.userId).toBe('test-user');
      expect(result.items).toHaveLength(1);

      // And: 데이터베이스에 저장되어야 함
      const savedOrder = await prismaService.order.findUnique({
        where: { id: order.id },
        include: { items: true },
      });
      expect(savedOrder).not.toBeNull();
      expect(savedOrder?.items).toHaveLength(1);
      expect(savedOrder?.items[0].productName).toBe('테스트 상품'); // 스냅샷 검증
    });

    it('기존 주문을 업데이트해야 함', async () => {
      // Given: 사용자 생성
      await prismaService.user.create({
        data: {
          id: 'test-user',
          name: '테스트 사용자',
          email: 'test@example.com',
        },
      });

      // And: 카테고리 및 상품 생성
      await prismaService.category.create({
        data: { id: 'test-category', name: '테스트 카테고리' },
      });

      await prismaService.product.create({
        data: {
          id: 'test-product',
          name: '테스트 상품',
          description: '테스트 설명',
          price: 10000,
          imageUrl: 'https://example.com/image.jpg',
          categoryId: 'test-category',
          hasOptions: false,
        },
      });

      // And: 기존 주문 생성
      await prismaService.order.create({
        data: {
          id: 'existing-order',
          userId: 'test-user',
          status: 'PENDING',
          totalAmount: 10000,
          discountAmount: 0,
          finalAmount: 10000,
          userCouponId: null,
          reservationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
          paidAt: null,
          items: {
            create: {
              id: 'existing-order-item',
              productId: 'test-product',
              productName: '테스트 상품',
              productOptionId: null,
              productOptionName: null,
              quantity: 1,
              unitPrice: 10000,
              totalPrice: 10000,
            },
          },
        },
      });

      // And: 주문 조회 및 상태 변경
      const order = await repository.findById('existing-order');
      expect(order).not.toBeNull();
      order!.complete();

      // When: 주문 업데이트
      const result = await repository.save(order!);

      // Then: 상태가 업데이트되어야 함
      expect(result.status).toBe(OrderStatus.COMPLETED);

      // And: 데이터베이스에 반영되어야 함
      const updatedOrder = await prismaService.order.findUnique({
        where: { id: 'existing-order' },
      });
      expect(updatedOrder?.status).toBe('COMPLETED');
      expect(updatedOrder?.paidAt).not.toBeNull();
    });
  });
});
