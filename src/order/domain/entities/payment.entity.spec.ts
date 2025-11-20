import { Payment, PaymentCreateData } from '@/order/domain/entities/payment.entity';
import { PaymentMethod } from '@/order/domain/entities/payment-method.enum';
import { PaymentStatus } from '@/order/domain/entities/payment-status.enum';

describe('Payment Entity', () => {
  describe('생성', () => {
    it('유효한 데이터로 Payment를 생성해야 함', () => {
      // Given
      const createData: PaymentCreateData = {
        orderId: 'order-001',
        userId: 'user-001',
        amount: 10000,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId: 'txn-12345',
      };

      // When
      const payment = Payment.create(createData);

      // Then
      expect(payment.id).toBeDefined();
      expect(payment.orderId).toBe('order-001');
      expect(payment.userId).toBe('user-001');
      expect(payment.amount).toBe(10000);
      expect(payment.paymentMethod).toBe(PaymentMethod.CREDIT_CARD);
      expect(payment.transactionId).toBe('txn-12345');
      expect(payment.createdAt).toBeInstanceOf(Date);
    });

    it('재구성 시 동일한 데이터를 반환해야 함', () => {
      // Given
      const data = {
        id: 'payment-001',
        orderId: 'order-001',
        userId: 'user-001',
        amount: 10000,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId: 'txn-12345',
        status: PaymentStatus.COMPLETED,
        createdAt: new Date('2025-01-01'),
      };

      // When
      const payment = Payment.reconstitute(data);

      // Then
      expect(payment.id).toBe('payment-001');
      expect(payment.orderId).toBe('order-001');
      expect(payment.userId).toBe('user-001');
      expect(payment.amount).toBe(10000);
      expect(payment.paymentMethod).toBe(PaymentMethod.CREDIT_CARD);
      expect(payment.transactionId).toBe('txn-12345');
      expect(payment.status).toBe(PaymentStatus.COMPLETED);
      expect(payment.createdAt).toEqual(new Date('2025-01-01'));
    });
  });

  describe('환불', () => {
    it('완료된 결제를 환불할 수 있어야 함', () => {
      // Given
      const payment = Payment.create({
        orderId: 'order-001',
        userId: 'user-001',
        amount: 10000,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId: 'txn-12345',
      });

      // When
      payment.refund();

      // Then
      expect(payment.status).toBe(PaymentStatus.REFUNDED);
      expect(payment.refundedAt).toBeInstanceOf(Date);
      expect(payment.canRefund()).toBe(false);
    });

    it('이미 환불된 결제는 다시 환불할 수 없어야 함', () => {
      // Given
      const payment = Payment.create({
        orderId: 'order-001',
        userId: 'user-001',
        amount: 10000,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId: 'txn-12345',
      });
      payment.refund();

      // When & Then
      expect(() => payment.refund()).toThrow('이미 환불된 결제입니다.');
    });

    it('생성된 결제는 환불 가능 상태여야 함', () => {
      // Given
      const payment = Payment.create({
        orderId: 'order-001',
        userId: 'user-001',
        amount: 10000,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId: 'txn-12345',
      });

      // Then
      expect(payment.canRefund()).toBe(true);
    });
  });

  describe('입력 검증', () => {
    it('주문 ID가 없으면 에러를 던져야 함', () => {
      // Given
      const createData: PaymentCreateData = {
        orderId: '',
        userId: 'user-001',
        amount: 10000,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId: 'txn-12345',
      };

      // When & Then
      expect(() => Payment.create(createData)).toThrow(
        '주문 ID는 필수입니다.',
      );
    });

    it('사용자 ID가 없으면 에러를 던져야 함', () => {
      // Given
      const createData: PaymentCreateData = {
        orderId: 'order-001',
        userId: '',
        amount: 10000,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId: 'txn-12345',
      };

      // When & Then
      expect(() => Payment.create(createData)).toThrow(
        '사용자 ID는 필수입니다.',
      );
    });

    it('금액이 0 이하이면 에러를 던져야 함', () => {
      // Given
      const createData: PaymentCreateData = {
        orderId: 'order-001',
        userId: 'user-001',
        amount: 0,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId: 'txn-12345',
      };

      // When & Then
      expect(() => Payment.create(createData)).toThrow(
        '결제 금액은 0보다 커야 합니다.',
      );
    });

    it('거래 번호가 없으면 에러를 던져야 함', () => {
      // Given
      const createData: PaymentCreateData = {
        orderId: 'order-001',
        userId: 'user-001',
        amount: 10000,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId: '',
      };

      // When & Then
      expect(() => Payment.create(createData)).toThrow(
        '거래 번호는 필수입니다.',
      );
    });
  });
});
