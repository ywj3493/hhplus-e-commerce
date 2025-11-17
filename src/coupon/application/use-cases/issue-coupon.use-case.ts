import { Inject, Injectable } from '@nestjs/common';
import { CouponRepository } from '../../domain/repositories/coupon.repository';
import { UserCouponRepository } from '../../domain/repositories/user-coupon.repository';
import { CouponService } from '../../domain/services/coupon.service';
import {
  CouponAlreadyIssuedException,
  CouponNotFoundException,
} from '../../domain/coupon.exceptions';
import {
  IssueCouponInput,
  IssueCouponOutput,
} from '../dtos/issue-coupon.dto';

/**
 * 쿠폰 발급 Use Case
 *
 * 비즈니스 규칙:
 * - BR-COUPON-01: 1인 1쿠폰 (중복 발급 방지)
 * - BR-COUPON-02: 선착순 발급 (수량 제한)
 * - BR-COUPON-03: 발급 기간 검증
 * - BR-COUPON-04: 동시 발급 방지 (SELECT FOR UPDATE)
 *
 * 흐름:
 * 1. Coupon 조회 (FOR UPDATE - 동시성 제어)
 * 2. 중복 발급 확인 (BR-COUPON-01)
 * 3. 쿠폰 발급 (Domain Service)
 * 4. Coupon 저장 (issuedQuantity 증가)
 * 5. UserCoupon 저장
 *
 * Note: InMemory Repository에서는 실제 Transaction이 필요 없으므로
 * 순차적으로 처리. 실제 DB 연동 시 Transaction 추가 필요.
 */
@Injectable()
export class IssueCouponUseCase {
  constructor(
    @Inject('CouponRepository')
    private readonly couponRepository: CouponRepository,
    @Inject('UserCouponRepository')
    private readonly userCouponRepository: UserCouponRepository,
    private readonly couponService: CouponService,
  ) {}

  async execute(input: IssueCouponInput): Promise<IssueCouponOutput> {
    // 1. 쿠폰 조회 (FOR UPDATE - 동시성 제어)
    const coupon = await this.couponRepository.findByIdForUpdate(
      input.couponId,
    );

    if (!coupon) {
      throw new CouponNotFoundException('쿠폰을 찾을 수 없습니다.');
    }

    // 2. 중복 발급 확인 (BR-COUPON-01: 1인 1쿠폰)
    const alreadyIssued =
      await this.userCouponRepository.existsByUserIdAndCouponId(
        input.userId,
        input.couponId,
      );

    if (alreadyIssued) {
      throw new CouponAlreadyIssuedException('이미 발급받은 쿠폰입니다.');
    }

    // 3. 쿠폰 발급 (Domain Service)
    // - BR-COUPON-02: 수량 검증
    // - BR-COUPON-03: 발급 기간 검증
    const userCoupon = this.couponService.issueCoupon(coupon, input.userId);

    // 4. Coupon 저장 (issuedQuantity 증가)
    await this.couponRepository.save(coupon);

    // 5. UserCoupon 저장
    const savedUserCoupon = await this.userCouponRepository.save(userCoupon);

    return IssueCouponOutput.from(savedUserCoupon, coupon);
  }
}
