import { Test, TestingModule } from '@nestjs/testing';
import { MySqlContainer, StartedMySqlContainer } from '@testcontainers/mysql';
import { PrismaClient } from '@prisma/client';
import { CouponPrismaRepository } from '@/coupon/infrastructure/repositories/coupon-prisma.repository';
import { PrismaService } from '@/common/infrastructure/prisma/prisma.service';
import { Coupon, CouponType } from '@/coupon/domain/entities/coupon.entity';
import { execSync } from 'child_process';

describe('CouponPrismaRepository 통합 테스트', () => {
  let container: StartedMySqlContainer;
  let prismaService: PrismaService;
  let repository: CouponPrismaRepository;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    // MySQL Testcontainer 시작
    container = await new MySqlContainer('mysql:8.0')
      .withDatabase('test_db')
      .withRootPassword('test')
      .start();

    // DATABASE_URL 설정
    const databaseUrl = container.getConnectionUri();
    process.env.DATABASE_URL = databaseUrl;

    // Prisma Client 생성 및 Migration 실행
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });

    // Migration 실행
    execSync('pnpm prisma migrate deploy', {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    });

    // NestJS 테스트 모듈 생성
    moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: prisma,
        },
        CouponPrismaRepository,
      ],
    }).compile();

    prismaService = moduleRef.get<PrismaService>(PrismaService);
    repository = moduleRef.get<CouponPrismaRepository>(CouponPrismaRepository);
  }, 60000); // 60초 timeout

  afterAll(async () => {
    // 연결 해제 및 컨테이너 종료
    if (prismaService) {
      await prismaService.$disconnect();
    }
    if (container) {
      await container.stop();
    }
  });

  beforeEach(async () => {
    // 각 테스트 전에 데이터 정리
    await prismaService.userCoupon.deleteMany({});
    await prismaService.coupon.deleteMany({});
  });

  describe('findById', () => {
    it('존재하는 쿠폰 ID로 조회 시 Coupon 엔티티를 반환해야 함', async () => {
      // Given: 정액 할인 쿠폰 생성
      const validFrom = new Date('2025-11-01T00:00:00Z');
      const validUntil = new Date('2025-12-31T23:59:59Z');

      await prismaService.coupon.create({
        data: {
          id: 'test-coupon-001',
          name: '테스트 쿠폰',
          description: '테스트용 정액 할인 쿠폰',
          discountType: 'FIXED',
          discountValue: 10000,
          minAmount: 50000,
          totalQuantity: 100,
          issuedQuantity: 0,
          validFrom,
          validUntil,
        },
      });

      // When: ID로 쿠폰 조회
      const result = await repository.findById('test-coupon-001');

      // Then: Coupon 엔티티가 반환되어야 함
      expect(result).toBeInstanceOf(Coupon);
      expect(result?.id).toBe('test-coupon-001');
      expect(result?.name).toBe('테스트 쿠폰');
      expect(result?.description).toBe('테스트용 정액 할인 쿠폰');
      expect(result?.discountType).toBe(CouponType.FIXED);
      expect(result?.discountValue).toBe(10000);
      expect(result?.minAmount).toBe(50000);
      expect(result?.totalQuantity).toBe(100);
      expect(result?.issuedQuantity).toBe(0);
      expect(result?.availableQuantity).toBe(100);
    });

    it('존재하지 않는 쿠폰 ID로 조회 시 null을 반환해야 함', async () => {
      // Given: 데이터베이스에 쿠폰이 없음

      // When: 존재하지 않는 ID로 조회
      const result = await repository.findById('non-existent-id');

      // Then: null이 반환되어야 함
      expect(result).toBeNull();
    });
  });

  describe('findByIdForUpdate', () => {
    it('트랜잭션 내에서 SELECT FOR UPDATE로 쿠폰을 조회해야 함', async () => {
      // Given: 쿠폰 생성
      await prismaService.coupon.create({
        data: {
          id: 'test-coupon-002',
          name: '선착순 쿠폰',
          description: '선착순 10명 한정',
          discountType: 'PERCENTAGE',
          discountValue: 20,
          minAmount: null,
          totalQuantity: 10,
          issuedQuantity: 0,
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // When: 트랜잭션 내에서 FOR UPDATE로 조회
      const result = await prismaService.$transaction(async (tx) => {
        return await repository.findByIdForUpdate('test-coupon-002', tx);
      });

      // Then: Coupon 엔티티가 반환되어야 함
      expect(result).toBeInstanceOf(Coupon);
      expect(result?.id).toBe('test-coupon-002');
      expect(result?.name).toBe('선착순 쿠폰');
      expect(result?.discountType).toBe(CouponType.PERCENTAGE);
    });

    it('존재하지 않는 쿠폰 ID로 FOR UPDATE 조회 시 null을 반환해야 함', async () => {
      // Given: 데이터베이스에 쿠폰이 없음

      // When: 트랜잭션 내에서 존재하지 않는 ID로 조회
      const result = await prismaService.$transaction(async (tx) => {
        return await repository.findByIdForUpdate('non-existent-id', tx);
      });

      // Then: null이 반환되어야 함
      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('새로운 쿠폰을 생성해야 함', async () => {
      // Given: 새 쿠폰 엔티티 생성
      const coupon = Coupon.create(
        '신규 쿠폰',
        '신규 가입 축하 쿠폰',
        CouponType.FIXED,
        15000,
        60000,
        500,
        0,
        new Date('2025-11-01T00:00:00Z'),
        new Date('2025-12-31T23:59:59Z'),
      );

      // When: 쿠폰 저장
      await repository.save(coupon);

      // Then: 데이터베이스에 저장되어야 함
      const savedCoupon = await prismaService.coupon.findUnique({
        where: { id: coupon.id },
      });

      expect(savedCoupon).not.toBeNull();
      expect(savedCoupon?.name).toBe('신규 쿠폰');
      expect(savedCoupon?.discountValue.toString()).toBe('15000');
      expect(savedCoupon?.minAmount?.toString()).toBe('60000');
      expect(savedCoupon?.totalQuantity).toBe(500);
    });

    it('기존 쿠폰을 업데이트해야 함', async () => {
      // Given: 기존 쿠폰 생성
      await prismaService.coupon.create({
        data: {
          id: 'test-coupon-003',
          name: '업데이트 전 이름',
          description: '업데이트 전 설명',
          discountType: 'FIXED',
          discountValue: 5000,
          minAmount: 30000,
          totalQuantity: 100,
          issuedQuantity: 10,
          validFrom: new Date('2025-11-01T00:00:00Z'),
          validUntil: new Date('2025-12-31T23:59:59Z'),
        },
      });

      // And: 쿠폰 조회 후 발급 수량 증가
      const coupon = await repository.findById('test-coupon-003');
      coupon!.decreaseQuantity(); // issuedQuantity: 10 -> 11

      // When: 업데이트된 쿠폰 저장
      await repository.save(coupon!);

      // Then: 데이터베이스에 업데이트되어야 함
      const updatedCoupon = await prismaService.coupon.findUnique({
        where: { id: 'test-coupon-003' },
      });

      expect(updatedCoupon?.issuedQuantity).toBe(11);
    });

    it('트랜잭션 내에서 쿠폰을 저장해야 함', async () => {
      // Given: 새 쿠폰 엔티티 생성
      const coupon = Coupon.create(
        '트랜잭션 쿠폰',
        '트랜잭션 테스트용',
        CouponType.PERCENTAGE,
        10,
        100000,
        200,
        0,
        new Date('2025-11-01T00:00:00Z'),
        new Date('2025-12-31T23:59:59Z'),
      );

      // When: 트랜잭션 내에서 쿠폰 저장
      await prismaService.$transaction(async (tx) => {
        await repository.save(coupon, tx);
      });

      // Then: 데이터베이스에 저장되어야 함
      const savedCoupon = await prismaService.coupon.findUnique({
        where: { id: coupon.id },
      });

      expect(savedCoupon).not.toBeNull();
      expect(savedCoupon?.name).toBe('트랜잭션 쿠폰');
    });
  });

  describe('동시성 제어', () => {
    it('동시에 쿠폰 발급 시 SELECT FOR UPDATE로 정확한 수량 제어가 되어야 함', async () => {
      // Given: 총 수량 10개인 쿠폰 생성
      await prismaService.coupon.create({
        data: {
          id: 'concurrent-test-coupon',
          name: '동시성 테스트 쿠폰',
          description: '10개 한정',
          discountType: 'FIXED',
          discountValue: 5000,
          minAmount: null,
          totalQuantity: 10,
          issuedQuantity: 0,
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // When: 20개의 동시 발급 요청
      const requests = Array.from({ length: 20 }, () =>
        prismaService.$transaction(async (tx) => {
          try {
            const coupon = await repository.findByIdForUpdate(
              'concurrent-test-coupon',
              tx,
            );
            if (coupon && coupon.issuedQuantity < coupon.totalQuantity) {
              coupon.decreaseQuantity(); // issuedQuantity++
              await repository.save(coupon, tx);
              return 'success';
            }
            return 'exhausted';
          } catch (error) {
            return 'error';
          }
        }),
      );

      const results = await Promise.all(requests);

      // Then: 정확히 10개만 성공해야 함
      const successCount = results.filter((r) => r === 'success').length;
      expect(successCount).toBe(10);

      // And: 최종 발급 수량이 10이어야 함
      const finalCoupon = await prismaService.coupon.findUnique({
        where: { id: 'concurrent-test-coupon' },
      });
      expect(finalCoupon?.issuedQuantity).toBe(10);
    });
  });
});
