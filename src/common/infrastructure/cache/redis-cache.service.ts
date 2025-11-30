import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@/common/infrastructure/locks/tokens';
import { RedisCacheServiceInterface } from './redis-cache.service.interface';

/**
 * Redis 캐시 서비스 구현
 *
 * NestJS CacheManager를 래핑하여 Redis 패턴 삭제 기능 추가
 * - get, set, del: CACHE_MANAGER 위임 (NestJS 기본 기능)
 * - delByPattern: Redis SCAN 직접 사용 (확장 기능)
 */
@Injectable()
export class RedisCacheService implements RedisCacheServiceInterface {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async get<T>(key: string): Promise<T | undefined> {
    const value = await this.cache.get<T>(key);
    return value ?? undefined;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    await this.cache.set(key, value, ttlMs);
  }

  async del(key: string): Promise<void> {
    await this.cache.del(key);
  }

  /**
   * 패턴 기반 캐시 삭제 (Redis 전용)
   *
   * Redis SCAN 명령어로 패턴 매칭 키 조회 후 삭제
   * KEYS 명령어보다 성능이 좋음 (블로킹 없음)
   */
  async delByPattern(pattern: string): Promise<void> {
    const fullPattern = pattern.includes('*') ? `cache:${pattern}` : `cache:${pattern}*`;
    const keys = await this.scanKeys(fullPattern);

    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * SCAN 명령어로 키 조회
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, foundKeys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      keys.push(...foundKeys);
    } while (cursor !== '0');

    return keys;
  }
}
