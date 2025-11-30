import { RedisCacheServiceInterface } from '@/common/infrastructure/cache/redis-cache.service.interface';

export interface RedisCacheableOptions {
  /** TTL (밀리초, 기본 60000) */
  ttlMs?: number;
}

/**
 * Redis 캐시 서비스를 가진 클래스의 인터페이스
 */
export interface HasRedisCacheService {
  redisCacheService: RedisCacheServiceInterface;
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

  return match[1]
    .split(',')
    .map((param) => {
      const withoutType = param.split(':')[0];
      const withoutDefault = withoutType.split('=')[0];
      return withoutDefault.trim().replace(/[?!]/g, '');
    })
    .filter((name) => name.length > 0);
}

/**
 * 키 패턴에서 {paramName} 또는 {paramName.property}를 실제 값으로 치환
 */
export function buildRedisCacheKey(
  keyPattern: string,
  originalMethod: Function,
  args: any[],
): string {
  const paramNames = extractParamNames(originalMethod);

  return keyPattern.replace(/\{(\w+)(?:\.(\w+))?\}/g, (match, paramName, propertyName) => {
    const paramIndex = paramNames.indexOf(paramName);
    if (paramIndex === -1) return match;

    let value = args[paramIndex];
    if (value === undefined || value === null) return 'null';

    if (propertyName && typeof value === 'object') {
      value = value[propertyName];
      if (value === undefined || value === null) return 'null';
    }

    return String(value);
  });
}

/**
 * Redis 캐시 데코레이터 (AOP)
 *
 * NestJS 기본 CacheInterceptor와 달리 동적 키 패턴을 지원합니다.
 * Redis 패턴 기반 캐시 무효화와 함께 사용하기 위해 커스텀 구현.
 *
 * @example
 * ```typescript
 * @RedisCacheable('products:list:{input.page}:{input.limit}', { ttlMs: 30000 })
 * async execute(input: GetProductsInput): Promise<GetProductsOutput> { ... }
 * ```
 *
 * @param keyPattern 캐시 키 패턴 ({param}, {param.property} 형식 지원)
 * @param options 캐시 옵션 (TTL 등)
 */
export function RedisCacheable(
  keyPattern: string,
  options: RedisCacheableOptions = {},
): MethodDecorator {
  const ttlMs = options.ttlMs ?? 60000;

  return function (target: any, _propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: HasRedisCacheService, ...args: any[]) {
      const { redisCacheService } = this;
      if (!redisCacheService) {
        throw new Error(
          `redisCacheService가 주입되지 않았습니다. ${target.constructor.name}에 REDIS_CACHE_SERVICE를 주입하세요.`,
        );
      }

      const key = buildRedisCacheKey(keyPattern, originalMethod, args);

      // 캐시 히트
      const cached = await redisCacheService.get(key);
      if (cached !== undefined) {
        return cached;
      }

      // 캐시 미스 - 원본 실행 후 캐싱
      const result = await originalMethod.apply(this, args);
      await redisCacheService.set(key, result, ttlMs);

      return result;
    };

    return descriptor;
  };
}
