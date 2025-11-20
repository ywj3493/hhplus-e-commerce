import { Injectable } from '@nestjs/common';
import { Coupon } from '@/coupon/domain/entities/coupon.entity';
import { CouponRepository } from '@/coupon/domain/repositories/coupon.repository';

/**
 * 쿠폰 영속성 데이터
 */
interface CouponData {
  id: string;
  name: string;
  description: string;
  discountType: string;
  discountValue: number;
  minAmount: number | null;
  totalQuantity: number;
  issuedQuantity: number;
  validFrom: Date;
  validUntil: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 인메모리 쿠폰 저장소
 *
 * 동시성 제어:
 * - findByIdForUpdate()는 잠금 메커니즘 시뮬레이션
 * - save() 시 잠금 해제
 */
@Injectable()
export class InMemoryCouponRepository implements CouponRepository {
  private coupons: Map<string, CouponData> = new Map();
  private locks: Map<string, boolean> = new Map();

  /**
   * ID로 쿠폰 조회
   */
  async findById(id: string): Promise<Coupon | null> {
    const data = this.coupons.get(id);
    if (!data) {
      return null;
    }
    return this.toDomain(data);
  }

  /**
   * ID로 쿠폰 조회 (FOR UPDATE)
   * 동시성 제어를 위한 잠금 획득
   */
  async findByIdForUpdate(id: string, em?: any): Promise<Coupon | null> {
    // 잠금 대기 (실제 DB의 SELECT FOR UPDATE 시뮬레이션)
    while (this.locks.get(id)) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // 잠금 획득
    this.locks.set(id, true);

    const data = this.coupons.get(id);
    if (!data) {
      // 데이터가 없으면 잠금 해제
      this.locks.delete(id);
      return null;
    }

    return this.toDomain(data);
  }

  /**
   * 쿠폰 저장
   */
  async save(coupon: Coupon, em?: any): Promise<Coupon> {
    const data = this.toPersistence(coupon);
    this.coupons.set(coupon.id, data);

    // 잠금 해제
    this.locks.delete(coupon.id);

    return coupon;
  }

  /**
   * 도메인 모델로 변환
   */
  private toDomain(data: CouponData): Coupon {
    return Coupon.reconstitute(
      data.id,
      data.name,
      data.description,
      data.discountType as any,
      data.discountValue,
      data.minAmount,
      data.totalQuantity,
      data.issuedQuantity,
      data.validFrom,
      data.validUntil,
      data.createdAt,
      data.updatedAt,
    );
  }

  /**
   * 영속성 모델로 변환
   */
  private toPersistence(coupon: Coupon): CouponData {
    return {
      id: coupon.id,
      name: coupon.name,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minAmount: coupon.minAmount,
      totalQuantity: coupon.totalQuantity,
      issuedQuantity: coupon.issuedQuantity,
      validFrom: coupon.validFrom,
      validUntil: coupon.validUntil,
      createdAt: coupon.createdAt,
      updatedAt: coupon.updatedAt,
    };
  }

  /**
   * 테스트용: 모든 데이터 초기화
   */
  clear(): void {
    this.coupons.clear();
    this.locks.clear();
  }

  /**
   * 테스트용: 초기 데이터 삽입
   */
  seed(coupons: Coupon[]): void {
    for (const coupon of coupons) {
      const data = this.toPersistence(coupon);
      this.coupons.set(coupon.id, data);
    }
  }
}
