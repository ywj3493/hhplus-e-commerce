import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import Redlock from 'redlock';
import { REDIS_CLIENT, DISTRIBUTED_LOCK_SERVICE, REDLOCK_INSTANCE } from './tokens';
import { SimpleDistributedLockService } from './simple-distributed-lock.service';
import { PubSubDistributedLockService } from './pubsub-distributed-lock.service';
import { DistributedLockInterceptor } from '@/common/utils/decorators/distributed-lock.interceptor';

/**
 * Redis 모듈
 * 전역 모듈로 등록되어 모든 모듈에서 분산락 서비스 사용 가능
 *
 * 기능:
 * - Redlock 기반 분산락 (TTL 자동 연장, Pub/Sub 대기)
 * - 환경 변수로 레거시 서비스 롤백 가능 (USE_LEGACY_LOCK=true)
 *
 * 테스트 환경:
 * - 통합 테스트에서는 TestContainers로 실제 Redis 인스턴스 사용
 * - NestJS 모듈 테스트에서는 모듈 자체를 모킹하거나 TestContainers 사용
 */
@Global()
@Module({
  providers: [
    // Redis 클라이언트
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        return new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD,
          maxRetriesPerRequest: 3,
          lazyConnect: true, // 실제 사용 시점에 연결
        });
      },
    },
    // Redlock 인스턴스
    {
      provide: REDLOCK_INSTANCE,
      useFactory: (redis: Redis) => {
        return new Redlock([redis], {
          // Pub/Sub으로 대기하므로 재시도 비활성화
          retryCount: 0,
          // TTL 자동 연장 임계값 (TTL 잔여 시간이 이 값 이하면 연장)
          automaticExtensionThreshold: 500,
        });
      },
      inject: [REDIS_CLIENT],
    },
    // 분산락 서비스 (Redlock 기반)
    {
      provide: DISTRIBUTED_LOCK_SERVICE,
      useClass:
        process.env.USE_LEGACY_LOCK === 'true'
          ? SimpleDistributedLockService
          : PubSubDistributedLockService,
    },
    // AOP 인터셉터
    DistributedLockInterceptor,
  ],
  exports: [
    REDIS_CLIENT,
    REDLOCK_INSTANCE,
    DISTRIBUTED_LOCK_SERVICE,
    DistributedLockInterceptor,
  ],
})
export class RedisModule {}
