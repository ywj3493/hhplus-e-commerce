/**
 * 락 획득 실패 예외
 */
export class LockAcquisitionException extends Error {
  constructor(key: string) {
    super(`락 획득에 실패했습니다: ${key}`);
    this.name = 'LockAcquisitionException';
  }
}

/**
 * Redis 연결 실패 예외
 */
export class RedisConnectionException extends Error {
  constructor(message: string = 'Redis 연결에 실패했습니다') {
    super(message);
    this.name = 'RedisConnectionException';
  }
}
