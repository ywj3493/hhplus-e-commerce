import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { ProcessPaymentUseCase } from '../../application/use-cases/process-payment.use-case';
import { ProcessPaymentRequestDto } from '../dtos/process-payment-request.dto';
import { PaymentResponseDto } from '../dtos/payment-response.dto';
import { PaymentMethod } from '../../domain/entities/payment-method.enum';
import { ProcessPaymentOutput } from '../../application/dtos/process-payment.dto';
import {
  AlreadyPaidException,
  OrderExpiredException,
  InvalidOrderStatusException,
  PaymentFailedException,
} from '../../domain/order.exceptions';

describe('PaymentController', () => {
  let controller: PaymentController;
  let processPaymentUseCase: jest.Mocked<ProcessPaymentUseCase>;

  const TEST_USER_ID = 'user-1';
  const TEST_ORDER_ID = 'order-1';
  const TEST_PAYMENT_ID = 'payment-1';
  const TEST_TRANSACTION_ID = 'TXN-12345';
  const TEST_AMOUNT = 45000;

  beforeEach(async () => {
    const mockProcessPaymentUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: ProcessPaymentUseCase,
          useValue: mockProcessPaymentUseCase,
        },
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
    processPaymentUseCase = module.get(ProcessPaymentUseCase);
  });

  describe('processPayment', () => {
    it('정상 결제 요청 시 201 Created와 PaymentResponseDto를 반환해야 함', async () => {
      // Given
      const requestDto = new ProcessPaymentRequestDto();
      requestDto.orderId = TEST_ORDER_ID;
      requestDto.paymentMethod = PaymentMethod.CREDIT_CARD;

      const output = new ProcessPaymentOutput(
        TEST_PAYMENT_ID,
        TEST_ORDER_ID,
        TEST_AMOUNT,
        PaymentMethod.CREDIT_CARD,
        TEST_TRANSACTION_ID,
        new Date(),
      );
      processPaymentUseCase.execute.mockResolvedValue(output);

      // When
      const response = await controller.processPayment(requestDto);

      // Then
      expect(response).toBeInstanceOf(PaymentResponseDto);
      expect(response.paymentId).toBe(TEST_PAYMENT_ID);
      expect(response.orderId).toBe(TEST_ORDER_ID);
      expect(response.amount).toBe(TEST_AMOUNT);
      expect(response.transactionId).toBe(TEST_TRANSACTION_ID);

      expect(processPaymentUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: TEST_USER_ID,
          orderId: TEST_ORDER_ID,
          paymentMethod: PaymentMethod.CREDIT_CARD,
        }),
        false, // testFail 기본값
      );
    });

    it('X-Test-Fail 헤더가 "true"일 경우 testFail을 true로 전달해야 함', async () => {
      // Given
      const requestDto = new ProcessPaymentRequestDto();
      requestDto.orderId = TEST_ORDER_ID;
      requestDto.paymentMethod = PaymentMethod.CREDIT_CARD;

      const output = new ProcessPaymentOutput(
        TEST_PAYMENT_ID,
        TEST_ORDER_ID,
        TEST_AMOUNT,
        PaymentMethod.CREDIT_CARD,
        TEST_TRANSACTION_ID,
        new Date(),
      );
      processPaymentUseCase.execute.mockResolvedValue(output);

      // When
      await controller.processPayment(requestDto, 'true');

      // Then
      expect(processPaymentUseCase.execute).toHaveBeenCalledWith(
        expect.anything(),
        true, // testFail = true
      );
    });

    it('X-Test-Fail 헤더가 "false"일 경우 testFail을 false로 전달해야 함', async () => {
      // Given
      const requestDto = new ProcessPaymentRequestDto();
      requestDto.orderId = TEST_ORDER_ID;
      requestDto.paymentMethod = PaymentMethod.CREDIT_CARD;

      const output = new ProcessPaymentOutput(
        TEST_PAYMENT_ID,
        TEST_ORDER_ID,
        TEST_AMOUNT,
        PaymentMethod.CREDIT_CARD,
        TEST_TRANSACTION_ID,
        new Date(),
      );
      processPaymentUseCase.execute.mockResolvedValue(output);

      // When
      await controller.processPayment(requestDto, 'false');

      // Then
      expect(processPaymentUseCase.execute).toHaveBeenCalledWith(
        expect.anything(),
        false, // testFail = false
      );
    });

    it('X-Test-Fail 헤더가 없을 경우 testFail을 false로 전달해야 함', async () => {
      // Given
      const requestDto = new ProcessPaymentRequestDto();
      requestDto.orderId = TEST_ORDER_ID;
      requestDto.paymentMethod = PaymentMethod.CREDIT_CARD;

      const output = new ProcessPaymentOutput(
        TEST_PAYMENT_ID,
        TEST_ORDER_ID,
        TEST_AMOUNT,
        PaymentMethod.CREDIT_CARD,
        TEST_TRANSACTION_ID,
        new Date(),
      );
      processPaymentUseCase.execute.mockResolvedValue(output);

      // When
      await controller.processPayment(requestDto, undefined);

      // Then
      expect(processPaymentUseCase.execute).toHaveBeenCalledWith(
        expect.anything(),
        false, // testFail = false
      );
    });
  });

  describe('예외 처리', () => {
    it('AlreadyPaidException 발생 시 그대로 전파해야 함', async () => {
      // Given
      const requestDto = new ProcessPaymentRequestDto();
      requestDto.orderId = TEST_ORDER_ID;
      requestDto.paymentMethod = PaymentMethod.CREDIT_CARD;

      processPaymentUseCase.execute.mockRejectedValue(
        new AlreadyPaidException(),
      );

      // When & Then
      await expect(controller.processPayment(requestDto)).rejects.toThrow(
        AlreadyPaidException,
      );
    });

    it('OrderExpiredException 발생 시 그대로 전파해야 함', async () => {
      // Given
      const requestDto = new ProcessPaymentRequestDto();
      requestDto.orderId = TEST_ORDER_ID;
      requestDto.paymentMethod = PaymentMethod.CREDIT_CARD;

      processPaymentUseCase.execute.mockRejectedValue(
        new OrderExpiredException(),
      );

      // When & Then
      await expect(controller.processPayment(requestDto)).rejects.toThrow(
        OrderExpiredException,
      );
    });

    it('InvalidOrderStatusException 발생 시 그대로 전파해야 함', async () => {
      // Given
      const requestDto = new ProcessPaymentRequestDto();
      requestDto.orderId = TEST_ORDER_ID;
      requestDto.paymentMethod = PaymentMethod.CREDIT_CARD;

      processPaymentUseCase.execute.mockRejectedValue(
        new InvalidOrderStatusException(),
      );

      // When & Then
      await expect(controller.processPayment(requestDto)).rejects.toThrow(
        InvalidOrderStatusException,
      );
    });

    it('PaymentFailedException 발생 시 그대로 전파해야 함', async () => {
      // Given
      const requestDto = new ProcessPaymentRequestDto();
      requestDto.orderId = TEST_ORDER_ID;
      requestDto.paymentMethod = PaymentMethod.CREDIT_CARD;

      processPaymentUseCase.execute.mockRejectedValue(
        new PaymentFailedException('결제 실패'),
      );

      // When & Then
      await expect(controller.processPayment(requestDto)).rejects.toThrow(
        PaymentFailedException,
      );
    });

    it('일반 예외 발생 시 그대로 전파해야 함', async () => {
      // Given
      const requestDto = new ProcessPaymentRequestDto();
      requestDto.orderId = TEST_ORDER_ID;
      requestDto.paymentMethod = PaymentMethod.CREDIT_CARD;

      const genericError = new Error('예상치 못한 오류');
      processPaymentUseCase.execute.mockRejectedValue(genericError);

      // When & Then
      await expect(controller.processPayment(requestDto)).rejects.toThrow(
        genericError,
      );
    });
  });

  describe('DTO 변환', () => {
    it('ProcessPaymentOutput을 PaymentResponseDto로 변환해야 함', async () => {
      // Given
      const requestDto = new ProcessPaymentRequestDto();
      requestDto.orderId = TEST_ORDER_ID;
      requestDto.paymentMethod = PaymentMethod.CREDIT_CARD;

      const createdAt = new Date('2025-11-18T12:00:00Z');
      const output = new ProcessPaymentOutput(
        TEST_PAYMENT_ID,
        TEST_ORDER_ID,
        TEST_AMOUNT,
        PaymentMethod.CREDIT_CARD,
        TEST_TRANSACTION_ID,
        createdAt,
      );
      processPaymentUseCase.execute.mockResolvedValue(output);

      // When
      const response = await controller.processPayment(requestDto);

      // Then
      expect(response.paymentId).toBe(TEST_PAYMENT_ID);
      expect(response.orderId).toBe(TEST_ORDER_ID);
      expect(response.amount).toBe(TEST_AMOUNT);
      expect(response.paymentMethod).toBe(PaymentMethod.CREDIT_CARD);
      expect(response.transactionId).toBe(TEST_TRANSACTION_ID);
      expect(response.createdAt).toBe(createdAt);
    });
  });
});
