import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProcessPaymentUseCase } from '@/order/application/use-cases/process-payment.use-case';
import {
  ProcessPaymentInput,
  ProcessPaymentOutput,
} from '@/order/application/dtos/process-payment.dto';
import { PaymentMethod } from '@/order/domain/entities/payment-method.enum';
import type { PaymentRepository } from '@/order/domain/repositories/payment.repository';
import {
  IPaymentApiClient,
  PAYMENT_API_CLIENT,
} from '@/order/infrastructure/clients/payment-api.interface';
import type { OrderRepository } from '@/order/domain/repositories/order.repository';
import { ORDER_REPOSITORY, PAYMENT_REPOSITORY } from '@/order/domain/repositories/tokens';
import { Order } from '@/order/domain/entities/order.entity';
import { OrderStatus } from '@/order/domain/entities/order-status.enum';
import { OrderItem } from '@/order/domain/entities/order-item.entity';
import { Payment } from '@/order/domain/entities/payment.entity';
import {
  AlreadyPaidException,
  OrderExpiredException,
  InvalidOrderStatusException,
  PaymentFailedException,
} from '@/order/domain/order.exceptions';
import { PaymentCompletedEvent } from '@/order/domain/events/payment-completed.event';
import { Price } from '@/product/domain/entities/price.vo';

