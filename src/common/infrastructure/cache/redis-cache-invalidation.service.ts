import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@/common/infrastructure/locks/tokens';
import { REDIS_CACHE_SERVICE } from './tokens';
import { RedisCacheServiceInterface } from './redis-cache.service.interface';

/**
 * Redis 분산 캐시 무효화 서비스
 *
 * Redis Pub/Sub을 사용하여 여러 인스턴스 간 캐시 무효화를 동기화합니다.
 *
 * 동작 방식:
 * 1. 캐시 무효화 요청 시 로컬 캐시 삭제
 * 2. Redis Pub/Sub 채널로 무효화 메시지 발행
 * 3. 다른 인스턴스에서 메시지 수신 시 해당 캐시 삭제
 */
@Injectable()
export class RedisCacheInvalidationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheInvalidationService.name);
  private subscriber: Redis;
  private readonly CHANNEL = 'cache:invalidation';

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(REDIS_CACHE_SERVICE) private readonly cacheService: RedisCacheServiceInterface,
  ) {
    // Pub/Sub을 위한 별도 연결 생성 (Redis는 Subscribe 모드에서 다른 명령 불가)
    this.subscriber = this.redis.duplicate();
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.subscriber.subscribe(this.CHANNEL);
      this.subscriber.on('message', (channel, message) => {
        if (channel === this.CHANNEL) {
          this.handleMessage(message).catch((error) => {
            this.logger.error('캐시 무효화 메시지 처리 실패', error);
          });
        }
      });
      this.logger.log(`캐시 무효화 채널 구독 시작: ${this.CHANNEL}`);
    } catch (error) {
      this.logger.error('캐시 무효화 서비스 초기화 실패', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.subscriber.unsubscribe(this.CHANNEL);
      await this.subscriber.quit();
      this.logger.log('캐시 무효화 채널 구독 해제');
    } catch (error) {
      this.logger.error('캐시 무효화 서비스 종료 실패', error);
    }
  }

  /**
   * 캐시 무효화 (로컬 + 분산)
   *
   * @param pattern 캐시 키 패턴 (예: 'products:list:*', 'products:detail:123')
   */
  async invalidate(pattern: string): Promise<void> {
    // 1. 로컬 캐시 삭제
    await this.cacheService.delByPattern(pattern);

    // 2. 다른 인스턴스에 알림 (Pub/Sub)
    const message = JSON.stringify({
      pattern,
      timestamp: Date.now(),
      source: process.pid, // 발행 인스턴스 식별
    });
    await this.redis.publish(this.CHANNEL, message);
  }

  /**
   * Pub/Sub 메시지 처리
   */
  private async handleMessage(message: string): Promise<void> {
    try {
      const { pattern, source } = JSON.parse(message);

      // 자기 자신이 발행한 메시지는 무시 (이미 로컬 캐시 삭제됨)
      if (source === process.pid) {
        return;
      }

      // 다른 인스턴스에서 발행한 메시지 처리
      await this.cacheService.delByPattern(pattern);
      this.logger.debug(`캐시 무효화 수신: ${pattern}`);
    } catch (error) {
      this.logger.error(`캐시 무효화 메시지 파싱 실패: ${message}`, error);
    }
  }
}
