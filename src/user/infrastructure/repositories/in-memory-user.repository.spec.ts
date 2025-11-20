import { InMemoryUserRepository } from '@/user/infrastructure/repositories/in-memory-user.repository';

describe('InMemoryUserRepository', () => {
  let repository: InMemoryUserRepository;

  beforeEach(() => {
    repository = new InMemoryUserRepository();
  });

  describe('findById', () => {
    it('존재하는 사용자를 조회해야 함', async () => {
      // Given
      const userId = 'user-001';

      // When
      const user = await repository.findById(userId);

      // Then
      expect(user).not.toBeNull();
      expect(user!.id).toBe('user-001');
      expect(user!.name).toBe('홍길동');
      expect(user!.email).toBe('hong@example.com');
    });

    it('존재하지 않는 사용자는 null을 반환해야 함', async () => {
      // Given
      const userId = 'non-existent-user';

      // When
      const user = await repository.findById(userId);

      // Then
      expect(user).toBeNull();
    });

    it('두 번째 사용자를 조회해야 함', async () => {
      // Given
      const userId = 'user-002';

      // When
      const user = await repository.findById(userId);

      // Then
      expect(user).not.toBeNull();
      expect(user!.id).toBe('user-002');
      expect(user!.name).toBe('김철수');
      expect(user!.email).toBe('kim@example.com');
    });

    it('세 번째 사용자를 조회해야 함', async () => {
      // Given
      const userId = 'user-003';

      // When
      const user = await repository.findById(userId);

      // Then
      expect(user).not.toBeNull();
      expect(user!.id).toBe('user-003');
      expect(user!.name).toBe('이영희');
      expect(user!.email).toBe('lee@example.com');
    });
  });

  describe('reset', () => {
    it('저장소를 초기화해야 함', async () => {
      // Given
      const userId = 'user-001';

      // When
      repository.reset();
      const user = await repository.findById(userId);

      // Then
      expect(user).not.toBeNull();
      expect(user!.id).toBe('user-001');
    });
  });

  describe('getAllUsers', () => {
    it('모든 사용자를 반환해야 함', () => {
      // When
      const users = repository.getAllUsers();

      // Then
      expect(users).toHaveLength(3);
      expect(users[0].name).toBe('홍길동');
      expect(users[1].name).toBe('김철수');
      expect(users[2].name).toBe('이영희');
    });
  });
});
