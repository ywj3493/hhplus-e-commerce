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

  describe('handle', () => {
    it('결제 완료 이벤트 수신 시 재고를 확정해야 함', async () => {
      // Given
      const orderItem = OrderItem.create({
        orderId: 'order-1',
        productId: 'product-1',
        productName: 'Test Product',
        productOptionId: 'option-1',
        productOptionName: 'Red',
        price: Price.from(10000),
        quantity: 2,
      });
      const order = Order.reconstitute({
        id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.COMPLETED,
        items: [orderItem],
        totalAmount: 20000,
        discountAmount: 0,
        finalAmount: 20000,
        userCouponId: null,
        reservationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        createdAt: new Date(),
        paidAt: new Date(),
        updatedAt: new Date(),
      });

      const event = new PaymentCompletedEvent('payment-1', 'order-1');
      orderRepository.findById.mockResolvedValue(order);
      stockManagementService.confirmSale.mockResolvedValue(undefined);

      // When
      await handler.handle(event);

      // Then
      expect(orderRepository.findById).toHaveBeenCalledWith('order-1');
      expect(stockManagementService.confirmSale).toHaveBeenCalledWith(
        'product-1',
        'option-1',
        2,
      );
      expect(stockManagementService.confirmSale).toHaveBeenCalledTimes(1);
    });

    it('이벤트 수신 시 로그를 기록해야 함', async () => {
      // Given
      const orderItem = OrderItem.create({
        orderId: 'order-1',
        productId: 'product-1',
        productName: 'Test Product',
        productOptionId: 'option-1',
        productOptionName: 'Red',
        price: Price.from(10000),
        quantity: 2,
      }
      );
      const order = Order.reconstitute({
        id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.COMPLETED,
        items: [orderItem],
        totalAmount: 20000,
        discountAmount: 0,
        finalAmount: 20000,
        userCouponId: null,
        reservationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        createdAt: new Date(),
        paidAt: new Date(),
        updatedAt: new Date(),
      });

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
      const event = new PaymentCompletedEvent('payment-1', 'order-1');
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
      const event = new PaymentCompletedEvent('payment-1', 'order-1');
      const error = new Error('재고 확정 실패');
      stockManagementService.confirmSale.mockRejectedValue(error);

      // When & Then
      await expect(handler.handle(event)).rejects.toThrow(error);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('재고 확정 실패'),
        error,
      );
    });

    it('재고가 부족한 경우 예외를 전파해야 함', async () => {
      // Given
      const event = new PaymentCompletedEvent('payment-1', 'order-1');
      const insufficientStockError = new Error('재고가 부족합니다');
      stockManagementService.confirmSale.mockRejectedValue(
        insufficientStockError,
      );

      // When & Then
      await expect(handler.handle(event)).rejects.toThrow(
        insufficientStockError,
      );

      expect(stockManagementService.confirmSale).toHaveBeenCalledWith(
        'order-1',
      );
    });

    it('주문을 찾을 수 없는 경우 예외를 전파해야 함', async () => {
      // Given
      const event = new PaymentCompletedEvent('payment-1', 'non-existent-order');
      const notFoundError = new Error('주문을 찾을 수 없습니다');
      stockManagementService.confirmSale.mockRejectedValue(
        notFoundError,
      );

      // When & Then
      await expect(handler.handle(event)).rejects.toThrow(notFoundError);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('재고 확정 실패'),
        notFoundError,
      );
    });
  });

  describe('이벤트 처리 흐름', () => {
    it('여러 이벤트를 순차적으로 처리할 수 있어야 함', async () => {
      // Given
      const event1 = new PaymentCompletedEvent('payment-1', 'order-1');
      const event2 = new PaymentCompletedEvent('payment-2', 'order-2');
      const event3 = new PaymentCompletedEvent('payment-3', 'order-3');

      stockManagementService.confirmSale.mockResolvedValue(undefined);

      // When
      await handler.handle(event1);
      await handler.handle(event2);
      await handler.handle(event3);

      // Then
      expect(stockManagementService.confirmSale).toHaveBeenCalledTimes(
        3,
      );
      expect(stockManagementService.confirmSale).toHaveBeenNthCalledWith(
        1,
        'order-1',
      );
      expect(stockManagementService.confirmSale).toHaveBeenNthCalledWith(
        2,
        'order-2',
      );
      expect(stockManagementService.confirmSale).toHaveBeenNthCalledWith(
        3,
        'order-3',
      );
    });

    it('한 이벤트가 실패해도 다음 이벤트를 처리할 수 있어야 함', async () => {
      // Given
      const event1 = new PaymentCompletedEvent('payment-1', 'order-1');
      const event2 = new PaymentCompletedEvent('payment-2', 'order-2'); // 실패할 이벤트
      const event3 = new PaymentCompletedEvent('payment-3', 'order-3');

      stockManagementService.confirmSale
        .mockResolvedValueOnce(undefined) // event1 성공
        .mockRejectedValueOnce(new Error('재고 확정 실패')) // event2 실패
        .mockResolvedValueOnce(undefined); // event3 성공

      // When
      await handler.handle(event1); // 성공
      await expect(handler.handle(event2)).rejects.toThrow(); // 실패
      await handler.handle(event3); // 성공

      // Then
      expect(stockManagementService.confirmSale).toHaveBeenCalledTimes(
        3,
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('재고 확정 완료'),
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('재고 확정 실패'),
        expect.any(Error),
      );
    });
  });

  describe('이벤트 데이터 검증', () => {
    it('이벤트에서 올바른 orderId를 추출하여 서비스에 전달해야 함', async () => {
      // Given
      const paymentId = 'payment-12345';
      const orderId = 'order-67890';
      const event = new PaymentCompletedEvent(paymentId, orderId);

      stockManagementService.confirmSale.mockResolvedValue(undefined);

      // When
      await handler.handle(event);

      // Then
      expect(stockManagementService.confirmSale).toHaveBeenCalledWith(
        orderId,
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
