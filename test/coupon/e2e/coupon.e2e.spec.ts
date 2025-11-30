import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/common/infrastructure/persistance/prisma.service';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  type TestDbConfig,
} from '../../utils/test-database';
import {
  setupTestRedis,
  cleanupTestRedis,
  type TestRedisConfig,
} from '../../utils/test-redis';
import { REDIS_CLIENT } from '@/common/infrastructure/locks/tokens';
import { overrideAllRepositories } from '../../utils/test-module-overrides';

/**
 * E2E Test: Coupon API Endpoints
 * Tests full HTTP request/response flow with Testcontainers
 *
 * Coupon 도메인의 Exception들은 NestJS HttpException을 상속하므로
 * 자동으로 적절한 HTTP 상태 코드로 변환됩니다.
 */
describe('Coupon API (e2e)', () => {
  let app: INestApplication;
  let db: TestDbConfig;
  let redisConfig: TestRedisConfig;
  let authToken: string;
  let user2Token: string;

  beforeAll(async () => {
    // 독립된 DB 및 Redis 설정 + Seed 데이터 (E2E 테스트용)
    db = await setupTestDatabase({ isolated: true, seed: true });
    redisConfig = await setupTestRedis();

    // NestJS 앱 생성
    // E2E 테스트에서는 실제 DB(Prisma)를 사용해야 하므로 모든 Repository를 Prisma로 override
    let moduleBuilder = Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(db.prisma)
      .overrideProvider(REDIS_CLIENT)
      .useValue(redisConfig.redis);

    moduleBuilder = overrideAllRepositories(moduleBuilder);
    const moduleFixture: TestingModule = await moduleBuilder.compile();

    app = moduleFixture.createNestApplication();

    // 글로벌 설정
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    );

    await app.init();

    // 인증 토큰 획득 (user1)
    const loginRes1 = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ id: 'user1', password: 'test1' });
    authToken = loginRes1.body.data.accessToken;

    // 인증 토큰 획득 (user2)
    const loginRes2 = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ id: 'user2', password: 'test2' });
    user2Token = loginRes2.body.data.accessToken;
  }, 180000);

  afterAll(async () => {
    await app.close();
    await cleanupTestDatabase(db);
    await cleanupTestRedis(redisConfig);
  });

  describe('GET /coupons/my', () => {
    it('사용자의 쿠폰 목록을 반환해야 함', () => {
      return request(app.getHttpServer())
        .get('/api/v1/coupons/my')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          // 응답 구조: { available: [], used: [], expired: [] }
          expect(res.body).toHaveProperty('available');
          expect(res.body).toHaveProperty('used');
          expect(res.body).toHaveProperty('expired');
          expect(Array.isArray(res.body.available)).toBe(true);
          expect(Array.isArray(res.body.used)).toBe(true);
          expect(Array.isArray(res.body.expired)).toBe(true);
          // user-001은 seed에서 3개 쿠폰을 가지고 있음 (available 2개 + used 1개)
          const totalCoupons =
            res.body.available.length +
            res.body.used.length +
            res.body.expired.length;
          expect(totalCoupons).toBe(3);
        });
    });

    it('쿠폰의 올바른 구조를 반환해야 함', () => {
      return request(app.getHttpServer())
        .get('/api/v1/coupons/my')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          const allCoupons = [
            ...res.body.available,
            ...res.body.used,
            ...res.body.expired,
          ];
          if (allCoupons.length > 0) {
            const coupon = allCoupons[0];
            expect(coupon).toHaveProperty('id');
            expect(coupon).toHaveProperty('couponId');
            expect(coupon).toHaveProperty('couponName');
            expect(coupon).toHaveProperty('discountType');
            expect(coupon).toHaveProperty('discountValue');
            expect(coupon).toHaveProperty('status');
            expect(coupon).toHaveProperty('issuedAt');
            expect(coupon).toHaveProperty('expiresAt');
          }
        });
    });

    it('status=AVAILABLE로 필터링하면 사용 가능한 쿠폰만 반환해야 함', () => {
      return request(app.getHttpServer())
        .get('/api/v1/coupons/my')
        .query({ status: 'AVAILABLE' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          // status 필터 시에도 같은 구조 반환 (available만 값 있음)
          expect(Array.isArray(res.body.available)).toBe(true);
          // user-001은 2개의 AVAILABLE 쿠폰 보유 (coupon-001, coupon-003)
          res.body.available.forEach((coupon: any) => {
            expect(coupon.status).toBe('AVAILABLE');
          });
        });
    });

    it('status=USED로 필터링하면 사용된 쿠폰만 반환해야 함', () => {
      return request(app.getHttpServer())
        .get('/api/v1/coupons/my')
        .query({ status: 'USED' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          // status 필터 시에도 같은 구조 반환 (used만 값 있음)
          expect(Array.isArray(res.body.used)).toBe(true);
          // user-001은 1개의 USED 쿠폰 보유 (coupon-002)
          res.body.used.forEach((coupon: any) => {
            expect(coupon.status).toBe('USED');
          });
        });
    });

    it('인증 없이 요청 시 401을 반환해야 함', () => {
      return request(app.getHttpServer())
        .get('/api/v1/coupons/my')
        .expect(401);
    });
  });

  describe('POST /coupons/:id/issue', () => {
    // 테스트용 신규 쿠폰 ID 생성 (매 테스트마다 고유)
    let testCouponId: string;

    beforeAll(async () => {
      // 테스트용 쿠폰 생성 (충분한 수량)
      testCouponId = `coupon-test-${Date.now()}`;
      await db.prisma.coupon.create({
        data: {
          id: testCouponId,
          name: '테스트 쿠폰',
          description: 'E2E 테스트용 쿠폰',
          discountType: 'FIXED',
          discountValue: 5000,
          minAmount: null,
          totalQuantity: 100,
          issuedQuantity: 0,
          validFrom: new Date(Date.now() - 24 * 60 * 60 * 1000),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    });

    it('쿠폰 발급이 성공해야 함', async () => {
      return request(app.getHttpServer())
        .post(`/api/v1/coupons/${testCouponId}/issue`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('userCouponId');
          expect(res.body).toHaveProperty('status', 'AVAILABLE');
          expect(res.body).toHaveProperty('issuedAt');
          expect(res.body).toHaveProperty('expiresAt');
          expect(res.body).toHaveProperty('couponName', '테스트 쿠폰');
        });
    });

    it('이미 발급받은 쿠폰을 재발급 시 409 Conflict를 반환해야 함', async () => {
      // 첫 번째 발급
      await request(app.getHttpServer())
        .post(`/api/v1/coupons/${testCouponId}/issue`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(201);

      // 두 번째 발급 시도 (같은 사용자)
      return request(app.getHttpServer())
        .post(`/api/v1/coupons/${testCouponId}/issue`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(409)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('이미 발급');
        });
    });

    it('존재하지 않는 쿠폰 발급 시 404 Not Found를 반환해야 함', () => {
      const nonExistentCouponId = 'coupon-non-existent-id';

      return request(app.getHttpServer())
        .post(`/api/v1/coupons/${nonExistentCouponId}/issue`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });

    it('소진된 쿠폰 발급 시 409 Conflict를 반환해야 함', () => {
      // coupon-005는 seed에서 이미 소진됨 (totalQuantity: 10, issuedQuantity: 10)
      return request(app.getHttpServer())
        .post('/api/v1/coupons/coupon-005/issue')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('소진');
        });
    });

    it('만료된 쿠폰 발급 시 400 Bad Request를 반환해야 함', () => {
      // coupon-004는 seed에서 이미 만료됨 (validUntil: 2025-10-31)
      return request(app.getHttpServer())
        .post('/api/v1/coupons/coupon-004/issue')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          // 메시지가 '쿠폰 발급 기간이 아닙니다.' 또는 '만료'를 포함
          expect(
            res.body.message.includes('만료') ||
              res.body.message.includes('기간'),
          ).toBe(true);
        });
    });

    it('인증 없이 요청 시 401을 반환해야 함', () => {
      return request(app.getHttpServer())
        .post('/api/v1/coupons/coupon-001/issue')
        .expect(401);
    });
  });

  describe('쿠폰 상태 변경 검증', () => {
    it('발급 후 내 쿠폰 목록에서 확인할 수 있어야 함', async () => {
      // 새로운 쿠폰 생성
      const newCouponId = `coupon-verify-${Date.now()}`;
      await db.prisma.coupon.create({
        data: {
          id: newCouponId,
          name: '검증용 쿠폰',
          description: '발급 검증용',
          discountType: 'PERCENTAGE',
          discountValue: 5,
          minAmount: 10000,
          totalQuantity: 50,
          issuedQuantity: 0,
          validFrom: new Date(Date.now() - 24 * 60 * 60 * 1000),
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // user3 토큰 획득
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ id: 'user3', password: 'test3' });
      const user3Token = loginRes.body.data.accessToken;

      // 발급 전 쿠폰 목록 확인
      const beforeRes = await request(app.getHttpServer())
        .get('/api/v1/coupons/my')
        .set('Authorization', `Bearer ${user3Token}`)
        .expect(200);

      const beforeCount =
        beforeRes.body.available.length +
        beforeRes.body.used.length +
        beforeRes.body.expired.length;

      // 쿠폰 발급
      await request(app.getHttpServer())
        .post(`/api/v1/coupons/${newCouponId}/issue`)
        .set('Authorization', `Bearer ${user3Token}`)
        .expect(201);

      // 발급 후 쿠폰 목록 확인
      const afterRes = await request(app.getHttpServer())
        .get('/api/v1/coupons/my')
        .set('Authorization', `Bearer ${user3Token}`)
        .expect(200);

      const afterCount =
        afterRes.body.available.length +
        afterRes.body.used.length +
        afterRes.body.expired.length;
      expect(afterCount).toBe(beforeCount + 1);

      // 새로 발급된 쿠폰이 목록에 있는지 확인 (available에 있어야 함)
      const newCoupon = afterRes.body.available.find(
        (c: any) => c.couponId === newCouponId,
      );
      expect(newCoupon).toBeDefined();
      expect(newCoupon.status).toBe('AVAILABLE');
      expect(newCoupon.couponName).toBe('검증용 쿠폰');
    });
  });
});
