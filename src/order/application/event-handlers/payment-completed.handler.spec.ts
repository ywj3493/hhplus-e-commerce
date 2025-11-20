import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PaymentCompletedHandler } from '@/order/application/event-handlers/payment-completed.handler';
import { StockManagementService } from '@/product/domain/services/stock-management.service';
import { PaymentCompletedEvent } from '@/order/domain/events/payment-completed.event';
import { OrderRepository } from '@/order/domain/repositories/order.repository';
import { ORDER_REPOSITORY } from '@/order/domain/repositories/tokens';
import { Order } from '@/order/domain/entities/order.entity';
import { OrderItem } from '@/order/domain/entities/order-item.entity';
import { OrderStatus } from '@/order/domain/entities/order-status.enum';
import { Price } from '@/product/domain/entities/price.vo';

describe('PaymentCompletedHandler', () => {
  let handler: PaymentCompletedHandler;
  let stockManagementService: jest.Mocked<StockManagementService>;
  let orderRepository: jest.Mocked<OrderRepository>;
  let loggerSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    const mockStockManagementService = {
      confirmSale: jest.fn(),
    } as unknown as jest.Mocked<StockManagementService>;

    const mockOrderRepository = {
      findById: jest.fn(),
      save: jest.fn(), // Issue #017: event handler에서 order 저장 필요
    } as unknown as jest.Mocked<OrderRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentCompletedHandler,
        {
          provide: ORDER_REPOSITORY,
          useValue: mockOrderRepository,
        },
        {
          provide: StockManagementService,
          useValue: mockStockManagementService,
        },
      ],
    }).compile();

    handler = module.get<PaymentCompletedHandler>(PaymentCompletedHandler);
    orderRepository = module.get(ORDER_REPOSITORY);
    stockManagementService = module.get(StockManagementService);

    // Logger spy 설정
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    loggerSpy.mockRestore();
    loggerErrorSpy.mockRestore();
  });

  // 테스트 헬퍼 함수: Order 엔티티 생성
  // Note: Issue #017 변경사항 - event handler에서 order.complete()를 호출하므로 PENDING 상태로 생성
  const createTestOrder = (
    orderId: string,
    productId: string,
    optionId: string,
    quantity: number = 1,
  ): Order => {
    const orderItem = OrderItem.create({
      orderId,
      productId,
      productName: 'Test Product',
      productOptionId: optionId,
      productOptionName: 'Test Option',
      price: Price.from(10000),
      quantity,
    });

    return Order.reconstitute({
      id: orderId,
      userId: 'user-1',
      status: OrderStatus.PENDING, // event handler에서 COMPLETED로 변경
      items: [orderItem],
      totalAmount: 10000 * quantity,
      discountAmount: 0,
      finalAmount: 10000 * quantity,
      userCouponId: null,
      reservationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      createdAt: new Date(),
      paidAt: null, // event handler에서 paidAt이 설정됨
      updatedAt: new Date(),
    });
  };

  describe('handle', () => {
    it('결제 완료 이벤트 수신 시 재고를 확정하고 주문을 완료해야 함 (Issue #017)', async () => {
      // Given
      const order = createTestOrder('order-1', 'product-1', 'option-1', 2);
      const event = new PaymentCompletedEvent('payment-1', 'order-1');
      orderRepository.findById.mockResolvedValue(order);
      stockManagementService.confirmSale.mockResolvedValue(undefined);

      // When
      await handler.handle(event);

      // Then: 재고가 확정되어야 함
      expect(orderRepository.findById).toHaveBeenCalledWith('order-1');
      expect(stockManagementService.confirmSale).toHaveBeenCalledWith(
        'product-1',
        'option-1',
        2,
      );
      expect(stockManagementService.confirmSale).toHaveBeenCalledTimes(1);

      // Then: 주문이 완료되어야 함 (Issue #017 변경사항)
      expect(order.status).toBe(OrderStatus.COMPLETED);
      expect(orderRepository.save).toHaveBeenCalledWith(order);
    });

    it('이벤트 수신 시 로그를 기록해야 함', async () => {
      // Given
      const order = createTestOrder('order-1', 'product-1', 'option-1', 2);
      const event = new PaymentCompletedEvent('payment-1', 'order-1');
      orderRepository.findById.mockResolvedValue(order);
      stockManagementService.confirmSale.mockResolvedValue(undefined);

      // When
      await handler.handle(event);

      // Then
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('결제 완료 이벤트 수신'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('paymentId=payment-1'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('orderId=order-1'),
      );
    });

    it('재고 확정 완료 시 성공 로그를 기록해야 함', async () => {
      // Given
      const order = createTestOrder('order-1', 'product-1', 'option-1', 2);
      const event = new PaymentCompletedEvent('payment-1', 'order-1');
      orderRepository.findById.mockResolvedValue(order);
      stockManagementService.confirmSale.mockResolvedValue(undefined);

      // When
      await handler.handle(event);

      // Then
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('재고 확정 완료'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('orderId=order-1'),
      );
    });

    it('재고 확정 실패 시 에러 로그를 기록하고 예외를 재발생해야 함', async () => {
      // Given
      const order = createTestOrder('order-1', 'product-1', 'option-1', 2);
      const event = new PaymentCompletedEvent('payment-1', 'order-1');
      const error = new Error('재고 확정 실패');
      orderRepository.findById.mockResolvedValue(order);
      stockManagementService.confirmSale.mockRejectedValue(error);

      // When & Then
      await expect(handler.handle(event)).rejects.toThrow(error);

      // Issue #017: 에러 메시지가 "결제 완료 처리 실패"로 변경됨
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('결제 완료 처리 실패'),
        error,
      );
    });

    it('재고가 부족한 경우 예외를 전파해야 함', async () => {
      // Given
      const order = createTestOrder('order-1', 'product-1', 'option-1', 2);
      const event = new PaymentCompletedEvent('payment-1', 'order-1');
      const insufficientStockError = new Error('재고가 부족합니다');
      orderRepository.findById.mockResolvedValue(order);
      stockManagementService.confirmSale.mockRejectedValue(
        insufficientStockError,
      );

      // When & Then
      await expect(handler.handle(event)).rejects.toThrow(
        insufficientStockError,
      );

      expect(stockManagementService.confirmSale).toHaveBeenCalledWith(
        'product-1',
        'option-1',
        2,
      );
    });

    it('주문을 찾을 수 없는 경우 예외를 전파해야 함', async () => {
      // Given
      const event = new PaymentCompletedEvent('payment-1', 'non-existent-order');
      orderRepository.findById.mockResolvedValue(null);

      // When & Then
      await expect(handler.handle(event)).rejects.toThrow(
        '주문을 찾을 수 없습니다: non-existent-order',
      );

      expect(stockManagementService.confirmSale).not.toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('결제 완료 처리 실패'), // Issue #017: 에러 메시지 변경
        expect.any(Error),
      );
    });
  });

  describe('이벤트 처리 흐름', () => {
    it('여러 이벤트를 순차적으로 처리할 수 있어야 함', async () => {
      // Given
      const order1 = createTestOrder('order-1', 'product-1', 'option-1', 1);
      const order2 = createTestOrder('order-2', 'product-2', 'option-2', 2);
      const order3 = createTestOrder('order-3', 'product-3', 'option-3', 3);

      const event1 = new PaymentCompletedEvent('payment-1', 'order-1');
      const event2 = new PaymentCompletedEvent('payment-2', 'order-2');
      const event3 = new PaymentCompletedEvent('payment-3', 'order-3');

      orderRepository.findById.mockImplementation((orderId: string) => {
        if (orderId === 'order-1') return Promise.resolve(order1);
        if (orderId === 'order-2') return Promise.resolve(order2);
        if (orderId === 'order-3') return Promise.resolve(order3);
        return Promise.resolve(null);
      });

      stockManagementService.confirmSale.mockResolvedValue(undefined);

      // When
      await handler.handle(event1);
      await handler.handle(event2);
      await handler.handle(event3);

      // Then
      expect(stockManagementService.confirmSale).toHaveBeenCalledTimes(3);
      expect(stockManagementService.confirmSale).toHaveBeenNthCalledWith(
        1,
        'product-1',
        'option-1',
        1,
      );
      expect(stockManagementService.confirmSale).toHaveBeenNthCalledWith(
        2,
        'product-2',
        'option-2',
        2,
      );
      expect(stockManagementService.confirmSale).toHaveBeenNthCalledWith(
        3,
        'product-3',
        'option-3',
        3,
      );
    });

    it('한 이벤트가 실패해도 다음 이벤트를 처리할 수 있어야 함', async () => {
      // Given
      const order1 = createTestOrder('order-1', 'product-1', 'option-1', 1);
      const order2 = createTestOrder('order-2', 'product-2', 'option-2', 2);
      const order3 = createTestOrder('order-3', 'product-3', 'option-3', 3);

      const event1 = new PaymentCompletedEvent('payment-1', 'order-1');
      const event2 = new PaymentCompletedEvent('payment-2', 'order-2'); // 실패할 이벤트
      const event3 = new PaymentCompletedEvent('payment-3', 'order-3');

      orderRepository.findById.mockImplementation((orderId: string) => {
        if (orderId === 'order-1') return Promise.resolve(order1);
        if (orderId === 'order-2') return Promise.resolve(order2);
        if (orderId === 'order-3') return Promise.resolve(order3);
        return Promise.resolve(null);
      });

      stockManagementService.confirmSale
        .mockResolvedValueOnce(undefined) // event1 성공
        .mockRejectedValueOnce(new Error('재고 확정 실패')) // event2 실패
        .mockResolvedValueOnce(undefined); // event3 성공

      // When
      await handler.handle(event1); // 성공
      await expect(handler.handle(event2)).rejects.toThrow(); // 실패
      await handler.handle(event3); // 성공

      // Then
      expect(stockManagementService.confirmSale).toHaveBeenCalledTimes(3);
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('재고 확정 완료'),
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('결제 완료 처리 실패'), // Issue #017: 에러 메시지 변경
        expect.any(Error),
      );
    });
  });

  describe('이벤트 데이터 검증', () => {
    it('이벤트에서 올바른 orderId를 추출하여 서비스에 전달해야 함', async () => {
      // Given
      const paymentId = 'payment-12345';
      const orderId = 'order-67890';
      const order = createTestOrder(orderId, 'product-1', 'option-1', 5);
      const event = new PaymentCompletedEvent(paymentId, orderId);

      orderRepository.findById.mockResolvedValue(order);
      stockManagementService.confirmSale.mockResolvedValue(undefined);

      // When
      await handler.handle(event);

      // Then
      expect(orderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(stockManagementService.confirmSale).toHaveBeenCalledWith(
        'product-1',
        'option-1',
        5,
      );
    });

    it('이벤트 발생 시각이 기록되어야 함', () => {
      // Given
      const beforeTime = new Date();
      const event = new PaymentCompletedEvent('payment-1', 'order-1');
      const afterTime = new Date();

      // Then
      expect(event.occurredAt).toBeInstanceOf(Date);
      expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime(),
      );
      expect(event.occurredAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });
});