describe('ProcessPaymentUseCase', () => {
  let useCase: ProcessPaymentUseCase;
  let paymentRepository: jest.Mocked<PaymentRepository>;
  let orderRepository: jest.Mocked<OrderRepository>;
  let paymentApiClient: jest.Mocked<IPaymentApiClient>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const TEST_USER_ID = 'user-1';
  const TEST_ORDER_ID = 'order-1';
  const TEST_AMOUNT = 45000;

  beforeEach(async () => {
    const mockPaymentRepository: jest.Mocked<PaymentRepository> = {
      findById: jest.fn(),
      findByOrderId: jest.fn(),
      save: jest.fn(),
    };

    const mockOrderRepository: jest.Mocked<OrderRepository> = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      countByUserId: jest.fn(),
      findExpiredPendingOrders: jest.fn(),
      save: jest.fn(),
    };

    const mockPaymentApiClient: jest.Mocked<IPaymentApiClient> = {
      requestPayment: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
      emitAsync: jest.fn(),
    } as unknown as jest.Mocked<EventEmitter2>;

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
          provide: PAYMENT_API_CLIENT,
          useValue: mockPaymentApiClient,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    useCase = module.get<ProcessPaymentUseCase>(ProcessPaymentUseCase);
    paymentRepository = module.get(PAYMENT_REPOSITORY);
    orderRepository = module.get(ORDER_REPOSITORY);
    paymentApiClient = module.get(PAYMENT_API_CLIENT);
    eventEmitter = module.get(EventEmitter2);
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
      );

      const order = createTestOrder(TEST_USER_ID);
      orderRepository.findById.mockResolvedValue(order);
      paymentRepository.findByOrderId.mockResolvedValue(null);

      const transactionId = 'TXN-12345';
      paymentApiClient.requestPayment.mockResolvedValue({
        success: true,
        transactionId,
        message: '결제 성공',
      });

      const savedPayment = Payment.create({
        orderId: TEST_ORDER_ID,
        userId: TEST_USER_ID,
        amount: TEST_AMOUNT,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId,
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
      expect(orderRepository.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'payment.completed',
        expect.any(PaymentCompletedEvent),
      );
    });

    it('testFail 플래그가 true일 경우 외부 API에 전달해야 함', async () => {
      // Given
      const input = new ProcessPaymentInput(
        TEST_USER_ID,
        TEST_ORDER_ID,
        PaymentMethod.CREDIT_CARD,
      );

      const order = createTestOrder(TEST_USER_ID);
      orderRepository.findById.mockResolvedValue(order);
      paymentRepository.findByOrderId.mockResolvedValue(null);

      paymentApiClient.requestPayment.mockResolvedValue({
        success: false,
        errorCode: 'TEST_FAILURE',
        message: '테스트용 강제 실패',
      });

      // When & Then
      await expect(useCase.execute(input, true)).rejects.toThrow(
        PaymentFailedException,
      );

      expect(paymentApiClient.requestPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: TEST_ORDER_ID,
          userId: TEST_USER_ID,
          amount: TEST_AMOUNT,
          paymentMethod: PaymentMethod.CREDIT_CARD,
        }),
        true, // testFail 플래그 전달
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
      );

      const order = createTestOrder('other-user'); // 다른 사용자
      orderRepository.findById.mockResolvedValue(order);

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        '권한이 없습니다',
      );

      expect(paymentApiClient.requestPayment).not.toHaveBeenCalled();
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
      );

      const order = createTestOrder(TEST_USER_ID, OrderStatus.COMPLETED);
      orderRepository.findById.mockResolvedValue(order);

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        InvalidOrderStatusException,
      );
      expect(paymentApiClient.requestPayment).not.toHaveBeenCalled();
    });

    it('CANCELED 상태 주문일 경우 InvalidOrderStatusException을 던져야 함', async () => {
      // Given
      const input = new ProcessPaymentInput(
        TEST_USER_ID,
        TEST_ORDER_ID,
        PaymentMethod.CREDIT_CARD,
      );

      const order = createTestOrder(TEST_USER_ID, OrderStatus.CANCELED);
      orderRepository.findById.mockResolvedValue(order);

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        InvalidOrderStatusException,
      );
      expect(paymentApiClient.requestPayment).not.toHaveBeenCalled();
    });
  });

  describe('BR-PAY-03: 예약 시간 검증', () => {
    it('예약 시간이 만료된 주문일 경우 OrderExpiredException을 던져야 함', async () => {
      // Given
      const input = new ProcessPaymentInput(
        TEST_USER_ID,
        TEST_ORDER_ID,
        PaymentMethod.CREDIT_CARD,
      );

      // 11분 전에 생성된 주문 (만료)
      const expiredDate = new Date(Date.now() - 11 * 60 * 1000);
      const order = createTestOrder(TEST_USER_ID, OrderStatus.PENDING, expiredDate);
      orderRepository.findById.mockResolvedValue(order);
      paymentRepository.findByOrderId.mockResolvedValue(null);

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        OrderExpiredException,
      );
      expect(paymentApiClient.requestPayment).not.toHaveBeenCalled();
    });

    it('예약 시간이 유효한 주문일 경우 정상 처리해야 함', async () => {
      // Given
      const input = new ProcessPaymentInput(
        TEST_USER_ID,
        TEST_ORDER_ID,
        PaymentMethod.CREDIT_CARD,
      );

      // 9분 전에 생성된 주문 (유효)
      const validDate = new Date(Date.now() - 9 * 60 * 1000);
      const order = createTestOrder(TEST_USER_ID, OrderStatus.PENDING, validDate);
      orderRepository.findById.mockResolvedValue(order);
      paymentRepository.findByOrderId.mockResolvedValue(null);

      const transactionId = 'TXN-12345';
      paymentApiClient.requestPayment.mockResolvedValue({
        success: true,
        transactionId,
      });

      const savedPayment = Payment.create({
        orderId: TEST_ORDER_ID,
        userId: TEST_USER_ID,
        amount: TEST_AMOUNT,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId,
      });
      paymentRepository.save.mockResolvedValue(savedPayment);
      orderRepository.save.mockResolvedValue(order);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output).toBeInstanceOf(ProcessPaymentOutput);
      expect(paymentApiClient.requestPayment).toHaveBeenCalled();
    });
  });

  describe('중복 결제 방지', () => {
    it('이미 결제된 주문일 경우 AlreadyPaidException을 던져야 함', async () => {
      // Given
      const input = new ProcessPaymentInput(
        TEST_USER_ID,
        TEST_ORDER_ID,
        PaymentMethod.CREDIT_CARD,
      );

      const order = createTestOrder(TEST_USER_ID);
      orderRepository.findById.mockResolvedValue(order);

      const existingPayment = Payment.create({
        orderId: TEST_ORDER_ID,
        userId: TEST_USER_ID,
        amount: TEST_AMOUNT,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId: 'TXN-EXISTING',
      });
      paymentRepository.findByOrderId.mockResolvedValue(existingPayment);

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        AlreadyPaidException,
      );
      expect(paymentApiClient.requestPayment).not.toHaveBeenCalled();
    });
  });

  describe('외부 API 결제 처리', () => {
    it('외부 API 결제 실패 시 PaymentFailedException을 던져야 함', async () => {
      // Given
      const input = new ProcessPaymentInput(
        TEST_USER_ID,
        TEST_ORDER_ID,
        PaymentMethod.CREDIT_CARD,
      );

      const order = createTestOrder(TEST_USER_ID);
      orderRepository.findById.mockResolvedValue(order);
      paymentRepository.findByOrderId.mockResolvedValue(null);

      paymentApiClient.requestPayment.mockResolvedValue({
        success: false,
        errorCode: 'INSUFFICIENT_BALANCE',
        message: '잔액이 부족합니다',
      });

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        PaymentFailedException,
      );

      // 결제 실패 시 Payment 저장하지 않음
      expect(paymentRepository.save).not.toHaveBeenCalled();
      expect(orderRepository.save).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('외부 API가 success: true를 반환하면 정상 처리해야 함', async () => {
      // Given
      const input = new ProcessPaymentInput(
        TEST_USER_ID,
        TEST_ORDER_ID,
        PaymentMethod.CREDIT_CARD,
      );

      const order = createTestOrder(TEST_USER_ID);
      orderRepository.findById.mockResolvedValue(order);
      paymentRepository.findByOrderId.mockResolvedValue(null);

      const transactionId = 'TXN-SUCCESS-123';
      paymentApiClient.requestPayment.mockResolvedValue({
        success: true,
        transactionId,
        message: '결제 성공',
      });

      const savedPayment = Payment.create({
        orderId: TEST_ORDER_ID,
        userId: TEST_USER_ID,
        amount: TEST_AMOUNT,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId,
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
    it('결제 성공 시 주문 상태를 COMPLETED로 변경해야 함', async () => {
      // Given
      const input = new ProcessPaymentInput(
        TEST_USER_ID,
        TEST_ORDER_ID,
        PaymentMethod.CREDIT_CARD,
      );

      const order = createTestOrder(TEST_USER_ID, OrderStatus.PENDING);
      orderRepository.findById.mockResolvedValue(order);
      paymentRepository.findByOrderId.mockResolvedValue(null);

      paymentApiClient.requestPayment.mockResolvedValue({
        success: true,
        transactionId: 'TXN-123',
      });

      const savedPayment = Payment.create({
        orderId: TEST_ORDER_ID,
        userId: TEST_USER_ID,
        amount: TEST_AMOUNT,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId: 'TXN-123',
      });
      paymentRepository.save.mockResolvedValue(savedPayment);

      let savedOrder: Order | null = null;
      orderRepository.save.mockImplementation(async (o: Order) => {
        savedOrder = o;
        return o;
      });

      // When
      await useCase.execute(input);

      // Then
      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.status).toBe(OrderStatus.COMPLETED);
      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OrderStatus.COMPLETED,
        }),
      );
    });
  });

  describe('이벤트 발행', () => {
    it('결제 성공 시 PaymentCompletedEvent를 발행해야 함', async () => {
      // Given
      const input = new ProcessPaymentInput(
        TEST_USER_ID,
        TEST_ORDER_ID,
        PaymentMethod.CREDIT_CARD,
      );

      const order = createTestOrder(TEST_USER_ID);
      orderRepository.findById.mockResolvedValue(order);
      paymentRepository.findByOrderId.mockResolvedValue(null);

      const transactionId = 'TXN-123';
      paymentApiClient.requestPayment.mockResolvedValue({
        success: true,
        transactionId,
      });

      const savedPayment = Payment.create({
        orderId: TEST_ORDER_ID,
        userId: TEST_USER_ID,
        amount: TEST_AMOUNT,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId,
      });
      paymentRepository.save.mockResolvedValue(savedPayment);
      orderRepository.save.mockResolvedValue(order);

      // When
      await useCase.execute(input);

      // Then
      expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'payment.completed',
        expect.objectContaining({
          paymentId: savedPayment.id,
          orderId: TEST_ORDER_ID,
        }),
      );
    });
  });

  describe('예외 케이스', () => {
    it('존재하지 않는 주문일 경우 오류를 던져야 함', async () => {
      // Given
      const input = new ProcessPaymentInput(
        TEST_USER_ID,
        'non-existent-order',
        PaymentMethod.CREDIT_CARD,
      );

      orderRepository.findById.mockResolvedValue(null);

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        '주문을 찾을 수 없습니다',
      );
    });
  });
});
