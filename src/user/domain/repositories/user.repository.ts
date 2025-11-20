import { User } from '@/user/domain/entities/user.entity';

/**
 * Injection Token
 */
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

/**
 * UserRepository Interface
 * User 도메인의 저장소 인터페이스
 */
export interface UserRepository {
  /**
   * ID로 사용자를 조회합니다.
   * @param id - 사용자 ID (UUID)
   * @returns User 엔티티 또는 null (존재하지 않으면)
   */
  findById(id: string): Promise<User | null>;
}
