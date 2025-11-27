# Issue 028: Redis Distributed Lock for Stock Management

**Status**: Completed
**Priority**: High
**Created**: 2025-11-26
**Updated**: 2025-11-27
**Branch**: `step11`

## Problem Statement

### Current Issue
The stock management system uses optimistic locking with version-based concurrency control. This approach causes several issues:

```typescript
// Previous implementation (product-prisma.repository.ts)
const result = await this.prisma.stock.updateMany({
  where: {
    id: stockId,
    version: stockModel.version,  // Optimistic lock check
    availableQuantity: { gte: quantity },
  },
  data: {
    availableQuantity: { decrement: quantity },
    reservedQuantity: { increment: quantity },
    version: { increment: 1 },  // Version bump
    updatedAt: new Date(),
  },
});

if (result.count === 0) {
  throw new OptimisticLockException();  // Retry required
}
```

### Issues with Optimistic Locking

1. **High Contention Overhead**: Under heavy concurrent load, most requests fail and require retry
2. **Database Load**: Each retry results in additional database queries
3. **Unpredictable Latency**: Retry loops cause variable response times
4. **Complex Client Code**: `CreateOrderUseCase` requires retry logic with exponential backoff

### Additional Issue: NestJS Interceptor Limitation

The initial implementation using `@UseInterceptors(DistributedLockInterceptor)` had a critical flaw:

**NestJS interceptors only work in HTTP request context**, not for service-to-service calls.

```typescript
// PROBLEM: Interceptor doesn't execute when called directly
@UseInterceptors(DistributedLockInterceptor)  // Only works for HTTP requests!
export class StockManagementService {
  @DistributedLock('stock:{productId}:{optionId}')
  async reserveStock(...) { }
}

// When CreateOrderUseCase calls stockManagementService.reserveStock() directly,
// the interceptor is bypassed and no lock is acquired!
```

## Solution: AOP Method Decorator with Redis Distributed Lock

### Approach

Replace NestJS Interceptor with **TypeScript Method Decorator** that wraps the original method:

1. Method decorator intercepts the call regardless of context
2. Acquire lock before method execution
3. Execute original method while holding lock
4. Release lock after completion (or on TTL expiry)

### Key Change: Interceptor → Method Decorator

```typescript
// NEW: AOP-style method decorator (works for all calls)
export function DistributedLock(
  keyPattern: string,
  options: DistributedLockOptions = {},
): MethodDecorator {
  return function (target, _propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: HasLockService, ...args: any[]) {
      const lockService = this.lockService;  // Injected via constructor
      const key = buildLockKey(keyPattern, originalMethod, args);

      return lockService.withLockExtended(
        key,
        () => originalMethod.apply(this, args),
        options,
      );
    };

    return descriptor;
  };
}
```

### Benefits

- **Works for all call contexts**: Service-to-service, HTTP, scheduled jobs, etc.
- **Same decorator syntax**: `@DistributedLock('stock:{productId}:{optionId}')`
- **Guaranteed Mutual Exclusion**: Only one request can modify stock at a time
- **Reduced Database Load**: No retry loops, single database write per request
- **Pub/Sub Wait Support**: Can wait for lock release instead of fail-fast
- **TTL Auto-Extension**: Long operations don't lose lock prematurely
- **Redis Connection Error Detection**: Distinguishes connection failures from lock conflicts

### Trade-offs

- **External Dependency**: Requires Redis infrastructure
- **Constructor Injection Required**: Service must inject `lockService`
- **Network Latency**: Additional round-trip to Redis

## Implementation

### 1. Infrastructure Layer

**Files Created** (`src/common/infrastructure/locks/`):
- `tokens.ts` - DI tokens (REDIS_CLIENT, REDLOCK_INSTANCE, DISTRIBUTED_LOCK_SERVICE)
- `lock-options.interface.ts` - Lock options (ttlMs, waitTimeoutMs, autoExtend)
- `simple-distributed-lock.interface.ts` - Service interface
- `simple-distributed-lock.service.ts` - Simple Redis SETNX implementation
- `pubsub-distributed-lock.service.ts` - Advanced Redlock + Pub/Sub implementation
- `lock.exceptions.ts` - LockAcquisitionException, RedisConnectionException
- `locks.module.ts` - Module configuration

**Key Implementation - Simple SETNX**:

