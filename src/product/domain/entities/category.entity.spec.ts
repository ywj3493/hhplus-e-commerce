import { Category } from '@/product/domain/entities/category.entity';

describe('Category', () => {
  describe('생성', () => {
    it('유효한 파라미터로 인스턴스를 생성해야 함', () => {
      // Given
      const id = 'category-1';
      const name = '전자제품';

      // When
      const category = Category.create(id, name);

      // Then
      expect(category.id).toBe('category-1');
      expect(category.name).toBe('전자제품');
      expect(category.createdAt).toBeInstanceOf(Date);
      expect(category.updatedAt).toBeInstanceOf(Date);
    });

    it('ID가 빈 문자열이면 예외를 던져야 함', () => {
      // When & Then
      expect(() => Category.create('', '전자제품')).toThrow(
        '카테고리 ID는 필수입니다',
      );
    });

    it('이름이 빈 문자열이면 예외를 던져야 함', () => {
      // When & Then
      expect(() => Category.create('category-1', '')).toThrow(
        '카테고리명은 필수입니다',
      );
    });

    it('이름이 100자를 초과하면 예외를 던져야 함', () => {
      // Given
      const longName = 'a'.repeat(101);

      // When & Then
      expect(() => Category.create('category-1', longName)).toThrow(
        '카테고리명은 100자를 초과할 수 없습니다',
      );
    });
  });

  describe('재구성', () => {
    it('영속화된 데이터로부터 재구성해야 함', () => {
      // Given
      const id = 'category-1';
      const name = '전자제품';
      const createdAt = new Date('2025-01-01');
      const updatedAt = new Date('2025-01-02');

      // When
      const category = Category.reconstitute(id, name, createdAt, updatedAt);

      // Then
      expect(category.id).toBe('category-1');
      expect(category.name).toBe('전자제품');
      expect(category.createdAt).toEqual(createdAt);
      expect(category.updatedAt).toEqual(updatedAt);
    });
  });
});
