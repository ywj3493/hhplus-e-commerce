import { Injectable } from '@nestjs/common';
import { UserRepository } from '@/user/domain/repositories/user.repository';
import { User } from '@/user/domain/entities/user.entity';
import { PrismaService } from '@/common/infrastructure/prisma/prisma.service';

/**
 * UserPrismaRepository
 * Prisma를 사용한 User Repository 구현체
 */
@Injectable()
export class UserPrismaRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ID로 사용자를 조회합니다.
   * @param id - 사용자 ID (UUID)
   * @returns User 엔티티 또는 null (존재하지 않으면)
   */
  async findById(id: string): Promise<User | null> {
    const userModel = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!userModel) {
      return null;
    }

    return this.toDomain(userModel);
  }

  /**
   * Prisma 모델을 Domain 엔티티로 변환합니다.
   * @param model - Prisma User 모델
   * @returns User 도메인 엔티티
   */
  private toDomain(model: {
    id: string;
    name: string;
    email: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return User.reconstitute({
      id: model.id,
      name: model.name,
      email: model.email,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    });
  }
}
