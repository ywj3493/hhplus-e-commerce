import { Payment } from '@/order/domain/entities/payment.entity';
import { PaymentMethod } from '@/order/domain/entities/payment-method.enum';
import { InMemoryPaymentRepository } from '@/order/infrastructure/repositories/in-memory-payment.repository';

describe('InMemoryPaymentRepository', () => {
  let repository: InMemoryPaymentRepository;

  beforeEach(() => {
    repository = new InMemoryPaymentRepository();
  });

  describe('save', () => {
    it('Payment를 저장하고 반환해야 함', async () => {
      // Given
      const payment = Payment.create({
        orderId: 'order-001',
        userId: 'user-001',
        amount: 10000,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId: 'txn-12345',
      });

      // When
      const savedPayment = await repository.save(payment);

      // Then
      expect(savedPayment.id).toBe(payment.id);
      expect(savedPayment.orderId).toBe('order-001');
      expect(savedPayment.userId).toBe('user-001');
      expect(savedPayment.amount).toBe(10000);
    });

    it('동일 ID로 재저장 시 덮어써야 함', async () => {
      // Given
      const payment = Payment.create({
        orderId: 'order-001',
        userId: 'user-001',
        amount: 10000,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId: 'txn-12345',
      });

      // When
      await repository.save(payment);
      const updatedPayment = await repository.save(payment);

      // Then
      const allPayments = repository.findAll();
      expect(allPayments).toHaveLength(1);
      expect(updatedPayment.id).toBe(payment.id);
    });
  });

  describe('findById', () => {
    it('ID로 Payment를 조회해야 함', async () => {
      // Given
      const payment = Payment.create({
        orderId: 'order-001',
        userId: 'user-001',
        amount: 10000,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId: 'txn-12345',
      });
      await repository.save(payment);

      // When
      const found = await repository.findById(payment.id);

      // Then
      expect(found).not.toBeNull();
      expect(found?.id).toBe(payment.id);
      expect(found?.orderId).toBe('order-001');
    });

    it('존재하지 않는 ID는 null을 반환해야 함', async () => {
      // When
      const found = await repository.findById('non-existing-id');

      // Then
      expect(found).toBeNull();
    });
  });

  describe('findByOrderId', () => {
    it('주문 ID로 Payment를 조회해야 함', async () => {
      // Given
      const payment = Payment.create({
        orderId: 'order-001',
        userId: 'user-001',
        amount: 10000,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId: 'txn-12345',
      });
      await repository.save(payment);

      // When
      const found = await repository.findByOrderId('order-001');

      // Then
      expect(found).not.toBeNull();
      expect(found?.orderId).toBe('order-001');
      expect(found?.id).toBe(payment.id);
    });

    it('존재하지 않는 주문 ID는 null을 반환해야 함', async () => {
      // When
      const found = await repository.findByOrderId('non-existing-order');

      // Then
      expect(found).toBeNull();
    });
  });

  describe('불변성 보장', () => {
    it('저장 후 원본 객체 수정이 저장소에 영향을 주지 않아야 함', async () => {
      // Given
      const payment = Payment.create({
        orderId: 'order-001',
        userId: 'user-001',
        amount: 10000,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId: 'txn-12345',
      });
      await repository.save(payment);

      // When: 조회 후 원본을 수정해도 저장소는 영향받지 않음
      const found = await repository.findById(payment.id);
      expect(found).not.toBeNull();

      // 원본을 다시 조회하면 변경되지 않은 값이어야 함
      const refetched = await repository.findById(payment.id);
      expect(refetched?.orderId).toBe('order-001');
    });
  });

  describe('Test Helpers', () => {
    it('clear는 모든 데이터를 삭제해야 함', async () => {
      // Given
      const payment1 = Payment.create({
        orderId: 'order-001',
        userId: 'user-001',
        amount: 10000,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId: 'txn-1',
      });
      const payment2 = Payment.create({
        orderId: 'order-002',
        userId: 'user-002',
        amount: 20000,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId: 'txn-2',
      });
      await repository.save(payment1);
      await repository.save(payment2);

      // When
      repository.clear();

      // Then
      const allPayments = repository.findAll();
      expect(allPayments).toHaveLength(0);
    });

    it('seed는 테스트 데이터를 초기화해야 함', () => {
      // Given
      const payments = [
        Payment.create({
          orderId: 'order-001',
          userId: 'user-001',
          amount: 10000,
          paymentMethod: PaymentMethod.CREDIT_CARD,
          transactionId: 'txn-1',
        }),
        Payment.create({
          orderId: 'order-002',
          userId: 'user-002',
          amount: 20000,
          paymentMethod: PaymentMethod.CREDIT_CARD,
          transactionId: 'txn-2',
        }),
      ];

      // When
      repository.seed(payments);

      // Then
      const allPayments = repository.findAll();
      expect(allPayments).toHaveLength(2);
    });
  });
});
