import { Injectable, Inject } from '@nestjs/common';
import { UserRepository } from '@/user/domain/repositories/user.repository';
import { UserNotFoundException } from '@/user/domain/user.exceptions';
import {
  GetUserProfileInput,
  GetUserProfileOutput,
} from '@/user/application/dtos/get-user-profile.dto';

/**
 * GetUserProfileUseCase
 * UC-USER-01: 사용자 정보 조회
 * BR-USER-01: 사용자는 본인의 정보만 조회 가능
 */
@Injectable()
export class GetUserProfileUseCase {
  constructor(
    @Inject('USER_REPOSITORY')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: GetUserProfileInput): Promise<GetUserProfileOutput> {
    // 사용자 조회
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new UserNotFoundException(input.userId);
    }

    return GetUserProfileOutput.from(user);
  }
}
