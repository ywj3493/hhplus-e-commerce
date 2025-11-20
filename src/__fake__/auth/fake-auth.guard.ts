import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { TOKEN_USER_MAP } from '@/__fake__/auth/master-token';

/**
 * FakeAuthGuard
 * Master Token 기반 임시 인증 가드
 * 향후 JwtAuthGuard로 교체 예정
 */
@Injectable()
export class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    // Authorization 헤더 확인
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('토큰이 필요합니다');
    }

    // Bearer 토큰 추출
    const token = authHeader.substring(7);

    // 토큰 검증
    const payload = TOKEN_USER_MAP[token];

    if (!payload) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다');
    }

    // request.user에 페이로드 설정
    request.user = payload;

    return true;
  }
}
