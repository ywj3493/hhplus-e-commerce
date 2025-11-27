import { Injectable, Inject } from '@nestjs/common';
import { ProductRepository } from '@/product/domain/repositories/product.repository';
import { PRODUCT_REPOSITORY } from '@/product/domain/repositories/tokens';
import {
  ProductNotFoundException,
  InsufficientStockException,
} from '@/product/domain/product.exceptions';
import { DistributedLock } from '@/common/utils/decorators/distributed-lock.decorator';
import { DistributedLockService } from '@/common/infrastructure/locks/simple-distributed-lock.interface';
import { DISTRIBUTED_LOCK_SERVICE } from '@/common/infrastructure/locks/tokens';

/**
 * StockManagementService
 * 재고 관리를 담당하는 Product 도메인 서비스
 *
 * 책임:
 * - 재고 예약 (주문 생성 시)
 * - 재고 해제 (주문 취소/만료 시)
 * - 판매 확정 (결제 완료 시)
 * - 재고 가용성 검증 (장바구니 추가 시)
 *
 * BR-ORDER-02: 주문 생성 시 재고 예약
 * BR-ORDER-14: 예약 취소/만료 시 재고 해제
 * BR-PAYMENT-02: 결제 완료 시 reserved → sold
 * BR-CART-02: 장바구니 추가 시 재고 확인
 *
 * 동시성 제어:
 * - Redlock 기반 분산락 사용 (@DistributedLock 데코레이터)
 * - Pub/Sub 대기: 락 해제 알림을 받아 순차적으로 처리
 * - TTL 자동 연장: 긴 작업에서도 락 유지
 * - 락 키 패턴: 'stock:{productId}:{optionId}'
 */
@Injectable()
export class StockManagementService {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
    @Inject(DISTRIBUTED_LOCK_SERVICE)
    private readonly lockService: DistributedLockService,
  ) {}

  /**
   * 재고 예약
   * BR-ORDER-02: 주문 생성 시 재고 예약
   *
   * @param productId 상품 ID
   * @param optionId 옵션 ID
   * @param quantity 예약 수량
   * @throws ProductNotFoundException 상품 또는 옵션을 찾을 수 없을 때
   * @throws InsufficientStockException 재고 부족 시
   */
  @DistributedLock('stock:{productId}:{optionId}', {
    waitTimeoutMs: 5000,
    autoExtend: true,
  })
  async reserveStock(
    productId: string,
    optionId: string,
    quantity: number,
  ): Promise<void> {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new ProductNotFoundException(productId);
    }

    const option = product.findOption(optionId);
    if (!option) {
      throw new ProductNotFoundException(`옵션을 찾을 수 없습니다: ${optionId}`);
    }

    // Stock Entity의 reserve() 메서드 호출
    option.stock.reserve(quantity);

    // 변경된 상품 저장
    await this.productRepository.save(product);
  }

  /**
   * 예약 재고 해제
   * BR-ORDER-14: 예약 취소/만료 시 reserved → available
   *
   * @param productId 상품 ID
   * @param optionId 옵션 ID
   * @param quantity 해제 수량
   */
  @DistributedLock('stock:{productId}:{optionId}', {
    waitTimeoutMs: 5000,
    autoExtend: true,
  })
  async releaseStock(
    productId: string,
    optionId: string,
    quantity: number,
  ): Promise<void> {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      console.warn(`재고 해제 실패: 상품을 찾을 수 없습니다: ${productId}`);
      return;
    }

    const option = product.findOption(optionId);
    if (!option) {
      console.warn(`재고 해제 실패: 옵션을 찾을 수 없습니다: ${optionId}`);
      return;
    }

    try {
      option.stock.restoreReserved(quantity);
      await this.productRepository.save(product);
    } catch (error) {
      console.error(
        `재고 복원 중 오류 발생: ${productId}/${optionId}`,
        error,
      );
    }
  }

  /**
   * 판매 확정
   * BR-PAYMENT-02: 결제 완료 시 reserved → sold
   *
   * @param productId 상품 ID
   * @param optionId 옵션 ID
   * @param quantity 판매 수량
   * @throws ProductNotFoundException 상품 또는 옵션을 찾을 수 없을 때
   */
  @DistributedLock('stock:{productId}:{optionId}', {
    waitTimeoutMs: 5000,
    autoExtend: true,
  })
  async confirmSale(
    productId: string,
    optionId: string,
    quantity: number,
  ): Promise<void> {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new ProductNotFoundException(productId);
    }

    const option = product.findOption(optionId);
    if (!option) {
      throw new ProductNotFoundException(`옵션을 찾을 수 없습니다: ${optionId}`);
    }

    // Stock Entity의 sell() 메서드 호출
    option.stock.sell(quantity);

    // 변경된 상품 저장
    await this.productRepository.save(product);
  }

  /**
   * 재고 가용성 검증
   * BR-CART-02: 장바구니 추가 시 재고 확인
   *
   * @param productId 상품 ID
   * @param optionId 옵션 ID
   * @param quantity 요청 수량
   * @throws ProductNotFoundException 상품 또는 옵션을 찾을 수 없을 때
   * @throws InsufficientStockException 재고 부족 시
   */
  async validateStockAvailability(
    productId: string,
    optionId: string,
    quantity: number,
  ): Promise<void> {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new ProductNotFoundException('상품을 찾을 수 없습니다.');
    }

    const option = product.findOption(optionId);
    if (!option) {
      throw new ProductNotFoundException('상품 옵션을 찾을 수 없습니다.');
    }

    if (option.stock.availableQuantity < quantity) {
      throw new InsufficientStockException(
        `재고가 부족합니다. (요청: ${quantity}, 가용: ${option.stock.availableQuantity})`,
      );
    }
  }
}
