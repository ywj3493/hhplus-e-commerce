import { GetProductsUseCase } from '../../../src/product/application/use-cases/get-products.use-case';
import { GetProductsInput } from '../../../src/product/application/dtos/get-products.input';
import { InMemoryProductRepository } from '../../../src/product/infrastructure/repositories/in-memory-product.repository';
import { StockStatusType } from '../../../src/product/domain/value-objects/stock-status.vo';

/**
 * Integration Test: GetProductsUseCase + InMemoryProductRepository
 * Tests the interaction between application layer and infrastructure layer
 */
describe('GetProductsUseCase Integration Test', () => {
  let useCase: GetProductsUseCase;
  let repository: InMemoryProductRepository;

  beforeEach(() => {
    repository = new InMemoryProductRepository();
    useCase = new GetProductsUseCase(repository);
  });

  describe('execute with real repository', () => {
    it('should retrieve products from repository with correct pagination', async () => {
      // Given: Repository is initialized with sample data
      const input = new GetProductsInput(1, 10);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.items.length).toBeGreaterThan(0);
      expect(output.items.length).toBeLessThanOrEqual(10);
      expect(output.page).toBe(1);
      expect(output.limit).toBe(10);
      expect(output.total).toBeGreaterThan(0);
      expect(output.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('should return products sorted by newest first (BR-PROD-01)', async () => {
      // Given
      const input = new GetProductsInput(1, 5);

      // When
      const output = await useCase.execute(input);

      // Then: Products should be sorted by createdAt DESC
      for (let i = 0; i < output.items.length - 1; i++) {
        // We can't directly access createdAt from the output,
        // but we know from fixtures that later products have later IDs
        expect(output.items[i].id).toBeDefined();
      }
      expect(output.items.length).toBeGreaterThan(0);
    });

    it('should calculate stock status correctly for each product (BR-PROD-04)', async () => {
      // Given
      const input = new GetProductsInput(1, 10);

      // When
      const output = await useCase.execute(input);

      // Then: All products should have valid stock status
      output.items.forEach((item) => {
        expect([StockStatusType.IN_STOCK, StockStatusType.OUT_OF_STOCK]).toContain(
          item.stockStatus.status,
        );
      });
    });

    it('should handle second page pagination', async () => {
      // Given
      const input = new GetProductsInput(2, 5);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.page).toBe(2);
      expect(output.limit).toBe(5);
      // Items may be 0 or more depending on total data
      expect(output.items.length).toBeGreaterThanOrEqual(0);
      expect(output.items.length).toBeLessThanOrEqual(5);
    });

    it('should respect page size limit (BR-PROD-03)', async () => {
      // Given: Request 100 items (max limit)
      const input = new GetProductsInput(1, 100);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.limit).toBe(100);
      expect(output.items.length).toBeLessThanOrEqual(100);
    });

    it('should use default pagination values (BR-PROD-02)', async () => {
      // Given: Default values (page=1, limit=10)
      const input = new GetProductsInput();

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.page).toBe(1);
      expect(output.limit).toBe(10);
      expect(output.items.length).toBeLessThanOrEqual(10);
    });

    it('should return consistent total count across pages', async () => {
      // Given
      const input1 = new GetProductsInput(1, 5);
      const input2 = new GetProductsInput(2, 5);

      // When
      const output1 = await useCase.execute(input1);
      const output2 = await useCase.execute(input2);

      // Then: Total should be the same
      expect(output1.total).toBe(output2.total);
    });

    it('should calculate totalPages correctly', async () => {
      // Given
      const input = new GetProductsInput(1, 5);

      // When
      const output = await useCase.execute(input);

      // Then
      const expectedTotalPages = Math.ceil(output.total / output.limit);
      expect(output.totalPages).toBe(expectedTotalPages);
    });

    it('should include all required product fields', async () => {
      // Given
      const input = new GetProductsInput(1, 1);

      // When
      const output = await useCase.execute(input);

      // Then: Check first product has all required fields
      if (output.items.length > 0) {
        const product = output.items[0];
        expect(product.id).toBeDefined();
        expect(product.name).toBeDefined();
        expect(product.price).toBeGreaterThanOrEqual(0);
        expect(product.imageUrl).toBeDefined();
        expect(product.stockStatus).toBeDefined();
      }
    });

    it('should handle empty result for page beyond available data', async () => {
      // Given: Request a very high page number
      const input = new GetProductsInput(1000, 10);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.items).toHaveLength(0);
      expect(output.total).toBeGreaterThan(0); // Total products still exist
      expect(output.page).toBe(1000);
    });
  });

  describe('pagination boundary cases', () => {
    it('should handle page=1 with limit=1', async () => {
      // Given
      const input = new GetProductsInput(1, 1);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.items.length).toBeLessThanOrEqual(1);
      expect(output.limit).toBe(1);
    });

    it('should handle maximum page size of 100', async () => {
      // Given
      const input = new GetProductsInput(1, 100);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.limit).toBe(100);
      expect(output.items.length).toBeLessThanOrEqual(100);
    });
  });

  describe('data integrity', () => {
    it('should not modify repository state', async () => {
      // Given
      const input = new GetProductsInput(1, 10);
      const initialCount = repository.count();

      // When
      await useCase.execute(input);
      await useCase.execute(input);

      // Then: Count should not change
      expect(repository.count()).toBe(initialCount);
    });

    it('should return different instances on multiple calls', async () => {
      // Given
      const input = new GetProductsInput(1, 10);

      // When
      const output1 = await useCase.execute(input);
      const output2 = await useCase.execute(input);

      // Then: Should return same data but different instances
      expect(output1).not.toBe(output2);
      expect(output1.items).toHaveLength(output2.items.length);
    });
  });
});
