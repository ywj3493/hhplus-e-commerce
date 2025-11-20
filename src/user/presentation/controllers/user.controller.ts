import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FakeJwtAuthGuard } from '@/__fake__/auth/fake-jwt-auth.guard';
import { GetUserProfileUseCase } from '@/user/application/use-cases/get-user-profile.use-case';
import { GetUserProfileInput } from '@/user/application/dtos/get-user-profile.dto';
import { UserResponseDto } from '@/user/presentation/dtos/user.response.dto';

/**
 * UserController
 * 사용자 관련 API 엔드포인트
 */
@ApiTags('users')
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
  @UseGuards(FakeJwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '내 프로필 조회', description: '인증된 사용자의 프로필 정보를 조회합니다.' })
  @ApiResponse({ status: 200, description: '프로필 조회 성공', type: UserResponseDto })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async getMyProfile(@Request() req): Promise<UserResponseDto> {
    const input = new GetUserProfileInput(req.user.userId);
    const output = await this.getUserProfileUseCase.execute(input);
    return UserResponseDto.from(output);
  }
}
