import { Test, TestingModule } from '@nestjs/testing';
import { UserCouponPrismaRepository } from '@/coupon/infrastructure/repositories/user-coupon-prisma.repository';
import { PrismaService } from '@/common/infrastructure/prisma/prisma.service';
import { UserCoupon } from '@/coupon/domain/entities/user-coupon.entity';
import { Coupon, CouponType } from '@/coupon/domain/entities/coupon.entity';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllTables,
  type TestDbConfig,
} from '../../utils/test-database';

describe('UserCouponPrismaRepository 통합 테스트', () => {
  let db: TestDbConfig;
  let prismaService: PrismaService;
  let repository: UserCouponPrismaRepository;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    // 공유 DB 설정
    db = await setupTestDatabase({ isolated: false });

    // NestJS 테스트 모듈 생성
    moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: db.prisma,
        },
        UserCouponPrismaRepository,
      ],
    }).compile();

    prismaService = moduleRef.get<PrismaService>(PrismaService);
    repository =
      moduleRef.get<UserCouponPrismaRepository>(UserCouponPrismaRepository);
  }, 120000); // 120초 timeout

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  beforeEach(async () => {
    // 각 테스트 전에 데이터 정리
    await clearAllTables(prismaService);
  });

  describe('findById', () => {
    it('존재하는 사용자 쿠폰 ID로 조회 시 UserCoupon 엔티티를 반환해야 함', async () => {
      // Given: 사용자 생성
      await prismaService.user.create({
        data: {
          id: 'test-user-001',
          name: '테스트 사용자',
          email: 'test@example.com',
        },
      });

      // And: 쿠폰 생성
      const validUntil = new Date('2025-12-31T23:59:59Z');
      await prismaService.coupon.create({
        data: {
          id: 'test-coupon-001',
          name: '테스트 쿠폰',
          description: '테스트용 쿠폰',
          discountType: 'FIXED',
          discountValue: 10000,
          minAmount: 50000,
          totalQuantity: 100,
          issuedQuantity: 1,
          validFrom: new Date('2025-11-01T00:00:00Z'),
          validUntil,
        },
      });

      // And: 사용자 쿠폰 생성
      const issuedAt = new Date('2025-11-15T10:00:00Z');
      await prismaService.userCoupon.create({
        data: {
          id: 'test-user-coupon-001',
          userId: 'test-user-001',
          couponId: 'test-coupon-001',
          isUsed: false,
          usedAt: null,
          issuedAt,
          expiresAt: validUntil,
        },
      });

      // When: ID로 사용자 쿠폰 조회
      const result = await repository.findById('test-user-coupon-001');

      // Then: UserCoupon 엔티티가 반환되어야 함
      expect(result).toBeInstanceOf(UserCoupon);
      expect(result?.id).toBe('test-user-coupon-001');
      expect(result?.userId).toBe('test-user-001');
      expect(result?.couponId).toBe('test-coupon-001');
      expect(result?.isUsed).toBe(false);
      expect(result?.usedAt).toBeNull();
    });

    it('존재하지 않는 사용자 쿠폰 ID로 조회 시 null을 반환해야 함', async () => {
      // Given: 데이터베이스에 사용자 쿠폰이 없음

      // When: 존재하지 않는 ID로 조회
      const result = await repository.findById('non-existent-id');

      // Then: null이 반환되어야 함
      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('사용자 ID로 모든 쿠폰을 조회해야 함', async () => {
      // Given: 사용자 생성
      await prismaService.user.create({
        data: {
          id: 'test-user-002',
          name: '테스트 사용자 2',
          email: 'test2@example.com',
        },
      });

      // And: 쿠폰 2개 생성
      await prismaService.coupon.createMany({
        data: [
          {
            id: 'coupon-001',
            name: '쿠폰 1',
            description: '첫 번째 쿠폰',
            discountType: 'FIXED',
            discountValue: 5000,
            minAmount: null,
            totalQuantity: 100,
            issuedQuantity: 1,
            validFrom: new Date('2025-11-01T00:00:00Z'),
            validUntil: new Date('2025-12-31T23:59:59Z'),
          },
          {
            id: 'coupon-002',
            name: '쿠폰 2',
            description: '두 번째 쿠폰',
            discountType: 'PERCENTAGE',
            discountValue: 10,
            minAmount: 100000,
            totalQuantity: 50,
            issuedQuantity: 1,
            validFrom: new Date('2025-11-01T00:00:00Z'),
            validUntil: new Date('2025-12-31T23:59:59Z'),
          },
        ],
      });

      // And: 사용자 쿠폰 2개 생성
      await prismaService.userCoupon.createMany({
        data: [
          {
            id: 'user-coupon-001',
            userId: 'test-user-002',
            couponId: 'coupon-001',
            isUsed: false,
            usedAt: null,
            issuedAt: new Date('2025-11-10T10:00:00Z'),
            expiresAt: new Date('2025-12-31T23:59:59Z'),
          },
          {
            id: 'user-coupon-002',
            userId: 'test-user-002',
            couponId: 'coupon-002',
            isUsed: true,
            usedAt: new Date('2025-11-15T14:30:00Z'),
            issuedAt: new Date('2025-11-14T10:00:00Z'),
            expiresAt: new Date('2025-12-31T23:59:59Z'),
          },
        ],
      });

      // When: 사용자 ID로 쿠폰 조회
      const results = await repository.findByUserId('test-user-002');

      // Then: 2개의 쿠폰이 반환되어야 함
      expect(results).toHaveLength(2);
      expect(results[0]).toBeInstanceOf(UserCoupon);
      expect(results[1]).toBeInstanceOf(UserCoupon);

      // And: 최신 발급 순으로 정렬되어야 함
      expect(results[0].issuedAt.getTime()).toBeGreaterThan(
        results[1].issuedAt.getTime(),
      );
    });

    it('쿠폰이 없는 사용자의 경우 빈 배열을 반환해야 함', async () => {
      // Given: 사용자 생성 (쿠폰 없음)
      await prismaService.user.create({
        data: {
          id: 'test-user-003',
          name: '테스트 사용자 3',
          email: null,
        },
      });

      // When: 사용자 ID로 쿠폰 조회
      const results = await repository.findByUserId('test-user-003');

      // Then: 빈 배열이 반환되어야 함
      expect(results).toEqual([]);
    });
  });

  describe('existsByUserIdAndCouponId', () => {
    it('사용자가 이미 발급받은 쿠폰인 경우 true를 반환해야 함', async () => {
      // Given: 사용자 및 쿠폰 생성
      await prismaService.user.create({
        data: {
          id: 'test-user-004',
          name: '테스트 사용자 4',
          email: 'test4@example.com',
        },
      });

      await prismaService.coupon.create({
        data: {
          id: 'coupon-003',
          name: '중복 체크 쿠폰',
          description: '중복 발급 체크용',
          discountType: 'FIXED',
          discountValue: 10000,
          minAmount: null,
          totalQuantity: 100,
          issuedQuantity: 1,
          validFrom: new Date('2025-11-01T00:00:00Z'),
          validUntil: new Date('2025-12-31T23:59:59Z'),
        },
      });

      // And: 사용자 쿠폰 발급
      await prismaService.userCoupon.create({
        data: {
          id: 'user-coupon-003',
          userId: 'test-user-004',
          couponId: 'coupon-003',
          isUsed: false,
          usedAt: null,
          issuedAt: new Date(),
          expiresAt: new Date('2025-12-31T23:59:59Z'),
        },
      });

      // When: 중복 체크
      const exists = await repository.existsByUserIdAndCouponId(
        'test-user-004',
        'coupon-003',
      );

      // Then: true가 반환되어야 함
      expect(exists).toBe(true);
    });

    it('사용자가 발급받지 않은 쿠폰인 경우 false를 반환해야 함', async () => {
      // Given: 사용자 및 쿠폰 생성 (발급 안 함)
      await prismaService.user.create({
        data: {
          id: 'test-user-005',
          name: '테스트 사용자 5',
          email: null,
        },
      });

      await prismaService.coupon.create({
        data: {
          id: 'coupon-004',
          name: '미발급 쿠폰',
          description: '아직 발급 안 함',
          discountType: 'PERCENTAGE',
          discountValue: 15,
          minAmount: 50000,
          totalQuantity: 100,
          issuedQuantity: 0,
          validFrom: new Date('2025-11-01T00:00:00Z'),
          validUntil: new Date('2025-12-31T23:59:59Z'),
        },
      });

      // When: 중복 체크
      const exists = await repository.existsByUserIdAndCouponId(
        'test-user-005',
        'coupon-004',
      );

      // Then: false가 반환되어야 함
      expect(exists).toBe(false);
    });

    it('트랜잭션 내에서 중복 체크를 수행해야 함', async () => {
      // Given: 사용자 및 쿠폰 생성
      await prismaService.user.create({
        data: {
          id: 'test-user-006',
          name: '테스트 사용자 6',
          email: 'test6@example.com',
        },
      });

      await prismaService.coupon.create({
        data: {
          id: 'coupon-005',
          name: '트랜잭션 쿠폰',
          description: '트랜잭션 테스트용',
          discountType: 'FIXED',
          discountValue: 8000,
          minAmount: null,
          totalQuantity: 100,
          issuedQuantity: 0,
          validFrom: new Date('2025-11-01T00:00:00Z'),
          validUntil: new Date('2025-12-31T23:59:59Z'),
        },
      });

      // When: 트랜잭션 내에서 중복 체크
      const exists = await prismaService.$transaction(async (tx) => {
        return await repository.existsByUserIdAndCouponId(
          'test-user-006',
          'coupon-005',
          tx,
        );
      });

      // Then: false가 반환되어야 함 (발급 안 함)
      expect(exists).toBe(false);
    });
  });

  describe('save', () => {
    it('새로운 사용자 쿠폰을 생성해야 함', async () => {
      // Given: 사용자 및 쿠폰 생성
      await prismaService.user.create({
        data: {
          id: 'test-user-007',
          name: '테스트 사용자 7',
          email: 'test7@example.com',
        },
      });

      const validUntil = new Date('2025-12-31T23:59:59Z');
      await prismaService.coupon.create({
        data: {
          id: 'coupon-006',
          name: '저장 테스트 쿠폰',
          description: '저장 테스트용',
          discountType: 'FIXED',
          discountValue: 12000,
          minAmount: null,
          totalQuantity: 100,
          issuedQuantity: 0,
          validFrom: new Date('2025-11-01T00:00:00Z'),
          validUntil,
        },
      });

      // And: 쿠폰 엔티티로 UserCoupon 생성
      const coupon = Coupon.reconstitute(
        'coupon-006',
        '저장 테스트 쿠폰',
        '저장 테스트용',
        CouponType.FIXED,
        12000,
        null,
        100,
        0,
        new Date('2025-11-01T00:00:00Z'),
        validUntil,
        new Date(),
        new Date(),
      );
      const userCoupon = UserCoupon.create('test-user-007', coupon);

      // When: 사용자 쿠폰 저장
      await repository.save(userCoupon);

      // Then: 데이터베이스에 저장되어야 함
      const savedUserCoupon = await prismaService.userCoupon.findUnique({
        where: { id: userCoupon.id },
      });

      expect(savedUserCoupon).not.toBeNull();
      expect(savedUserCoupon?.userId).toBe('test-user-007');
      expect(savedUserCoupon?.couponId).toBe('coupon-006');
      expect(savedUserCoupon?.isUsed).toBe(false);
    });

    it('사용자 쿠폰 사용 시 업데이트해야 함', async () => {
      // Given: 사용자 쿠폰 생성
      await prismaService.user.create({
        data: {
          id: 'test-user-008',
          name: '테스트 사용자 8',
          email: null,
        },
      });

      const validUntil = new Date('2025-12-31T23:59:59Z');
      await prismaService.coupon.create({
        data: {
          id: 'coupon-007',
          name: '업데이트 테스트 쿠폰',
          description: '업데이트 테스트용',
          discountType: 'PERCENTAGE',
          discountValue: 20,
          minAmount: 50000,
          totalQuantity: 50,
          issuedQuantity: 1,
          validFrom: new Date('2025-11-01T00:00:00Z'),
          validUntil,
        },
      });

      const issuedAt = new Date('2025-11-15T10:00:00Z');
      await prismaService.userCoupon.create({
        data: {
          id: 'user-coupon-update-test',
          userId: 'test-user-008',
          couponId: 'coupon-007',
          isUsed: false,
          usedAt: null,
          issuedAt,
          expiresAt: validUntil,
        },
      });

      // And: 사용자 쿠폰 조회 후 사용 처리
      const userCoupon = await repository.findById('user-coupon-update-test');
      userCoupon!.use(); // isUsed: true, usedAt: 현재 시각

      // When: 업데이트된 사용자 쿠폰 저장
      await repository.save(userCoupon!);

      // Then: 데이터베이스에 업데이트되어야 함
      const updatedUserCoupon = await prismaService.userCoupon.findUnique({
        where: { id: 'user-coupon-update-test' },
      });

      expect(updatedUserCoupon?.isUsed).toBe(true);
      expect(updatedUserCoupon?.usedAt).not.toBeNull();
    });

    it('트랜잭션 내에서 사용자 쿠폰을 저장해야 함', async () => {
      // Given: 사용자 및 쿠폰 생성
      await prismaService.user.create({
        data: {
          id: 'test-user-009',
          name: '테스트 사용자 9',
          email: 'test9@example.com',
        },
      });

      const validUntil = new Date('2025-12-31T23:59:59Z');
      await prismaService.coupon.create({
        data: {
          id: 'coupon-008',
          name: '트랜잭션 쿠폰',
          description: '트랜잭션 저장 테스트',
          discountType: 'FIXED',
          discountValue: 7000,
          minAmount: null,
          totalQuantity: 200,
          issuedQuantity: 0,
          validFrom: new Date('2025-11-01T00:00:00Z'),
          validUntil,
        },
      });

      const coupon = Coupon.reconstitute(
        'coupon-008',
        '트랜잭션 쿠폰',
        '트랜잭션 저장 테스트',
        CouponType.FIXED,
        7000,
        null,
        200,
        0,
        new Date('2025-11-01T00:00:00Z'),
        validUntil,
        new Date(),
        new Date(),
      );
      const userCoupon = UserCoupon.create('test-user-009', coupon);

      // When: 트랜잭션 내에서 사용자 쿠폰 저장
      await prismaService.$transaction(async (tx) => {
        await repository.save(userCoupon, tx);
      });

      // Then: 데이터베이스에 저장되어야 함
      const savedUserCoupon = await prismaService.userCoupon.findUnique({
        where: { id: userCoupon.id },
      });

      expect(savedUserCoupon).not.toBeNull();
      expect(savedUserCoupon?.userId).toBe('test-user-009');
    });
  });
});
