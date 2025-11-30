import { Global, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';
import { RedisCacheService } from './redis-cache.service';
import { RedisCacheInvalidationService } from './redis-cache-invalidation.service';
import { REDIS_CACHE_SERVICE, REDIS_CACHE_INVALIDATION_SERVICE } from './tokens';

/**
 * 캐시 모듈
 *
 * Redis 기반 분산 캐시를 제공합니다.
 * 전역 모듈로 등록되어 모든 모듈에서 캐시 서비스 사용 가능
 *
 * 특징:
 * - Redis 기반 캐시 저장소
 * - 키 프리픽스: 'cache:'
 * - 기본 TTL: 60초
 * - Pub/Sub 기반 분산 캐시 무효화
 */
@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const store = await redisStore({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD || undefined,
          keyPrefix: 'cache:',
          ttl: 60000, // 기본 60초
        });
        return { store };
      },
    }),
  ],
  providers: [
    {
      provide: REDIS_CACHE_SERVICE,
      useClass: RedisCacheService,
    },
    {
      provide: REDIS_CACHE_INVALIDATION_SERVICE,
      useClass: RedisCacheInvalidationService,
    },
  ],
  exports: [REDIS_CACHE_SERVICE, REDIS_CACHE_INVALIDATION_SERVICE],
})
export class CacheConfigModule {}
