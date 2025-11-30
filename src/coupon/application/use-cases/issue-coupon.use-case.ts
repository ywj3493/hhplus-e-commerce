import { Inject, Injectable } from '@nestjs/common';
import { CouponRepository } from '@/coupon/domain/repositories/coupon.repository';
import { UserCouponRepository } from '@/coupon/domain/repositories/user-coupon.repository';
import {
  COUPON_REPOSITORY,
  USER_COUPON_REPOSITORY,
} from '@/coupon/domain/repositories/tokens';
import { CouponService } from '@/coupon/domain/services/coupon.service';
import {
  CouponAlreadyIssuedException,
  CouponNotFoundException,
} from '@/coupon/domain/coupon.exceptions';
import {
  IssueCouponInput,
  IssueCouponOutput,
} from '@/coupon/application/dtos/issue-coupon.dto';
import { PrismaService } from '@/common/infrastructure/persistance/prisma.service';
import { DistributedLockService } from '@/common/infrastructure/locks/simple-distributed-lock.interface';
import { DISTRIBUTED_LOCK_SERVICE } from '@/common/infrastructure/locks/tokens';

/**
 * 쿠폰 발급 Use Case
 *
 * 비즈니스 규칙:
 * - BR-COUPON-01: 1인 1쿠폰 (중복 발급 방지)
 * - BR-COUPON-02: 선착순 발급 (수량 제한)
 * - BR-COUPON-03: 발급 기간 검증
 * - BR-COUPON-04: 동시 발급 방지 (SELECT FOR UPDATE)
 *
 * 동시성 제어:
 * - Redlock 기반 분산락: 다중 인스턴스 환경에서의 동시성 제어
 * - DB 비관적 락 (SELECT FOR UPDATE): DB 레벨에서의 동시성 제어
 *
 * 흐름:
 * 1. 분산락 획득 (coupon:issue:{couponId})
 * 2. Coupon 조회 (FOR UPDATE - 비관적 락)
 * 3. 중복 발급 확인 (BR-COUPON-01)
 * 4. 쿠폰 발급 (Domain Service)
 * 5. Coupon 저장 (issuedQuantity 증가)
 * 6. UserCoupon 저장
 * 7. 분산락 해제
 */
@Injectable()
export class IssueCouponUseCase {
  constructor(
    @Inject(COUPON_REPOSITORY)
    private readonly couponRepository: CouponRepository,
    @Inject(USER_COUPON_REPOSITORY)
    private readonly userCouponRepository: UserCouponRepository,
    private readonly couponService: CouponService,
    private readonly prisma: PrismaService,
    @Inject(DISTRIBUTED_LOCK_SERVICE)
    private readonly lockService: DistributedLockService,
  ) {}

  async execute(input: IssueCouponInput): Promise<IssueCouponOutput> {
    const lockKey = `coupon:issue:${input.couponId}`;

    // 분산락 획득 후 비관적 락 + 트랜잭션 실행
    return await this.lockService.withLockExtended(
      lockKey,
      async () => {
        return await this.prisma.$transaction(async (tx) => {
          // 1. 쿠폰 조회 (FOR UPDATE - 비관적 락)
          const coupon = await this.couponRepository.findByIdForUpdate(
            input.couponId,
            tx,
          );

          if (!coupon) {
            throw new CouponNotFoundException('쿠폰을 찾을 수 없습니다.');
          }

          // 2. 중복 발급 확인 (BR-COUPON-01: 1인 1쿠폰)
          const alreadyIssued =
            await this.userCouponRepository.existsByUserIdAndCouponId(
              input.userId,
              input.couponId,
              tx,
            );

          if (alreadyIssued) {
            throw new CouponAlreadyIssuedException('이미 발급받은 쿠폰입니다.');
          }

          // 3. 쿠폰 발급 (Domain Service)
          // - BR-COUPON-02: 수량 검증
          // - BR-COUPON-03: 발급 기간 검증
          const userCoupon = this.couponService.issueCoupon(
            coupon,
            input.userId,
          );

          // 4. Coupon 저장 (issuedQuantity 증가)
          await this.couponRepository.save(coupon, tx);

          // 5. UserCoupon 저장
          const savedUserCoupon = await this.userCouponRepository.save(
            userCoupon,
            tx,
          );

          return IssueCouponOutput.from(savedUserCoupon, coupon);
        });
      },
      {
        waitTimeoutMs: 5000,
        autoExtend: true,
      },
    );
  }
}