```typescript
// simple-distributed-lock.service.ts
private readonly RELEASE_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

async acquireLock(key: string, ttlMs: number = 30000): Promise<LockResult> {
  const lockId = uuid();
  const result = await this.redis.set(key, lockId, 'PX', ttlMs, 'NX');

  if (result === 'OK') {
    return { acquired: true, lockId };
  }
  return { acquired: false, lockId: null };
}

async releaseLock(key: string, lockId: string): Promise<boolean> {
  const result = await this.redis.eval(this.RELEASE_SCRIPT, 1, key, lockId);
  return result === 1;
}
```

**Advanced Implementation - Pub/Sub + Auto-Extend**:

```typescript
// pubsub-distributed-lock.service.ts
async withLockExtended<T>(
  key: string,
  fn: () => Promise<T>,
  options: LockOptions = {},
): Promise<T> {
  const lockResult = await this.acquireLockExtended(key, options);

  if (!lockResult.acquired) {
    throw new LockAcquisitionException(key);
  }

  let extensionTimer: NodeJS.Timeout | null = null;

  try {
    if (options.autoExtend) {
      // Auto-extend TTL every ttlMs/2
      extensionTimer = setInterval(async () => {
        await lockResult.lock!.extend(options.ttlMs);
      }, options.ttlMs / 2);
    }

    return await fn();
  } finally {
    if (extensionTimer) clearInterval(extensionTimer);
    await this.releaseLock(key, lockResult.lockId!, lockResult.lock);
  }
}
```

**Redis Connection Error Detection**:

```typescript
// pubsub-distributed-lock.service.ts
private async checkConnectionError(error: ExecutionError): Promise<boolean> {
  for (const attemptPromise of error.attempts) {
    const stats = await attemptPromise;
    for (const [, err] of stats.votesAgainst) {
      if (
        err.message.includes('ECONNREFUSED') ||
        err.message.includes('ENOTFOUND') ||
        err.message.includes('Connection is closed') ||
        err.name === 'MaxRetriesPerRequestError'
      ) {
        return true;
      }
    }
  }
  return false;
}
```

### 2. Decorator Layer

**Files Created** (`src/common/utils/decorators/`):
- `distributed-lock.decorator.ts` - AOP method decorator
- `distributed-lock.interceptor.ts` - Legacy NestJS interceptor (kept for HTTP context)

**Dynamic Key Pattern with Parameter Extraction**:

```typescript
// distributed-lock.decorator.ts
function buildLockKey(
  keyPattern: string,
  originalMethod: Function,
  args: any[],
): string {
  const paramNames = extractParamNames(originalMethod);

  return keyPattern.replace(/\{(\w+)\}/g, (match, paramName) => {
    const paramIndex = paramNames.indexOf(paramName);
    if (paramIndex === -1) return match;

    const value = args[paramIndex];
    return value !== undefined && value !== null ? String(value) : 'null';
  });
}

// Usage: 'stock:{productId}:{optionId}' + ['prod-123', 'opt-456', 5]
// Result: 'stock:prod-123:opt-456'
```

### 3. Domain Layer Changes

**File**: `src/product/domain/services/stock-management.service.ts`

```typescript
@Injectable()
export class StockManagementService {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
    @Inject(DISTRIBUTED_LOCK_SERVICE)
    private readonly lockService: DistributedLockService,  // Required for decorator
  ) {}

  @DistributedLock('stock:{productId}:{optionId}', {
    waitTimeoutMs: 5000,  // Wait up to 5s for lock
    autoExtend: true,     // Auto-extend TTL for long operations
  })
  async reserveStock(
    productId: string,
    optionId: string,
    quantity: number,
  ): Promise<void> {
    const product = await this.productRepository.findById(productId);
    // ... business logic executed under lock protection
    option.stock.reserve(quantity);
    await this.productRepository.save(product);
  }

  @DistributedLock('stock:{productId}:{optionId}', { waitTimeoutMs: 5000, autoExtend: true })
  async releaseStock(...) { }

  @DistributedLock('stock:{productId}:{optionId}', { waitTimeoutMs: 5000, autoExtend: true })
  async confirmSale(...) { }
}
```

### 4. Module Configuration

**File**: `src/common/infrastructure/locks/locks.module.ts`

```typescript
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        return new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
        });
      },
    },
    {
      provide: REDLOCK_INSTANCE,
      useFactory: (redis: Redis) => new Redlock([redis]),
      inject: [REDIS_CLIENT],
    },
    {
      provide: DISTRIBUTED_LOCK_SERVICE,
      useClass: PubSubDistributedLockService,
    },
  ],
  exports: [REDIS_CLIENT, REDLOCK_INSTANCE, DISTRIBUTED_LOCK_SERVICE],
})
export class RedisModule {}
```

