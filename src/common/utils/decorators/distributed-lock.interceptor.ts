import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, lastValueFrom } from 'rxjs';
import {
  DISTRIBUTED_LOCK_KEY,
  DistributedLockMetadata,
} from './distributed-lock.decorator';
import { DISTRIBUTED_LOCK_SERVICE } from '@/common/infrastructure/locks/tokens';
import { LockAcquisitionException } from '@/common/infrastructure/locks/lock.exceptions';
import { PubSubDistributedLockService } from '@/common/infrastructure/locks/pubsub-distributed-lock.service';

/**
 * 분산락 인터셉터
 * @DistributedLock 데코레이터가 적용된 메서드에 자동으로 락 적용
 *
 * 기능:
 * - 기본 모드: fail-fast (즉시 실패)
 * - waitTimeoutMs > 0: Pub/Sub 기반 락 대기
 * - autoExtend: true: TTL 자동 연장 (Redlock using 메서드)
 *
 * 파라미터 이름 추출 방식:
 * - TypeScript 컴파일 시 파라미터 이름이 유지되지 않으므로
 * - 함수 toString()에서 정규식으로 파라미터 이름 추출
 */
@Injectable()
export class DistributedLockInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Inject(DISTRIBUTED_LOCK_SERVICE)
    private readonly lockService: PubSubDistributedLockService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const metadata = this.reflector.get<DistributedLockMetadata>(
      DISTRIBUTED_LOCK_KEY,
      context.getHandler(),
    );

    // 데코레이터가 없으면 락 없이 진행
    if (!metadata) {
      return next.handle();
    }

    const handler = context.getHandler();
    const args = context.getArgs();

    // 락 키 생성
    const key = this.buildLockKey(metadata.keyPattern, handler, args);
    const { ttlMs = 30000, waitTimeoutMs = 0, autoExtend = false } = metadata.options;

    // autoExtend가 활성화된 경우 withLockExtended 사용
    if (autoExtend) {
      return this.executeWithAutoExtend(key, next, { ttlMs, waitTimeoutMs });
    }

    // 일반 모드: 수동 획득/해제
    return this.executeWithManualLock(key, next, { ttlMs, waitTimeoutMs });
  }

  /**
   * autoExtend 모드: Redlock using() 메서드로 자동 TTL 연장
   */
  private async executeWithAutoExtend(
    key: string,
    next: CallHandler,
    options: { ttlMs: number; waitTimeoutMs: number },
  ): Promise<Observable<any>> {
    const result = await this.lockService.withLockExtended(
      key,
      async () => {
        return lastValueFrom(next.handle());
      },
      {
        ttlMs: options.ttlMs,
        waitTimeoutMs: options.waitTimeoutMs,
        autoExtend: true,
      },
    );

    return from([result]);
  }

  /**
   * 일반 모드: 수동 락 획득/해제
   */
  private async executeWithManualLock(
    key: string,
    next: CallHandler,
    options: { ttlMs: number; waitTimeoutMs: number },
  ): Promise<Observable<any>> {
    // 락 획득 (Pub/Sub 대기 지원)
    const lockResult = await this.lockService.acquireLockExtended(key, {
      ttlMs: options.ttlMs,
      waitTimeoutMs: options.waitTimeoutMs,
    });

    if (!lockResult.acquired || !lockResult.lock) {
      throw new LockAcquisitionException(key);
    }

    // 메서드 실행 및 락 해제 보장
    try {
      const result = await lastValueFrom(next.handle());
      return from([result]);
    } finally {
      await this.lockService.releaseLock(key, lockResult.lockId!, lockResult.lock);
    }
  }

  /**
   * 키 패턴에서 {paramName}을 실제 파라미터 값으로 치환
   */
  private buildLockKey(
    keyPattern: string,
    handler: Function,
    args: any[],
  ): string {
    const paramNames = this.extractParamNames(handler);

    let key = keyPattern;
    const placeholderRegex = /\{(\w+)\}/g;

    key = key.replace(placeholderRegex, (match, paramName) => {
      const paramIndex = paramNames.indexOf(paramName);
      if (paramIndex === -1) {
        return match;
      }

      const value = args[paramIndex];
      if (value === undefined || value === null) {
        return 'null';
      }

      return String(value);
    });

    return key;
  }

  /**
   * 함수에서 파라미터 이름 추출
   */
  private extractParamNames(fn: Function): string[] {
    const fnStr = fn.toString();
    const match = fnStr.match(/(?:async\s+)?[\w$]+\s*\(([^)]*)\)/);

    if (!match || !match[1]) {
      return [];
    }

    const paramsStr = match[1];

    return paramsStr
      .split(',')
      .map((param) => {
        const withoutType = param.split(':')[0];
        const withoutDefault = withoutType.split('=')[0];
        return withoutDefault.trim().replace(/[?!]/g, '');
      })
      .filter((name) => name.length > 0);
  }
}
