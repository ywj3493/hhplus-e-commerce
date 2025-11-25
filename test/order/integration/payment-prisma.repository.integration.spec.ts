import { Test, TestingModule } from '@nestjs/testing';
import { PaymentPrismaRepository } from '@/order/infrastructure/repositories/payment-prisma.repository';
import { PrismaService } from '@/common/infrastructure/prisma/prisma.service';
import { Payment } from '@/order/domain/entities/payment.entity';
import { PaymentMethod } from '@/order/domain/entities/payment-method.enum';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllTables,
  type TestDbConfig,
} from '../../utils/test-database';

describe('PaymentPrismaRepository 통합 테스트', () => {
  let db: TestDbConfig;
  let prismaService: PrismaService;
  let repository: PaymentPrismaRepository;
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
        PaymentPrismaRepository,
      ],
    }).compile();

    prismaService = moduleRef.get<PrismaService>(PrismaService);
    repository = moduleRef.get<PaymentPrismaRepository>(PaymentPrismaRepository);
  }, 120000); // 120초 timeout

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  beforeEach(async () => {
    // 각 테스트 전에 데이터 정리
    await clearAllTables(prismaService);
  });

  describe('findById', () => {
    it('존재하는 결제 ID로 조회 시 Payment 엔티티를 반환해야 함', async () => {
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

      // And: 주문 생성
      await prismaService.order.create({
        data: {
          id: 'test-order',
          userId: 'test-user',
          status: 'PAID',
          totalAmount: 10000,
          discountAmount: 0,
          finalAmount: 10000,
          userCouponId: null,
          reservationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
          paidAt: new Date(),
          items: {
            create: {
              id: 'test-order-item',
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

      // And: 결제 생성
      await prismaService.payment.create({
        data: {
          id: 'test-payment',
          orderId: 'test-order',
          userId: 'test-user',
          amount: 10000,
          method: 'CREDIT_CARD',
          transactionId: 'txn-123456',
          idempotencyKey: 'test-idempotency-key-1',
        },
      });

      // When: ID로 결제 조회
      const result = await repository.findById('test-payment');

      // Then: Payment 엔티티가 반환되어야 함
      expect(result).toBeInstanceOf(Payment);
      expect(result?.id).toBe('test-payment');
      expect(result?.orderId).toBe('test-order');
      expect(result?.userId).toBe('test-user');
      expect(result?.amount).toBe(10000);
      expect(result?.paymentMethod).toBe(PaymentMethod.CREDIT_CARD);
      expect(result?.transactionId).toBe('txn-123456');
    });

    it('존재하지 않는 결제 ID로 조회 시 null을 반환해야 함', async () => {
      // Given: 데이터베이스에 결제가 없음

      // When: 존재하지 않는 ID로 조회
      const result = await repository.findById('non-existent-id');

      // Then: null이 반환되어야 함
      expect(result).toBeNull();
    });
  });

  describe('findByOrderId', () => {
    it('주문 ID로 결제를 조회해야 함', async () => {
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

      // And: 주문 생성
      await prismaService.order.create({
        data: {
          id: 'test-order',
          userId: 'test-user',
          status: 'PAID',
          totalAmount: 10000,
          discountAmount: 0,
          finalAmount: 10000,
          userCouponId: null,
          reservationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
          paidAt: new Date(),
          items: {
            create: {
              id: 'test-order-item',
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

      // And: 결제 생성
      await prismaService.payment.create({
        data: {
          id: 'test-payment',
          orderId: 'test-order',
          userId: 'test-user',
          amount: 10000,
          method: 'CREDIT_CARD',
          transactionId: 'txn-123456',
          idempotencyKey: 'test-idempotency-key-2',
        },
      });

      // When: 주문 ID로 결제 조회
      const result = await repository.findByOrderId('test-order');

      // Then: Payment 엔티티가 반환되어야 함
      expect(result).toBeInstanceOf(Payment);
      expect(result?.orderId).toBe('test-order');
      expect(result?.transactionId).toBe('txn-123456');
    });

    it('결제가 없는 주문 ID로 조회 시 null을 반환해야 함', async () => {
      // Given: 데이터베이스에 결제가 없음

      // When: 존재하지 않는 주문 ID로 조회
      const result = await repository.findByOrderId('non-existent-order');

      // Then: null이 반환되어야 함
      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('새로운 결제를 저장해야 함', async () => {
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

      // And: 주문 생성
      await prismaService.order.create({
        data: {
          id: 'test-order',
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
              id: 'test-order-item',
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

      // And: Payment 엔티티 생성
      const payment = Payment.create({
        orderId: 'test-order',
        userId: 'test-user',
        amount: 10000,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId: 'txn-new-123456',
        idempotencyKey: 'test-idempotency-key-123',
      });

      // When: 결제 저장
      const result = await repository.save(payment);

      // Then: 저장된 결제가 반환되어야 함
      expect(result).toBeInstanceOf(Payment);
      expect(result.orderId).toBe('test-order');
      expect(result.transactionId).toBe('txn-new-123456');

      // And: 데이터베이스에 저장되어야 함
      const savedPayment = await prismaService.payment.findUnique({
        where: { id: payment.id },
      });
      expect(savedPayment).not.toBeNull();
      expect(savedPayment?.orderId).toBe('test-order');
      expect(savedPayment?.transactionId).toBe('txn-new-123456');
    });

    it('orderId unique 제약조건을 검증해야 함', async () => {
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

      // And: 주문 생성
      await prismaService.order.create({
        data: {
          id: 'test-order',
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
              id: 'test-order-item',
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

      // And: 첫 번째 결제 저장
      const payment1 = Payment.create({
        orderId: 'test-order',
        userId: 'test-user',
        amount: 10000,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId: 'txn-first',
        idempotencyKey: 'test-idempotency-key-123',
      });
      await repository.save(payment1);

      // And: 같은 orderId로 두 번째 결제 생성 시도
      const payment2 = Payment.create({
        orderId: 'test-order',
        userId: 'test-user',
        amount: 10000,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId: 'txn-second',
        idempotencyKey: 'test-idempotency-key-123',
      });

      // When & Then: unique 제약조건 위반으로 에러 발생
      await expect(repository.save(payment2)).rejects.toThrow();
    });
  });
});
