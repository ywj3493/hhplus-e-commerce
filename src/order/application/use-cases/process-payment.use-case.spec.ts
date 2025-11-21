import { Test, TestingModule } from '@nestjs/testing';
import { ProcessPaymentUseCase } from '@/order/application/use-cases/process-payment.use-case';
import {
  ProcessPaymentInput,
  ProcessPaymentOutput,
} from '@/order/application/dtos/process-payment.dto';
import { PaymentMethod } from '@/order/domain/entities/payment-method.enum';
import type { PaymentRepository } from '@/order/domain/repositories/payment.repository';
import {
  PaymentAdapter,
  PAYMENT_ADAPTER,
} from '@/order/domain/ports/payment.port';
import type { OrderRepository } from '@/order/domain/repositories/order.repository';
import { ORDER_REPOSITORY, PAYMENT_REPOSITORY } from '@/order/domain/repositories/tokens';
import { Order } from '@/order/domain/entities/order.entity';
import { OrderStatus } from '@/order/domain/entities/order-status.enum';
import { OrderItem } from '@/order/domain/entities/order-item.entity';
import { Payment } from '@/order/domain/entities/payment.entity';
import {
  OrderExpiredException,
  InvalidOrderStatusException,
  PaymentFailedException,
} from '@/order/domain/order.exceptions';
import { Price } from '@/product/domain/entities/price.vo';

