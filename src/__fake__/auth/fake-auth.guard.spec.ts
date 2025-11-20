import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { FakeAuthGuard } from '@/__fake__/auth/fake-auth.guard';
import { MASTER_TOKEN } from '@/__fake__/auth/master-token';

describe('FakeAuthGuard', () => {
  let guard: FakeAuthGuard;
  let mockExecutionContext: ExecutionContext;
  let mockRequest: any;

  beforeEach(() => {
    guard = new FakeAuthGuard();
    mockRequest = {
      headers: {},
      user: null,
    };
    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as ExecutionContext;
  });

  describe('canActivate', () => {
    it('유효한 Master Token이 있으면 true를 반환하고 user를 설정해야 함', () => {
      // Given
      mockRequest.headers['authorization'] = `Bearer ${MASTER_TOKEN}`;

      // When
      const result = guard.canActivate(mockExecutionContext);

      // Then
      expect(result).toBe(true);
      expect(mockRequest.user).toEqual({ userId: 'user-uuid-1' });
    });

    it('두 번째 사용자 토큰도 검증해야 함', () => {
      // Given
      mockRequest.headers['authorization'] = 'Bearer test-token-user2';

      // When
      const result = guard.canActivate(mockExecutionContext);

      // Then
      expect(result).toBe(true);
      expect(mockRequest.user).toEqual({ userId: 'user-uuid-2' });
    });

    it('세 번째 사용자 토큰도 검증해야 함', () => {
      // Given
      mockRequest.headers['authorization'] = 'Bearer test-token-user3';

      // When
      const result = guard.canActivate(mockExecutionContext);

      // Then
      expect(result).toBe(true);
      expect(mockRequest.user).toEqual({ userId: 'user-uuid-3' });
    });

    it('Authorization 헤더가 없으면 UnauthorizedException을 발생시켜야 함', () => {
      // Given
      // Authorization 헤더 없음

      // When & Then
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        new UnauthorizedException('토큰이 필요합니다'),
      );
    });

    it('Bearer가 없는 헤더면 UnauthorizedException을 발생시켜야 함', () => {
      // Given
      mockRequest.headers['authorization'] = 'InvalidFormat token';

      // When & Then
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        new UnauthorizedException('토큰이 필요합니다'),
      );
    });

    it('유효하지 않은 토큰이면 UnauthorizedException을 발생시켜야 함', () => {
      // Given
      mockRequest.headers['authorization'] = 'Bearer invalid-token';

      // When & Then
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        new UnauthorizedException('유효하지 않은 토큰입니다'),
      );
    });
  });
});
