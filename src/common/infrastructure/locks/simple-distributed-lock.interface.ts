import { LockOptions } from './lock-options.interface';

/**
 * 락 획득 결과
 */
export interface LockResult {
  /** 락 획득 성공 여부 */
  acquired: boolean;
  /** 락 해제에 사용할 고유 ID (UUID) */
  lockId: string | null;
}

/**
 * 분산락 서비스 인터페이스
 */
export interface DistributedLockService {
  /**
   * 락 획득 시도
   * @param key 락 키 (예: 'stock:product-123:option-456')
   * @param ttlMs 락 TTL (밀리초, 기본 30000)
   * @returns 락 획득 결과
   */
  acquireLock(key: string, ttlMs?: number): Promise<LockResult>;

  /**
   * 락 해제
   * @param key 락 키
   * @param lockId 락 획득 시 받은 ID
   * @returns 해제 성공 여부
   */
  releaseLock(key: string, lockId: string): Promise<boolean>;

  /**
   * 락을 걸고 함수 실행 (공통함수 방식)
   * 락 획득 실패 시 LockAcquisitionException 발생
   * 함수 완료 후 자동으로 락 해제
   *
   * @param key 락 키
   * @param fn 실행할 함수
   * @param ttlMs 락 TTL (밀리초)
   */
  withLock<T>(key: string, fn: () => Promise<T>, ttlMs?: number): Promise<T>;

  /**
   * 확장된 withLock (Pub/Sub 대기 및 autoExtend 지원)
   * 락 획득 실패 시 LockAcquisitionException 발생
   * 함수 완료 후 자동으로 락 해제
   *
   * @param key 락 키
   * @param fn 실행할 함수
   * @param options 락 옵션 (ttlMs, waitTimeoutMs, autoExtend)
   */
  withLockExtended<T>(
    key: string,
    fn: () => Promise<T>,
    options?: LockOptions,
  ): Promise<T>;
}
