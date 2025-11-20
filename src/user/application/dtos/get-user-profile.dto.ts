import { User } from '@/user/domain/entities/user.entity';

/**
 * GetUserProfileInput
 * 사용자 프로필 조회 입력 DTO
 */
export class GetUserProfileInput {
  constructor(public readonly userId: string) {
    this.validate();
  }

  private validate(): void {
    if (!this.userId || this.userId.trim() === '') {
      throw new Error('사용자 ID는 필수입니다');
    }
  }
}

/**
 * GetUserProfileOutput
 * 사용자 프로필 조회 출력 DTO
 */
export class GetUserProfileOutput {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string | null,
    public readonly createdAt: Date,
  ) {}

  static from(user: User): GetUserProfileOutput {
    return new GetUserProfileOutput(
      user.id,
      user.name,
      user.email,
      user.createdAt,
    );
  }
}
