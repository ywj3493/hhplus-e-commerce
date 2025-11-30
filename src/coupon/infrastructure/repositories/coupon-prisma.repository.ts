import { Injectable } from '@nestjs/common';
import { CouponRepository } from '@/coupon/domain/repositories/coupon.repository';
import { Coupon, CouponType } from '@/coupon/domain/entities/coupon.entity';
import { PrismaService } from '@/common/infrastructure/persistance/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * CouponPrismaRepository
 * Prisma를 사용한 Coupon Repository 구현체
 *
 * 주요 기능:
 * - Coupon 조회 및 저장
 * - 쿠폰 발급 동시성 제어 (SELECT FOR UPDATE)
 * - 트랜잭션 지원 (em 파라미터)
 */
@Injectable()
export class CouponPrismaRepository implements CouponRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ID로 쿠폰 조회
   * @param id - 쿠폰 ID
   * @returns Coupon 엔티티 또는 null
   */
  async findById(id: string): Promise<Coupon | null> {
    const couponModel = await this.prisma.coupon.findUnique({
      where: { id },
    });

    if (!couponModel) {
      return null;
    }

    return this.toDomain(couponModel);
  }

  /**
   * ID로 쿠폰 조회 (FOR UPDATE)
   * 동시성 제어를 위해 비관적 락 사용
   *
   * @param id - 쿠폰 ID
   * @param em - Entity Manager (Transaction 지원)
   * @returns Coupon 엔티티 또는 null
   */
  async findByIdForUpdate(id: string, em?: any): Promise<Coupon | null> {
    const tx = em || this.prisma;

    // 비관적 락: SELECT FOR UPDATE
    // 다른 트랜잭션이 이 행을 수정하지 못하도록 잠금
    const couponModel = await tx.$queryRaw<
      Array<{
        id: string;
        name: string;
        description: string;
        discountType: string;
        discountValue: Prisma.Decimal;
        minAmount: Prisma.Decimal | null;
        totalQuantity: number;
        issuedQuantity: number;
        validFrom: Date;
        validUntil: Date;
        createdAt: Date;
        updatedAt: Date;
      }>
    >`SELECT * FROM coupons WHERE id = ${id} FOR UPDATE`;

    if (!couponModel || couponModel.length === 0) {
      return null;
    }

    return this.toDomain(couponModel[0]);
  }

  /**
   * 쿠폰 저장 (생성 또는 업데이트)
   *
   * @param coupon - Coupon 도메인 엔티티
   * @param em - Entity Manager (Transaction 지원)
   * @returns 저장된 Coupon 엔티티
   */
  async save(coupon: Coupon, em?: any): Promise<Coupon> {
    const tx = em || this.prisma;

    const data = {
      name: coupon.name,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minAmount: coupon.minAmount,
      totalQuantity: coupon.totalQuantity,
      issuedQuantity: coupon.issuedQuantity,
      validFrom: coupon.validFrom,
      validUntil: coupon.validUntil,
      updatedAt: coupon.updatedAt,
    };

    const savedModel = await tx.coupon.upsert({
      where: { id: coupon.id },
      update: data,
      create: {
        id: coupon.id,
        ...data,
        createdAt: coupon.createdAt,
      },
    });

    return this.toDomain(savedModel);
  }

  /**
   * Prisma 모델을 Domain 엔티티로 변환
   * @param model - Prisma Coupon 모델
   * @returns Coupon 도메인 엔티티
   */
  private toDomain(
    model: Prisma.CouponGetPayload<object> | {
      id: string;
      name: string;
      description: string;
      discountType: string;
      discountValue: Prisma.Decimal;
      minAmount: Prisma.Decimal | null;
      totalQuantity: number;
      issuedQuantity: number;
      validFrom: Date;
      validUntil: Date;
      createdAt: Date;
      updatedAt: Date;
    },
  ): Coupon {
    return Coupon.reconstitute(
      model.id,
      model.name,
      model.description,
      model.discountType as CouponType,
      Number(model.discountValue), // Prisma Decimal -> number 변환
      model.minAmount ? Number(model.minAmount) : null,
      model.totalQuantity,
      model.issuedQuantity,
      model.validFrom,
      model.validUntil,
      model.createdAt,
      model.updatedAt,
    );
  }
}
