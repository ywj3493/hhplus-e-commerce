import { Injectable } from '@nestjs/common';
import { User } from '@/user/domain/entities/user.entity';
import { UserRepository } from '@/user/domain/repositories/user.repository';
import { userFixtures } from '@/user/infrastructure/fixtures/user.fixtures';

/**
 * InMemory User Repository 구현체
 * 테스트 및 개발용 메모리 기반 저장소
 */
@Injectable()
export class InMemoryUserRepository implements UserRepository {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
    this.initializeFixtures();
  }

  /**
   * Fixture 데이터로 초기화
   */
  private initializeFixtures(): void {
    userFixtures.forEach((userData) => {
      const user = User.reconstitute(userData);
      this.users.set(user.id, user);
    });
  }

  /**
   * ID로 사용자를 조회합니다.
   * @param id - 사용자 ID
   * @returns User 엔티티 또는 null
   */
  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  /**
   * 테스트용 메서드: 저장소 초기화
   */
  reset(): void {
    this.users.clear();
    this.initializeFixtures();
  }

  /**
   * 테스트용 메서드: 모든 사용자 조회
   */
  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }
}
