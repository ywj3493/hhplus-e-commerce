import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PaymentCompletedHandler } from './payment-completed.handler';
import { StockReservationService } from '../../domain/services/stock-reservation.service';
import { PaymentCompletedEvent } from '../../domain/events/payment-completed.event';

describe('PaymentCompletedHandler', () => {
  let handler: PaymentCompletedHandler;
  let stockReservationService: jest.Mocked<StockReservationService>;
  let loggerSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    const mockStockReservationService = {
      convertReservedToSold: jest.fn(),
      reserveStockForCart: jest.fn(),
      releaseReservedStock: jest.fn(),
    } as unknown as jest.Mocked<StockReservationService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentCompletedHandler,
        {
          provide: StockReservationService,
          useValue: mockStockReservationService,
        },
      ],
    }).compile();

    handler = module.get<PaymentCompletedHandler>(PaymentCompletedHandler);
    stockReservationService = module.get(StockReservationService);

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
      const event = new PaymentCompletedEvent('payment-1', 'order-1');
      stockReservationService.convertReservedToSold.mockResolvedValue(undefined);

      // When
      await handler.handle(event);

      // Then
      expect(stockReservationService.convertReservedToSold).toHaveBeenCalledWith(
        'order-1',
      );
      expect(stockReservationService.convertReservedToSold).toHaveBeenCalledTimes(
        1,
      );
    });

    it('이벤트 수신 시 로그를 기록해야 함', async () => {
      // Given
      const event = new PaymentCompletedEvent('payment-1', 'order-1');
      stockReservationService.convertReservedToSold.mockResolvedValue(undefined);

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
      stockReservationService.convertReservedToSold.mockResolvedValue(undefined);

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
      stockReservationService.convertReservedToSold.mockRejectedValue(error);

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
      stockReservationService.convertReservedToSold.mockRejectedValue(
        insufficientStockError,
      );

      // When & Then
      await expect(handler.handle(event)).rejects.toThrow(
        insufficientStockError,
      );

      expect(stockReservationService.convertReservedToSold).toHaveBeenCalledWith(
        'order-1',
      );
    });

    it('주문을 찾을 수 없는 경우 예외를 전파해야 함', async () => {
      // Given
      const event = new PaymentCompletedEvent('payment-1', 'non-existent-order');
      const notFoundError = new Error('주문을 찾을 수 없습니다');
      stockReservationService.convertReservedToSold.mockRejectedValue(
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

      stockReservationService.convertReservedToSold.mockResolvedValue(undefined);

      // When
      await handler.handle(event1);
      await handler.handle(event2);
      await handler.handle(event3);

      // Then
      expect(stockReservationService.convertReservedToSold).toHaveBeenCalledTimes(
        3,
      );
      expect(stockReservationService.convertReservedToSold).toHaveBeenNthCalledWith(
        1,
        'order-1',
      );
      expect(stockReservationService.convertReservedToSold).toHaveBeenNthCalledWith(
        2,
        'order-2',
      );
      expect(stockReservationService.convertReservedToSold).toHaveBeenNthCalledWith(
        3,
        'order-3',
      );
    });

    it('한 이벤트가 실패해도 다음 이벤트를 처리할 수 있어야 함', async () => {
      // Given
      const event1 = new PaymentCompletedEvent('payment-1', 'order-1');
      const event2 = new PaymentCompletedEvent('payment-2', 'order-2'); // 실패할 이벤트
      const event3 = new PaymentCompletedEvent('payment-3', 'order-3');

      stockReservationService.convertReservedToSold
        .mockResolvedValueOnce(undefined) // event1 성공
        .mockRejectedValueOnce(new Error('재고 확정 실패')) // event2 실패
        .mockResolvedValueOnce(undefined); // event3 성공

      // When
      await handler.handle(event1); // 성공
      await expect(handler.handle(event2)).rejects.toThrow(); // 실패
      await handler.handle(event3); // 성공

      // Then
      expect(stockReservationService.convertReservedToSold).toHaveBeenCalledTimes(
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

      stockReservationService.convertReservedToSold.mockResolvedValue(undefined);

      // When
      await handler.handle(event);

      // Then
      expect(stockReservationService.convertReservedToSold).toHaveBeenCalledWith(
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
