import { Module } from '@nestjs/common';
import { UserController } from '@/user/presentation/controllers/user.controller';
import { GetUserProfileUseCase } from '@/user/application/use-cases/get-user-profile.use-case';
import { InMemoryUserRepository } from '@/user/infrastructure/repositories/in-memory-user.repository';
import { UserPrismaRepository } from '@/user/infrastructure/repositories/user-prisma.repository';
import { USER_REPOSITORY } from '@/user/domain/repositories/user.repository';

/**
 * User Module
 * User 도메인의 의존성 주입 설정
 */
@Module({
  controllers: [UserController],
  providers: [
    // Use Cases
    GetUserProfileUseCase,

    // Repository
    // 환경에 따라 Repository 구현체 선택
    // - 개발/프로덕션: UserPrismaRepository (실제 DB)
    // - 테스트: InMemoryUserRepository (메모리)
    {
      provide: USER_REPOSITORY,
      useClass:
        process.env.NODE_ENV === 'test'
          ? InMemoryUserRepository
          : UserPrismaRepository,
    },
  ],
  exports: [
    // Export use cases if needed by other modules
    GetUserProfileUseCase,
    USER_REPOSITORY,
  ],
})
export class UserModule {}
