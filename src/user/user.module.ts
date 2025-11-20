import { Module } from '@nestjs/common';
import { UserController } from '@/user/presentation/controllers/user.controller';
import { GetUserProfileUseCase } from '@/user/application/use-cases/get-user-profile.use-case';
import { InMemoryUserRepository } from '@/user/infrastructure/repositories/in-memory-user.repository';
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
    {
      provide: USER_REPOSITORY,
      useClass: InMemoryUserRepository,
    },
  ],
  exports: [
    // Export use cases if needed by other modules
    GetUserProfileUseCase,
    USER_REPOSITORY,
  ],
})
export class UserModule {}
