import { InMemoryCategoryRepository } from '@/product/infrastructure/repositories/in-memory-category.repository';
import { Category } from '@/product/domain/entities/category.entity';

describe('InMemoryCategoryRepository', () => {
  let repository: InMemoryCategoryRepository;

  beforeEach(() => {
    repository = new InMemoryCategoryRepository();
  });

  describe('save', () => {
    it('카테고리를 저장해야 함', async () => {
      // Given
      const category = Category.create('category-1', '전자제품');

      // When
      const saved = await repository.save(category);

      // Then
      expect(saved).toBe(category);
      const found = await repository.findById('category-1');
      expect(found).not.toBeNull();
      expect(found?.name).toBe('전자제품');
    });
  });

  describe('findById', () => {
    it('ID로 카테고리를 조회해야 함', async () => {
      // Given
      const category = Category.create('category-1', '전자제품');
      await repository.save(category);

      // When
      const found = await repository.findById('category-1');

      // Then
      expect(found).not.toBeNull();
      expect(found?.id).toBe('category-1');
      expect(found?.name).toBe('전자제품');
    });

    it('존재하지 않는 ID면 null을 반환해야 함', async () => {
      // When
      const found = await repository.findById('non-existent');

      // Then
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('모든 카테고리를 조회해야 함', async () => {
      // Given
      const category1 = Category.create('category-1', '전자제품');
      const category2 = Category.create('category-2', '가전제품');
      await repository.save(category1);
      await repository.save(category2);

      // When
      const categories = await repository.findAll();

      // Then
      expect(categories).toHaveLength(2);
      expect(categories.map((c) => c.id)).toContain('category-1');
      expect(categories.map((c) => c.id)).toContain('category-2');
    });

    it('카테고리가 없으면 빈 배열을 반환해야 함', async () => {
      // When
      const categories = await repository.findAll();

      // Then
      expect(categories).toEqual([]);
    });
  });

  describe('clear', () => {
    it('모든 데이터를 초기화해야 함', async () => {
      // Given
      const category = Category.create('category-1', '전자제품');
      await repository.save(category);

      // When
      repository.clear();

      // Then
      const categories = await repository.findAll();
      expect(categories).toEqual([]);
    });
  });

  describe('seed', () => {
    it('초기 데이터를 삽입해야 함', async () => {
      // Given
      const categories = [
        Category.create('category-1', '전자제품'),
        Category.create('category-2', '가전제품'),
      ];

      // When
      repository.seed(categories);

      // Then
      const allCategories = await repository.findAll();
      expect(allCategories).toHaveLength(2);
    });
  });
});
