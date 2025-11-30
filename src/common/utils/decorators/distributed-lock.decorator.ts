import { DistributedLockService } from '@/common/infrastructure/locks/simple-distributed-lock.interface';

export const DISTRIBUTED_LOCK_KEY = 'DISTRIBUTED_LOCK';

export interface DistributedLockOptions {
  /** 락 TTL (밀리초, 기본 30000) */
  ttlMs?: number;

  /**
   * Pub/Sub 대기 타임아웃 (밀리초)
   * - 0: fail-fast (기본값, 즉시 실패)
   * - > 0: 락 해제 알림을 대기
   */
  waitTimeoutMs?: number;

  /**
   * TTL 자동 연장 활성화
   * - true: Redlock using() 메서드로 자동 연장
   * - false: 고정 TTL (기본값)
   */
  autoExtend?: boolean;
}

export interface DistributedLockMetadata {
  /** 락 키 패턴 (예: 'stock:{productId}:{optionId}') */
  keyPattern: string;
  /** 옵션 */
  options: DistributedLockOptions;
}

/**
 * 락 서비스를 가진 클래스의 인터페이스
 */
export interface HasLockService {
  lockService: DistributedLockService;
}

/**
 * 함수에서 파라미터 이름 추출
 */
function extractParamNames(fn: Function): string[] {
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

/**
 * 키 패턴에서 {paramName}을 실제 파라미터 값으로 치환
 */
function buildLockKey(
  keyPattern: string,
  originalMethod: Function,
  args: any[],
): string {
  const paramNames = extractParamNames(originalMethod);

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
 * 분산락 데코레이터 (AOP 방식)
 *
 * 이 데코레이터를 사용하는 클래스는 반드시 lockService를 생성자에서 주입받아야 합니다:
 *
 * @example
 * @Injectable()
 * export class MyService {
 *   constructor(
 *     @Inject(DISTRIBUTED_LOCK_SERVICE)
 *     private readonly lockService: DistributedLockService,
 *   ) {}
 *
 *   @DistributedLock('stock:{productId}:{optionId}')
 *   async reserveStock(productId: string, optionId: string, quantity: number) {
 *     // productId='prod-123', optionId='opt-456' 일 때
 *     // 락 키: 'stock:prod-123:opt-456'
 *   }
 * }
 *
 * @example
 * // Pub/Sub 대기 (최대 5초)
 * @DistributedLock('stock:{productId}:{optionId}', { waitTimeoutMs: 5000 })
 * async reserveStockWithWait(productId: string, optionId: string, quantity: number) { }
 *
 * @example
 * // TTL 자동 연장
 * @DistributedLock('stock:{productId}:{optionId}', { autoExtend: true })
 * async longRunningOperation(productId: string, optionId: string) { }
 *
 * @example
 * // Pub/Sub 대기 + TTL 자동 연장
 * @DistributedLock('stock:{productId}:{optionId}', { waitTimeoutMs: 5000, autoExtend: true })
 * async reserveStockWithWaitAndAutoExtend(...) { }
 */
export function DistributedLock(
  keyPattern: string,
  options: DistributedLockOptions = {},
): MethodDecorator {
  const resolvedOptions: DistributedLockOptions = {
    ttlMs: options.ttlMs ?? 30000,
    waitTimeoutMs: options.waitTimeoutMs ?? 0,
    autoExtend: options.autoExtend ?? false,
  };

  return function (
    target: any,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: HasLockService, ...args: any[]) {
      // 락 서비스를 인스턴스에서 가져옴 (생성자 주입)
      const lockService = this.lockService;
      if (!lockService) {
        throw new Error(
          `lockService가 주입되지 않았습니다. ${target.constructor.name}에 DISTRIBUTED_LOCK_SERVICE를 주입하세요.`,
        );
      }

      // 파라미터에서 락 키 생성
      const key = buildLockKey(keyPattern, originalMethod, args);

      // 락을 걸고 원래 메서드 실행
      return lockService.withLockExtended(
        key,
        () => originalMethod.apply(this, args),
        resolvedOptions,
      );
    };

    return descriptor;
  };
}
