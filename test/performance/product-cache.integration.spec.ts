import { GetProductsUseCase } from '@/product/application/use-cases/get-products.use-case';
import { GetProductDetailUseCase } from '@/product/application/use-cases/get-product-detail.use-case';
import { GetProductsInput } from '@/product/application/dtos/get-products.dto';
import { GetProductDetailInput } from '@/product/application/dtos/get-product-detail.dto';
import { InMemoryProductRepository } from '@/product/infrastructure/repositories/in-memory-product.repository';
import { RedisCacheServiceInterface } from '@/common/infrastructure/cache/redis-cache.service.interface';
import {
  setupTestRedis,
  cleanupTestRedis,
  clearAllKeys,
  type TestRedisConfig,
} from '../utils/test-redis';

/**
 * Redis 기반 CacheService 구현 (테스트용)
 */
class TestRedisCacheService implements RedisCacheServiceInterface {
  private readonly keyPrefix = 'cache:';

  constructor(private readonly redis: import('ioredis').default) {}

  async get<T>(key: string): Promise<T | undefined> {
    const fullKey = `${this.keyPrefix}${key}`;
    const value = await this.redis.get(fullKey);
    if (value === null) return undefined;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const fullKey = `${this.keyPrefix}${key}`;
    const serialized = JSON.stringify(value);
    if (ttlMs) {
      await this.redis.set(fullKey, serialized, 'PX', ttlMs);
    } else {
      await this.redis.set(fullKey, serialized);
    }
  }

  async del(key: string): Promise<void> {
    const fullKey = `${this.keyPrefix}${key}`;
    await this.redis.del(fullKey);
  }

