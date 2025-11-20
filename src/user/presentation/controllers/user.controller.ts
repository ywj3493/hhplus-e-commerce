import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { FakeAuthGuard } from '@/__fake__/auth/fake-auth.guard';
import { GetUserProfileUseCase } from '@/user/application/use-cases/get-user-profile.use-case';
import { GetUserProfileInput } from '@/user/application/dtos/get-user-profile.dto';
import { UserResponseDto } from '@/user/presentation/dtos/user.response.dto';

/**
 * UserController
 * 사용자 관련 API 엔드포인트
 */
@Controller('users')
export class UserController {
  constructor(
    private readonly getUserProfileUseCase: GetUserProfileUseCase,
  ) {}

  /**
   * GET /users/me
   * 내 프로필 정보를 조회합니다.
   * UC-USER-01: 사용자 정보 조회
   */
  @Get('me')
  @UseGuards(FakeAuthGuard)
  async getMyProfile(@Request() req): Promise<UserResponseDto> {
    const input = new GetUserProfileInput(req.user.userId);
    const output = await this.getUserProfileUseCase.execute(input);
    return UserResponseDto.from(output);
  }
}
