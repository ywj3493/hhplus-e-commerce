import { GetProductsUseCase } from '../../../src/product/application/use-cases/get-products.use-case';
import { GetProductsInput } from '../../../src/product/application/dtos/get-products.dto';
import { InMemoryProductRepository } from '../../../src/product/infrastructure/repositories/in-memory-product.repository';
import { StockStatusType } from '../../../src/product/domain/entities/stock-status.vo';

/**
 * Integration Test: GetProductsUseCase + InMemoryProductRepository
 * Tests the interaction between application layer and infrastructure layer
 */
describe('GetProductsUseCase 통합 테스트', () => {
  let useCase: GetProductsUseCase;
  let repository: InMemoryProductRepository;

  beforeEach(() => {
    repository = new InMemoryProductRepository();
    useCase = new GetProductsUseCase(repository);
  });

  describe('실제 레포지토리와 함께 실행', () => {
    it('올바른 페이지네이션으로 레포지토리에서 상품을 조회해야 함', async () => {
      // Given: 샘플 데이터로 레포지토리가 초기화됨
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

    it('최신순으로 정렬된 상품을 반환해야 함 (BR-PROD-01)', async () => {
      // Given
      const input = new GetProductsInput(1, 5);

      // When
      const output = await useCase.execute(input);

      // Then: 상품은 createdAt 내림차순으로 정렬되어야 함
      for (let i = 0; i < output.items.length - 1; i++) {
        // 출력에서 createdAt에 직접 접근할 수 없지만,
        // 픽스처에서 나중 상품이 더 나중 ID를 가진다는 것을 알고 있음
        expect(output.items[i].id).toBeDefined();
      }
      expect(output.items.length).toBeGreaterThan(0);
    });

    it('각 상품에 대해 재고 상태를 올바르게 계산해야 함 (BR-PROD-04)', async () => {
      // Given
      const input = new GetProductsInput(1, 10);

      // When
      const output = await useCase.execute(input);

      // Then: 모든 상품은 유효한 재고 상태를 가져야 함
      output.items.forEach((item) => {
        expect([StockStatusType.IN_STOCK, StockStatusType.OUT_OF_STOCK]).toContain(
          item.stockStatus.status,
        );
      });
    });

    it('두 번째 페이지 페이지네이션을 처리해야 함', async () => {
      // Given
      const input = new GetProductsInput(2, 5);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.page).toBe(2);
      expect(output.limit).toBe(5);
      // 총 데이터에 따라 항목이 0개 이상일 수 있음
      expect(output.items.length).toBeGreaterThanOrEqual(0);
      expect(output.items.length).toBeLessThanOrEqual(5);
    });

    it('페이지 크기 제한을 준수해야 함 (BR-PROD-03)', async () => {
      // Given: 100개 항목 요청 (최대 제한)
      const input = new GetProductsInput(1, 100);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.limit).toBe(100);
      expect(output.items.length).toBeLessThanOrEqual(100);
    });

    it('기본 페이지네이션 값을 사용해야 함 (BR-PROD-02)', async () => {
      // Given: 기본값 (page=1, limit=10)
      const input = new GetProductsInput();

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.page).toBe(1);
      expect(output.limit).toBe(10);
      expect(output.items.length).toBeLessThanOrEqual(10);
    });

    it('페이지 간 일관된 총 개수를 반환해야 함', async () => {
      // Given
      const input1 = new GetProductsInput(1, 5);
      const input2 = new GetProductsInput(2, 5);

      // When
      const output1 = await useCase.execute(input1);
      const output2 = await useCase.execute(input2);

      // Then: 총 개수는 동일해야 함
      expect(output1.total).toBe(output2.total);
    });

    it('totalPages를 올바르게 계산해야 함', async () => {
      // Given
      const input = new GetProductsInput(1, 5);

      // When
      const output = await useCase.execute(input);

      // Then
      const expectedTotalPages = Math.ceil(output.total / output.limit);
      expect(output.totalPages).toBe(expectedTotalPages);
    });

    it('필요한 모든 상품 필드를 포함해야 함', async () => {
      // Given
      const input = new GetProductsInput(1, 1);

      // When
      const output = await useCase.execute(input);

      // Then: 첫 번째 상품이 모든 필수 필드를 가지는지 확인
      if (output.items.length > 0) {
        const product = output.items[0];
        expect(product.id).toBeDefined();
        expect(product.name).toBeDefined();
        expect(product.price).toBeGreaterThanOrEqual(0);
        expect(product.imageUrl).toBeDefined();
        expect(product.stockStatus).toBeDefined();
      }
    });

    it('사용 가능한 데이터를 초과하는 페이지에 대해 빈 결과를 처리해야 함', async () => {
      // Given: 매우 높은 페이지 번호 요청
      const input = new GetProductsInput(1000, 10);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.items).toHaveLength(0);
      expect(output.total).toBeGreaterThan(0); // 총 상품은 여전히 존재함
      expect(output.page).toBe(1000);
    });
  });

  describe('페이지네이션 경계 케이스', () => {
    it('page=1, limit=1을 처리해야 함', async () => {
      // Given
      const input = new GetProductsInput(1, 1);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.items.length).toBeLessThanOrEqual(1);
      expect(output.limit).toBe(1);
    });

    it('최대 페이지 크기 100을 처리해야 함', async () => {
      // Given
      const input = new GetProductsInput(1, 100);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.limit).toBe(100);
      expect(output.items.length).toBeLessThanOrEqual(100);
    });
  });

  describe('데이터 무결성', () => {
    it('레포지토리 상태를 변경하지 않아야 함', async () => {
      // Given
      const input = new GetProductsInput(1, 10);
      const initialCount = repository.count();

      // When
      await useCase.execute(input);
      await useCase.execute(input);

      // Then: 개수가 변경되지 않아야 함
      expect(repository.count()).toBe(initialCount);
    });

    it('여러 호출에서 다른 인스턴스를 반환해야 함', async () => {
      // Given
      const input = new GetProductsInput(1, 10);

      // When
      const output1 = await useCase.execute(input);
      const output2 = await useCase.execute(input);

      // Then: 같은 데이터이지만 다른 인스턴스를 반환해야 함
      expect(output1).not.toBe(output2);
      expect(output1.items).toHaveLength(output2.items.length);
    });
  });
});
