import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { v4 as uuid } from 'uuid';
import { REDIS_CLIENT } from './tokens';
import { DistributedLockService, LockResult } from './simple-distributed-lock.interface';
import { LockOptions } from './lock-options.interface';
import { LockAcquisitionException } from './lock.exceptions';

/**
 * Redis SETNX 기반 분산락 서비스
 *
 * 구현 방식:
 * - SET key value NX PX ttl (원자적 락 획득)
 * - Lua 스크립트로 원자적 락 해제 (본인 락만 해제 가능)
 */
@Injectable()
export class SimpleDistributedLockService implements DistributedLockService {
  // Lua 스크립트: 락 해제 (본인 락만 해제)
  private readonly RELEASE_SCRIPT = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async acquireLock(key: string, ttlMs: number = 30000): Promise<LockResult> {
    const lockId = uuid();

    // SET key lockId NX PX ttlMs
    const result = await this.redis.set(key, lockId, 'PX', ttlMs, 'NX');

    if (result === 'OK') {
      return { acquired: true, lockId };
    }

    return { acquired: false, lockId: null };
  }

  async releaseLock(key: string, lockId: string): Promise<boolean> {
    const result = await this.redis.eval(this.RELEASE_SCRIPT, 1, key, lockId);
    return result === 1;
  }

  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    ttlMs: number = 30000,
  ): Promise<T> {
    const lockResult = await this.acquireLock(key, ttlMs);

    if (!lockResult.acquired) {
      throw new LockAcquisitionException(key);
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock(key, lockResult.lockId!);
    }
  }

  /**
   * 확장된 withLock (Simple 구현에서는 기본 withLock으로 위임)
   * waitTimeoutMs와 autoExtend는 무시됨
   */
  async withLockExtended<T>(
    key: string,
    fn: () => Promise<T>,
    options: LockOptions = {},
  ): Promise<T> {
    const ttlMs = options.ttlMs ?? 30000;
    return this.withLock(key, fn, ttlMs);
  }
}
