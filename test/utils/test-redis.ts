import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import Redis from 'ioredis';

export type TestRedisConfig = {
  container: StartedRedisContainer;
  redis: Redis;
  host: string;
  port: number;
};

/**
 * 테스트용 Redis 컨테이너 설정
 * TestContainers를 사용하여 실제 Redis 인스턴스 생성
 *
 * @returns 테스트 Redis 설정 정보
 */
export async function setupTestRedis(): Promise<TestRedisConfig> {
  const container = await new RedisContainer('redis:7-alpine').start();

  const host = container.getHost();
  const port = container.getMappedPort(6379);

  const redis = new Redis({
    host,
    port,
    maxRetriesPerRequest: 3,
  });

  return { container, redis, host, port };
}

/**
 * 테스트 Redis 정리
 */
export async function cleanupTestRedis(config: TestRedisConfig): Promise<void> {
  try {
    await config.redis.quit();
  } catch (error) {
    console.error('Failed to disconnect Redis:', error);
  }

  try {
    await config.container.stop();
  } catch (error) {
    console.error('Failed to stop Redis container:', error);
  }
}

/**
 * Redis의 모든 키 삭제
 */
export async function clearAllKeys(redis: Redis): Promise<void> {
  await redis.flushall();
}
