import Redis from 'ioredis';
import Redlock from 'redlock';
import { PubSubDistributedLockService } from '@/common/infrastructure/locks/pubsub-distributed-lock.service';
import {
  setupTestRedis,
  cleanupTestRedis,
  clearAllKeys,
  type TestRedisConfig,
} from '../../utils/test-redis';

/**
 * 락-트랜잭션 순서 검증 통합 테스트
 *
 * 목적:
 * - 분산락이 트랜잭션 완료 후에만 해제되는지 검증
 * - 트랜잭션 롤백 후 락이 정상적으로 해제되는지 검증
 */
describe('락-트랜잭션 순서 검증', () => {
  let redisConfig: TestRedisConfig;
  let redlock: Redlock;
  let lockService: PubSubDistributedLockService;

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  beforeAll(async () => {
    redisConfig = await setupTestRedis();

    redlock = new Redlock([redisConfig.redis], {
      retryCount: 0,
      automaticExtensionThreshold: 500,
    });

    lockService = new PubSubDistributedLockService(
      redisConfig.redis as any,
      redlock as any,
    );
  }, 60000);

  afterAll(async () => {
    await cleanupTestRedis(redisConfig);
  });

  beforeEach(async () => {
    await clearAllKeys(redisConfig.redis);
  });

  describe('트랜잭션 중 락 유지', () => {
    it('락은 콜백이 완료된 후에만 해제되어야 함', async () => {
      // Given
      const key = 'test:lock-tx:1';
      const events: Array<{ event: string; time: number }> = [];

      // When: 첫 번째 요청이 락을 획득하고 긴 작업 수행
      const firstRequest = lockService.withLockExtended(
        key,
        async () => {
          events.push({ event: 'callback_started', time: Date.now() });

          // 트랜잭션 시뮬레이션 (실제 DB 트랜잭션 대신 sleep 사용)
          await sleep(200);

          events.push({ event: 'callback_completing', time: Date.now() });
        },
        { ttlMs: 10000, autoExtend: true },
      );

      // 50ms 후 두 번째 요청이 락 획득 시도 (fail-fast)
      await sleep(50);
      const secondLockAttempt = await lockService.acquireLockExtended(key, {
        ttlMs: 10000,
        waitTimeoutMs: 0, // fail-fast
      });
      events.push({
        event: secondLockAttempt.acquired ? 'second_acquired' : 'second_blocked',
        time: Date.now(),
      });

      await firstRequest;
      events.push({ event: 'first_completed', time: Date.now() });

      // Then: 두 번째 요청은 첫 번째 콜백 진행 중에 락을 획득하지 못해야 함
      const callbackStartTime = events.find(
        (e) => e.event === 'callback_started',
      )!.time;
      const callbackCompleteTime = events.find(
        (e) => e.event === 'callback_completing',
      )!.time;
      const secondAttemptEvent = events.find(
        (e) => e.event === 'second_blocked' || e.event === 'second_acquired',
      )!;

      // 두 번째 시도는 콜백 진행 중에 발생
      expect(secondAttemptEvent.time).toBeGreaterThan(callbackStartTime);
      expect(secondAttemptEvent.time).toBeLessThan(callbackCompleteTime);

      // 두 번째 시도는 블록되어야 함
      expect(secondAttemptEvent.event).toBe('second_blocked');
    });

    it('락 해제는 콜백 완료 후에 발생해야 함', async () => {
      // Given
      const key = 'test:lock-tx:2';
      let callbackCompleted = false;
      let lockReleasedAfterCallback = false;

      // When: withLockExtended 실행
      await lockService.withLockExtended(
        key,
        async () => {
          await sleep(100);
          callbackCompleted = true;
        },
        { ttlMs: 10000 },
      );

      // withLockExtended 반환 후 락 획득 시도
      const newLock = await lockService.acquireLockExtended(key, { ttlMs: 10000 });
      lockReleasedAfterCallback = newLock.acquired && callbackCompleted;

      // Then: 콜백 완료 후 락이 해제되어 새 락 획득 가능
      expect(callbackCompleted).toBe(true);
      expect(lockReleasedAfterCallback).toBe(true);

      // 정리
      if (newLock.lock) {
        await lockService.releaseLock(key, newLock.lockId!, newLock.lock);
      }
    });
  });

  describe('에러 발생 시 락 해제', () => {
    it('콜백에서 에러가 발생해도 락이 정상적으로 해제되어야 함', async () => {
      // Given
      const key = 'test:lock-error:1';
      const events: string[] = [];

      // When: 콜백에서 에러 발생
      try {
        await lockService.withLockExtended(
          key,
          async () => {
            events.push('callback_started');
            throw new Error('Intentional error');
          },
          { ttlMs: 10000 },
        );
      } catch (error) {
        events.push('error_caught');
      }

      // 락 해제 확인: 새로운 락 획득 가능해야 함
      const newLock = await lockService.acquireLockExtended(key, { ttlMs: 10000 });
      events.push(newLock.acquired ? 'new_lock_acquired' : 'new_lock_failed');

      // Then: 에러 후에도 락이 해제되어 새 락 획득 가능
      expect(events).toContain('callback_started');
      expect(events).toContain('error_caught');
      expect(events).toContain('new_lock_acquired');

      // 정리
      if (newLock.lock) {
        await lockService.releaseLock(key, newLock.lockId!, newLock.lock);
      }
    });

    it('중첩된 에러가 발생해도 락이 해제되어야 함', async () => {
      // Given
      const key = 'test:lock-error:2';

      // When: 중첩된 async 작업에서 에러 발생
      try {
        await lockService.withLockExtended(
          key,
          async () => {
            await sleep(50);
            await (async () => {
              throw new Error('Nested error');
            })();
          },
          { ttlMs: 10000 },
        );
      } catch {
        // 에러 무시
      }

      // Then: 락이 해제되어 새 락 획득 가능
      const newLock = await lockService.acquireLockExtended(key, { ttlMs: 10000 });
      expect(newLock.acquired).toBe(true);

      // 정리
      if (newLock.lock) {
        await lockService.releaseLock(key, newLock.lockId!, newLock.lock);
      }
    });
  });

  describe('Pub/Sub 대기자와 트랜잭션 순서', () => {
    it('대기 중인 요청은 콜백 완료 후에만 락을 획득해야 함', async () => {
      // Given
      const key = 'test:lock-waiter:1';
      const acquisitionOrder: Array<{ id: string; time: number }> = [];

      // When: 첫 번째 요청이 락 획득 후 긴 작업 수행
      const firstPromise = lockService.withLockExtended(
        key,
        async () => {
          acquisitionOrder.push({ id: 'first', time: Date.now() });
          await sleep(300); // 긴 작업 시뮬레이션
        },
        { ttlMs: 10000, waitTimeoutMs: 5000, autoExtend: true },
      );

      // 50ms 후 두 번째 요청 시작 (Pub/Sub 대기)
      await sleep(50);
      const secondPromise = lockService.withLockExtended(
        key,
        async () => {
          acquisitionOrder.push({ id: 'second', time: Date.now() });
        },
        { ttlMs: 10000, waitTimeoutMs: 5000 },
      );

      await Promise.all([firstPromise, secondPromise]);

      // Then: 순서대로 획득, 최소 300ms 간격
      expect(acquisitionOrder[0].id).toBe('first');
      expect(acquisitionOrder[1].id).toBe('second');
      expect(acquisitionOrder[1].time - acquisitionOrder[0].time).toBeGreaterThanOrEqual(280); // 약간의 오차 허용
    });

    it('여러 대기자가 순차적으로 락을 획득해야 함', async () => {
      // Given
      const key = 'test:lock-waiter:2';
      const executionOrder: string[] = [];

      // When: 첫 번째 락 획득
      const firstPromise = lockService.withLockExtended(
        key,
        async () => {
          executionOrder.push('first_start');
          await sleep(100);
          executionOrder.push('first_end');
        },
        { ttlMs: 10000, waitTimeoutMs: 10000, autoExtend: true },
      );

      // 3개의 대기자 추가
      await sleep(20);
      const waiterPromises = ['second', 'third', 'fourth'].map(async (id) => {
        try {
          await lockService.withLockExtended(
            key,
            async () => {
              executionOrder.push(`${id}_start`);
              await sleep(50);
              executionOrder.push(`${id}_end`);
            },
            { ttlMs: 10000, waitTimeoutMs: 10000, autoExtend: true },
          );
        } catch {
          // 타임아웃 무시
        }
      });

      await Promise.all([firstPromise, ...waiterPromises]);

      // Then: 첫 번째가 먼저 시작/종료해야 함
      expect(executionOrder[0]).toBe('first_start');
      expect(executionOrder[1]).toBe('first_end');

      // 나머지 순서는 보장되지 않지만, 각 작업은 start-end 쌍으로 완료되어야 함
      const otherExecutions = executionOrder.slice(2);
      const startCount = otherExecutions.filter((e) => e.endsWith('_start')).length;
      const endCount = otherExecutions.filter((e) => e.endsWith('_end')).length;
      expect(startCount).toBe(endCount);
    });
  });

});
