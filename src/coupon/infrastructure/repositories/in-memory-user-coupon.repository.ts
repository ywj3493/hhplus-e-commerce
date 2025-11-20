import { Injectable } from '@nestjs/common';
import { UserCoupon } from '@/coupon/domain/entities/user-coupon.entity';
import { UserCouponRepository } from '@/coupon/domain/repositories/user-coupon.repository';

/**
 * UserCoupon 영속성 데이터
 */
interface UserCouponData {
  id: string;
  userId: string;
  couponId: string;
  isUsed: boolean;
  usedAt: Date | null;
  issuedAt: Date;
  expiresAt: Date;
}

/**
 * 인메모리 사용자 쿠폰 저장소
 */
@Injectable()
export class InMemoryUserCouponRepository implements UserCouponRepository {
  private userCoupons: Map<string, UserCouponData> = new Map();

  /**
   * ID로 사용자 쿠폰 조회
   */
  async findById(id: string): Promise<UserCoupon | null> {
    const data = this.userCoupons.get(id);
    if (!data) {
      return null;
    }
    return this.toDomain(data);
  }

  /**
   * 사용자 ID로 모든 쿠폰 조회
   */
  async findByUserId(userId: string): Promise<UserCoupon[]> {
    const userCoupons: UserCoupon[] = [];

    for (const data of this.userCoupons.values()) {
      if (data.userId === userId) {
        userCoupons.push(this.toDomain(data));
      }
    }

    return userCoupons;
  }

  /**
   * 사용자가 특정 쿠폰을 이미 발급받았는지 확인
   *
   * BR-COUPON-01: 1인 1쿠폰 검증
   */
  async existsByUserIdAndCouponId(
    userId: string,
    couponId: string,
    em?: any,
  ): Promise<boolean> {
    for (const data of this.userCoupons.values()) {
      if (data.userId === userId && data.couponId === couponId) {
        return true;
      }
    }
    return false;
  }

  /**
   * 사용자 쿠폰 저장
   */
  async save(userCoupon: UserCoupon, em?: any): Promise<UserCoupon> {
    const data = this.toPersistence(userCoupon);
    this.userCoupons.set(userCoupon.id, data);
    return userCoupon;
  }

  /**
   * 도메인 모델로 변환
   */
  private toDomain(data: UserCouponData): UserCoupon {
    return UserCoupon.reconstitute(
      data.id,
      data.userId,
      data.couponId,
      data.isUsed,
      data.usedAt,
      data.issuedAt,
      data.expiresAt,
    );
  }

  /**
   * 영속성 모델로 변환
   */
  private toPersistence(userCoupon: UserCoupon): UserCouponData {
    return {
      id: userCoupon.id,
      userId: userCoupon.userId,
      couponId: userCoupon.couponId,
      isUsed: userCoupon.isUsed,
      usedAt: userCoupon.usedAt,
      issuedAt: userCoupon.issuedAt,
      expiresAt: userCoupon.expiresAt,
    };
  }

  /**
   * 테스트용: 모든 데이터 초기화
   */
  clear(): void {
    this.userCoupons.clear();
  }
}
