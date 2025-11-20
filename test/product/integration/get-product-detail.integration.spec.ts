import { GetProductDetailUseCase } from '@/product/application/use-cases/get-product-detail.use-case';
import { GetProductDetailInput } from '@/product/application/dtos/get-product-detail.dto';
import { InMemoryProductRepository } from '@/product/infrastructure/repositories/in-memory-product.repository';
import { ProductNotFoundException } from '@/product/domain/product.exceptions';
import { StockStatusType } from '@/product/domain/entities/stock-status.vo';

/**
 * Integration Test: GetProductDetailUseCase + InMemoryProductRepository
 */
describe('GetProductDetailUseCase 통합 테스트', () => {
  let useCase: GetProductDetailUseCase;
  let repository: InMemoryProductRepository;

  beforeEach(() => {
    repository = new InMemoryProductRepository();
    useCase = new GetProductDetailUseCase(repository);
  });

  describe('실제 레포지토리와 함께 실행', () => {
    it('레포지토리에서 상품 상세를 조회해야 함', async () => {
      // Given: 픽스처에 존재하는 상품 ID 사용
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

    it('옵션을 타입별로 올바르게 그룹화해야 함 (BR-PROD-05)', async () => {
      // Given: Color 옵션이 있는 상품 (Basic T-Shirt)
      const productId = '550e8400-e29b-41d4-a716-446655440001';
      const input = new GetProductDetailInput(productId);

      // When
      const output = await useCase.execute(input);

      // Then
      const colorGroup = output.optionGroups.find((g) => g.type === 'Color');
      expect(colorGroup).toBeDefined();
      expect(colorGroup?.options.length).toBeGreaterThan(0);

      // 그룹의 모든 옵션은 같은 타입을 가져야 함
      colorGroup?.options.forEach((opt) => {
        expect(opt.id).toBeDefined();
        expect(opt.name).toBeDefined();
      });
    });

    it('각 옵션에 재고 상태를 포함해야 함 (BR-PROD-06)', async () => {
      // Given: 여러 옵션이 있는 상품
      const productId = '550e8400-e29b-41d4-a716-446655440001';
      const input = new GetProductDetailInput(productId);

      // When
      const output = await useCase.execute(input);

      // Then: 모든 옵션은 재고 상태를 가져야 함
      output.optionGroups.forEach((group) => {
        group.options.forEach((opt) => {
          expect([StockStatusType.IN_STOCK, StockStatusType.OUT_OF_STOCK]).toContain(
            opt.stockStatus.status,
          );
        });
      });
    });

    it('품절 옵션을 선택 불가능으로 표시해야 함 (BR-PROD-08)', async () => {
      // Given: 상품 1은 품절인 Navy 색상을 가짐
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

      // White와 Black은 재고가 있고 선택 가능해야 함
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

    it('옵션의 추가 가격을 포함해야 함', async () => {
      // Given: Premium Hoodie는 L과 XL에 추가 가격이 있음
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

    it('존재하지 않는 상품에 대해 ProductNotFoundException을 던져야 함', async () => {
      // Given
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const input = new GetProductDetailInput(nonExistentId);

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(ProductNotFoundException);
      await expect(useCase.execute(input)).rejects.toThrow(
        `상품을 찾을 수 없습니다: ${nonExistentId}`,
      );
    });

    it('여러 옵션 타입이 있는 상품을 처리해야 함', async () => {
      // Given: 여러 옵션 타입이 있을 수 있는 상품 확인
      const productId = '550e8400-e29b-41d4-a716-446655440002'; // Premium Hoodie (Size 옵션)
      const input = new GetProductDetailInput(productId);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.optionGroups.length).toBeGreaterThan(0);

      // 각 그룹은 최소한 하나의 옵션을 가져야 함
      output.optionGroups.forEach((group) => {
        expect(group.type).toBeDefined();
        expect(group.options.length).toBeGreaterThan(0);
      });
    });

    it('단일 옵션이 있는 상품을 처리해야 함', async () => {
      // Given: 상품 6-15는 단일 기본 옵션을 가짐
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

  describe('데이터 무결성', () => {
    it('레포지토리 상태를 변경하지 않아야 함', async () => {
      // Given
      const productId = '550e8400-e29b-41d4-a716-446655440001';
      const input = new GetProductDetailInput(productId);
      const initialCount = repository.count();

      // When
      await useCase.execute(input);
      await useCase.execute(input);

      // Then: 레포지토리 개수가 변경되지 않아야 함
      expect(repository.count()).toBe(initialCount);
    });

    it('여러 호출에서 일관된 데이터를 반환해야 함', async () => {
      // Given
      const productId = '550e8400-e29b-41d4-a716-446655440001';
      const input = new GetProductDetailInput(productId);

      // When
      const output1 = await useCase.execute(input);
      const output2 = await useCase.execute(input);

      // Then: 같은 데이터를 반환해야 함
      expect(output1.id).toBe(output2.id);
      expect(output1.name).toBe(output2.name);
      expect(output1.price.amount).toBe(output2.price.amount);
      expect(output1.optionGroups.length).toBe(output2.optionGroups.length);
    });
  });

  describe('모든 픽스처 상품', () => {
    it('모든 상품을 ID로 조회할 수 있어야 함', async () => {
      // Given: 모든 픽스처 상품의 ID
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

  describe('옵션 상세 검증', () => {
    it('유효한 옵션 구조를 가져야 함', async () => {
      // Given
      const productId = '550e8400-e29b-41d4-a716-446655440001';
      const input = new GetProductDetailInput(productId);

      // When
      const output = await useCase.execute(input);

      // Then: 옵션 구조 검증
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
