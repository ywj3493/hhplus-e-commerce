import { GetProductDetailUseCase } from '../../../src/product/application/use-cases/get-product-detail.use-case';
import { GetProductDetailInput } from '../../../src/product/application/dtos/get-product-detail.input';
import { InMemoryProductRepository } from '../../../src/product/infrastructure/repositories/in-memory-product.repository';
import { ProductNotFoundException } from '../../../src/product/domain/exceptions/product-not-found.exception';
import { StockStatusType } from '../../../src/product/domain/value-objects/stock-status.vo';

/**
 * Integration Test: GetProductDetailUseCase + InMemoryProductRepository
 * Tests the interaction between application layer and infrastructure layer
 */
describe('GetProductDetailUseCase Integration Test', () => {
  let useCase: GetProductDetailUseCase;
  let repository: InMemoryProductRepository;

  beforeEach(() => {
    repository = new InMemoryProductRepository();
    useCase = new GetProductDetailUseCase(repository);
  });

  describe('execute with real repository', () => {
    it('should retrieve product detail from repository', async () => {
      // Given: Use a product ID that exists in fixtures
      const productId = '550e8400-e29b-41d4-a716-446655440001'; // Basic T-Shirt
      const input = new GetProductDetailInput(productId);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.id).toBe(productId);
      expect(output.name).toBe('Basic T-Shirt');
      expect(output.price.amount).toBe(29000);
      expect(output.description).toBeDefined();
      expect(output.imageUrl).toBeDefined();
      expect(output.optionGroups).toBeDefined();
    });

    it('should group options by type correctly (BR-PROD-05)', async () => {
      // Given: Product with Color options (Basic T-Shirt)
      const productId = '550e8400-e29b-41d4-a716-446655440001';
      const input = new GetProductDetailInput(productId);

      // When
      const output = await useCase.execute(input);

      // Then
      const colorGroup = output.optionGroups.find((g) => g.type === 'Color');
      expect(colorGroup).toBeDefined();
      expect(colorGroup?.options.length).toBeGreaterThan(0);

      // All options in the group should have the same type
      colorGroup?.options.forEach((opt) => {
        expect(opt.id).toBeDefined();
        expect(opt.name).toBeDefined();
      });
    });

    it('should include stock status for each option (BR-PROD-06)', async () => {
      // Given: Product with multiple options
      const productId = '550e8400-e29b-41d4-a716-446655440001';
      const input = new GetProductDetailInput(productId);

      // When
      const output = await useCase.execute(input);

      // Then: All options should have stock status
      output.optionGroups.forEach((group) => {
        group.options.forEach((opt) => {
          expect([StockStatusType.IN_STOCK, StockStatusType.OUT_OF_STOCK]).toContain(
            opt.stockStatus.status,
          );
        });
      });
    });

    it('should mark out-of-stock options as not selectable (BR-PROD-08)', async () => {
      // Given: Product 1 has Navy color which is out of stock
      const productId = '550e8400-e29b-41d4-a716-446655440001';
      const input = new GetProductDetailInput(productId);

      // When
      const output = await useCase.execute(input);

      // Then
      const colorGroup = output.optionGroups.find((g) => g.type === 'Color');
      const navyOption = colorGroup?.options.find((o) => o.name === 'Navy');

      if (navyOption) {
        expect(navyOption.stockStatus.status).toBe(StockStatusType.OUT_OF_STOCK);
        expect(navyOption.isSelectable).toBe(false);
      }

      // White and Black should be in stock and selectable
      const whiteOption = colorGroup?.options.find((o) => o.name === 'White');
      const blackOption = colorGroup?.options.find((o) => o.name === 'Black');

      if (whiteOption) {
        expect(whiteOption.stockStatus.status).toBe(StockStatusType.IN_STOCK);
        expect(whiteOption.isSelectable).toBe(true);
      }

      if (blackOption) {
        expect(blackOption.stockStatus.status).toBe(StockStatusType.IN_STOCK);
        expect(blackOption.isSelectable).toBe(true);
      }
    });

    it('should include additional price for options', async () => {
      // Given: Premium Hoodie has L and XL with additional price
      const productId = '550e8400-e29b-41d4-a716-446655440002';
      const input = new GetProductDetailInput(productId);

      // When
      const output = await useCase.execute(input);

      // Then
      const sizeGroup = output.optionGroups.find((g) => g.type === 'Size');
      expect(sizeGroup).toBeDefined();

      const lOption = sizeGroup?.options.find((o) => o.name === 'L');
      const xlOption = sizeGroup?.options.find((o) => o.name === 'XL');

      if (lOption) {
        expect(lOption.additionalPrice.amount).toBe(2000);
      }
      if (xlOption) {
        expect(xlOption.additionalPrice.amount).toBe(2000);
      }
    });

    it('should throw ProductNotFoundException for non-existent product', async () => {
      // Given
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const input = new GetProductDetailInput(nonExistentId);

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(ProductNotFoundException);
      await expect(useCase.execute(input)).rejects.toThrow(
        `Product not found: ${nonExistentId}`,
      );
    });

    it('should handle product with multiple option types', async () => {
      // Given: Check a product that might have multiple option types
      const productId = '550e8400-e29b-41d4-a716-446655440002'; // Premium Hoodie (Size options)
      const input = new GetProductDetailInput(productId);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.optionGroups.length).toBeGreaterThan(0);

      // Each group should have at least one option
      output.optionGroups.forEach((group) => {
        expect(group.type).toBeDefined();
        expect(group.options.length).toBeGreaterThan(0);
      });
    });

    it('should handle products with single option', async () => {
      // Given: Products 6-15 have single default option
      const productId = '550e8400-e29b-41d4-a716-446655440006';
      const input = new GetProductDetailInput(productId);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.optionGroups).toHaveLength(1);
      expect(output.optionGroups[0].type).toBe('Default');
      expect(output.optionGroups[0].options).toHaveLength(1);
    });
  });

  describe('data integrity', () => {
    it('should not modify repository state', async () => {
      // Given
      const productId = '550e8400-e29b-41d4-a716-446655440001';
      const input = new GetProductDetailInput(productId);
      const initialCount = repository.count();

      // When
      await useCase.execute(input);
      await useCase.execute(input);

      // Then: Repository count should not change
      expect(repository.count()).toBe(initialCount);
    });

    it('should return consistent data on multiple calls', async () => {
      // Given
      const productId = '550e8400-e29b-41d4-a716-446655440001';
      const input = new GetProductDetailInput(productId);

      // When
      const output1 = await useCase.execute(input);
      const output2 = await useCase.execute(input);

      // Then: Should return same data
      expect(output1.id).toBe(output2.id);
      expect(output1.name).toBe(output2.name);
      expect(output1.price.amount).toBe(output2.price.amount);
      expect(output1.optionGroups.length).toBe(output2.optionGroups.length);
    });
  });

  describe('all fixture products', () => {
    it('should be able to retrieve all products by their IDs', async () => {
      // Given: IDs of all fixture products
      const productIds = [
        '550e8400-e29b-41d4-a716-446655440001', // Basic T-Shirt
        '550e8400-e29b-41d4-a716-446655440002', // Premium Hoodie
        '550e8400-e29b-41d4-a716-446655440003', // Denim Jeans
        '550e8400-e29b-41d4-a716-446655440004', // Sneakers
        '550e8400-e29b-41d4-a716-446655440005', // Baseball Cap
      ];

      // When & Then
      for (const productId of productIds) {
        const input = new GetProductDetailInput(productId);
        const output = await useCase.execute(input);

        expect(output.id).toBe(productId);
        expect(output.name).toBeDefined();
        expect(output.price.amount).toBeGreaterThan(0);
        expect(output.optionGroups.length).toBeGreaterThan(0);
      }
    });
  });

  describe('option details validation', () => {
    it('should have valid option structure', async () => {
      // Given
      const productId = '550e8400-e29b-41d4-a716-446655440001';
      const input = new GetProductDetailInput(productId);

      // When
      const output = await useCase.execute(input);

      // Then: Validate option structure
      output.optionGroups.forEach((group) => {
        group.options.forEach((opt) => {
          expect(opt.id).toBeDefined();
          expect(typeof opt.id).toBe('string');
          expect(opt.name).toBeDefined();
          expect(typeof opt.name).toBe('string');
          expect(opt.additionalPrice.amount).toBeGreaterThanOrEqual(0);
          expect(opt.stockStatus).toBeDefined();
          expect(typeof opt.isSelectable).toBe('boolean');
        });
      });
    });
  });
});
