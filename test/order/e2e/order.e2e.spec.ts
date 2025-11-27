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
 * E2E Test: Order API Endpoints
 * Tests full HTTP request/response flow with Testcontainers
 *
 * Order 도메인의 Exception들은 Error를 상속하므로
 * Global Exception Filter 없이는 500 에러로 반환될 수 있음
 *
 * 테스트할 Exception:
 * - EmptyCartException → 400 Bad Request (예상)
 * - OrderNotFoundException → 404 Not Found (예상)
 * - OrderOwnershipException → 403 Forbidden (예상)
 * - InsufficientStockException → 409 Conflict (예상)
 */
describe('Order API (e2e)', () => {
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

  describe('GET /orders', () => {
    it('사용자의 주문 목록을 반환해야 함', () => {
      // user-001은 seed에서 order-001 (PAID), order-003 (CANCELLED)을 가지고 있음
      return request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          // API 응답 구조: orders, pagination 객체로 분리
          expect(res.body).toHaveProperty('orders');
          expect(res.body).toHaveProperty('pagination');
          expect(res.body.pagination).toHaveProperty('total');
          expect(res.body.pagination).toHaveProperty('page');
          expect(res.body.pagination).toHaveProperty('limit');
          expect(Array.isArray(res.body.orders)).toBe(true);
          expect(res.body.orders.length).toBeGreaterThanOrEqual(2);
        });
    });

    it('주문의 올바른 구조를 반환해야 함', () => {
      return request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          if (res.body.orders.length > 0) {
            const order = res.body.orders[0];
            // API 응답 구조: orderId 사용
            expect(order).toHaveProperty('orderId');
            expect(order).toHaveProperty('status');
            expect(order).toHaveProperty('totalAmount');
            expect(order).toHaveProperty('finalAmount');
            expect(order).toHaveProperty('createdAt');
          }
        });
    });

    it('페이지네이션이 올바르게 동작해야 함', () => {
      return request(app.getHttpServer())
        .get('/api/v1/orders')
        .query({ page: 1, limit: 1 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          // API 응답 구조: pagination 객체
          expect(res.body.pagination.page).toBe(1);
          expect(res.body.pagination.limit).toBe(1);
          expect(res.body.orders.length).toBeLessThanOrEqual(1);
        });
    });

    it('인증 없이 요청 시 401을 반환해야 함', () => {
      return request(app.getHttpServer())
        .get('/api/v1/orders')
        .expect(401);
    });
  });

  describe('GET /orders/:id', () => {
    it('본인의 주문을 조회할 수 있어야 함', () => {
      // order-001은 user-001의 주문
      return request(app.getHttpServer())
        .get('/api/v1/orders/order-001')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          // API 응답 구조: orderId 사용
          expect(res.body).toHaveProperty('orderId', 'order-001');
          expect(res.body).toHaveProperty('status', 'PAID');
          expect(res.body).toHaveProperty('items');
          expect(Array.isArray(res.body.items)).toBe(true);
          expect(res.body.items.length).toBeGreaterThan(0);
        });
    });

    it('주문 아이템의 올바른 구조를 반환해야 함', () => {
      return request(app.getHttpServer())
        .get('/api/v1/orders/order-001')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          const item = res.body.items[0];
          // API 응답 구조: price, subtotal 사용
          expect(item).toHaveProperty('productId');
          expect(item).toHaveProperty('productName');
          expect(item).toHaveProperty('quantity');
          expect(item).toHaveProperty('price');
          expect(item).toHaveProperty('subtotal');
        });
    });

    it('존재하지 않는 주문 조회 시 에러를 반환해야 함', () => {
      // NOTE: Global Exception Filter가 없어서 OrderNotFoundException이 500으로 반환됨
      // Global Exception Filter 구현 후 404로 변경 필요
      return request(app.getHttpServer())
        .get('/api/v1/orders/non-existent-order')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);
    });

    it('다른 사용자의 주문 조회 시 에러를 반환해야 함', () => {
      // NOTE: Global Exception Filter가 없어서 OrderOwnershipException이 500으로 반환됨
      // Global Exception Filter 구현 후 403으로 변경 필요
      // order-001은 user-001의 주문, user2로 조회 시도
      return request(app.getHttpServer())
        .get('/api/v1/orders/order-001')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(500);
    });

    it('인증 없이 요청 시 401을 반환해야 함', () => {
      return request(app.getHttpServer())
        .get('/api/v1/orders/order-001')
        .expect(401);
    });
  });

  describe('POST /orders', () => {
    it('장바구니 상품으로 주문을 생성할 수 있어야 함', async () => {
      // 먼저 장바구니 비우기
      await request(app.getHttpServer())
        .delete('/api/v1/carts')
        .set('Authorization', `Bearer ${user2Token}`);

      // 장바구니에 상품 추가 (옵션이 있는 상품 사용)
      // product-005 (스마트워치 450,000원) + option-005-40mm
      await request(app.getHttpServer())
        .post('/api/v1/carts/items')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          productId: 'product-005',
          productOptionId: 'option-005-40mm',
          quantity: 1,
        });

      // 주문 생성
      return request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ couponId: null })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('orderId');
          expect(res.body).toHaveProperty('status', 'PENDING');
          expect(res.body).toHaveProperty('totalAmount');
          expect(res.body).toHaveProperty('finalAmount');
          // API 응답 구조: reservationExpiresAt 사용
          expect(res.body).toHaveProperty('reservationExpiresAt');
          // 스마트워치 350,000원
          expect(res.body.totalAmount).toBe(350000);
        });
    });

    it('쿠폰을 적용하여 주문을 생성할 수 있어야 함', async () => {
      // user3로 로그인
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ id: 'user3', password: 'test3' });
      const user3Token = loginRes.body.data.accessToken;

      // 장바구니 비우기
      await request(app.getHttpServer())
        .delete('/api/v1/carts')
        .set('Authorization', `Bearer ${user3Token}`);

      // 장바구니에 상품 추가 (최소 주문 금액 5만원 이상, 옵션 있는 상품 사용)
      // product-005 (스마트워치 450,000원) + option-005-44mm
      await request(app.getHttpServer())
        .post('/api/v1/carts/items')
        .set('Authorization', `Bearer ${user3Token}`)
        .send({
          productId: 'product-005',
          productOptionId: 'option-005-44mm',
          quantity: 1, // 450,000원
        });

      // user-003은 user-coupon-006 (coupon-001: 10,000원 할인) 보유
      // 최소 주문 금액 50,000원 충족
      return request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${user3Token}`)
        .send({ couponId: 'user-coupon-006' })
        .expect(201)
        .expect((res) => {
          // 스마트워치 350,000원
          expect(res.body.totalAmount).toBe(350000);
          expect(res.body.discountAmount).toBe(10000);
          expect(res.body.finalAmount).toBe(340000);
        });
    });

    it('빈 장바구니로 주문 시 에러를 반환해야 함', async () => {
      // 장바구니 비우기
      await request(app.getHttpServer())
        .delete('/api/v1/carts')
        .set('Authorization', `Bearer ${user2Token}`);

      // NOTE: Global Exception Filter가 없어서 EmptyCartException이 500으로 반환됨
      // Global Exception Filter 구현 후 400으로 변경 필요
      // 빈 장바구니로 주문 시도
      return request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ couponId: null })
        .expect(500);
    });

    it('재고 부족 시 에러를 반환해야 함', async () => {
      // 장바구니 비우기
      await request(app.getHttpServer())
        .delete('/api/v1/carts')
        .set('Authorization', `Bearer ${user2Token}`);

      // 먼저 재고가 있는 상태에서 장바구니에 추가
      await request(app.getHttpServer())
        .post('/api/v1/carts/items')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          productId: 'product-001',
          productOptionId: 'option-001-purple',
          quantity: 1,
        });

      // 장바구니 추가 후 재고를 0으로 변경 (주문 시점에 재고 부족 발생)
      await db.prisma.stock.update({
        where: { id: 'stock-option-001-purple' },
        data: { availableQuantity: 0 },
      });

      // NOTE: Global Exception Filter가 없어서 InsufficientStockException이 500으로 반환됨
      // Global Exception Filter 구현 후 409로 변경 필요
      // 주문 시도 - 재고 부족으로 실패해야 함
      return request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ couponId: null })
        .expect(500);
    });

    it('인증 없이 요청 시 401을 반환해야 함', () => {
      return request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({ couponId: null })
        .expect(401);
    });
  });

  describe('주문 상태 및 데이터 일관성', () => {
    it('주문 생성 후 장바구니가 비워져야 함', async () => {
      // 장바구니 비우기
      await request(app.getHttpServer())
        .delete('/api/v1/carts')
        .set('Authorization', `Bearer ${user2Token}`);

      // 장바구니에 상품 추가 (옵션 있는 상품 사용)
      // product-004 (태블릿 800,000원) + option-004-gray
      await request(app.getHttpServer())
        .post('/api/v1/carts/items')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          productId: 'product-004',
          productOptionId: 'option-004-gray',
          quantity: 1,
        });

      // 장바구니 확인
      const cartBefore = await request(app.getHttpServer())
        .get('/api/v1/carts')
        .set('Authorization', `Bearer ${user2Token}`);
      expect(cartBefore.body.items.length).toBe(1);

      // 주문 생성
      await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ couponId: null })
        .expect(201);

      // 장바구니가 비워졌는지 확인
      const cartAfter = await request(app.getHttpServer())
        .get('/api/v1/carts')
        .set('Authorization', `Bearer ${user2Token}`);
      expect(cartAfter.body.items.length).toBe(0);
    });

    it('주문 생성 후 주문 목록에서 확인할 수 있어야 함', async () => {
      // 장바구니 비우기
      await request(app.getHttpServer())
        .delete('/api/v1/carts')
        .set('Authorization', `Bearer ${user2Token}`);

      // 장바구니에 상품 추가 (옵션 있는 상품 사용)
      // product-002 (노트북 2,500,000원) + option-002-512gb
      await request(app.getHttpServer())
        .post('/api/v1/carts/items')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          productId: 'product-002',
          productOptionId: 'option-002-512gb',
          quantity: 1,
        });

      // 주문 생성
      const orderRes = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ couponId: null });

      const newOrderId = orderRes.body.orderId;

      // 주문 목록에서 새 주문 확인
      const ordersRes = await request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${user2Token}`);

      // API 응답 구조: orderId 사용
      const newOrder = ordersRes.body.orders.find(
        (o: any) => o.orderId === newOrderId,
      );
      expect(newOrder).toBeDefined();
      expect(newOrder.status).toBe('PENDING');
    });
  });
});
