import { Injectable, Inject, Logger } from '@nestjs/common';
import { ProductRepository } from '@/product/domain/repositories/product.repository';
import { PRODUCT_REPOSITORY } from '@/product/domain/repositories/tokens';
import { StockManagementService } from '@/product/domain/services/stock-management.service';
import { DistributedLockService } from '@/common/infrastructure/locks/simple-distributed-lock.interface';
import { DISTRIBUTED_LOCK_SERVICE } from '@/common/infrastructure/locks/tokens';
import { PrismaService } from '@/common/infrastructure/persistance/prisma.service';

/**
 * ReleaseStockUseCase
 * 예약 재고 해제 Use Case (Application Layer)
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
 * BR-ORDER-14: 예약 취소/만료 시 재고 해제
 */
@Injectable()
export class ReleaseStockUseCase {
  private readonly logger = new Logger(ReleaseStockUseCase.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
    private readonly stockManagementService: StockManagementService,
    @Inject(DISTRIBUTED_LOCK_SERVICE)
    private readonly lockService: DistributedLockService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 예약 재고 해제 실행
   *
   * 재고 해제는 실패해도 시스템에 치명적이지 않으므로 에러를 로깅만 하고 전파하지 않음
   *
   * @param productId 상품 ID
   * @param optionId 옵션 ID
   * @param quantity 해제 수량
   */
  async execute(
    productId: string,
    optionId: string,
    quantity: number,
  ): Promise<void> {
    const lockKey = `stock:${productId}:${optionId}`;

    try {
      // 분산락 획득 후 비관적 락 + 트랜잭션 실행
      await this.lockService.withLockExtended(
        lockKey,
        async () => {
          await this.prisma.$transaction(async (tx) => {
            // 1. 비관적 락으로 상품 조회
            const product = await this.productRepository.findByIdForUpdate(
              productId,
              tx,
            );

            if (!product) {
              this.logger.warn(
                `재고 해제 실패: 상품을 찾을 수 없습니다: ${productId}`,
              );
              return;
            }

            // 2. 도메인 서비스에서 비즈니스 로직 실행
            const success = this.stockManagementService.releaseStock(
              product,
              optionId,
              quantity,
            );

            if (!success) {
              this.logger.warn(
                `재고 해제 실패: 옵션을 찾을 수 없습니다: ${optionId}`,
              );
              return;
            }

            // 3. 변경된 상품 저장 (트랜잭션 내에서)
            await this.productRepository.saveWithTx(product, tx);
          });
        },
        {
          waitTimeoutMs: 5000,
          autoExtend: true,
        },
      );
    } catch (error) {
      this.logger.error(
        `재고 해제 중 오류 발생: ${productId}/${optionId}`,
        error,
      );
      // 재고 해제 실패는 시스템에 치명적이지 않으므로 에러를 전파하지 않음
    }
  }
}
