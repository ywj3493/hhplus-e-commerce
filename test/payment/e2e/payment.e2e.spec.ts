import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import Redlock from 'redlock';
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
import { REDIS_CLIENT, REDLOCK_INSTANCE } from '@/common/infrastructure/locks/tokens';
import { overrideAllRepositories } from '../../utils/test-module-overrides';

/**
 * E2E Test: Payment API Endpoints
 * Tests full HTTP request/response flow with Testcontainers
 *
 * Payment 도메인의 Exception들은 Error를 상속하므로
 * Global Exception Filter 없이는 500 에러로 반환될 수 있음
 *
 * 테스트할 Exception:
 * - OrderNotFoundException → 404 Not Found (예상)
 * - AlreadyPaidException → 409 Conflict (예상)
 * - PaymentFailedException → 402 Payment Required (예상)
 * - InvalidOrderStatusException → 400 Bad Request (예상)
 */
describe('Payment API (e2e)', () => {
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
      .useValue(redisConfig.redis)
      .overrideProvider(REDLOCK_INSTANCE)
      .useFactory({
        factory: () => new Redlock([redisConfig.redis], { retryCount: 0 }),
      });

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

  /**
   * 주문 생성 헬퍼 함수
   */
  async function createPendingOrder(token: string): Promise<string> {
    // 장바구니 비우기
    await request(app.getHttpServer())
      .delete('/api/v1/carts')
      .set('Authorization', `Bearer ${token}`);

    // 장바구니에 상품 추가 (옵션이 있는 상품 사용)
    // product-004 (태블릿 800,000원) + option-004-gray
    const cartRes = await request(app.getHttpServer())
      .post('/api/v1/carts/items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: 'product-004',
        productOptionId: 'option-004-gray',
        quantity: 1,
      });

    // 주문 생성
    const orderRes = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ couponId: null });

    return orderRes.body.orderId;
  }

  describe('POST /payments', () => {
    it('PENDING 상태의 주문에 대해 결제가 성공해야 함', async () => {
      const orderId = await createPendingOrder(user2Token);
      const idempotencyKey = uuidv4();

      return request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          orderId,
          paymentMethod: 'CREDIT_CARD',
          idempotencyKey,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('paymentId');
          expect(res.body).toHaveProperty('orderId', orderId);
          expect(res.body).toHaveProperty('amount');
          expect(res.body).toHaveProperty('transactionId');
          // 태블릿 800,000원
          expect(res.body.amount).toBe(800000);
        });
    });

    it('결제 성공 후 주문 상태가 COMPLETED로 변경되어야 함', async () => {
      const orderId = await createPendingOrder(user2Token);
      const idempotencyKey = uuidv4();

      // 결제 처리
      await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          orderId,
          paymentMethod: 'CREDIT_CARD',
          idempotencyKey,
        })
        .expect(201);

      // 주문 상태 확인
      const orderRes = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      // 결제 완료 후 주문 상태는 COMPLETED
      expect(orderRes.body.status).toBe('COMPLETED');
    });

    it('존재하지 않는 주문에 대해 결제 시 에러를 반환해야 함', () => {
      // NOTE: Global Exception Filter가 없어서 OrderNotFoundException이 500으로 반환됨
      // Global Exception Filter 구현 후 404로 변경 필요
      return request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          orderId: 'non-existent-order',
          paymentMethod: 'CREDIT_CARD',
          idempotencyKey: uuidv4(),
        })
        .expect(500);
    });

    it('이미 결제된 주문에 대해 재결제 시 에러를 반환해야 함', () => {
      // NOTE: Global Exception Filter가 없어서 AlreadyPaidException이 500으로 반환됨
      // Global Exception Filter 구현 후 409로 변경 필요
      // order-001은 seed에서 이미 PAID 상태
      return request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: 'order-001',
          paymentMethod: 'CREDIT_CARD',
          idempotencyKey: uuidv4(),
        })
        .expect(500);
    });

    it('X-Test-Fail 헤더로 강제 결제 실패 시 에러를 반환해야 함', async () => {
      const orderId = await createPendingOrder(user2Token);

      // NOTE: Global Exception Filter가 없어서 PaymentFailedException이 500으로 반환됨
      // Global Exception Filter 구현 후 402로 변경 필요
      return request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${user2Token}`)
        .set('X-Test-Fail', 'true')
        .send({
          orderId,
          paymentMethod: 'CREDIT_CARD',
          idempotencyKey: uuidv4(),
        })
        .expect(500);
    });

    it('멱등성 키로 중복 결제 요청 시 동일한 결과를 반환해야 함', async () => {
      const orderId = await createPendingOrder(user2Token);
      const idempotencyKey = uuidv4();

      // 첫 번째 결제 요청
      const firstRes = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          orderId,
          paymentMethod: 'CREDIT_CARD',
          idempotencyKey,
        })
        .expect(201);

      // 동일한 멱등성 키로 두 번째 결제 요청
      const secondRes = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          orderId,
          paymentMethod: 'CREDIT_CARD',
          idempotencyKey,
        })
        .expect(201);

      // 동일한 결과여야 함
      expect(firstRes.body.paymentId).toBe(secondRes.body.paymentId);
      expect(firstRes.body.transactionId).toBe(secondRes.body.transactionId);
    });

    it('다른 사용자의 주문에 대해 결제 시 에러를 반환해야 함', async () => {
      // NOTE: Global Exception Filter가 없어서 OrderOwnershipException이 500으로 반환됨
      // Global Exception Filter 구현 후 403으로 변경 필요
      // user2의 주문 생성
      const orderId = await createPendingOrder(user2Token);

      // user1이 user2의 주문을 결제 시도
      return request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId,
          paymentMethod: 'CREDIT_CARD',
          idempotencyKey: uuidv4(),
        })
        .expect(500);
    });

    it('인증 없이 요청 시 401을 반환해야 함', () => {
      return request(app.getHttpServer())
        .post('/api/v1/payments')
        .send({
          orderId: 'order-001',
          paymentMethod: 'CREDIT_CARD',
          idempotencyKey: uuidv4(),
        })
        .expect(401);
    });

    it('잘못된 결제 방법으로 요청 시 400을 반환해야 함', async () => {
      // NOTE: PaymentMethod enum에는 CREDIT_CARD만 정의되어 있음
      // 잘못된 결제 방법 사용 시 ValidationPipe에서 400 반환
      const orderId = await createPendingOrder(user2Token);
      return request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          orderId,
          paymentMethod: 'INVALID_METHOD',
          idempotencyKey: uuidv4(),
        })
        .expect(400);
    });
  });

  describe('결제 후 재고 변화 검증', () => {
    it('결제 성공 후 재고가 확정(soldQuantity 증가)되어야 함', async () => {
      // product-001 (스마트폰) + option-001-black 사용 - 재고 70개
      // 결제 전 재고 확인
      const stockBefore = await db.prisma.stock.findUnique({
        where: { id: 'stock-option-001-black' },
      });
      const soldBefore = stockBefore?.soldQuantity || 0;

      // 장바구니 비우기
      await request(app.getHttpServer())
        .delete('/api/v1/carts')
        .set('Authorization', `Bearer ${user2Token}`);

      // product-001 (스마트폰 1,200,000원) + option-001-black
      await request(app.getHttpServer())
        .post('/api/v1/carts/items')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          productId: 'product-001',
          productOptionId: 'option-001-black',
          quantity: 1,
        });

      // 주문 생성
      const orderRes = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ couponId: null });
      const orderId = orderRes.body.orderId;

      // 결제
      await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          orderId,
          paymentMethod: 'CREDIT_CARD',
          idempotencyKey: uuidv4(),
        })
        .expect(201);

      // 결제 후 재고 확인
      const stockAfter = await db.prisma.stock.findUnique({
        where: { id: 'stock-option-001-black' },
      });

      // soldQuantity가 1 증가해야 함
      expect(stockAfter?.soldQuantity).toBe(soldBefore + 1);
    });
  });
});
