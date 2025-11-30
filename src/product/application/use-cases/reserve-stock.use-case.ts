import { Injectable, Inject } from '@nestjs/common';
import { ProductRepository } from '@/product/domain/repositories/product.repository';
import { PRODUCT_REPOSITORY } from '@/product/domain/repositories/tokens';
import { StockManagementService } from '@/product/domain/services/stock-management.service';
import { ProductNotFoundException } from '@/product/domain/product.exceptions';
import { DistributedLockService } from '@/common/infrastructure/locks/simple-distributed-lock.interface';
import { DISTRIBUTED_LOCK_SERVICE } from '@/common/infrastructure/locks/tokens';
import { PrismaService } from '@/common/infrastructure/persistance/prisma.service';
import { REDIS_CACHE_SERVICE } from '@/common/infrastructure/cache/tokens';
import { RedisCacheServiceInterface } from '@/common/infrastructure/cache/redis-cache.service.interface';

/**
 * ReserveStockUseCase
 * 재고 예약 Use Case (Application Layer)
 *
 * 책임:
 * - 분산락 획득 (Redis Redlock)
 * - 트랜잭션 관리 (Prisma Transaction)
 * - 비관적 락 (SELECT FOR UPDATE)
 * - 도메인 서비스 호출 (StockManagementService)
 *
 * 동시성 제어:
 * 1. 분산락 (Redlock): 다중 인스턴스 환경에서의 동시성 제어
 * 2. 비관적 락 (SELECT FOR UPDATE): DB 레벨에서의 동시성 제어
 *
 * BR-ORDER-02: 주문 생성 시 재고 예약
 */
@Injectable()
export class ReserveStockUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
    private readonly stockManagementService: StockManagementService,
    @Inject(DISTRIBUTED_LOCK_SERVICE)
    private readonly lockService: DistributedLockService,
    private readonly prisma: PrismaService,
    @Inject(REDIS_CACHE_SERVICE)
    private readonly redisCacheService: RedisCacheServiceInterface,
  ) {}

  /**
   * 재고 예약 실행
   *
   * @param productId 상품 ID
   * @param optionId 옵션 ID
   * @param quantity 예약 수량
   * @throws ProductNotFoundException 상품 또는 옵션을 찾을 수 없을 때
   * @throws InsufficientStockException 재고 부족 시
   * @throws LockAcquisitionException 락 획득 실패 시
   */
  async execute(productId: string, optionId: string, quantity: number): Promise<void> {
    const lockKey = `stock:${productId}:${optionId}`;

    // 분산락 획득 후 비관적 락 + 트랜잭션 실행
    await this.lockService.withLockExtended(
      lockKey,
      async () => {
        await this.prisma.$transaction(async (tx) => {
          // 1. 비관적 락으로 상품 조회
          const product = await this.productRepository.findByIdForUpdate(productId, tx);

          if (!product) {
            throw new ProductNotFoundException(productId);
          }

          // 2. 도메인 서비스에서 비즈니스 로직 실행
          this.stockManagementService.reserveStock(product, optionId, quantity);

          // 3. 변경된 상품 저장 (트랜잭션 내에서)
          await this.productRepository.saveWithTx(product, tx);
        });
      },
      {
        waitTimeoutMs: 5000,
        autoExtend: true,
      },
    );

    // 캐시 무효화 (재고 변경으로 인해 상품 목록/상세 캐시 갱신 필요)
    await this.invalidateProductCache(productId);
  }

  /**
   * 상품 관련 캐시 무효화
   */
  private async invalidateProductCache(productId: string): Promise<void> {
    await Promise.all([
      this.redisCacheService.delByPattern('products:list:*'),
      this.redisCacheService.delByPattern(`products:detail:${productId}`),
    ]);
  }
}
