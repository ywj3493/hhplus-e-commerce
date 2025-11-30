import Redis from 'ioredis';
import { SimpleDistributedLockService } from '@/common/infrastructure/locks/simple-distributed-lock.service';
import { LockAcquisitionException } from '@/common/infrastructure/locks/lock.exceptions';
import {
  setupTestRedis,
  cleanupTestRedis,
  clearAllKeys,
  type TestRedisConfig,
} from '../../utils/test-redis';

/**
 * Simple 분산락 통합 테스트
 * - TestContainers를 사용한 실제 Redis 인스턴스 테스트
 * - SETNX 기반 분산락 동작 검증
 * - 동시성 시나리오 검증
 */
describe('SimpleDistributedLockService 통합 테스트', () => {
  let redisConfig: TestRedisConfig;
  let lockService: SimpleDistributedLockService;

  beforeAll(async () => {
    // 실제 Redis 컨테이너 시작
    redisConfig = await setupTestRedis();

    // 테스트용 락 서비스 생성 (DI 없이 직접 주입)
    lockService = new SimpleDistributedLockService(redisConfig.redis as any);
  }, 60000); // 60초 timeout (컨테이너 시작)

  afterAll(async () => {
    await cleanupTestRedis(redisConfig);
  });

  beforeEach(async () => {
    // 각 테스트 전 모든 키 삭제
    await clearAllKeys(redisConfig.redis);
  });

  describe('acquireLock', () => {
    it('락이 없을 때 즉시 획득해야 함', async () => {
      // Given
      const key = 'test:lock:1';

      // When
      const result = await lockService.acquireLock(key);

      // Then
      expect(result.acquired).toBe(true);
      expect(result.lockId).toBeDefined();
      expect(result.lockId).not.toBeNull();

      // Redis에 키가 존재하는지 확인
      const value = await redisConfig.redis.get(key);
      expect(value).toBe(result.lockId);
    });

    it('이미 락이 있을 때 획득에 실패해야 함', async () => {
      // Given
      const key = 'test:lock:2';
      await lockService.acquireLock(key, 10000);

      // When
      const result = await lockService.acquireLock(key, 1000);

      // Then
      expect(result.acquired).toBe(false);
      expect(result.lockId).toBeNull();
    });

    it('락이 만료되면 새 락을 획득할 수 있어야 함', async () => {
      // Given
      const key = 'test:lock:3';
      await lockService.acquireLock(key, 100); // 100ms TTL
      await new Promise((resolve) => setTimeout(resolve, 150)); // 만료 대기

      // When
      const result = await lockService.acquireLock(key, 10000);

      // Then
      expect(result.acquired).toBe(true);
      expect(result.lockId).not.toBeNull();
    });

    it('서로 다른 키에는 독립적으로 락을 획득할 수 있어야 함', async () => {
      // Given
      const key1 = 'test:lock:key1';
      const key2 = 'test:lock:key2';
      await lockService.acquireLock(key1, 10000);

      // When
      const result = await lockService.acquireLock(key2, 10000);

      // Then
      expect(result.acquired).toBe(true);
    });

    it('TTL이 정확하게 설정되어야 함', async () => {
      // Given
      const key = 'test:lock:ttl';
      const ttlMs = 5000;

      // When
      await lockService.acquireLock(key, ttlMs);

      // Then
      const pttl = await redisConfig.redis.pttl(key);
      // TTL이 설정된 값 근처여야 함 (약간의 오차 허용)
      expect(pttl).toBeGreaterThan(ttlMs - 100);
      expect(pttl).toBeLessThanOrEqual(ttlMs);
    });
  });

  describe('releaseLock', () => {
    it('본인 락을 해제할 수 있어야 함', async () => {
      // Given
      const key = 'test:release:1';
      const { lockId } = await lockService.acquireLock(key, 10000);

      // When
      const released = await lockService.releaseLock(key, lockId!);

      // Then
      expect(released).toBe(true);

      // Redis에서 키가 삭제되었는지 확인
      const value = await redisConfig.redis.get(key);
      expect(value).toBeNull();
    });

    it('다른 lockId로는 해제할 수 없어야 함', async () => {
      // Given
      const key = 'test:release:2';
      const { lockId } = await lockService.acquireLock(key, 10000);

      // When
      const released = await lockService.releaseLock(key, 'wrong-lock-id');

      // Then
      expect(released).toBe(false);

      // 락이 여전히 존재해야 함
      const value = await redisConfig.redis.get(key);
      expect(value).toBe(lockId);
    });

    it('존재하지 않는 키는 해제에 실패해야 함', async () => {
      // Given & When
      const released = await lockService.releaseLock(
        'non-existent-key',
        'any-id',
      );

      // Then
      expect(released).toBe(false);
    });

    it('락 해제 후 새로운 락을 획득할 수 있어야 함', async () => {
      // Given
      const key = 'test:release:3';
      const { lockId } = await lockService.acquireLock(key, 10000);
      await lockService.releaseLock(key, lockId!);

      // When
      const result = await lockService.acquireLock(key, 10000);

      // Then
      expect(result.acquired).toBe(true);
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
      const result = await lockService.acquireLock(key);
      expect(result.acquired).toBe(true);
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
      const result = await lockService.acquireLock(key);
      expect(result.acquired).toBe(true);
    });

    it('이미 락이 걸려있으면 LockAcquisitionException을 발생시켜야 함', async () => {
      // Given
      const key = 'test:withLock:4';
      await lockService.acquireLock(key, 10000);

      // When & Then
      await expect(
        lockService.withLock(key, async () => {
          return 'should not reach';
        }),
      ).rejects.toThrow(LockAcquisitionException);
    });

    it('함수 실행 중에는 다른 요청이 락을 획득할 수 없어야 함', async () => {
      // Given
      const key = 'test:withLock:5';
      let innerLockResult: { acquired: boolean; lockId: string | null } | null =
        null;

      // When
      await lockService.withLock(key, async () => {
        // 함수 실행 중 락 획득 시도
        innerLockResult = await lockService.acquireLock(key);
        return 'done';
      });

      // Then
      expect(innerLockResult).not.toBeNull();
      expect(innerLockResult!.acquired).toBe(false);
    });
  });

  describe('동시성 테스트', () => {
    it('동시에 여러 요청이 들어와도 하나만 락을 획득해야 함', async () => {
      // Given
      const key = 'test:concurrent:1';
      const requests = 20;

      // When: 동시에 20개의 락 획득 시도
      const results = await Promise.all(
        Array.from({ length: requests }, () =>
          lockService.acquireLock(key, 10000),
        ),
      );

      // Then: 정확히 1개만 성공
      const successCount = results.filter((r) => r.acquired).length;
      expect(successCount).toBe(1);

      // 성공한 lockId 확인
      const successResult = results.find((r) => r.acquired);
      const storedValue = await redisConfig.redis.get(key);
      expect(storedValue).toBe(successResult!.lockId);
    });

    it('100개의 동시 요청에서 정확히 1개만 락을 획득해야 함', async () => {
      // Given
      const key = 'test:concurrent:100';
      const requests = 100;

      // When: 동시에 100개의 락 획득 시도
      const results = await Promise.all(
        Array.from({ length: requests }, () =>
          lockService.acquireLock(key, 10000),
        ),
      );

      // Then: 정확히 1개만 성공
      const successCount = results.filter((r) => r.acquired).length;
      const failureCount = results.filter((r) => !r.acquired).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(99);
    });

    it('순차적으로 락을 획득하고 해제하면 모두 성공해야 함', async () => {
      // Given
      const key = 'test:sequential:1';
      const operations = 5;
      const results: boolean[] = [];

      // When: 순차적으로 락 획득 → 해제 반복
      for (let i = 0; i < operations; i++) {
        const lockResult = await lockService.acquireLock(key, 10000);
        results.push(lockResult.acquired);
        if (lockResult.acquired) {
          await lockService.releaseLock(key, lockResult.lockId!);
        }
      }

      // Then: 모두 성공
      expect(results).toEqual([true, true, true, true, true]);
    });

    it('withLock으로 동시 작업 시 하나만 성공하고 나머지는 예외가 발생해야 함', async () => {
      // Given
      const key = 'test:concurrent:withLock';
      const operations = 10;
      let successCount = 0;
      let failureCount = 0;

      // When: 동시에 10개의 withLock 시도
      const promises = Array.from({ length: operations }, async () => {
        try {
          await lockService.withLock(
            key,
            async () => {
              // 약간의 작업 시뮬레이션
              await new Promise((r) => setTimeout(r, 50));
              successCount++;
            },
            10000,
          );
        } catch (error) {
          if (error instanceof LockAcquisitionException) {
            failureCount++;
          } else {
            throw error;
          }
        }
      });

      await Promise.all(promises);

      // Then: 1개만 성공, 나머지는 실패
      expect(successCount).toBe(1);
      expect(failureCount).toBe(9);
    });

    it('서로 다른 키에 대한 동시 작업은 모두 독립적으로 처리되어야 함', async () => {
      // Given
      const operations = 10;
      const results: { key: string; acquired: boolean }[] = [];

      // When: 10개의 서로 다른 키에 동시 락 획득
      const promises = Array.from({ length: operations }, async (_, i) => {
        const key = `test:independent:${i}`;
        const result = await lockService.acquireLock(key, 10000);
        results.push({ key, acquired: result.acquired });
      });

      await Promise.all(promises);

      // Then: 모두 성공
      expect(results.every((r) => r.acquired)).toBe(true);
    });
  });

  describe('엣지 케이스', () => {
    it('빈 문자열 키도 처리해야 함', async () => {
      // Given
      const key = '';

      // When
      const result = await lockService.acquireLock(key, 1000);

      // Then: 빈 키도 유효한 Redis 키로 처리됨
      expect(result.acquired).toBe(true);
    });

    it('특수문자가 포함된 키도 처리해야 함', async () => {
      // Given
      const key = 'stock:{product-123}:{option:456}';

      // When
      const result = await lockService.acquireLock(key, 1000);

      // Then
      expect(result.acquired).toBe(true);

      const value = await redisConfig.redis.get(key);
      expect(value).toBe(result.lockId);
    });

    it('매우 긴 키도 처리해야 함', async () => {
      // Given
      const key = 'test:' + 'x'.repeat(1000);

      // When
      const result = await lockService.acquireLock(key, 1000);

      // Then
      expect(result.acquired).toBe(true);
    });

    it('매우 짧은 TTL도 작동해야 함', async () => {
      // Given
      const key = 'test:short-ttl';
      const ttlMs = 1; // 1ms

      // When
      const result = await lockService.acquireLock(key, ttlMs);

      // Then
      expect(result.acquired).toBe(true);

      // 짧은 대기 후 락이 만료되었는지 확인
      await new Promise((resolve) => setTimeout(resolve, 10));
      const value = await redisConfig.redis.get(key);
      expect(value).toBeNull();
    });

    it('동일한 lockId로 두 번 해제 시도해도 안전해야 함', async () => {
      // Given
      const key = 'test:double-release';
      const { lockId } = await lockService.acquireLock(key, 10000);

      // When: 첫 번째 해제
      const firstRelease = await lockService.releaseLock(key, lockId!);

      // When: 두 번째 해제 (이미 삭제됨)
      const secondRelease = await lockService.releaseLock(key, lockId!);

      // Then
      expect(firstRelease).toBe(true);
      expect(secondRelease).toBe(false);
    });
  });

  describe('재고 시나리오 시뮬레이션', () => {
    it('동시에 100개의 재고 예약 요청이 들어와도 순차적으로 처리되어야 함', async () => {
      // Given: 재고 100개
      let stock = 100;
      const reservations = 100;
      let successCount = 0;
      let failureCount = 0;

      // When: 100개의 동시 예약 요청 (각 1개씩)
      const promises = Array.from({ length: reservations }, async (_, i) => {
        const lockKey = `stock:product-1:option-1`;

        try {
          await lockService.withLock(
            lockKey,
            async () => {
              // 재고 확인 및 예약 (실제 DB 작업 시뮬레이션)
              if (stock > 0) {
                await new Promise((r) => setTimeout(r, 1)); // DB 지연 시뮬레이션
                stock--;
                successCount++;
              } else {
                throw new Error('재고 부족');
              }
            },
            5000,
          );
        } catch (error) {
          if (error instanceof LockAcquisitionException) {
            failureCount++;
          }
          // 재고 부족 에러는 무시
        }
      });

      await Promise.all(promises);

      // Then: 락으로 인해 1개만 성공 (나머지 99개는 락 획득 실패)
      // 분산락은 대기하지 않으므로 첫 번째만 성공
      expect(successCount).toBe(1);
      expect(failureCount).toBe(99);
      expect(stock).toBe(99); // 1개만 차감됨
    });

    it('서로 다른 상품에 대한 동시 예약은 병렬로 처리되어야 함', async () => {
      // Given: 각각 10개의 재고를 가진 3개의 상품
      const stocks: Record<string, number> = {
        'product-1': 10,
        'product-2': 10,
        'product-3': 10,
      };
      const results: { productId: string; success: boolean }[] = [];

      // When: 각 상품에 대해 1개씩 동시 예약
      const promises = Object.keys(stocks).map(async (productId) => {
        const lockKey = `stock:${productId}:option-1`;

        try {
          await lockService.withLock(
            lockKey,
            async () => {
              if (stocks[productId] > 0) {
                await new Promise((r) => setTimeout(r, 10)); // DB 지연 시뮬레이션
                stocks[productId]--;
                results.push({ productId, success: true });
              }
            },
            5000,
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
