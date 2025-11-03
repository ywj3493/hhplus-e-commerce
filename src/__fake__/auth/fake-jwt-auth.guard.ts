import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class FakeJwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '인증이 필요합니다',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '유효하지 않은 인증 토큰입니다',
        },
        timestamp: new Date().toISOString(),
      });
    }

    try {
      // Verify JWT token
      const payload = this.jwtService.verify(token, {
        secret: 'fake-secret-key-for-testing',
      });

      // Attach user info to request
      request.user = {
        userId: payload.userId,
        name: payload.name,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: '유효하지 않거나 만료된 토큰입니다',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
