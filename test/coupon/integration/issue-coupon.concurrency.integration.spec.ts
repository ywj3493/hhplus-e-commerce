import { Test, TestingModule } from '@nestjs/testing';
import { CouponPrismaRepository } from '@/coupon/infrastructure/repositories/coupon-prisma.repository';
import { UserCouponPrismaRepository } from '@/coupon/infrastructure/repositories/user-coupon-prisma.repository';
import { PrismaService } from '@/common/infrastructure/prisma/prisma.service';
import { IssueCouponUseCase } from '@/coupon/application/use-cases/issue-coupon.use-case';
import { IssueCouponInput } from '@/coupon/application/dtos/issue-coupon.dto';
import { CouponService } from '@/coupon/domain/services/coupon.service';
import { COUPON_REPOSITORY, USER_COUPON_REPOSITORY } from '@/coupon/domain/repositories/tokens';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllTables,
  type TestDbConfig,
} from '../../utils/test-database';

describe('IssueCoupon 동시성 통합 테스트', () => {
  let db: TestDbConfig;
  let prismaService: PrismaService;
  let issueCouponUseCase: IssueCouponUseCase;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    // 독립된 DB 설정 (동시성 테스트용)
    db = await setupTestDatabase({ isolated: true });

    // NestJS 테스트 모듈 생성
    moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: db.prisma,
        },
        {
          provide: COUPON_REPOSITORY,
          useClass: CouponPrismaRepository,
        },
        {
          provide: USER_COUPON_REPOSITORY,
          useClass: UserCouponPrismaRepository,
        },
        CouponService,
        IssueCouponUseCase,
      ],
    }).compile();

    prismaService = moduleRef.get<PrismaService>(PrismaService);
    issueCouponUseCase = moduleRef.get<IssueCouponUseCase>(IssueCouponUseCase);
  }, 120000); // 120초 timeout (컨테이너 시작 + migration)

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  beforeEach(async () => {
    // 각 테스트 전에 데이터 정리
    await clearAllTables(prismaService);
  });

  describe('쿠폰 발급 동시성 제어', () => {
    it('100명이 동시에 10개 수량의 쿠폰을 요청할 때 정확히 10명만 발급받아야 함', async () => {
      // Given: 100명의 사용자 생성
      const userIds: string[] = [];
      for (let i = 1; i <= 100; i++) {
        const userId = `user-${String(i).padStart(3, '0')}`;
        await prismaService.user.create({
          data: {
            id: userId,
            name: `사용자 ${i}`,
            email: `user${i}@example.com`,
          },
        });
        userIds.push(userId);
      }

      // And: 총 수량 10개인 쿠폰 생성
      await prismaService.coupon.create({
        data: {
          id: 'limited-coupon',
          name: '선착순 10명 한정 쿠폰',
          description: '동시성 테스트용 쿠폰',
          discountType: 'FIXED',
          discountValue: 10000,
          minAmount: null,
          totalQuantity: 10,
          issuedQuantity: 0,
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30일 후
        },
      });

      // When: 100명이 동시에 쿠폰 발급 요청
      const requests = userIds.map((userId) =>
        issueCouponUseCase
          .execute(new IssueCouponInput({ userId, couponId: 'limited-coupon' }))
          .then(
            () => ({ userId, status: 'success' as const }),
            (error) => ({ userId, status: 'failed' as const, error: error.message }),
          ),
      );

      const results = await Promise.all(requests);

      // Then: 정확히 10명만 성공해야 함
      const successResults = results.filter((r) => r.status === 'success');
      const failedResults = results.filter((r) => r.status === 'failed');

      expect(successResults.length).toBe(10);
      expect(failedResults.length).toBe(90);

      // And: 데이터베이스에 정확히 10개의 UserCoupon이 생성되어야 함
      const userCoupons = await prismaService.userCoupon.findMany({
        where: { couponId: 'limited-coupon' },
      });
      expect(userCoupons).toHaveLength(10);

      // And: Coupon의 issuedQuantity가 정확히 10이어야 함
      const coupon = await prismaService.coupon.findUnique({
        where: { id: 'limited-coupon' },
      });
      expect(coupon?.issuedQuantity).toBe(10);

      // And: 실패한 요청들은 '쿠폰이 모두 소진되었습니다' 에러를 받아야 함
      const exhaustedErrors = failedResults.filter((r) =>
        r.error?.includes('쿠폰이 모두 소진되었습니다'),
      );
      expect(exhaustedErrors.length).toBeGreaterThan(0);
    }, 30000); // 30초 timeout

    it('동일한 사용자가 중복 발급을 시도하면 1개만 발급되어야 함', async () => {
      // Given: 사용자 1명 생성
      await prismaService.user.create({
        data: {
          id: 'duplicate-test-user',
          name: '중복 테스트 사용자',
          email: 'duplicate@example.com',
        },
      });

      // And: 충분한 수량의 쿠폰 생성
      await prismaService.coupon.create({
        data: {
          id: 'duplicate-test-coupon',
          name: '중복 발급 테스트 쿠폰',
          description: '중복 발급 방지 테스트용',
          discountType: 'PERCENTAGE',
          discountValue: 15,
          minAmount: 50000,
          totalQuantity: 100,
          issuedQuantity: 0,
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // When: 동일한 사용자가 10번 동시에 발급 요청
      const requests = Array.from({ length: 10 }, () =>
        issueCouponUseCase
          .execute(
            new IssueCouponInput({
              userId: 'duplicate-test-user',
              couponId: 'duplicate-test-coupon',
            }),
          )
          .then(
            () => 'success' as const,
            (error) => error.message as string,
          ),
      );

      const results = await Promise.all(requests);

      // Then: 1개만 성공해야 함
      const successCount = results.filter((r) => r === 'success').length;
      expect(successCount).toBe(1);

      // And: 나머지는 '이미 발급받은 쿠폰입니다' 에러를 받아야 함
      const duplicateErrors = results.filter((r) =>
        typeof r === 'string' && r.includes('이미 발급받은 쿠폰입니다'),
      );
      expect(duplicateErrors.length).toBe(9);

      // And: 데이터베이스에 1개의 UserCoupon만 생성되어야 함
      const userCoupons = await prismaService.userCoupon.findMany({
        where: {
          userId: 'duplicate-test-user',
          couponId: 'duplicate-test-coupon',
        },
      });
      expect(userCoupons).toHaveLength(1);

      // And: Coupon의 issuedQuantity가 1이어야 함
      const coupon = await prismaService.coupon.findUnique({
        where: { id: 'duplicate-test-coupon' },
      });
      expect(coupon?.issuedQuantity).toBe(1);
    }, 15000); // 15초 timeout

    it('만료된 쿠폰은 발급이 실패해야 함', async () => {
      // Given: 사용자 생성
      await prismaService.user.create({
        data: {
          id: 'expired-test-user',
          name: '만료 테스트 사용자',
          email: 'expired@example.com',
        },
      });

      // And: 만료된 쿠폰 생성
      await prismaService.coupon.create({
        data: {
          id: 'expired-coupon',
          name: '만료된 쿠폰',
          description: '이미 기간이 지난 쿠폰',
          discountType: 'FIXED',
          discountValue: 5000,
          minAmount: null,
          totalQuantity: 100,
          issuedQuantity: 0,
          validFrom: new Date('2025-01-01T00:00:00Z'),
          validUntil: new Date('2025-01-31T23:59:59Z'), // 이미 만료됨
        },
      });

      // When: 만료된 쿠폰 발급 요청
      let errorMessage = '';
      try {
        await issueCouponUseCase.execute(
          new IssueCouponInput({
            userId: 'expired-test-user',
            couponId: 'expired-coupon',
          }),
        );
      } catch (error: any) {
        errorMessage = error.message;
      }

      // Then: '쿠폰 발급 기간이 아닙니다' 에러가 발생해야 함
      expect(errorMessage).toContain('쿠폰 발급 기간이 아닙니다');

      // And: UserCoupon이 생성되지 않아야 함
      const userCoupons = await prismaService.userCoupon.findMany({
        where: { couponId: 'expired-coupon' },
      });
      expect(userCoupons).toHaveLength(0);

      // And: Coupon의 issuedQuantity가 0이어야 함
      const coupon = await prismaService.coupon.findUnique({
        where: { id: 'expired-coupon' },
      });
      expect(coupon?.issuedQuantity).toBe(0);
    });

    it('존재하지 않는 쿠폰 발급 시 에러가 발생해야 함', async () => {
      // Given: 사용자 생성
      await prismaService.user.create({
        data: {
          id: 'notfound-test-user',
          name: '미존재 테스트 사용자',
          email: 'notfound@example.com',
        },
      });

      // When: 존재하지 않는 쿠폰 발급 요청
      let errorMessage = '';
      try {
        await issueCouponUseCase.execute(
          new IssueCouponInput({
            userId: 'notfound-test-user',
            couponId: 'non-existent-coupon',
          }),
        );
      } catch (error: any) {
        errorMessage = error.message;
      }

      // Then: '쿠폰을 찾을 수 없습니다' 에러가 발생해야 함
      expect(errorMessage).toContain('쿠폰을 찾을 수 없습니다');
    });
  });
});
