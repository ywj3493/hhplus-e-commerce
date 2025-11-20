import { Category } from '@/product/domain/entities/category.entity';

/**
 * CategoryRepository 인터페이스
 */
export interface CategoryRepository {
  /**
   * ID로 카테고리 조회
   */
  findById(id: string): Promise<Category | null>;

  /**
   * 모든 카테고리 조회
   */
  findAll(): Promise<Category[]>;

  /**
   * 카테고리 저장
   */
  save(category: Category): Promise<Category>;
}