describe('ProcessPaymentUseCase', () => {
  let useCase: ProcessPaymentUseCase;
  let paymentRepository: jest.Mocked<PaymentRepository>;
  let orderRepository: jest.Mocked<OrderRepository>;
  let paymentAdapter: jest.Mocked<PaymentAdapter>;

  const TEST_USER_ID = 'user-1';
  const TEST_ORDER_ID = 'order-1';
  const TEST_AMOUNT = 45000;
  const TEST_IDEMPOTENCY_KEY = 'test-idempotency-key-123';

  beforeEach(async () => {
    const mockPaymentRepository: jest.Mocked<PaymentRepository> = {
      findById: jest.fn(),
      findByOrderId: jest.fn(),
      findByIdempotencyKey: jest.fn(),
      save: jest.fn(),
      refund: jest.fn(),
    };

    const mockOrderRepository: jest.Mocked<OrderRepository> = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      countByUserId: jest.fn(),
      findExpiredPendingOrders: jest.fn(),
      save: jest.fn(),
    };

    const mockPaymentAdapter: jest.Mocked<PaymentAdapter> = {
      processPayment: jest.fn(),
      refund: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessPaymentUseCase,
        {
          provide: PAYMENT_REPOSITORY,
          useValue: mockPaymentRepository,
        },
        {
          provide: ORDER_REPOSITORY,
          useValue: mockOrderRepository,
        },
        {
          provide: PAYMENT_ADAPTER,
          useValue: mockPaymentAdapter,
        },
      ],
    }).compile();

    useCase = module.get<ProcessPaymentUseCase>(ProcessPaymentUseCase);
    paymentRepository = module.get(PAYMENT_REPOSITORY);
    orderRepository = module.get(ORDER_REPOSITORY);
    paymentAdapter = module.get(PAYMENT_ADAPTER);
  });

  const createTestOrderItem = (): OrderItem => {
    return OrderItem.create({
      orderId: TEST_ORDER_ID,
      productId: 'product-1',
      productName: '테스트 상품',
      productOptionId: 'option-1',
      productOptionName: '옵션 1',
      price: Price.from(25000),
      quantity: 2,
    });
  };

  const createTestOrder = (
    userId: string,
    status: OrderStatus = OrderStatus.PENDING,
    createdAt: Date = new Date(),
  ): Order => {
    const now = new Date();
    // reservationExpiresAt = createdAt + 10분
    const reservationExpiresAt = new Date(createdAt.getTime() + 10 * 60 * 1000);

    return Order.reconstitute({
      id: TEST_ORDER_ID,
      userId,
      items: [createTestOrderItem()],
      totalAmount: 50000,
      discountAmount: 5000,
      finalAmount: TEST_AMOUNT,
      status,
      userCouponId: null,
      reservationExpiresAt,
      createdAt,
      paidAt: null,
      updatedAt: now,
    });
  };

  describe('실행', () => {
    it('유효한 주문으로 결제를 성공적으로 처리해야 함', async () => {
      // Given
      const input = new ProcessPaymentInput(
        TEST_USER_ID,
        TEST_ORDER_ID,
        PaymentMethod.CREDIT_CARD,
        TEST_IDEMPOTENCY_KEY,
      );

      const order = createTestOrder(TEST_USER_ID);
      orderRepository.findById.mockResolvedValue(order);
      paymentRepository.findByOrderId.mockResolvedValue(null);
      paymentRepository.findByIdempotencyKey.mockResolvedValue(null);

      const transactionId = 'TXN-12345';
      paymentAdapter.processPayment.mockResolvedValue({
        success: true,
        transactionId,
      });

      const savedPayment = Payment.create({
        orderId: TEST_ORDER_ID,
        userId: TEST_USER_ID,
        amount: TEST_AMOUNT,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId,
        idempotencyKey: TEST_IDEMPOTENCY_KEY,
      });
      paymentRepository.save.mockResolvedValue(savedPayment);
      orderRepository.save.mockResolvedValue(order);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output).toBeInstanceOf(ProcessPaymentOutput);
      expect(output.paymentId).toBeDefined();
      expect(output.orderId).toBe(TEST_ORDER_ID);
      expect(output.amount).toBe(TEST_AMOUNT);
      expect(output.transactionId).toBe(transactionId);

      expect(paymentRepository.save).toHaveBeenCalled();
      // Note: 재고 확정 및 주문 완료는 Facade에서 처리
      expect(orderRepository.save).not.toHaveBeenCalled();
    });

    it('testFail 플래그가 true일 경우 외부 API에 전달해야 함', async () => {
      // Given
      const input = new ProcessPaymentInput(
        TEST_USER_ID,
        TEST_ORDER_ID,
        PaymentMethod.CREDIT_CARD,
        TEST_IDEMPOTENCY_KEY,
      );

      const order = createTestOrder(TEST_USER_ID);
      orderRepository.findById.mockResolvedValue(order);
      paymentRepository.findByOrderId.mockResolvedValue(null);
      paymentRepository.findByIdempotencyKey.mockResolvedValue(null);

      paymentAdapter.processPayment.mockResolvedValue({
        success: false,
        errorMessage: '테스트용 강제 실패',
      });

      // When & Then
      await expect(useCase.execute(input, true)).rejects.toThrow(
        PaymentFailedException,
      );

      expect(paymentAdapter.processPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: TEST_ORDER_ID,
          userId: TEST_USER_ID,
          amount: TEST_AMOUNT,
          paymentMethod: PaymentMethod.CREDIT_CARD,
        }),
        true, // shouldFail 플래그 전달
      );
    });
  });

  describe('BR-PAY-01: 주문 소유권 검증', () => {
    it('다른 사용자의 주문일 경우 오류를 던져야 함', async () => {
      // Given
      const input = new ProcessPaymentInput(
        TEST_USER_ID,
        TEST_ORDER_ID,
        PaymentMethod.CREDIT_CARD,
        TEST_IDEMPOTENCY_KEY,
      );

      const order = createTestOrder('other-user'); // 다른 사용자
      orderRepository.findById.mockResolvedValue(order);

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        '권한이 없습니다',
      );

      expect(paymentAdapter.processPayment).not.toHaveBeenCalled();
      expect(paymentRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('BR-PAY-02: 주문 상태 검증', () => {
    it('COMPLETED 상태 주문일 경우 InvalidOrderStatusException을 던져야 함', async () => {
      // Given
      const input = new ProcessPaymentInput(
        TEST_USER_ID,
        TEST_ORDER_ID,
        PaymentMethod.CREDIT_CARD,
        TEST_IDEMPOTENCY_KEY,
      );

      const order = createTestOrder(TEST_USER_ID, OrderStatus.COMPLETED);
      orderRepository.findById.mockResolvedValue(order);

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        InvalidOrderStatusException,
      );
      expect(paymentAdapter.processPayment).not.toHaveBeenCalled();
    });

    it('CANCELED 상태 주문일 경우 InvalidOrderStatusException을 던져야 함', async () => {
      // Given
      const input = new ProcessPaymentInput(
        TEST_USER_ID,
        TEST_ORDER_ID,
        PaymentMethod.CREDIT_CARD,
        TEST_IDEMPOTENCY_KEY,
      );

      const order = createTestOrder(TEST_USER_ID, OrderStatus.CANCELED);
      orderRepository.findById.mockResolvedValue(order);

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        InvalidOrderStatusException,
      );
      expect(paymentAdapter.processPayment).not.toHaveBeenCalled();
    });
  });

  describe('BR-PAY-03: 예약 시간 검증', () => {
    it('예약 시간이 만료된 주문일 경우 OrderExpiredException을 던져야 함', async () => {
      // Given
      const input = new ProcessPaymentInput(
        TEST_USER_ID,
        TEST_ORDER_ID,
        PaymentMethod.CREDIT_CARD,
        TEST_IDEMPOTENCY_KEY,
      );

      // 11분 전에 생성된 주문 (만료)
      const expiredDate = new Date(Date.now() - 11 * 60 * 1000);
      const order = createTestOrder(TEST_USER_ID, OrderStatus.PENDING, expiredDate);
      orderRepository.findById.mockResolvedValue(order);
      paymentRepository.findByOrderId.mockResolvedValue(null);
      paymentRepository.findByIdempotencyKey.mockResolvedValue(null);

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        OrderExpiredException,
      );
      expect(paymentAdapter.processPayment).not.toHaveBeenCalled();
    });

    it('예약 시간이 유효한 주문일 경우 정상 처리해야 함', async () => {
      // Given
      const input = new ProcessPaymentInput(
        TEST_USER_ID,
        TEST_ORDER_ID,
        PaymentMethod.CREDIT_CARD,
        TEST_IDEMPOTENCY_KEY,
      );

      // 9분 전에 생성된 주문 (유효)
      const validDate = new Date(Date.now() - 9 * 60 * 1000);
      const order = createTestOrder(TEST_USER_ID, OrderStatus.PENDING, validDate);
      orderRepository.findById.mockResolvedValue(order);
      paymentRepository.findByOrderId.mockResolvedValue(null);
      paymentRepository.findByIdempotencyKey.mockResolvedValue(null);

      const transactionId = 'TXN-12345';
      paymentAdapter.processPayment.mockResolvedValue({
        success: true,
        transactionId,
      });

      const savedPayment = Payment.create({
        orderId: TEST_ORDER_ID,
        userId: TEST_USER_ID,
        amount: TEST_AMOUNT,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId,
        idempotencyKey: TEST_IDEMPOTENCY_KEY,
      });
      paymentRepository.save.mockResolvedValue(savedPayment);
      orderRepository.save.mockResolvedValue(order);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output).toBeInstanceOf(ProcessPaymentOutput);
      expect(paymentAdapter.processPayment).toHaveBeenCalled();
    });
  });

  describe('멱등성 (Idempotency)', () => {
    it('동일한 idempotencyKey로 2번 호출 시 기존 결과를 반환해야 함', async () => {
      // Given
      const input = new ProcessPaymentInput(
        TEST_USER_ID,
        TEST_ORDER_ID,
        PaymentMethod.CREDIT_CARD,
        TEST_IDEMPOTENCY_KEY,
      );

      const existingPayment = Payment.create({
        orderId: TEST_ORDER_ID,
        userId: TEST_USER_ID,
        amount: TEST_AMOUNT,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId: 'TXN-EXISTING',
        idempotencyKey: TEST_IDEMPOTENCY_KEY,
      });
      paymentRepository.findByIdempotencyKey.mockResolvedValue(existingPayment);

      // When
      const result = await useCase.execute(input);

      // Then
      expect(result.paymentId).toBe(existingPayment.id);
      expect(result.transactionId).toBe('TXN-EXISTING');
      expect(paymentAdapter.processPayment).not.toHaveBeenCalled();
      expect(paymentRepository.save).not.toHaveBeenCalled();
      expect(orderRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('외부 API 결제 처리', () => {
    it('외부 API 결제 실패 시 PaymentFailedException을 던져야 함', async () => {
      // Given
      const input = new ProcessPaymentInput(
        TEST_USER_ID,
        TEST_ORDER_ID,
        PaymentMethod.CREDIT_CARD,
        TEST_IDEMPOTENCY_KEY,
      );

      const order = createTestOrder(TEST_USER_ID);
      orderRepository.findById.mockResolvedValue(order);
      paymentRepository.findByOrderId.mockResolvedValue(null);
      paymentRepository.findByIdempotencyKey.mockResolvedValue(null);

      paymentAdapter.processPayment.mockResolvedValue({
        success: false,
        errorMessage: '잔액이 부족합니다',
      });

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        PaymentFailedException,
      );

      // 결제 실패 시 Payment 저장하지 않음
      expect(paymentRepository.save).not.toHaveBeenCalled();
      expect(orderRepository.save).not.toHaveBeenCalled();
    });

    it('Gateway가 success: true를 반환하면 정상 처리해야 함', async () => {
      // Given
      const input = new ProcessPaymentInput(
        TEST_USER_ID,
        TEST_ORDER_ID,
        PaymentMethod.CREDIT_CARD,
        TEST_IDEMPOTENCY_KEY,
      );

      const order = createTestOrder(TEST_USER_ID);
      orderRepository.findById.mockResolvedValue(order);
      paymentRepository.findByOrderId.mockResolvedValue(null);
      paymentRepository.findByIdempotencyKey.mockResolvedValue(null);

      const transactionId = 'TXN-SUCCESS-123';
      paymentAdapter.processPayment.mockResolvedValue({
        success: true,
        transactionId,
      });

      const savedPayment = Payment.create({
        orderId: TEST_ORDER_ID,
        userId: TEST_USER_ID,
        amount: TEST_AMOUNT,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId,
        idempotencyKey: TEST_IDEMPOTENCY_KEY,
      });
      paymentRepository.save.mockResolvedValue(savedPayment);
      orderRepository.save.mockResolvedValue(order);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.transactionId).toBe(transactionId);
      expect(paymentRepository.save).toHaveBeenCalled();
    });
  });

  describe('주문 상태 업데이트', () => {
    it('결제 성공 시 주문 상태는 event handler에서 COMPLETED로 변경됨 (Issue #017)', async () => {
      // Given
      const input = new ProcessPaymentInput(
        TEST_USER_ID,
        TEST_ORDER_ID,
        PaymentMethod.CREDIT_CARD,
        TEST_IDEMPOTENCY_KEY,
      );

      const order = createTestOrder(TEST_USER_ID, OrderStatus.PENDING);
      orderRepository.findById.mockResolvedValue(order);
      paymentRepository.findByOrderId.mockResolvedValue(null);
      paymentRepository.findByIdempotencyKey.mockResolvedValue(null);

      paymentAdapter.processPayment.mockResolvedValue({
        success: true,
        transactionId: 'TXN-123',
      });

      const savedPayment = Payment.create({
        orderId: TEST_ORDER_ID,
        userId: TEST_USER_ID,
        amount: TEST_AMOUNT,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId: 'TXN-123',
        idempotencyKey: TEST_IDEMPOTENCY_KEY,
      });
      paymentRepository.save.mockResolvedValue(savedPayment);

      // When
      await useCase.execute(input);

      // Then: Order 상태는 event handler에서 변경되므로 use case에서는 변경되지 않음
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(orderRepository.save).not.toHaveBeenCalled();

      // Payment는 저장됨
      expect(paymentRepository.save).toHaveBeenCalled();
    });
  });

  describe('예외 케이스', () => {
    it('존재하지 않는 주문일 경우 오류를 던져야 함', async () => {
      // Given
      const input = new ProcessPaymentInput(
        TEST_USER_ID,
        'non-existent-order',
        PaymentMethod.CREDIT_CARD,
        TEST_IDEMPOTENCY_KEY,
      );

      paymentRepository.findByIdempotencyKey.mockResolvedValue(null);
      orderRepository.findById.mockResolvedValue(null);

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        '주문을 찾을 수 없습니다',
      );
    });
  });
});
