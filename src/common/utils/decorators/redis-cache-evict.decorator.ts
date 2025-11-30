import { buildRedisCacheKey, HasRedisCacheService } from './redis-cacheable.decorator';

/**
 * Redis 캐시 무효화 데코레이터 (AOP)
 *
 * 메서드 실행 후 지정된 패턴의 캐시를 무효화합니다.
 * Redis SCAN 명령어를 사용하여 패턴 매칭 키를 삭제합니다.
 *
 * @example
 * ```typescript
 * @RedisCacheEvict(['products:list:*', 'products:detail:{productId}'])
 * async reserveStock(productId: string, quantity: number): Promise<void> { ... }
 * ```
 *
 * @param keyPatterns 무효화할 캐시 키 패턴 배열
 */
export function RedisCacheEvict(keyPatterns: string[]): MethodDecorator {
  return function (target: any, _propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: HasRedisCacheService, ...args: any[]) {
      // 원본 메서드 먼저 실행
      const result = await originalMethod.apply(this, args);

      // 캐시 무효화
      const { redisCacheService } = this;
      if (redisCacheService) {
        await Promise.all(
          keyPatterns.map((pattern) => {
            const key = buildRedisCacheKey(pattern, originalMethod, args);
            return redisCacheService.delByPattern(key);
          }),
        );
      }

      return result;
    };

    return descriptor;
  };
}
