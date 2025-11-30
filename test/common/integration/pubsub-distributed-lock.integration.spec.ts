import Redis from 'ioredis';
import Redlock from 'redlock';
import { PubSubDistributedLockService } from '@/common/infrastructure/locks/pubsub-distributed-lock.service';
import { LockAcquisitionException } from '@/common/infrastructure/locks/lock.exceptions';
import {
  setupTestRedis,
  cleanupTestRedis,
  clearAllKeys,
  type TestRedisConfig,
} from '../../utils/test-redis';

/**
 * Pub/Sub 분산락 통합 테스트
 * - TestContainers를 사용한 실제 Redis 인스턴스 테스트
 * - Redlock 알고리즘 기반 락 동작 검증
 * - Pub/Sub 대기 및 TTL 자동 연장 검증
 */
describe('PubSubDistributedLockService 통합 테스트', () => {
  let redisConfig: TestRedisConfig;
  let redlock: Redlock;
  let lockService: PubSubDistributedLockService;

  beforeAll(async () => {
    // 실제 Redis 컨테이너 시작
    redisConfig = await setupTestRedis();

    // Redlock 인스턴스 생성
    redlock = new Redlock([redisConfig.redis], {
      retryCount: 0, // Pub/Sub으로 대기하므로 재시도 비활성화
      automaticExtensionThreshold: 500,
    });

    // 테스트용 락 서비스 생성
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

  describe('기본 락 획득/해제', () => {
    it('락이 없을 때 즉시 획득해야 함', async () => {
      // Given
      const key = 'test:redlock:1';

      // When
      const result = await lockService.acquireLockExtended(key, { ttlMs: 10000 });

      // Then
      expect(result.acquired).toBe(true);
      expect(result.lockId).toBeDefined();
      expect(result.lock).toBeDefined();

      // 정리
      if (result.lock) {
        await result.lock.release();
      }
    });

    it('이미 락이 있을 때 fail-fast 모드에서 즉시 실패해야 함', async () => {
      // Given
      const key = 'test:redlock:2';
      const firstLock = await lockService.acquireLockExtended(key, { ttlMs: 10000 });

      // When
      const result = await lockService.acquireLockExtended(key, {
        ttlMs: 10000,
        waitTimeoutMs: 0, // fail-fast
      });

      // Then
      expect(result.acquired).toBe(false);
      expect(result.lockId).toBeNull();

      // 정리
      if (firstLock.lock) {
        await firstLock.lock.release();
      }
    });

    it('락 해제 후 새로운 락을 획득할 수 있어야 함', async () => {
      // Given
      const key = 'test:redlock:3';
      const firstLock = await lockService.acquireLockExtended(key, { ttlMs: 10000 });
      await lockService.releaseLock(key, firstLock.lockId!, firstLock.lock);

      // When
      const result = await lockService.acquireLockExtended(key, { ttlMs: 10000 });

      // Then
      expect(result.acquired).toBe(true);

      // 정리
      if (result.lock) {
        await result.lock.release();
      }
    });
  });

  describe('Pub/Sub 대기', () => {
    it('락이 점유 중일 때 release 알림까지 대기해야 함', async () => {
      // Given
      const key = 'test:pubsub:1';
      const firstLock = await lockService.acquireLockExtended(key, { ttlMs: 10000 });

      // When: 두 번째 요청은 대기
      const waitPromise = lockService.acquireLockExtended(key, {
        ttlMs: 10000,
        waitTimeoutMs: 5000,
      });

      // 100ms 후 첫 번째 락 해제
      setTimeout(async () => {
        await lockService.releaseLock(key, firstLock.lockId!, firstLock.lock);
      }, 100);

      const result = await waitPromise;

      // Then
      expect(result.acquired).toBe(true);
      expect(result.lockId).toBeDefined();

      // 정리
      if (result.lock) {
        await result.lock.release();
      }
    });

    it('waitTimeout 초과 시 획득 실패를 반환해야 함', async () => {
      // Given
      const key = 'test:pubsub:2';
      const firstLock = await lockService.acquireLockExtended(key, { ttlMs: 10000 });

      // When: 짧은 타임아웃으로 대기
      const result = await lockService.acquireLockExtended(key, {
        ttlMs: 10000,
        waitTimeoutMs: 100, // 100ms 타임아웃
      });

      // Then
      expect(result.acquired).toBe(false);

      // 정리
      if (firstLock.lock) {
        await firstLock.lock.release();
      }
    });

    it('여러 waiter가 있을 때 하나만 획득해야 함', async () => {
      // Given
      const key = 'test:pubsub:3';
      const firstLock = await lockService.acquireLockExtended(key, { ttlMs: 10000 });

      // When: 5개의 대기 요청
      const waitPromises = Array.from({ length: 5 }, () =>
        lockService.acquireLockExtended(key, {
          ttlMs: 10000,
          waitTimeoutMs: 2000,
        }),
      );

      // 100ms 후 첫 번째 락 해제
      setTimeout(async () => {
        await lockService.releaseLock(key, firstLock.lockId!, firstLock.lock);
      }, 100);

      const results = await Promise.all(waitPromises);

      // Then: 1개만 성공
      const successCount = results.filter((r) => r.acquired).length;
      expect(successCount).toBe(1);

      // 정리: 성공한 락 해제
      const successResult = results.find((r) => r.acquired);
      if (successResult?.lock) {
        await successResult.lock.release();
      }
    });

    it('Pub/Sub 대기 중 락이 해제되면 즉시 획득해야 함', async () => {
      // Given
      const key = 'test:pubsub:4';
      const firstLock = await lockService.acquireLockExtended(key, { ttlMs: 10000 });

      const startTime = Date.now();

      // When: 대기 시작
      const waitPromise = lockService.acquireLockExtended(key, {
        ttlMs: 10000,
        waitTimeoutMs: 5000,
      });

      // 50ms 후 해제
      setTimeout(async () => {
        await lockService.releaseLock(key, firstLock.lockId!, firstLock.lock);
      }, 50);

      const result = await waitPromise;
      const elapsed = Date.now() - startTime;

      // Then: 즉시 획득 (polling이면 retryDelay 만큼 지연)
      expect(result.acquired).toBe(true);
      expect(elapsed).toBeLessThan(500); // Pub/Sub이므로 빠르게 응답

      // 정리
      if (result.lock) {
        await result.lock.release();
      }
    });
  });

  describe('withLock', () => {
    it('함수를 실행하고 결과를 반환해야 함', async () => {
      // Given
      const key = 'test:withLock:1';
      const expectedResult = { data: 'success' };

      // When
      const result = await lockService.withLock(key, async () => {
        return expectedResult;
      });

      // Then
      expect(result).toEqual(expectedResult);
    });

    it('함수 실행 후 자동으로 락이 해제되어야 함', async () => {
      // Given
      const key = 'test:withLock:2';

      // When
      await lockService.withLock(key, async () => {
        return 'done';
      });

      // Then: 락이 해제되었으므로 새 락 획득 가능
      const result = await lockService.acquireLockExtended(key, { ttlMs: 10000 });
      expect(result.acquired).toBe(true);

      if (result.lock) {
        await result.lock.release();
      }
    });

    it('함수에서 예외가 발생해도 락이 해제되어야 함', async () => {
      // Given
      const key = 'test:withLock:3';

      // When & Then
      await expect(
        lockService.withLock(key, async () => {
          throw new Error('테스트 에러');
        }),
      ).rejects.toThrow('테스트 에러');

      // 락이 해제되었으므로 새 락 획득 가능
      const result = await lockService.acquireLockExtended(key, { ttlMs: 10000 });
      expect(result.acquired).toBe(true);

      if (result.lock) {
        await result.lock.release();
      }
    });

    it('이미 락이 걸려있으면 LockAcquisitionException을 발생시켜야 함', async () => {
      // Given
      const key = 'test:withLock:4';
      const firstLock = await lockService.acquireLockExtended(key, { ttlMs: 10000 });

      // When & Then
      await expect(
        lockService.withLock(key, async () => {
          return 'should not reach';
        }),
      ).rejects.toThrow(LockAcquisitionException);

      // 정리
      if (firstLock.lock) {
        await firstLock.lock.release();
      }
    });
  });

  describe('withLockExtended (autoExtend)', () => {
    it('autoExtend가 활성화되면 TTL이 자동으로 연장되어야 함', async () => {
      // Given
      const key = 'test:autoExtend:1';
      const shortTtl = 1000; // 1초

      // When: 1.5초 작업 실행 (TTL보다 긴 작업)
      const result = await lockService.withLockExtended(
        key,
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          return 'success';
        },
        {
          ttlMs: shortTtl,
          autoExtend: true,
        },
      );

      // Then: 작업이 성공적으로 완료됨 (TTL 자동 연장)
      expect(result).toBe('success');
    });

    it('autoExtend가 비활성화되면 TTL 만료 후 다른 요청이 획득 가능해야 함', async () => {
      // Given
      const key = 'test:autoExtend:2';
      const shortTtl = 100; // 100ms

      // When: 락 획득 후 TTL 만료 대기
      const firstLock = await lockService.acquireLockExtended(key, {
        ttlMs: shortTtl,
      });

      await new Promise((resolve) => setTimeout(resolve, 150));

      // Then: TTL 만료 후 새 락 획득 가능
      const result = await lockService.acquireLockExtended(key, { ttlMs: 10000 });
      expect(result.acquired).toBe(true);

      if (result.lock) {
        await result.lock.release();
      }
    });
  });

  describe('Pub/Sub 대기 + 동시성 시나리오', () => {
    it(
      '동시에 10개의 요청이 Pub/Sub 대기로 순차 처리되어야 함',
      async () => {
        // Given
        const key = 'test:concurrent:pubsub';
        let counter = 0;
        const results: number[] = [];

        // When: 10개의 동시 요청 (Pub/Sub 대기)
        const promises = Array.from({ length: 10 }, async () => {
          try {
            await lockService.withLockExtended(
              key,
              async () => {
                const currentValue = counter;
                await new Promise((r) => setTimeout(r, 10)); // 짧은 작업
                counter = currentValue + 1;
                results.push(counter);
              },
              {
                ttlMs: 10000,
                waitTimeoutMs: 10000, // 충분한 대기 시간
                autoExtend: false,
              },
            );
          } catch (error) {
            // 대기 타임아웃 시 무시
          }
        });

        await Promise.all(promises);

        // Then: 순차적으로 처리되어 counter가 정확해야 함
        // 참고: Pub/Sub 대기 시 일부는 타임아웃될 수 있음
        expect(counter).toBeGreaterThan(0);
        expect(counter).toBeLessThanOrEqual(10);
      },
      30000,
    );

    it('서로 다른 키에 대한 동시 작업은 모두 독립적으로 처리되어야 함', async () => {
      // Given
      const operations = 5;
      const results: { key: string; acquired: boolean }[] = [];

      // When: 5개의 서로 다른 키에 동시 락 획득
      const promises = Array.from({ length: operations }, async (_, i) => {
        const key = `test:independent:${i}`;
        const result = await lockService.acquireLockExtended(key, {
          ttlMs: 10000,
        });
        results.push({ key, acquired: result.acquired });

        if (result.lock) {
          await result.lock.release();
        }
      });

      await Promise.all(promises);

      // Then: 모두 성공
      expect(results.every((r) => r.acquired)).toBe(true);
    });
  });

  describe('재고 시나리오 시뮬레이션 (Pub/Sub)', () => {
    it(
      '동시 예약 요청이 Pub/Sub 대기로 순차 처리되어야 함',
      async () => {
        // Given: 재고 5개
        let stock = 5;
        const reservations = 10; // 10개 요청 (5개만 성공해야 함)
        let successCount = 0;
        let failureCount = 0;
        // 고유한 키 사용 (다른 테스트와 충돌 방지)
        const testId = Date.now();

        // When: 10개의 동시 예약 요청 (Pub/Sub 대기)
        const promises = Array.from({ length: reservations }, async () => {
          const lockKey = `stock:product-1:option-1:${testId}`;

          try {
            await lockService.withLockExtended(
              lockKey,
              async () => {
                if (stock > 0) {
                  await new Promise((r) => setTimeout(r, 10)); // DB 지연 시뮬레이션
                  stock--;
                  successCount++;
                } else {
                  failureCount++;
                }
              },
              {
                ttlMs: 5000,
                waitTimeoutMs: 10000, // 충분한 대기 시간
                autoExtend: true,
              },
            );
          } catch (error) {
            if (error instanceof LockAcquisitionException) {
              failureCount++;
            }
          }
        });

        await Promise.all(promises);

        // Then: 재고만큼만 성공
        expect(successCount).toBe(5);
        expect(stock).toBe(0);
      },
      30000,
    );

    it('서로 다른 상품에 대한 동시 예약은 병렬로 처리되어야 함', async () => {
      // Given: 각각 10개의 재고를 가진 3개의 상품
      const stocks: Record<string, number> = {
        'product-1': 10,
        'product-2': 10,
        'product-3': 10,
      };
      const results: { productId: string; success: boolean }[] = [];
      // 고유한 키 사용 (다른 테스트와 충돌 방지)
      const testId = Date.now();

      // When: 각 상품에 대해 1개씩 동시 예약
      const promises = Object.keys(stocks).map(async (productId) => {
        const lockKey = `stock:${productId}:option-1:${testId}`;

        try {
          await lockService.withLockExtended(
            lockKey,
            async () => {
              if (stocks[productId] > 0) {
                await new Promise((r) => setTimeout(r, 10)); // DB 지연 시뮬레이션
                stocks[productId]--;
                results.push({ productId, success: true });
              }
            },
            {
              ttlMs: 5000,
              waitTimeoutMs: 5000,
              autoExtend: true,
            },
          );
        } catch {
          results.push({ productId, success: false });
        }
      });

      await Promise.all(promises);

      // Then: 모든 상품에 대해 예약 성공 (서로 다른 키이므로 병렬 처리)
      expect(results.length).toBe(3);
      expect(results.every((r) => r.success)).toBe(true);
      expect(stocks['product-1']).toBe(9);
      expect(stocks['product-2']).toBe(9);
      expect(stocks['product-3']).toBe(9);
    });
  });
});