### 5. Test Implementation

**Integration Tests**:
- `test/common/integration/simple-distributed-lock.integration.spec.ts`
- `test/common/integration/pubsub-distributed-lock.integration.spec.ts`

Test scenarios:
- Lock acquisition/release
- TTL expiration
- Pub/Sub wait for lock release
- Auto-extend TTL
- Concurrent requests (100+)
- Lock release safety (Lua script)
- Redis connection error detection

## Technical Decisions

### 1. Interceptor → Method Decorator

**Decision**: Use TypeScript method decorator instead of NestJS interceptor
**Rationale**:
- Interceptors only work in HTTP context
- Method decorators work for all call contexts
- Same decorator syntax can be preserved
- Required change: inject `lockService` in constructor

### 2. Lock Granularity

**Decision**: Lock per stock item (`stock:{productId}:{optionId}`)
**Rationale**:
- Minimizes lock contention
- Different products don't block each other
- Matches domain model

### 3. Lock Options

**Decision**: Support waitTimeoutMs and autoExtend
**Rationale**:
- waitTimeoutMs: Allows waiting for lock instead of immediate failure
- autoExtend: Prevents lock loss during long operations
- Both are optional with sensible defaults

### 4. Connection Error Detection

**Decision**: Distinguish connection errors from lock conflicts
**Rationale**:
- `ExecutionError` can mean both connection failure and lock conflict
- Connection failures should throw `RedisConnectionException`
- Lock conflicts should return `{ acquired: false }` or wait via Pub/Sub

## Files Changed

### New Files

**Infrastructure** (`src/common/infrastructure/locks/`):
- `tokens.ts`
- `lock-options.interface.ts`
- `simple-distributed-lock.interface.ts`
- `simple-distributed-lock.service.ts`
- `pubsub-distributed-lock.service.ts`
- `lock.exceptions.ts`
- `locks.module.ts`

**Decorators** (`src/common/utils/decorators/`):
- `distributed-lock.decorator.ts`
- `distributed-lock.interceptor.ts`

**Tests**:
- `test/common/integration/simple-distributed-lock.integration.spec.ts`
- `test/common/integration/pubsub-distributed-lock.integration.spec.ts`
- `test/utils/test-redis.ts`

### Modified Files

- `src/app.module.ts` - Added RedisModule import
- `src/product/domain/services/stock-management.service.ts` - Added lockService injection, @DistributedLock
- `src/product/product.module.ts` - Updated imports
- `src/common/infrastructure/persistance/` - Moved from `prisma/` folder
- All repository files - Updated import paths
- All test files - Updated import paths

### Dependencies Added

- `ioredis` - Redis client
- `redlock` - Distributed lock algorithm
- `@testcontainers/redis` - Redis TestContainers

### Configuration

- `docker-compose.yml` - Added Redis service (port 16379)
- `.env.example` - Added REDIS_HOST, REDIS_PORT

## Success Criteria

- [x] Redis infrastructure implemented (SETNX + Redlock)
- [x] AOP method decorator (works for all call contexts)
- [x] Dynamic lock key pattern with parameter substitution
- [x] Pub/Sub wait for lock release
- [x] TTL auto-extension for long operations
- [x] Redis connection error detection
- [x] StockManagementService uses @DistributedLock
- [x] Integration tests with real Redis (TestContainers)
- [x] All existing tests pass

## Commits

1. `5887b23` - feat: Redis 연결 실패 예외 클래스 추가
2. `43d168f` - feat: 분산락 서비스 구현 및 인터페이스 정의
3. `1ff1b32` - feat: AOP 방식 분산락 데코레이터 구현
4. `609f598` - feat: StockManagementService에 분산락 적용
5. `7018e4e` - feat: Redis 설정 및 테스트 인프라 추가
6. `9b13d9a` - refactor: Prisma 모듈 경로 변경 및 Redis 모듈 통합

## References

- [Redis SETNX Documentation](https://redis.io/commands/setnx/)
- [Distributed Locks with Redis](https://redis.io/docs/manual/patterns/distributed-locks/)
- [Redlock Algorithm](https://redis.io/docs/manual/patterns/distributed-locks/#the-redlock-algorithm)

## Related Issues

- Issue #027: Payment Idempotency Key (related concurrency pattern)
- Issue #029: Coupon Issuance Distributed Lock
