import { Injectable } from '@nestjs/common';
import { CategoryRepository } from '@/product/domain/repositories/category.repository';
import { Category } from '@/product/domain/entities/category.entity';
import { PrismaService } from '@/common/infrastructure/prisma/prisma.service';

/**
 * CategoryPrismaRepository
 * Prisma를 사용한 Category Repository 구현체
 */
@Injectable()
export class CategoryPrismaRepository implements CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ID로 카테고리 조회
   * @param id - 카테고리 ID
   * @returns Category 엔티티 또는 null
   */
  async findById(id: string): Promise<Category | null> {
    const categoryModel = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!categoryModel) {
      return null;
    }

    return this.toDomain(categoryModel);
  }

  /**
   * 모든 카테고리 조회
   * @returns Category 엔티티 배열
   */
  async findAll(): Promise<Category[]> {
    const categories = await this.prisma.category.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return categories.map((category) => this.toDomain(category));
  }

  /**
   * 카테고리 저장 (생성 또는 업데이트)
   * @param category - Category 도메인 엔티티
   * @returns 저장된 Category 엔티티
   */
  async save(category: Category): Promise<Category> {
    const data = {
      name: category.name,
      updatedAt: new Date(),
    };

    const savedCategory = await this.prisma.category.upsert({
      where: { id: category.id },
      update: data,
      create: {
        id: category.id,
        ...data,
        createdAt: category.createdAt,
      },
    });

    return this.toDomain(savedCategory);
  }

  /**
   * Prisma 모델을 Domain 엔티티로 변환
   * @param model - Prisma Category 모델
   * @returns Category 도메인 엔티티
   */
  private toDomain(model: {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  }): Category {
    return Category.reconstitute(model.id, model.name, model.createdAt, model.updatedAt);
  }
}
