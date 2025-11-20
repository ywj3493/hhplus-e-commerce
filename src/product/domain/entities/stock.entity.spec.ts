import { Stock } from '@/product/domain/entities/stock.entity';
import { StockStatusType } from '@/product/domain/entities/stock-status.vo';

describe('Stock', () => {
  describe('생성', () => {
    it('유효한 파라미터로 Stock 인스턴스를 생성해야 함', () => {
      // Given
      const id = 'stock-1';
      const productOptionId = 'option-1';
      const totalQuantity = 100;
      const availableQuantity = 80;
      const reservedQuantity = 10;
      const soldQuantity = 10;

      // When
      const stock = Stock.create(
        id,
        productOptionId,
        totalQuantity,
        availableQuantity,
        reservedQuantity,
        soldQuantity,
      );

      // Then
      expect(stock.id).toBe(id);
      expect(stock.productOptionId).toBe(productOptionId);
      expect(stock.totalQuantity).toBe(100);
      expect(stock.availableQuantity).toBe(80);
      expect(stock.reservedQuantity).toBe(10);
      expect(stock.soldQuantity).toBe(10);
    });

    it('각 재고 수량의 합이 총 재고를 초과할 때 에러를 발생시켜야 함', () => {
      // Given
      const id = 'stock-1';
      const productOptionId = 'option-1';
      const totalQuantity = 100;
      const availableQuantity = 80;
      const reservedQuantity = 20;
      const soldQuantity = 20; // 80 + 20 + 20 = 120 > 100

      // When & Then
      expect(() =>
        Stock.create(
          id,
          productOptionId,
          totalQuantity,
          availableQuantity,
          reservedQuantity,
          soldQuantity,
        ),
      ).toThrow('가용, 예약, 판매 재고의 합은 총 재고를 초과할 수 없습니다');
    });

    it('음수 총 재고 수량에 대해 에러를 발생시켜야 함', () => {
      // Given
      const id = 'stock-1';
      const productOptionId = 'option-1';
      const totalQuantity = -1;

      // When & Then
      expect(() =>
        Stock.create(id, productOptionId, totalQuantity, 0, 0, 0),
      ).toThrow('총 재고 수량은 음수일 수 없습니다');
    });

    it('음수 가용 재고 수량에 대해 에러를 발생시켜야 함', () => {
      // Given
      const id = 'stock-1';
      const productOptionId = 'option-1';

      // When & Then
      expect(() =>
        Stock.create(id, productOptionId, 100, -1, 0, 0),
      ).toThrow('가용 재고 수량은 음수일 수 없습니다');
    });
  });

  describe('초기화', () => {
    it('모든 수량이 가용 상태인 초기 재고를 생성해야 함', () => {
      // Given
      const id = 'stock-1';
      const productOptionId = 'option-1';
      const totalQuantity = 100;

      // When
      const stock = Stock.initialize(id, productOptionId, totalQuantity);

      // Then
      expect(stock.totalQuantity).toBe(100);
      expect(stock.availableQuantity).toBe(100);
      expect(stock.reservedQuantity).toBe(0);
      expect(stock.soldQuantity).toBe(0);
    });
  });

  describe('재고 상태 조회', () => {
    it('가용 수량이 0보다 클 때 재고 있음 상태를 반환해야 함', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 50, 0, 0);

      // When
      const status = stock.getStatus();

      // Then
      expect(status.status).toBe(StockStatusType.IN_STOCK);
    });

    it('가용 수량이 0일 때 품절 상태를 반환해야 함', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 0, 50, 50);

      // When
      const status = stock.getStatus();

      // Then
      expect(status.status).toBe(StockStatusType.OUT_OF_STOCK);
    });
  });

  describe('가용 여부 확인', () => {
    it('가용 수량이 0보다 클 때 true를 반환해야 함', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 50, 0, 0);

      // When
      const result = stock.isAvailable();

      // Then
      expect(result).toBe(true);
    });

    it('가용 수량이 0일 때 false를 반환해야 함', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 0, 50, 50);

      // When
      const result = stock.isAvailable();

      // Then
      expect(result).toBe(false);
    });
  });

  describe('재고 예약', () => {
    it('재고를 성공적으로 예약해야 함', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 100, 0, 0);
      const reserveQuantity = 10;

      // When
      stock.reserve(reserveQuantity);

      // Then
      expect(stock.availableQuantity).toBe(90);
      expect(stock.reservedQuantity).toBe(10);
    });

    it('예약 수량이 가용 수량을 초과할 때 에러를 발생시켜야 함', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 50, 0, 0);
      const reserveQuantity = 60;

      // When & Then
      expect(() => stock.reserve(reserveQuantity)).toThrow('가용 재고가 부족합니다');
    });

    it('0 수량에 대해 에러를 발생시켜야 함', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 50, 0, 0);

      // When & Then
      expect(() => stock.reserve(0)).toThrow('예약 수량은 양수여야 합니다');
    });

    it('음수 수량에 대해 에러를 발생시켜야 함', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 50, 0, 0);

      // When & Then
      expect(() => stock.reserve(-1)).toThrow('예약 수량은 양수여야 합니다');
    });
  });

  describe('예약 복원', () => {
    it('예약된 재고를 성공적으로 복원해야 함', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 80, 20, 0);
      const restoreQuantity = 10;

      // When
      stock.restoreReserved(restoreQuantity);

      // Then
      expect(stock.availableQuantity).toBe(90);
      expect(stock.reservedQuantity).toBe(10);
    });

    it('복원 수량이 예약 수량을 초과할 때 에러를 발생시켜야 함', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 80, 20, 0);
      const restoreQuantity = 30;

      // When & Then
      expect(() => stock.restoreReserved(restoreQuantity)).toThrow(
        '복원 수량이 예약 수량을 초과합니다',
      );
    });

    it('0 수량에 대해 에러를 발생시켜야 함', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 80, 20, 0);

      // When & Then
      expect(() => stock.restoreReserved(0)).toThrow('복원 수량은 양수여야 합니다');
    });
  });

  describe('판매 처리', () => {
    it('예약된 재고를 판매 완료 상태로 성공적으로 전환해야 함', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 80, 20, 0);
      const sellQuantity = 10;

      // When
      stock.sell(sellQuantity);

      // Then
      expect(stock.reservedQuantity).toBe(10);
      expect(stock.soldQuantity).toBe(10);
      expect(stock.availableQuantity).toBe(80);
    });

    it('판매 수량이 예약 수량을 초과할 때 에러를 발생시켜야 함', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 80, 20, 0);
      const sellQuantity = 30;

      // When & Then
      expect(() => stock.sell(sellQuantity)).toThrow('판매 수량이 예약 수량을 초과합니다');
    });

    it('0 수량에 대해 에러를 발생시켜야 함', () => {
      // Given
      const stock = Stock.create('stock-1', 'option-1', 100, 80, 20, 0);

      // When & Then
      expect(() => stock.sell(0)).toThrow('판매 수량은 양수여야 합니다');
    });
  });

  describe('재고 흐름 시나리오', () => {
    it('완전한 주문 흐름을 처리해야 함: 예약 -> 판매', () => {
      // Given: 초기 재고
      const stock = Stock.initialize('stock-1', 'option-1', 100);
      expect(stock.availableQuantity).toBe(100);

      // When: 고객이 10개 예약
      stock.reserve(10);

      // Then: 가용 재고 감소, 예약 재고 증가
      expect(stock.availableQuantity).toBe(90);
      expect(stock.reservedQuantity).toBe(10);

      // When: 결제 완료, 판매로 전환
      stock.sell(10);

      // Then: 예약이 판매로 전환됨
      expect(stock.availableQuantity).toBe(90);
      expect(stock.reservedQuantity).toBe(0);
      expect(stock.soldQuantity).toBe(10);
    });

    it('주문 취소를 처리해야 함: 예약 -> 복원', () => {
      // Given: 초기 재고
      const stock = Stock.initialize('stock-1', 'option-1', 100);

      // When: 고객이 10개 예약
      stock.reserve(10);
      expect(stock.availableQuantity).toBe(90);
      expect(stock.reservedQuantity).toBe(10);

      // When: 주문 취소, 예약 복원
      stock.restoreReserved(10);

      // Then: 재고가 가용 상태로 복원됨
      expect(stock.availableQuantity).toBe(100);
      expect(stock.reservedQuantity).toBe(0);
      expect(stock.soldQuantity).toBe(0);
    });
  });
});
