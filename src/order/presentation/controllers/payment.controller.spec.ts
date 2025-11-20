import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PaymentController } from '@/order/presentation/controllers/payment.controller';
import { PaymentFacadeService } from '@/order/application/facades/payment-facade.service';
import { ProcessPaymentRequestDto } from '@/order/presentation/dtos/process-payment-request.dto';
import { PaymentResponseDto } from '@/order/presentation/dtos/payment-response.dto';
import { PaymentMethod } from '@/order/domain/entities/payment-method.enum';
import { ProcessPaymentOutput } from '@/order/application/dtos/process-payment.dto';
import {
  AlreadyPaidException,
  OrderExpiredException,
  InvalidOrderStatusException,
  PaymentFailedException,
} from '@/order/domain/order.exceptions';

describe('PaymentController', () => {
  let controller: PaymentController;
  let paymentFacadeService: jest.Mocked<PaymentFacadeService>;

  const TEST_USER_ID = 'user-001';
  const TEST_ORDER_ID = 'order-1';
  const TEST_PAYMENT_ID = 'payment-1';
  const TEST_TRANSACTION_ID = 'TXN-12345';
  const TEST_AMOUNT = 45000;

  // Mock request object with authenticated user
  const mockRequest = {
    user: {
      userId: 'user-001',
      name: '테스트 유저 1',
    },
  };

  beforeEach(async () => {
    const mockPaymentFacadeService = {
      processPaymentAndComplete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: PaymentFacadeService,
          useValue: mockPaymentFacadeService,
        },
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn().mockReturnValue({ userId: 'user-001', name: 'Test User' }),
            sign: jest.fn().mockReturnValue('fake-token'),
          },
        },
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
    paymentFacadeService = module.get(PaymentFacadeService);
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
      paymentFacadeService.processPaymentAndComplete.mockResolvedValue(output);

      // When
      const response = await controller.processPayment(requestDto, undefined, mockRequest);

      // Then
      expect(response).toBeInstanceOf(PaymentResponseDto);
      expect(response.paymentId).toBe(TEST_PAYMENT_ID);
      expect(response.orderId).toBe(TEST_ORDER_ID);
      expect(response.amount).toBe(TEST_AMOUNT);
      expect(response.transactionId).toBe(TEST_TRANSACTION_ID);

      expect(paymentFacadeService.processPaymentAndComplete).toHaveBeenCalledWith(
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
      paymentFacadeService.processPaymentAndComplete.mockResolvedValue(output);

      // When
      await controller.processPayment(requestDto, 'true', mockRequest);

      // Then
      expect(paymentFacadeService.processPaymentAndComplete).toHaveBeenCalledWith(
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
      paymentFacadeService.processPaymentAndComplete.mockResolvedValue(output);

      // When
      await controller.processPayment(requestDto, 'false', mockRequest);

      // Then
      expect(paymentFacadeService.processPaymentAndComplete).toHaveBeenCalledWith(
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
      paymentFacadeService.processPaymentAndComplete.mockResolvedValue(output);

      // When
      await controller.processPayment(requestDto, undefined, mockRequest);

      // Then
      expect(paymentFacadeService.processPaymentAndComplete).toHaveBeenCalledWith(
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

      paymentFacadeService.processPaymentAndComplete.mockRejectedValue(
        new AlreadyPaidException(),
      );

      // When & Then
      await expect(controller.processPayment(requestDto, undefined, mockRequest)).rejects.toThrow(
        AlreadyPaidException,
      );
    });

    it('OrderExpiredException 발생 시 그대로 전파해야 함', async () => {
      // Given
      const requestDto = new ProcessPaymentRequestDto();
      requestDto.orderId = TEST_ORDER_ID;
      requestDto.paymentMethod = PaymentMethod.CREDIT_CARD;

      paymentFacadeService.processPaymentAndComplete.mockRejectedValue(
        new OrderExpiredException(),
      );

      // When & Then
      await expect(controller.processPayment(requestDto, undefined, mockRequest)).rejects.toThrow(
        OrderExpiredException,
      );
    });

    it('InvalidOrderStatusException 발생 시 그대로 전파해야 함', async () => {
      // Given
      const requestDto = new ProcessPaymentRequestDto();
      requestDto.orderId = TEST_ORDER_ID;
      requestDto.paymentMethod = PaymentMethod.CREDIT_CARD;

      paymentFacadeService.processPaymentAndComplete.mockRejectedValue(
        new InvalidOrderStatusException(),
      );

      // When & Then
      await expect(controller.processPayment(requestDto, undefined, mockRequest)).rejects.toThrow(
        InvalidOrderStatusException,
      );
    });

    it('PaymentFailedException 발생 시 그대로 전파해야 함', async () => {
      // Given
      const requestDto = new ProcessPaymentRequestDto();
      requestDto.orderId = TEST_ORDER_ID;
      requestDto.paymentMethod = PaymentMethod.CREDIT_CARD;

      paymentFacadeService.processPaymentAndComplete.mockRejectedValue(
        new PaymentFailedException('결제 실패'),
      );

      // When & Then
      await expect(controller.processPayment(requestDto, undefined, mockRequest)).rejects.toThrow(
        PaymentFailedException,
      );
    });

    it('일반 예외 발생 시 그대로 전파해야 함', async () => {
      // Given
      const requestDto = new ProcessPaymentRequestDto();
      requestDto.orderId = TEST_ORDER_ID;
      requestDto.paymentMethod = PaymentMethod.CREDIT_CARD;

      const genericError = new Error('예상치 못한 오류');
      paymentFacadeService.processPaymentAndComplete.mockRejectedValue(genericError);

      // When & Then
      await expect(controller.processPayment(requestDto, undefined, mockRequest)).rejects.toThrow(
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
      paymentFacadeService.processPaymentAndComplete.mockResolvedValue(output);

      // When
      const response = await controller.processPayment(requestDto, undefined, mockRequest);

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
