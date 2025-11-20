import { Injectable } from '@nestjs/common';
import { Category } from '@/product/domain/entities/category.entity';
import { CategoryRepository } from '@/product/domain/repositories/category.repository';

/**
 * 카테고리 영속성 데이터
 */
interface CategoryData {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 인메모리 카테고리 저장소
 */
@Injectable()
export class InMemoryCategoryRepository implements CategoryRepository {
  private categories: Map<string, CategoryData> = new Map();

  /**
   * ID로 카테고리 조회
   */
  async findById(id: string): Promise<Category | null> {
    const data = this.categories.get(id);
    if (!data) {
      return null;
    }
    return this.toDomain(data);
  }

  /**
   * 모든 카테고리 조회
   */
  async findAll(): Promise<Category[]> {
    const categoriesData = Array.from(this.categories.values());
    return categoriesData.map((data) => this.toDomain(data));
  }

  /**
   * 카테고리 저장
   */
  async save(category: Category): Promise<Category> {
    const data = this.toPersistence(category);
    this.categories.set(category.id, data);
    return category;
  }

  /**
   * 도메인 모델로 변환
   */
  private toDomain(data: CategoryData): Category {
    return Category.reconstitute(
      data.id,
      data.name,
      data.createdAt,
      data.updatedAt,
    );
  }

  /**
   * 영속성 모델로 변환
   */
  private toPersistence(category: Category): CategoryData {
    return {
      id: category.id,
      name: category.name,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  /**
   * 테스트용: 모든 데이터 초기화
   */
  clear(): void {
    this.categories.clear();
  }

  /**
   * 테스트용: 초기 데이터 삽입
   */
  seed(categories: Category[]): void {
    for (const category of categories) {
      const data = this.toPersistence(category);
      this.categories.set(category.id, data);
    }
  }
}
