import { Category } from '@/product/domain/entities/category.entity';

/**
 * 테스트용 카테고리 생성 헬퍼
 */
export const createTestCategory = (
  overrides?: Partial<{
    id: string;
    name: string;
  }>,
): Category => {
  return Category.create(
    overrides?.id || 'category-1',
    overrides?.name || '전자제품',
  );
};
