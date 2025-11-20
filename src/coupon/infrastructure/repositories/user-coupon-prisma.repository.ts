import { Injectable } from '@nestjs/common';
import { UserCouponRepository } from '@/coupon/domain/repositories/user-coupon.repository';
import { UserCoupon } from '@/coupon/domain/entities/user-coupon.entity';
import { PrismaService } from '@/common/infrastructure/prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * UserCouponPrismaRepository
 * Prisma를 사용한 UserCoupon Repository 구현체
 *
 * 주요 기능:
 * - 사용자 쿠폰 조회 및 저장
 * - 중복 발급 체크 (existsByUserIdAndCouponId)
 * - 트랜잭션 지원 (em 파라미터)
 */
@Injectable()
export class UserCouponPrismaRepository implements UserCouponRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ID로 사용자 쿠폰 조회
   * @param id - 사용자 쿠폰 ID
   * @returns UserCoupon 엔티티 또는 null
   */
  async findById(id: string): Promise<UserCoupon | null> {
    const userCouponModel = await this.prisma.userCoupon.findUnique({
      where: { id },
    });

    if (!userCouponModel) {
      return null;
    }

    return this.toDomain(userCouponModel);
  }

  /**
   * 사용자 ID로 모든 쿠폰 조회
   * 최신 발급 순으로 정렬
   *
   * @param userId - 사용자 ID
   * @returns 사용자 쿠폰 목록
   */
  async findByUserId(userId: string): Promise<UserCoupon[]> {
    const userCouponModels = await this.prisma.userCoupon.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' }, // 최신 발급 순
    });

    return userCouponModels.map((model) => this.toDomain(model));
  }

  /**
   * 사용자가 특정 쿠폰을 이미 발급받았는지 확인
   * BR-COUPON-01: 1인 1쿠폰 검증에 사용
   *
   * @param userId - 사용자 ID
   * @param couponId - 쿠폰 ID
   * @param em - Entity Manager (Transaction 지원)
   * @returns 존재 여부
   */
  async existsByUserIdAndCouponId(
    userId: string,
    couponId: string,
    em?: any,
  ): Promise<boolean> {
    const tx = em || this.prisma;

    const count = await tx.userCoupon.count({
      where: {
        userId,
        couponId,
      },
    });

    return count > 0;
  }

  /**
   * 사용자 쿠폰 저장 (생성 또는 업데이트)
   *
   * @param userCoupon - UserCoupon 도메인 엔티티
   * @param em - Entity Manager (Transaction 지원)
   * @returns 저장된 UserCoupon 엔티티
   */
  async save(userCoupon: UserCoupon, em?: any): Promise<UserCoupon> {
    const tx = em || this.prisma;

    const data = {
      userId: userCoupon.userId,
      couponId: userCoupon.couponId,
      isUsed: userCoupon.isUsed,
      usedAt: userCoupon.usedAt,
      issuedAt: userCoupon.issuedAt,
      expiresAt: userCoupon.expiresAt,
    };

    const savedModel = await tx.userCoupon.upsert({
      where: { id: userCoupon.id },
      update: {
        isUsed: data.isUsed,
        usedAt: data.usedAt,
      },
      create: {
        id: userCoupon.id,
        ...data,
      },
    });

    return this.toDomain(savedModel);
  }

  /**
   * Prisma 모델을 Domain 엔티티로 변환
   * @param model - Prisma UserCoupon 모델
   * @returns UserCoupon 도메인 엔티티
   */
  private toDomain(model: Prisma.UserCouponGetPayload<object>): UserCoupon {
    return UserCoupon.reconstitute(
      model.id,
      model.userId,
      model.couponId,
      model.isUsed,
      model.usedAt,
      model.issuedAt,
      model.expiresAt,
    );
  }
}
