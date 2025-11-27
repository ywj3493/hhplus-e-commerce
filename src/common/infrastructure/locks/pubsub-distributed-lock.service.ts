import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import Redlock, { Lock, ResourceLockedError, ExecutionError } from 'redlock';
import { REDIS_CLIENT, REDLOCK_INSTANCE } from './tokens';
import { DistributedLockService, LockResult } from './simple-distributed-lock.interface';
import { LockOptions, ExtendedLockResult } from './lock-options.interface';
import {
  LockAcquisitionException,
  RedisConnectionException,
} from './lock.exceptions';

/**
 * Redlock + Pub/Sub 기반 분산락 서비스
 *
 * 기능:
 * 1. Redlock 알고리즘으로 안전한 분산락 관리
 * 2. Pub/Sub 기반 락 해제 알림 (대기 중인 클라이언트에 즉시 통지)
 * 3. TTL 자동 연장 (using 메서드)
 */
@Injectable()
export class PubSubDistributedLockService implements DistributedLockService {
  private readonly LOCK_RELEASE_CHANNEL_PREFIX = 'lock:release:';

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    @Inject(REDLOCK_INSTANCE)
    private readonly redlock: Redlock,
  ) {
    // Redlock 에러 이벤트 핸들링 (ResourceLockedError는 정상적인 경쟁 상황)
    this.redlock.on('error', (error) => {
      if (!(error instanceof ResourceLockedError)) {
        // 심각한 오류만 콘솔에 출력
        console.error('Redlock critical error:', error);
      }
    });
  }

  /**
   * 락 획득 (기본 인터페이스 호환)
   */
  async acquireLock(
    key: string,
    ttlMs: number = 30000,
    options?: LockOptions,
  ): Promise<LockResult> {
    const result = await this.acquireLockExtended(key, {
      ttlMs,
      waitTimeoutMs: options?.waitTimeoutMs ?? 0,
      autoExtend: options?.autoExtend ?? false,
    });

    return {
      acquired: result.acquired,
      lockId: result.lockId,
    };
  }

  /**
   * 확장된 락 획득 (Pub/Sub 대기 지원)
   */
  async acquireLockExtended(
    key: string,
    options: LockOptions = {},
  ): Promise<ExtendedLockResult> {
    const ttlMs = options.ttlMs ?? 30000;
    const waitTimeoutMs = options.waitTimeoutMs ?? 0;

    // 1. 즉시 획득 시도
    try {
      const lock = await this.redlock.acquire([key], ttlMs);
      return { acquired: true, lockId: lock.value, lock };
    } catch (error) {
      // ResourceLockedError: 정상적인 락 경쟁
      if (error instanceof ResourceLockedError) {
        if (waitTimeoutMs <= 0) {
          return { acquired: false, lockId: null };
        }
        return this.waitForLockWithPubSub(key, ttlMs, waitTimeoutMs);
      }

      // ExecutionError: 연결 실패인지 락 충돌인지 구분
      if (error instanceof ExecutionError) {
        const isConnectionError = await this.checkConnectionError(error);
        if (isConnectionError) {
          throw new RedisConnectionException('Redis 연결에 실패했습니다');
        }

        // 락 충돌인 경우 대기 로직으로
        if (waitTimeoutMs <= 0) {
          return { acquired: false, lockId: null };
        }
        return this.waitForLockWithPubSub(key, ttlMs, waitTimeoutMs);
      }

      // 그 외 에러는 즉시 전파
      throw error;
    }
  }

  /**
   * ExecutionError가 Redis 연결 실패인지 확인
   */
  private async checkConnectionError(error: ExecutionError): Promise<boolean> {
    for (const attemptPromise of error.attempts) {
      const stats = await attemptPromise;
      for (const [, err] of stats.votesAgainst) {
        const message = err.message || '';
        const name = err.name || '';

        if (
          message.includes('ECONNREFUSED') ||
          message.includes('ENOTFOUND') ||
          message.includes('ETIMEDOUT') ||
          message.includes('Connection is closed') ||
          message.includes('ECONNRESET') ||
          name === 'MaxRetriesPerRequestError'
        ) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Pub/Sub 기반 락 대기
   */
  private async waitForLockWithPubSub(
    key: string,
    ttlMs: number,
    waitTimeoutMs: number,
  ): Promise<ExtendedLockResult> {
    const channel = `${this.LOCK_RELEASE_CHANNEL_PREFIX}${key}`;
    const subscriber = this.redis.duplicate();

    return new Promise((resolve) => {
      let isResolved = false;

      const timeout = setTimeout(() => {
        if (isResolved) return;
        isResolved = true;
        cleanup();
        resolve({ acquired: false, lockId: null });
      }, waitTimeoutMs);

      const messageHandler = async (receivedChannel: string) => {
        if (isResolved || receivedChannel !== channel) return;

        try {
          const lock = await this.redlock.acquire([key], ttlMs);
          if (!isResolved) {
            isResolved = true;
            cleanup();
            resolve({ acquired: true, lockId: lock.value, lock });
          }
        } catch {
          // 다른 waiter가 먼저 획득한 경우, 계속 대기
        }
      };

      const cleanup = () => {
        clearTimeout(timeout);
        subscriber.unsubscribe(channel).catch(() => {});
        subscriber.removeAllListeners('message');
        subscriber.quit().catch(() => {});
      };

      subscriber.on('message', messageHandler);
      subscriber.subscribe(channel).catch(() => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          resolve({ acquired: false, lockId: null });
        }
      });
    });
  }

  /**
   * 락 해제
   */
  async releaseLock(key: string, lockId: string, lock?: Lock): Promise<boolean> {
    try {
      if (lock) {
        await lock.release();
      } else {
        // Lock 객체가 없는 경우 해제 불가
        return false;
      }

      await this.publishLockRelease(key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 락 해제 알림 발행
   */
  private async publishLockRelease(key: string): Promise<void> {
    const channel = `${this.LOCK_RELEASE_CHANNEL_PREFIX}${key}`;
    await this.redis.publish(channel, 'released').catch(() => {});
  }

  /**
   * 락을 걸고 함수 실행 (기본 인터페이스)
   */
  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    ttlMs: number = 30000,
  ): Promise<T> {
    return this.withLockExtended(key, fn, { ttlMs, autoExtend: false });
  }

  /**
   * 확장된 withLock (autoExtend 지원)
   */
  async withLockExtended<T>(
    key: string,
    fn: () => Promise<T>,
    options: LockOptions = {},
  ): Promise<T> {
    const ttlMs = options.ttlMs ?? 30000;
    const waitTimeoutMs = options.waitTimeoutMs ?? 0;
    const autoExtend = options.autoExtend ?? false;

    const lockResult = await this.acquireLockExtended(key, {
      ttlMs,
      waitTimeoutMs,
    });

    if (!lockResult.acquired || !lockResult.lock) {
      throw new LockAcquisitionException(key);
    }

    let extensionTimer: NodeJS.Timeout | null = null;

    try {
      if (autoExtend) {
        const extensionInterval = Math.floor(ttlMs / 2);

        extensionTimer = setInterval(async () => {
          try {
            await lockResult.lock!.extend(ttlMs);
          } catch {
            if (extensionTimer) {
              clearInterval(extensionTimer);
              extensionTimer = null;
            }
          }
        }, extensionInterval);
      }

      return await fn();
    } finally {
      if (extensionTimer) {
        clearInterval(extensionTimer);
      }
      await this.releaseLock(key, lockResult.lockId!, lockResult.lock);
    }
  }
}
