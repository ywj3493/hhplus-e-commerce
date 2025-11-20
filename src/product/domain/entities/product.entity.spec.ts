import { Product } from '@/product/domain/entities/product.entity';
import { ProductOption } from '@/product/domain/entities/product-option.entity';
import { Stock } from '@/product/domain/entities/stock.entity';
import { Money } from '@/product/domain/entities/money.vo';
import { StockStatusType } from '@/product/domain/entities/stock-status.vo';

describe('Product', () => {
  const createTestProduct = (options: ProductOption[] = []): Product => {
    return Product.create(
      'product-1',
      'Test Product',
      Money.from(10000),
      'Test Description',
      'https://example.com/image.jpg',
      options,
      new Date('2024-01-01'),
      new Date('2024-01-01'),
    );
  };

  const createTestOption = (
    id: string,
    type: string,
    name: string,
    additionalPrice: number,
    availableQuantity: number,
  ): ProductOption => {
    const stock = Stock.create(
      `stock-${id}`,
      id,
      100,
      availableQuantity,
      0,
      100 - availableQuantity,
    );
    return ProductOption.create(
      id,
      'product-1',
      type,
      name,
      Money.from(additionalPrice),
      stock,
    );
  };

  describe('생성', () => {
    it('유효한 파라미터로 Product 인스턴스를 생성해야 함', () => {
      // Given
      const id = 'product-1';
      const name = 'Test Product';
      const price = Money.from(10000);
      const description = 'Test Description';
      const imageUrl = 'https://example.com/image.jpg';
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-01');

      // When
      const product = Product.create(
        id,
        name,
        price,
        description,
        imageUrl,
        [],
        createdAt,
        updatedAt,
      );

      // Then
      expect(product.id).toBe(id);
      expect(product.name).toBe(name);
      expect(product.price).toBe(price);
      expect(product.description).toBe(description);
      expect(product.imageUrl).toBe(imageUrl);
      expect(product.options).toHaveLength(0);
      expect(product.createdAt).toEqual(createdAt);
      expect(product.updatedAt).toEqual(updatedAt);
    });

    it('상품 ID가 비어있을 때 에러를 발생시켜야 함', () => {
      // When & Then
      expect(() =>
        Product.create(
          '',
          'Test',
          Money.from(10000),
          'Desc',
          'https://example.com/image.jpg',
          [],
          new Date(),
          new Date(),
        ),
      ).toThrow('상품 ID는 필수입니다');
    });

    it('상품명이 비어있을 때 에러를 발생시켜야 함', () => {
      // When & Then
      expect(() =>
        Product.create(
          'product-1',
          '',
          Money.from(10000),
          'Desc',
          'https://example.com/image.jpg',
          [],
          new Date(),
          new Date(),
        ),
      ).toThrow('상품명은 필수입니다');
    });

    it('이미지 URL이 비어있을 때 에러를 발생시켜야 함', () => {
      // When & Then
      expect(() =>
        Product.create(
          'product-1',
          'Test',
          Money.from(10000),
          'Desc',
          '',
          [],
          new Date(),
          new Date(),
        ),
      ).toThrow('상품 이미지 URL은 필수입니다');
    });
  });

  describe('재고 상태 조회', () => {
    it('최소 하나의 옵션이 구매 가능할 때 재고 있음 상태를 반환해야 함 (BR-PROD-04)', () => {
      // Given
      const options = [
        createTestOption('option-1', 'Color', 'Red', 0, 10), // 구매 가능
        createTestOption('option-2', 'Color', 'Blue', 0, 0), // 품절
      ];
      const product = createTestProduct(options);

      // When
      const status = product.getStockStatus();

      // Then
      expect(status.status).toBe(StockStatusType.IN_STOCK);
    });

    it('모든 옵션이 품절일 때 품절 상태를 반환해야 함', () => {
      // Given
      const options = [
        createTestOption('option-1', 'Color', 'Red', 0, 0),
        createTestOption('option-2', 'Color', 'Blue', 0, 0),
      ];
      const product = createTestProduct(options);

      // When
      const status = product.getStockStatus();

      // Then
      expect(status.status).toBe(StockStatusType.OUT_OF_STOCK);
    });

    it('상품에 옵션이 없을 때 품절 상태를 반환해야 함', () => {
      // Given
      const product = createTestProduct([]);

      // When
      const status = product.getStockStatus();

      // Then
      expect(status.status).toBe(StockStatusType.OUT_OF_STOCK);
    });
  });

  describe('옵션 그룹화 조회', () => {
    it('옵션을 타입별로 그룹화해야 함 (BR-PROD-05)', () => {
      // Given
      const options = [
        createTestOption('option-1', 'Color', 'Red', 0, 10),
        createTestOption('option-2', 'Color', 'Blue', 0, 5),
        createTestOption('option-3', 'Size', 'S', 0, 0),
        createTestOption('option-4', 'Size', 'M', 0, 20),
        createTestOption('option-5', 'Size', 'L', 1000, 15),
      ];
      const product = createTestProduct(options);

      // When
      const grouped = product.getGroupedOptions();

      // Then
      expect(grouped).toHaveLength(2);

      const colorGroup = grouped.find((g) => g.type === 'Color');
      expect(colorGroup).toBeDefined();
      expect(colorGroup?.options).toHaveLength(2);
      expect(colorGroup?.options.map((o) => o.name)).toEqual(['Red', 'Blue']);

      const sizeGroup = grouped.find((g) => g.type === 'Size');
      expect(sizeGroup).toBeDefined();
      expect(sizeGroup?.options).toHaveLength(3);
      expect(sizeGroup?.options.map((o) => o.name)).toEqual(['S', 'M', 'L']);
    });

    it('각 옵션의 재고 상태를 포함해야 함 (BR-PROD-06)', () => {
      // Given
      const options = [
        createTestOption('option-1', 'Color', 'Red', 0, 10), // 재고 있음
        createTestOption('option-2', 'Color', 'Blue', 0, 0), // 품절
      ];
      const product = createTestProduct(options);

      // When
      const grouped = product.getGroupedOptions();

      // Then
      const colorGroup = grouped.find((g) => g.type === 'Color');
      expect(colorGroup?.options[0].stockStatus.status).toBe(StockStatusType.IN_STOCK);
      expect(colorGroup?.options[1].stockStatus.status).toBe(StockStatusType.OUT_OF_STOCK);
    });

    it('각 옵션의 추가 금액을 포함해야 함', () => {
      // Given
      const options = [
        createTestOption('option-1', 'Size', 'S', 0, 10),
        createTestOption('option-2', 'Size', 'M', 0, 10),
        createTestOption('option-3', 'Size', 'L', 1000, 10),
      ];
      const product = createTestProduct(options);

      // When
      const grouped = product.getGroupedOptions();

      // Then
      const sizeGroup = grouped.find((g) => g.type === 'Size');
      expect(sizeGroup?.options[0].additionalPrice.amount).toBe(0);
      expect(sizeGroup?.options[1].additionalPrice.amount).toBe(0);
      expect(sizeGroup?.options[2].additionalPrice.amount).toBe(1000);
    });

    it('품절된 옵션을 선택 불가로 표시해야 함 (BR-PROD-08)', () => {
      // Given
      const options = [
        createTestOption('option-1', 'Size', 'S', 0, 0), // 품절
        createTestOption('option-2', 'Size', 'M', 0, 10), // 재고 있음
      ];
      const product = createTestProduct(options);

      // When
      const grouped = product.getGroupedOptions();

      // Then
      const sizeGroup = grouped.find((g) => g.type === 'Size');
      expect(sizeGroup?.options[0].isSelectable).toBe(false);
      expect(sizeGroup?.options[1].isSelectable).toBe(true);
    });

    it('상품에 옵션이 없을 때 빈 배열을 반환해야 함', () => {
      // Given
      const product = createTestProduct([]);

      // When
      const grouped = product.getGroupedOptions();

      // Then
      expect(grouped).toHaveLength(0);
    });
  });

  describe('옵션 검색', () => {
    it('ID로 옵션을 찾아야 함', () => {
      // Given
      const options = [
        createTestOption('option-1', 'Color', 'Red', 0, 10),
        createTestOption('option-2', 'Color', 'Blue', 0, 5),
      ];
      const product = createTestProduct(options);

      // When
      const found = product.findOption('option-2');

      // Then
      expect(found).toBeDefined();
      expect(found?.name).toBe('Blue');
    });

    it('옵션을 찾지 못했을 때 undefined를 반환해야 함', () => {
      // Given
      const options = [createTestOption('option-1', 'Color', 'Red', 0, 10)];
      const product = createTestProduct(options);

      // When
      const found = product.findOption('non-existent');

      // Then
      expect(found).toBeUndefined();
    });
  });

  describe('총 가격 계산', () => {
    it('총 가격을 올바르게 계산해야 함 (BR-PROD-07)', () => {
      // Given: 상품 가격 10,000원
      const options = [
        createTestOption('option-1', 'Size', 'L', 1000, 10), // +1,000원
      ];
      const product = createTestProduct(options);
      const quantity = 3;

      // When: (10,000 + 1,000) × 3
      const totalPrice = product.calculateTotalPrice('option-1', quantity);

      // Then: = 33,000원
      expect(totalPrice.amount).toBe(33000);
    });

    it('추가 금액이 없을 때 올바르게 계산해야 함', () => {
      // Given
      const options = [
        createTestOption('option-1', 'Color', 'Red', 0, 10), // +0원
      ];
      const product = createTestProduct(options);
      const quantity = 2;

      // When: (10,000 + 0) × 2
      const totalPrice = product.calculateTotalPrice('option-1', quantity);

      // Then: = 20,000원
      expect(totalPrice.amount).toBe(20000);
    });

    it('존재하지 않는 옵션에 대해 에러를 발생시켜야 함', () => {
      // Given
      const product = createTestProduct([]);

      // When & Then
      expect(() => product.calculateTotalPrice('non-existent', 1)).toThrow(
        '옵션을 찾을 수 없습니다: non-existent',
      );
    });

    it('0 수량에 대해 에러를 발생시켜야 함', () => {
      // Given
      const options = [createTestOption('option-1', 'Color', 'Red', 0, 10)];
      const product = createTestProduct(options);

      // When & Then
      expect(() => product.calculateTotalPrice('option-1', 0)).toThrow(
        '수량은 양수여야 합니다',
      );
    });

    it('음수 수량에 대해 에러를 발생시켜야 함', () => {
      // Given
      const options = [createTestOption('option-1', 'Color', 'Red', 0, 10)];
      const product = createTestProduct(options);

      // When & Then
      expect(() => product.calculateTotalPrice('option-1', -1)).toThrow(
        '수량은 양수여야 합니다',
      );
    });
  });

  describe('옵션 불변성', () => {
    it('불변성 유지를 위해 옵션의 복사본을 반환해야 함', () => {
      // Given
      const options = [createTestOption('option-1', 'Color', 'Red', 0, 10)];
      const product = createTestProduct(options);

      // When
      const retrievedOptions = product.options;
      retrievedOptions.push(createTestOption('option-2', 'Color', 'Blue', 0, 5));

      // Then: 원본 상품 옵션은 수정되지 않아야 함
      expect(product.options).toHaveLength(1);
    });
  });
});
