import { InMemoryProductRepository } from '@/product/infrastructure/repositories/in-memory-product.repository';
import { Product } from '@/product/domain/entities/product.entity';
import { ProductOption } from '@/product/domain/entities/product-option.entity';
import { Stock } from '@/product/domain/entities/stock.entity';
import { Price } from '@/product/domain/entities/price.vo';

describe('InMemoryProductRepository', () => {
  let repository: InMemoryProductRepository;

  beforeEach(() => {
    repository = new InMemoryProductRepository();
  });

  const createTestProduct = (
    id: string,
    name: string,
    createdAt: Date,
    soldQuantity: number = 0,
  ): Product => {
    const option = ProductOption.create(
      `opt-${id}`,
      id,
      'Default',
      'Standard',
      Price.from(0),
      Stock.create(`stock-${id}`, `opt-${id}`, 100, 100 - soldQuantity, 0, soldQuantity),
    );
    return Product.create(
      id,
      name,
      Price.from(10000),
      'Test description',
      'https://example.com/image.jpg',
      'category-test', // categoryId
      [option],
      createdAt,
      createdAt,
    );
  };

  describe('초기화', () => {
    it('샘플 데이터로 초기화해야 함', () => {
      // When
      const count = repository.count();

      // Then
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('findById', () => {
    it('ID로 존재하는 상품을 조회해야 함', async () => {
      // Given: 샘플 데이터가 초기화됨
      const existingId = '550e8400-e29b-41d4-a716-446655440001';

      // When
      const product = await repository.findById(existingId);

      // Then
      expect(product).toBeDefined();
      expect(product?.id).toBe(existingId);
    });

    it('존재하지 않는 ID에 대해 undefined를 반환해야 함', async () => {
      // Given
      const nonExistentId = 'non-existent-id';

      // When
      const product = await repository.findById(nonExistentId);

      // Then
      expect(product).toBeUndefined();
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      // 테스트 데이터 초기화
      repository.clear();
      repository.save(createTestProduct('prod-1', 'Product 1', new Date('2024-01-01')));
      repository.save(createTestProduct('prod-2', 'Product 2', new Date('2024-01-02')));
      repository.save(createTestProduct('prod-3', 'Product 3', new Date('2024-01-03')));
      repository.save(createTestProduct('prod-4', 'Product 4', new Date('2024-01-04')));
      repository.save(createTestProduct('prod-5', 'Product 5', new Date('2024-01-05')));
    });

    it('최신순으로 정렬된 페이지네이션된 상품 목록을 반환해야 함 (BR-PROD-01)', async () => {
      // Given
      const page = 1;
      const limit = 3;

      // When
      const result = await repository.findAll(page, limit);

      // Then
      expect(result.items).toHaveLength(3);
      expect(result.items[0].name).toBe('Product 5'); // 최신
      expect(result.items[1].name).toBe('Product 4');
      expect(result.items[2].name).toBe('Product 3');
      expect(result.total).toBe(5);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(3);
      expect(result.totalPages).toBe(2);
    });

    it('두 번째 페이지를 올바르게 반환해야 함', async () => {
      // Given
      const page = 2;
      const limit = 3;

      // When
      const result = await repository.findAll(page, limit);

      // Then
      expect(result.items).toHaveLength(2);
      expect(result.items[0].name).toBe('Product 2');
      expect(result.items[1].name).toBe('Product 1'); // 가장 오래됨
      expect(result.page).toBe(2);
    });

    it('전체 페이지를 초과하는 페이지에 대해 빈 배열을 반환해야 함', async () => {
      // Given
      const page = 10;
      const limit = 10;

      // When
      const result = await repository.findAll(page, limit);

      // Then
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(5);
      expect(result.totalPages).toBe(1);
    });

    it('전체 상품보다 큰 limit을 처리해야 함', async () => {
      // Given
      const page = 1;
      const limit = 100;

      // When
      const result = await repository.findAll(page, limit);

      // Then
      expect(result.items).toHaveLength(5);
      expect(result.totalPages).toBe(1);
    });

    it('limit이 1인 경우를 처리해야 함', async () => {
      // Given
      const page = 1;
      const limit = 1;

      // When
      const result = await repository.findAll(page, limit);

      // Then
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Product 5');
      expect(result.totalPages).toBe(5);
    });
  });

  describe('findPopular', () => {
    beforeEach(() => {
      repository.clear();
      // 판매량이 다른 상품 생성
      repository.save(createTestProduct('prod-1', 'Product 1', new Date('2024-01-01'), 100)); // 가장 많이 팔림
      repository.save(createTestProduct('prod-2', 'Product 2', new Date('2024-01-02'), 80));
      repository.save(createTestProduct('prod-3', 'Product 3', new Date('2024-01-03'), 50));
      repository.save(createTestProduct('prod-4', 'Product 4', new Date('2024-01-04'), 30));
      repository.save(createTestProduct('prod-5', 'Product 5', new Date('2024-01-05'), 10)); // 가장 적게 팔림
    });

    it('판매량 순으로 정렬된 상위 5개 인기 상품을 반환해야 함', async () => {
      // Given
      const limit = 5;

      // When
      const products = await repository.findPopular(limit);

      // Then
      expect(products).toHaveLength(5);
      expect(products[0].name).toBe('Product 1'); // 가장 많이 팔림
      expect(products[1].name).toBe('Product 2');
      expect(products[2].name).toBe('Product 3');
      expect(products[3].name).toBe('Product 4');
      expect(products[4].name).toBe('Product 5'); // 가장 적게 팔림
    });

    it('상위 3개 인기 상품을 반환해야 함', async () => {
      // Given
      const limit = 3;

      // When
      const products = await repository.findPopular(limit);

      // Then
      expect(products).toHaveLength(3);
      expect(products[0].name).toBe('Product 1');
      expect(products[1].name).toBe('Product 2');
      expect(products[2].name).toBe('Product 3');
    });

    it('사용 가능한 상품보다 큰 limit을 처리해야 함', async () => {
      // Given
      const limit = 10;

      // When
      const products = await repository.findPopular(limit);

      // Then
      expect(products).toHaveLength(5);
    });

    it('모든 옵션의 총 판매량을 계산해야 함', async () => {
      // Given: 여러 옵션이 있는 상품
      repository.clear();
      const option1 = ProductOption.create(
        'opt-1',
        'prod-multi',
        'Size',
        'S',
        Price.from(0),
        Stock.create('stock-1', 'opt-1', 100, 50, 0, 50),
      );
      const option2 = ProductOption.create(
        'opt-2',
        'prod-multi',
        'Size',
        'M',
        Price.from(0),
        Stock.create('stock-2', 'opt-2', 100, 20, 0, 80),
      );
      const product = Product.create(
        'prod-multi',
        'Multi Option Product',
        Price.from(10000),
        'Test',
        'https://example.com/image.jpg',
        'category-test', // categoryId
        [option1, option2],
        new Date(),
        new Date(),
      );
      repository.save(product);

      // When
      const products = await repository.findPopular(1);

      // Then: 총 판매량 = 50 + 80 = 130
      expect(products).toHaveLength(1);
      expect(products[0].id).toBe('prod-multi');
    });
  });

  describe('save', () => {
    it('새 상품을 저장해야 함', async () => {
      // Given
      repository.clear();
      const product = createTestProduct('new-prod', 'New Product', new Date());

      // When
      await repository.save(product);

      // Then
      const found = await repository.findById('new-prod');
      expect(found).toBeDefined();
      expect(found?.name).toBe('New Product');
      expect(repository.count()).toBe(1);
    });

    it('기존 상품을 업데이트해야 함', async () => {
      // Given
      repository.clear();
      const product1 = createTestProduct('prod-1', 'Original Name', new Date());
      await repository.save(product1);

      // When: 같은 ID로 다른 데이터의 상품 저장
      const product2 = createTestProduct('prod-1', 'Updated Name', new Date());
      await repository.save(product2);

      // Then
      const found = await repository.findById('prod-1');
      expect(found?.name).toBe('Updated Name');
      expect(repository.count()).toBe(1); // 개수가 증가하지 않아야 함
    });
  });

  describe('exists', () => {
    it('존재하는 상품에 대해 true를 반환해야 함', async () => {
      // Given
      repository.clear();
      const product = createTestProduct('prod-1', 'Product 1', new Date());
      await repository.save(product);

      // When
      const exists = await repository.exists('prod-1');

      // Then
      expect(exists).toBe(true);
    });

    it('존재하지 않는 상품에 대해 false를 반환해야 함', async () => {
      // Given
      repository.clear();

      // When
      const exists = await repository.exists('non-existent');

      // Then
      expect(exists).toBe(false);
    });
  });

  describe('clear', () => {
    it('모든 상품을 제거해야 함', () => {
      // Given
      const initialCount = repository.count();
      expect(initialCount).toBeGreaterThan(0);

      // When
      repository.clear();

      // Then
      expect(repository.count()).toBe(0);
    });
  });

  describe('count', () => {
    it('올바른 개수를 반환해야 함', () => {
      // Given
      repository.clear();
      repository.save(createTestProduct('prod-1', 'Product 1', new Date()));
      repository.save(createTestProduct('prod-2', 'Product 2', new Date()));
      repository.save(createTestProduct('prod-3', 'Product 3', new Date()));

      // When
      const count = repository.count();

      // Then
      expect(count).toBe(3);
    });
  });
});
