import { Test, TestingModule } from '@nestjs/testing';
import { GetUserProfileUseCase } from '@/user/application/use-cases/get-user-profile.use-case';
import {
  UserRepository,
  USER_REPOSITORY,
} from '@/user/domain/repositories/user.repository';
import { UserNotFoundException } from '@/user/domain/user.exceptions';
import { User } from '@/user/domain/entities/user.entity';
import { GetUserProfileInput } from '@/user/application/dtos/get-user-profile.dto';

describe('GetUserProfileUseCase', () => {
  let useCase: GetUserProfileUseCase;
  let userRepository: jest.Mocked<UserRepository>;

  beforeEach(async () => {
    const mockRepository: jest.Mocked<UserRepository> = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUserProfileUseCase,
        {
          provide: USER_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetUserProfileUseCase>(GetUserProfileUseCase);
    userRepository = module.get(USER_REPOSITORY);
  });

  describe('execute', () => {
    it('사용자 정보를 조회해야 함', async () => {
      // Given
      const user = User.reconstitute({
        id: 'user-uuid-1',
        name: '홍길동',
        email: 'hong@example.com',
        createdAt: new Date('2025-01-15T10:00:00Z'),
        updatedAt: new Date('2025-01-15T10:00:00Z'),
      });

      userRepository.findById.mockResolvedValue(user);

      const input = new GetUserProfileInput('user-uuid-1');

      // When
      const output = await useCase.execute(input);

      // Then
      expect(userRepository.findById).toHaveBeenCalledWith('user-uuid-1');
      expect(output.id).toBe('user-uuid-1');
      expect(output.name).toBe('홍길동');
      expect(output.email).toBe('hong@example.com');
      expect(output.createdAt).toEqual(new Date('2025-01-15T10:00:00Z'));
    });

    it('사용자를 찾을 수 없으면 UserNotFoundException을 발생시켜야 함', async () => {
      // Given
      userRepository.findById.mockResolvedValue(null);

      const input = new GetUserProfileInput('non-existent-user');

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        UserNotFoundException,
      );
      expect(userRepository.findById).toHaveBeenCalledWith('non-existent-user');
    });

    it('email이 null인 사용자도 조회할 수 있어야 함', async () => {
      // Given
      const user = User.reconstitute({
        id: 'user-uuid-1',
        name: '홍길동',
        email: null,
        createdAt: new Date('2025-01-15T10:00:00Z'),
        updatedAt: new Date('2025-01-15T10:00:00Z'),
      });

      userRepository.findById.mockResolvedValue(user);

      const input = new GetUserProfileInput('user-uuid-1');

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output.email).toBeNull();
    });
  });
});
