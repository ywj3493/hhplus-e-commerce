import { ProductOption } from './product-option.entity';
import { Stock } from './stock.entity';
import { Money } from './money.vo';
import { StockStatusType } from './stock-status.vo';

describe('ProductOption', () => {
  describe('생성', () => {
    it('유효한 파라미터로 ProductOption 인스턴스를 생성해야 함', () => {
      // Given
      const id = 'option-1';
      const productId = 'product-1';
      const type = 'Color';
      const name = 'Red';
      const additionalPrice = Money.from(0);
      const stock = Stock.initialize('stock-1', 'option-1', 100);

      // When
      const option = ProductOption.create(id, productId, type, name, additionalPrice, stock);

      // Then
      expect(option.id).toBe(id);
      expect(option.productId).toBe(productId);
      expect(option.type).toBe(type);
      expect(option.name).toBe(name);
      expect(option.additionalPrice).toBe(additionalPrice);
      expect(option.stock).toBe(stock);
    });

    it('옵션 ID가 비어있을 때 에러를 발생시켜야 함', () => {
      // Given
      const stock = Stock.initialize('stock-1', 'option-1', 100);
      const additionalPrice = Money.from(0);

      // When & Then
      expect(() =>
        ProductOption.create('', 'product-1', 'Color', 'Red', additionalPrice, stock),
      ).toThrow('옵션 ID는 필수입니다');
    });

    it('상품 ID가 비어있을 때 에러를 발생시켜야 함', () => {
      // Given
      const stock = Stock.initialize('stock-1', 'option-1', 100);
      const additionalPrice = Money.from(0);

      // When & Then
      expect(() =>
        ProductOption.create('option-1', '', 'Color', 'Red', additionalPrice, stock),
      ).toThrow('상품 ID는 필수입니다');
    });

    it('옵션 타입이 비어있을 때 에러를 발생시켜야 함', () => {
      // Given
      const stock = Stock.initialize('stock-1', 'option-1', 100);
      const additionalPrice = Money.from(0);

      // When & Then
      expect(() =>
        ProductOption.create('option-1', 'product-1', '', 'Red', additionalPrice, stock),
      ).toThrow('옵션 타입은 필수입니다');
    });

    it('옵션명이 비어있을 때 에러를 발생시켜야 함', () => {
      // Given
      const stock = Stock.initialize('stock-1', 'option-1', 100);
      const additionalPrice = Money.from(0);

      // When & Then
      expect(() =>
        ProductOption.create('option-1', 'product-1', 'Color', '', additionalPrice, stock),
      ).toThrow('옵션명은 필수입니다');
    });
  });

  describe('가격 계산', () => {
    it('추가 금액이 없을 때 기본 가격을 반환해야 함', () => {
      // Given
      const basePrice = Money.from(10000);
      const additionalPrice = Money.from(0);
      const stock = Stock.initialize('stock-1', 'option-1', 100);
      const option = ProductOption.create(
        'option-1',
        'product-1',
        'Color',
        'Red',
        additionalPrice,
        stock,
      );

      // When
      const totalPrice = option.calculatePrice(basePrice);

      // Then
      expect(totalPrice.amount).toBe(10000);
    });

    it('추가 금액이 있을 때 기본 가격과 추가 금액을 합산해야 함', () => {
      // Given
      const basePrice = Money.from(10000);
      const additionalPrice = Money.from(1000);
      const stock = Stock.initialize('stock-1', 'option-1', 100);
      const option = ProductOption.create(
        'option-1',
        'product-1',
        'Size',
        'L',
        additionalPrice,
        stock,
      );

      // When
      const totalPrice = option.calculatePrice(basePrice);

      // Then
      expect(totalPrice.amount).toBe(11000);
    });
  });

  describe('재고 상태 조회', () => {
    it('재고가 있을 때 재고 있음 상태를 반환해야 함', () => {
      // Given
      const additionalPrice = Money.from(0);
      const stock = Stock.initialize('stock-1', 'option-1', 100);
      const option = ProductOption.create(
        'option-1',
        'product-1',
        'Color',
        'Red',
        additionalPrice,
        stock,
      );

      // When
      const status = option.getStockStatus();

      // Then
      expect(status.status).toBe(StockStatusType.IN_STOCK);
    });

    it('재고가 없을 때 품절 상태를 반환해야 함', () => {
      // Given
      const additionalPrice = Money.from(0);
      const stock = Stock.create('stock-1', 'option-1', 100, 0, 50, 50);
      const option = ProductOption.create(
        'option-1',
        'product-1',
        'Color',
        'Red',
        additionalPrice,
        stock,
      );

      // When
      const status = option.getStockStatus();

      // Then
      expect(status.status).toBe(StockStatusType.OUT_OF_STOCK);
    });
  });

  describe('선택 가능 여부', () => {
    it('재고가 있을 때 true를 반환해야 함 (BR-PROD-08)', () => {
      // Given
      const additionalPrice = Money.from(0);
      const stock = Stock.initialize('stock-1', 'option-1', 100);
      const option = ProductOption.create(
        'option-1',
        'product-1',
        'Color',
        'Red',
        additionalPrice,
        stock,
      );

      // When
      const selectable = option.isSelectable();

      // Then
      expect(selectable).toBe(true);
    });

    it('재고가 없을 때 false를 반환해야 함 (BR-PROD-08)', () => {
      // Given
      const additionalPrice = Money.from(0);
      const stock = Stock.create('stock-1', 'option-1', 100, 0, 50, 50);
      const option = ProductOption.create(
        'option-1',
        'product-1',
        'Size',
        'S',
        additionalPrice,
        stock,
      );

      // When
      const selectable = option.isSelectable();

      // Then
      expect(selectable).toBe(false);
    });
  });

  describe('옵션 종류별 생성', () => {
    it('추가 금액 없이 색상 옵션을 생성해야 함', () => {
      // Given
      const additionalPrice = Money.from(0);
      const stock = Stock.initialize('stock-1', 'option-1', 50);

      // When
      const option = ProductOption.create(
        'option-1',
        'product-1',
        'Color',
        'Blue',
        additionalPrice,
        stock,
      );

      // Then
      expect(option.type).toBe('Color');
      expect(option.name).toBe('Blue');
      expect(option.additionalPrice.amount).toBe(0);
    });

    it('추가 금액과 함께 사이즈 옵션을 생성해야 함', () => {
      // Given
      const additionalPrice = Money.from(1000);
      const stock = Stock.initialize('stock-1', 'option-1', 30);

      // When
      const option = ProductOption.create(
        'option-1',
        'product-1',
        'Size',
        'L',
        additionalPrice,
        stock,
      );

      // Then
      expect(option.type).toBe('Size');
      expect(option.name).toBe('L');
      expect(option.additionalPrice.amount).toBe(1000);
    });
  });
});
