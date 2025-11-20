/**
 * Master Token for testing
 * 임시 인증을 위한 마스터 토큰 정의
 */
export const MASTER_TOKEN = 'test-master-token-12345';

/**
 * Token Payload Interface
 */
export interface TokenPayload {
  userId: string;
}

/**
 * Master Token to User ID mapping
 * 토큰과 사용자 ID 매핑 테이블
 */
export const TOKEN_USER_MAP: Record<string, TokenPayload> = {
  [MASTER_TOKEN]: { userId: 'user-uuid-1' },
  'test-token-user2': { userId: 'user-uuid-2' },
  'test-token-user3': { userId: 'user-uuid-3' },
};
