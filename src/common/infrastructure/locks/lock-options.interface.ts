import type { Lock } from 'redlock';

/**
 * 분산락 옵션 인터페이스
 */
export interface LockOptions {
  /** 락 TTL (밀리초, 기본값: 30000) */
  ttlMs?: number;

  /**
   * Pub/Sub 대기 타임아웃 (밀리초)
   * - 0: fail-fast (기본값, 즉시 실패)
   * - > 0: 락 해제 알림을 대기
   */
  waitTimeoutMs?: number;

  /**
   * TTL 자동 연장 활성화
   * - true: Redlock using() 메서드로 자동 연장
   * - false: 고정 TTL (기본값)
   */
  autoExtend?: boolean;
}

/**
 * 확장된 락 획득 결과
 */
export interface ExtendedLockResult {
  /** 락 획득 성공 여부 */
  acquired: boolean;

  /** 락 해제에 사용할 고유 ID */
  lockId: string | null;

  /** Redlock Lock 객체 (release/extend용) */
  lock?: Lock;
}
