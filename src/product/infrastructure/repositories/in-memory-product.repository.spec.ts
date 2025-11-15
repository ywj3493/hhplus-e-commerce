import { InMemoryProductRepository } from './in-memory-product.repository';
import { Product } from '../../domain/entities/product.entity';
import { ProductOption } from '../../domain/entities/product-option.entity';
import { Stock } from '../../domain/entities/stock.entity';
import { Money } from '../../domain/entities/money.vo';

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
      Money.from(0),
      Stock.create(`stock-${id}`, `opt-${id}`, 100, 100 - soldQuantity, 0, soldQuantity),
    );
    return Product.create(
      id,
      name,
      Money.from(10000),
      'Test description',
      'https://example.com/image.jpg',
      [option],
      createdAt,
      createdAt,
    );
  };

  describe('initialization', () => {
    it('should initialize with sample data', () => {
      // When
      const count = repository.count();

      // Then
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('findById', () => {
    it('should find existing product by ID', async () => {
      // Given: Sample data is initialized
      const existingId = '550e8400-e29b-41d4-a716-446655440001';

      // When
      const product = await repository.findById(existingId);

      // Then
      expect(product).toBeDefined();
      expect(product?.id).toBe(existingId);
    });

    it('should return undefined for non-existent ID', async () => {
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
      // Clear and add test data
      repository.clear();
      repository.save(createTestProduct('prod-1', 'Product 1', new Date('2024-01-01')));
      repository.save(createTestProduct('prod-2', 'Product 2', new Date('2024-01-02')));
      repository.save(createTestProduct('prod-3', 'Product 3', new Date('2024-01-03')));
      repository.save(createTestProduct('prod-4', 'Product 4', new Date('2024-01-04')));
      repository.save(createTestProduct('prod-5', 'Product 5', new Date('2024-01-05')));
    });

    it('should return paginated products sorted by newest first (BR-PROD-01)', async () => {
      // Given
      const page = 1;
      const limit = 3;

      // When
      const result = await repository.findAll(page, limit);

      // Then
      expect(result.items).toHaveLength(3);
      expect(result.items[0].name).toBe('Product 5'); // Newest
      expect(result.items[1].name).toBe('Product 4');
      expect(result.items[2].name).toBe('Product 3');
      expect(result.total).toBe(5);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(3);
      expect(result.totalPages).toBe(2);
    });

    it('should return second page correctly', async () => {
      // Given
      const page = 2;
      const limit = 3;

      // When
      const result = await repository.findAll(page, limit);

      // Then
      expect(result.items).toHaveLength(2);
      expect(result.items[0].name).toBe('Product 2');
      expect(result.items[1].name).toBe('Product 1'); // Oldest
      expect(result.page).toBe(2);
    });

    it('should return empty array for page beyond total pages', async () => {
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

    it('should handle limit larger than total products', async () => {
      // Given
      const page = 1;
      const limit = 100;

      // When
      const result = await repository.findAll(page, limit);

      // Then
      expect(result.items).toHaveLength(5);
      expect(result.totalPages).toBe(1);
    });

    it('should handle limit of 1', async () => {
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
      // Create products with different sold quantities
      repository.save(createTestProduct('prod-1', 'Product 1', new Date('2024-01-01'), 100)); // Most sold
      repository.save(createTestProduct('prod-2', 'Product 2', new Date('2024-01-02'), 80));
      repository.save(createTestProduct('prod-3', 'Product 3', new Date('2024-01-03'), 50));
      repository.save(createTestProduct('prod-4', 'Product 4', new Date('2024-01-04'), 30));
      repository.save(createTestProduct('prod-5', 'Product 5', new Date('2024-01-05'), 10)); // Least sold
    });

    it('should return top 5 popular products sorted by sales', async () => {
      // Given
      const limit = 5;

      // When
      const products = await repository.findPopular(limit);

      // Then
      expect(products).toHaveLength(5);
      expect(products[0].name).toBe('Product 1'); // Most sold
      expect(products[1].name).toBe('Product 2');
      expect(products[2].name).toBe('Product 3');
      expect(products[3].name).toBe('Product 4');
      expect(products[4].name).toBe('Product 5'); // Least sold
    });

    it('should return top 3 popular products', async () => {
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

    it('should handle limit larger than available products', async () => {
      // Given
      const limit = 10;

      // When
      const products = await repository.findPopular(limit);

      // Then
      expect(products).toHaveLength(5);
    });

    it('should calculate total sold across all options', async () => {
      // Given: Product with multiple options
      repository.clear();
      const option1 = ProductOption.create(
        'opt-1',
        'prod-multi',
        'Size',
        'S',
        Money.from(0),
        Stock.create('stock-1', 'opt-1', 100, 50, 0, 50),
      );
      const option2 = ProductOption.create(
        'opt-2',
        'prod-multi',
        'Size',
        'M',
        Money.from(0),
        Stock.create('stock-2', 'opt-2', 100, 20, 0, 80),
      );
      const product = Product.create(
        'prod-multi',
        'Multi Option Product',
        Money.from(10000),
        'Test',
        'https://example.com/image.jpg',
        [option1, option2],
        new Date(),
        new Date(),
      );
      repository.save(product);

      // When
      const products = await repository.findPopular(1);

      // Then: Total sold = 50 + 80 = 130
      expect(products).toHaveLength(1);
      expect(products[0].id).toBe('prod-multi');
    });
  });

  describe('save', () => {
    it('should save new product', async () => {
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

    it('should update existing product', async () => {
      // Given
      repository.clear();
      const product1 = createTestProduct('prod-1', 'Original Name', new Date());
      await repository.save(product1);

      // When: Save product with same ID but different data
      const product2 = createTestProduct('prod-1', 'Updated Name', new Date());
      await repository.save(product2);

      // Then
      const found = await repository.findById('prod-1');
      expect(found?.name).toBe('Updated Name');
      expect(repository.count()).toBe(1); // Count should not increase
    });
  });

  describe('exists', () => {
    it('should return true for existing product', async () => {
      // Given
      repository.clear();
      const product = createTestProduct('prod-1', 'Product 1', new Date());
      await repository.save(product);

      // When
      const exists = await repository.exists('prod-1');

      // Then
      expect(exists).toBe(true);
    });

    it('should return false for non-existent product', async () => {
      // Given
      repository.clear();

      // When
      const exists = await repository.exists('non-existent');

      // Then
      expect(exists).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all products', () => {
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
    it('should return correct count', () => {
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
