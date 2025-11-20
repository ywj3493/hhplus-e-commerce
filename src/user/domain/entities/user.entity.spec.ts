import { User } from '@/user/domain/entities/user.entity';

describe('User', () => {
  describe('reconstitute', () => {
    it('유효한 데이터로 User 엔티티를 생성해야 함', () => {
      // Given
      const userData = {
        id: 'user-uuid-1',
        name: '홍길동',
        email: 'hong@example.com',
        createdAt: new Date('2025-01-15T10:00:00Z'),
        updatedAt: new Date('2025-01-15T10:00:00Z'),
      };

      // When
      const user = User.reconstitute(userData);

      // Then
      expect(user.id).toBe('user-uuid-1');
      expect(user.name).toBe('홍길동');
      expect(user.email).toBe('hong@example.com');
      expect(user.createdAt).toEqual(new Date('2025-01-15T10:00:00Z'));
      expect(user.updatedAt).toEqual(new Date('2025-01-15T10:00:00Z'));
    });

    it('email이 null인 경우에도 User 엔티티를 생성해야 함', () => {
      // Given
      const userData = {
        id: 'user-uuid-1',
        name: '홍길동',
        email: null,
        createdAt: new Date('2025-01-15T10:00:00Z'),
        updatedAt: new Date('2025-01-15T10:00:00Z'),
      };

      // When
      const user = User.reconstitute(userData);

      // Then
      expect(user.email).toBeNull();
    });
  });

  describe('validate', () => {
    it('ID가 없으면 에러를 발생시켜야 함', () => {
      // Given & When & Then
      expect(() =>
        User.reconstitute({
          id: '',
          name: '홍길동',
          email: 'hong@example.com',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ).toThrow('사용자 ID는 필수입니다');
    });

    it('이름이 없으면 에러를 발생시켜야 함', () => {
      // Given & When & Then
      expect(() =>
        User.reconstitute({
          id: 'user-uuid-1',
          name: '',
          email: 'hong@example.com',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ).toThrow('사용자 이름은 필수입니다');
    });

    it('이름이 100자를 초과하면 에러를 발생시켜야 함', () => {
      // Given
      const longName = 'a'.repeat(101);

      // When & Then
      expect(() =>
        User.reconstitute({
          id: 'user-uuid-1',
          name: longName,
          email: 'hong@example.com',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ).toThrow('사용자 이름은 100자를 초과할 수 없습니다');
    });

    it('이메일이 255자를 초과하면 에러를 발생시켜야 함', () => {
      // Given
      const longEmail = 'a'.repeat(256) + '@example.com';

      // When & Then
      expect(() =>
        User.reconstitute({
          id: 'user-uuid-1',
          name: '홍길동',
          email: longEmail,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ).toThrow('이메일은 255자를 초과할 수 없습니다');
    });
  });

  describe('getters', () => {
    it('모든 속성을 조회할 수 있어야 함', () => {
      // Given
      const userData = {
        id: 'user-uuid-1',
        name: '홍길동',
        email: 'hong@example.com',
        createdAt: new Date('2025-01-15T10:00:00Z'),
        updatedAt: new Date('2025-01-15T10:00:00Z'),
      };
      const user = User.reconstitute(userData);

      // When & Then
      expect(user.id).toBe('user-uuid-1');
      expect(user.name).toBe('홍길동');
      expect(user.email).toBe('hong@example.com');
      expect(user.createdAt).toEqual(new Date('2025-01-15T10:00:00Z'));
      expect(user.updatedAt).toEqual(new Date('2025-01-15T10:00:00Z'));
    });
  });
});
