import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { FAKE_USERS } from '@/__fake__/auth/fake-users';

@ApiTags('Fake Auth')
@Controller('fake-auth')
export class FakeAuthController {
  constructor(private jwtService: JwtService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Mock 로그인 (JWT 토큰 발급)',
    description: `테스트용 로그인 엔드포인트입니다. 두 명의 사용자로 테스트 가능합니다:

**User 1:**
- id: user1
- password: test1

**User 2:**
- id: user2
- password: test2

성공 시 JWT 토큰이 발급되며, 이 토큰을 Swagger UI의 "Authorize" 버튼을 통해 설정할 수 있습니다.`,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          example: 'user1',
          description: '사용자 ID',
        },
        password: {
          type: 'string',
          example: 'test1',
          description: '비밀번호',
        },
      },
      required: ['id', 'password'],
    },
  })
  @ApiResponse({
    status: 200,
    description: '로그인 성공',
    schema: {
      example: {
        success: true,
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          userId: 'user-001',
          name: '테스트 유저 1',
        },
        timestamp: '2025-11-02T10:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '로그인 실패',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: '아이디 또는 비밀번호가 올바르지 않습니다',
        },
        timestamp: '2025-11-02T10:00:00Z',
      },
    },
  })
  login(@Body() body: { id: string; password: string }) {
    // Fake user validation
    const user = FAKE_USERS.find(
      (u) => u.id === body.id && u.password === body.password,
    );

    if (!user) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: '아이디 또는 비밀번호가 올바르지 않습니다',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Generate JWT token
    const payload = {
      userId: user.userId,
      name: user.name,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      success: true,
      data: {
        accessToken,
        userId: user.userId,
        name: user.name,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