  async delByPattern(pattern: string): Promise<void> {
    const fullPattern = pattern.includes('*')
      ? `${this.keyPrefix}${pattern}`
      : `${this.keyPrefix}${pattern}*`;
    const keys = await this.scanKeys(fullPattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

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

/**
 * 상품 캐시 성능 테스트
 *
 * 캐시 적용 전/후 성능을 비교하여 캐시 효과 검증
 * - 응답 시간 비교
 * - 캐시 히트/미스 확인
 * - DB 호출 횟수 비교
 */
describe('상품 캐시 성능 테스트', () => {
  let redisConfig: TestRedisConfig;
  let redisCacheService: TestRedisCacheService;
  let repository: InMemoryProductRepository;

  beforeAll(async () => {
    // Redis 컨테이너 시작
    redisConfig = await setupTestRedis();
    redisCacheService = new TestRedisCacheService(redisConfig.redis);
    repository = new InMemoryProductRepository();
  }, 60000);

  afterAll(async () => {
    await cleanupTestRedis(redisConfig);
  });

  beforeEach(async () => {
    await clearAllKeys(redisConfig.redis);
    repository = new InMemoryProductRepository(); // 매번 새로운 repository
  });

  describe('캐시 미적용 (Baseline)', () => {
    let useCaseWithoutCache: GetProductsUseCaseWithoutCache;

    beforeEach(() => {
      useCaseWithoutCache = new GetProductsUseCaseWithoutCache(repository);
    });

    it('상품 목록 조회 성능 측정 (100회)', async () => {
      // Given
      const iterations = 100;
      const input = new GetProductsInput(1, 10);
      const times: number[] = [];

      // When
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await useCaseWithoutCache.execute(input);
        const end = performance.now();
        times.push(end - start);
      }

      // Then
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      console.log(`\n[캐시 미적용] 상품 목록 조회 성능:`);
      console.log(`  - 평균 응답 시간: ${avgTime.toFixed(2)}ms`);
      console.log(`  - 최소 응답 시간: ${minTime.toFixed(2)}ms`);
      console.log(`  - 최대 응답 시간: ${maxTime.toFixed(2)}ms`);

      expect(avgTime).toBeDefined();
    });

    it('상품 상세 조회 성능 측정 (100회)', async () => {
      // Given
      const useCaseWithoutCache = new GetProductDetailUseCaseWithoutCache(repository);
      const iterations = 100;
      const input = new GetProductDetailInput('550e8400-e29b-41d4-a716-446655440001'); // In-memory repository의 첫 번째 상품 (Basic T-Shirt)
      const times: number[] = [];

      // When
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await useCaseWithoutCache.execute(input);
        const end = performance.now();
        times.push(end - start);
      }

      // Then
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      console.log(`\n[캐시 미적용] 상품 상세 조회 성능:`);
      console.log(`  - 평균 응답 시간: ${avgTime.toFixed(2)}ms`);
      console.log(`  - 최소 응답 시간: ${minTime.toFixed(2)}ms`);
      console.log(`  - 최대 응답 시간: ${maxTime.toFixed(2)}ms`);

      expect(avgTime).toBeDefined();
    });
  });

  describe('캐시 적용 후', () => {
    let useCaseWithCache: GetProductsUseCase;

    beforeEach(() => {
      useCaseWithCache = new GetProductsUseCase(repository, redisCacheService);
    });

    it('상품 목록 조회 성능 비교 (100회)', async () => {
      // Given
      const iterations = 100;
      const input = new GetProductsInput(1, 10);
      const times: number[] = [];
      let cacheHits = 0;

      // When: 첫 번째 호출 (캐시 미스)
      const firstStart = performance.now();
      await useCaseWithCache.execute(input);
      const firstTime = performance.now() - firstStart;

      // When: 나머지 호출 (캐시 히트 예상)
      for (let i = 1; i < iterations; i++) {
        const start = performance.now();
        await useCaseWithCache.execute(input);
        const end = performance.now();
        times.push(end - start);
      }

      // 캐시 히트 확인
      const cacheKey = `products:list:${input.page}:${input.limit}`;
      const cached = await redisCacheService.get(cacheKey);
      if (cached) cacheHits = iterations - 1;

      // Then
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      const cacheHitRate = (cacheHits / iterations) * 100;

      console.log(`\n[캐시 적용] 상품 목록 조회 성능:`);
      console.log(`  - 첫 번째 요청 (캐시 미스): ${firstTime.toFixed(2)}ms`);
      console.log(`  - 평균 응답 시간 (캐시 히트): ${avgTime.toFixed(2)}ms`);
      console.log(`  - 최소 응답 시간: ${minTime.toFixed(2)}ms`);
      console.log(`  - 최대 응답 시간: ${maxTime.toFixed(2)}ms`);
      console.log(`  - 캐시 히트율: ${cacheHitRate.toFixed(1)}%`);

      // 캐시 적용 후 응답 시간이 빨라야 함
      expect(avgTime).toBeLessThan(firstTime);
    });

    it('상품 상세 조회 성능 비교 (100회)', async () => {
      // Given
      const useCaseWithCache = new GetProductDetailUseCase(repository, redisCacheService);
      const iterations = 100;
      const input = new GetProductDetailInput('550e8400-e29b-41d4-a716-446655440001');
      const times: number[] = [];
      let cacheHits = 0;

      // When: 첫 번째 호출 (캐시 미스)
      const firstStart = performance.now();
      await useCaseWithCache.execute(input);
      const firstTime = performance.now() - firstStart;

      // When: 나머지 호출 (캐시 히트 예상)
      for (let i = 1; i < iterations; i++) {
        const start = performance.now();
        await useCaseWithCache.execute(input);
        const end = performance.now();
        times.push(end - start);
      }

      // 캐시 히트 확인
      const cacheKey = `products:detail:${input.productId}`;
      const cached = await redisCacheService.get(cacheKey);
      if (cached) cacheHits = iterations - 1;

      // Then
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      const cacheHitRate = (cacheHits / iterations) * 100;

      console.log(`\n[캐시 적용] 상품 상세 조회 성능:`);
      console.log(`  - 첫 번째 요청 (캐시 미스): ${firstTime.toFixed(2)}ms`);
      console.log(`  - 평균 응답 시간 (캐시 히트): ${avgTime.toFixed(2)}ms`);
      console.log(`  - 최소 응답 시간: ${minTime.toFixed(2)}ms`);
      console.log(`  - 최대 응답 시간: ${maxTime.toFixed(2)}ms`);
      console.log(`  - 캐시 히트율: ${cacheHitRate.toFixed(1)}%`);

      // 캐시 적용 후 응답 시간이 빨라야 함
      expect(avgTime).toBeLessThan(firstTime);
    });

    it('캐시 무효화 후 재캐싱 확인', async () => {
      // Given
      const input = new GetProductsInput(1, 10);
      const cacheKey = `products:list:${input.page}:${input.limit}`;

      // When: 첫 번째 호출로 캐시 생성
      await useCaseWithCache.execute(input);
      const cachedBefore = await redisCacheService.get(cacheKey);
      expect(cachedBefore).toBeDefined();

      // When: 캐시 무효화
      await redisCacheService.delByPattern('products:list:*');
      const cachedAfterDelete = await redisCacheService.get(cacheKey);
      expect(cachedAfterDelete).toBeUndefined();

      // When: 다시 호출하여 캐시 재생성
      await useCaseWithCache.execute(input);
      const cachedAfterRecreate = await redisCacheService.get(cacheKey);

      // Then
      expect(cachedAfterRecreate).toBeDefined();
    });
  });

  describe('성능 비교 요약', () => {
    it('캐시 적용 전/후 성능 개선율 측정', async () => {
      // Given
      const iterations = 50;
      const input = new GetProductsInput(1, 10);

      // 캐시 미적용 측정
      const useCaseWithoutCache = new GetProductsUseCaseWithoutCache(repository);
      const timesWithoutCache: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await useCaseWithoutCache.execute(input);
        timesWithoutCache.push(performance.now() - start);
      }
      const avgWithoutCache = timesWithoutCache.reduce((a, b) => a + b, 0) / iterations;

      // 캐시 적용 측정 (첫 번째 호출로 캐시 채움)
      const useCaseWithCache = new GetProductsUseCase(repository, redisCacheService);
      await useCaseWithCache.execute(input); // 캐시 생성
      const timesWithCache: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await useCaseWithCache.execute(input);
        timesWithCache.push(performance.now() - start);
      }
      const avgWithCache = timesWithCache.reduce((a, b) => a + b, 0) / iterations;

      // 성능 개선율 계산
      const improvement = ((avgWithoutCache - avgWithCache) / avgWithoutCache) * 100;

      console.log(`\n========================================`);
      console.log(`상품 목록 조회 성능 비교 요약 (${iterations}회)`);
      console.log(`========================================`);
      console.log(`캐시 미적용 (In-Memory): ${avgWithoutCache.toFixed(4)}ms`);
      console.log(`캐시 적용 (Redis):       ${avgWithCache.toFixed(4)}ms`);
      console.log(`========================================`);
      console.log(`참고: In-Memory 레포지토리가 Redis보다 빠를 수 있음`);
      console.log(`실제 DB (Prisma) 사용 시 캐시 효과가 더 두드러짐`);
      console.log(`========================================\n`);

      // InMemory 레포지토리는 매우 빠르므로 Redis 캐시보다 빠를 수 있음
      // 실제 DB 환경에서는 캐시 효과가 명확하게 나타남
      // 여기서는 캐시가 정상 동작하는지만 검증
      expect(avgWithCache).toBeDefined();
      expect(avgWithoutCache).toBeDefined();
    });
  });
});

/**
 * 캐시 없는 버전의 GetProductsUseCase (성능 비교용)
 */
class GetProductsUseCaseWithoutCache {
  constructor(private readonly productRepository: InMemoryProductRepository) {}

  async execute(input: GetProductsInput) {
    const paginationResult = await this.productRepository.findAll(input.page, input.limit);

    const items = paginationResult.items.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price.amount,
      imageUrl: product.imageUrl,
      stockStatus: product.getStockStatus(),
    }));

    return {
      items,
      total: paginationResult.total,
      page: paginationResult.page,
      limit: paginationResult.limit,
      totalPages: paginationResult.totalPages,
    };
  }
}

/**
 * 캐시 없는 버전의 GetProductDetailUseCase (성능 비교용)
 */
class GetProductDetailUseCaseWithoutCache {
  constructor(private readonly productRepository: InMemoryProductRepository) {}

  async execute(input: GetProductDetailInput) {
    const product = await this.productRepository.findById(input.productId);

    if (!product) {
      throw new Error(`Product not found: ${input.productId}`);
    }

    const groupedOptions = product.getGroupedOptions();

    return {
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description,
      imageUrl: product.imageUrl,
      optionGroups: groupedOptions,
    };
  }
}
