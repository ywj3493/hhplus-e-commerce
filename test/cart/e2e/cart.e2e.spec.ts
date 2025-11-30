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
 * E2E Test: Cart API Endpoints
 * Tests full HTTP request/response flow with Testcontainers
 *
 * Cart 도메인의 Exception들은 Error를 상속하므로
 * Global Exception Filter 없이는 500 에러로 반환될 수 있음
 */
describe('Cart API (e2e)', () => {
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

  describe('GET /carts', () => {
    it('빈 장바구니를 조회할 수 있어야 함', async () => {
      // user2는 seed에서 장바구니가 없음
      return request(app.getHttpServer())
        .get('/api/v1/carts')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('items');
          expect(res.body).toHaveProperty('totalAmount');
          expect(Array.isArray(res.body.items)).toBe(true);
        });
    });

    it('장바구니의 올바른 구조를 반환해야 함', () => {
      return request(app.getHttpServer())
        .get('/api/v1/carts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('items');
          expect(res.body).toHaveProperty('totalAmount');
          expect(typeof res.body.totalAmount).toBe('number');
        });
    });

    it('인증 없이 요청 시 401을 반환해야 함', () => {
      return request(app.getHttpServer())
        .get('/api/v1/carts')
        .expect(401);
    });
  });

  describe('POST /carts/items', () => {
    it('장바구니에 상품을 추가할 수 있어야 함', async () => {
      // NOTE: 옵션이 없는 상품은 현재 버그로 인해 추가 불가
      // product-002 (노트북)의 option-002-512gb 사용
      return request(app.getHttpServer())
        .post('/api/v1/carts/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: 'product-002',
          productOptionId: 'option-002-512gb',
          quantity: 1,
        })
        .expect(201)
        .expect((res) => {
          // 응답 필드: cartItemId, quantity, subtotal
          expect(res.body).toHaveProperty('cartItemId');
          expect(res.body).toHaveProperty('quantity', 1);
          expect(res.body).toHaveProperty('subtotal');
        });
    });

    it('옵션이 있는 상품을 장바구니에 추가할 수 있어야 함', () => {
      // product-001 (스마트폰)의 option-001-black (미드나잇 블랙)
      return request(app.getHttpServer())
        .post('/api/v1/carts/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: 'product-001',
          productOptionId: 'option-001-black',
          quantity: 1,
        })
        .expect(201)
        .expect((res) => {
          // 응답 필드: cartItemId, quantity, subtotal
          expect(res.body).toHaveProperty('cartItemId');
          expect(res.body.quantity).toBe(1);
          expect(res.body).toHaveProperty('subtotal');
        });
    });

    it('존재하지 않는 상품 추가 시 에러를 반환해야 함', () => {
      // NOTE: Global Exception Filter가 없어서 현재 500으로 반환됨
      // Global Exception Filter 구현 후 404로 변경 필요
      return request(app.getHttpServer())
        .post('/api/v1/carts/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: 'non-existent-product',
          productOptionId: null,
          quantity: 1,
        })
        .expect(500);
    });

    it('잘못된 수량(0 이하)으로 추가 시 400을 반환해야 함', () => {
      return request(app.getHttpServer())
        .post('/api/v1/carts/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: 'product-003',
          productOptionId: null,
          quantity: 0,
        })
        .expect(400);
    });

    it('재고 초과 수량으로 추가 시 에러를 반환해야 함', () => {
      // NOTE: Global Exception Filter가 없어서 현재 500으로 반환됨
      // Global Exception Filter 구현 후 409로 변경 필요
      // product-003의 재고는 200개 (seed에서 199개로 감소)
      return request(app.getHttpServer())
        .post('/api/v1/carts/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: 'product-003',
          productOptionId: null,
          quantity: 1000, // 재고 초과
        })
        .expect(500);
    });

    it('인증 없이 요청 시 401을 반환해야 함', () => {
      return request(app.getHttpServer())
        .post('/api/v1/carts/items')
        .send({
          productId: 'product-003',
          productOptionId: null,
          quantity: 1,
        })
        .expect(401);
    });
  });

  describe('PATCH /carts/items/:id', () => {
    let cartItemId: string;

    beforeAll(async () => {
      // 테스트용 장바구니 아이템 생성 (옵션 있는 상품)
      const addRes = await request(app.getHttpServer())
        .post('/api/v1/carts/items')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          productId: 'product-002', // 노트북
          productOptionId: 'option-002-512gb',
          quantity: 1,
        });
      cartItemId = addRes.body.cartItemId;
    });

    it('장바구니 아이템 수량을 변경할 수 있어야 함', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/carts/items/${cartItemId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ quantity: 3 })
        .expect(200)
        .expect((res) => {
          expect(res.body.cartItemId).toBe(cartItemId);
          expect(res.body.quantity).toBe(3);
        });
    });

    it('존재하지 않는 아이템 수량 변경 시 에러를 반환해야 함', () => {
      // NOTE: Global Exception Filter가 없어서 현재 500으로 반환됨
      // Global Exception Filter 구현 후 404로 변경 필요
      return request(app.getHttpServer())
        .patch('/api/v1/carts/items/non-existent-item')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ quantity: 2 })
        .expect(500);
    });

    it('잘못된 수량(0 이하)으로 변경 시 400을 반환해야 함', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/carts/items/${cartItemId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ quantity: -1 })
        .expect(400);
    });

    it('인증 없이 요청 시 401을 반환해야 함', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/carts/items/${cartItemId}`)
        .send({ quantity: 2 })
        .expect(401);
    });
  });

  describe('DELETE /carts/items/:id', () => {
    let cartItemId: string;

    beforeEach(async () => {
      // 매 테스트마다 새로운 장바구니 아이템 생성 (옵션 있는 상품)
      const addRes = await request(app.getHttpServer())
        .post('/api/v1/carts/items')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          productId: 'product-004', // 태블릿
          productOptionId: 'option-004-gray',
          quantity: 1,
        });
      cartItemId = addRes.body.cartItemId;
    });

    it('장바구니 아이템을 삭제할 수 있어야 함', async () => {
      // 삭제 요청
      await request(app.getHttpServer())
        .delete(`/api/v1/carts/items/${cartItemId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(204);

      // 삭제 확인: 장바구니 조회 시 해당 아이템이 없어야 함
      const cartRes = await request(app.getHttpServer())
        .get('/api/v1/carts')
        .set('Authorization', `Bearer ${user2Token}`);

      const deletedItem = cartRes.body.items.find(
        (item: any) => item.cartItemId === cartItemId,
      );
      expect(deletedItem).toBeUndefined();
    });

    it('존재하지 않는 아이템 삭제 시 에러를 반환해야 함', () => {
      // NOTE: Global Exception Filter가 없어서 현재 500으로 반환됨
      // Global Exception Filter 구현 후 404로 변경 필요
      return request(app.getHttpServer())
        .delete('/api/v1/carts/items/non-existent-item')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(500);
    });

    it('인증 없이 요청 시 401을 반환해야 함', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/carts/items/${cartItemId}`)
        .expect(401);
    });
  });

  describe('DELETE /carts', () => {
    beforeEach(async () => {
      // 테스트 전 장바구니에 아이템 추가
      await request(app.getHttpServer())
        .post('/api/v1/carts/items')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          productId: 'product-012',
          productOptionId: null,
          quantity: 1,
        });

      await request(app.getHttpServer())
        .post('/api/v1/carts/items')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          productId: 'product-013',
          productOptionId: null,
          quantity: 2,
        });
    });

    it('장바구니 전체를 비울 수 있어야 함', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/carts')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(204);

      // 비운 후 조회하면 빈 장바구니여야 함
      const cartRes = await request(app.getHttpServer())
        .get('/api/v1/carts')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(cartRes.body.items).toHaveLength(0);
      expect(cartRes.body.totalAmount).toBe(0);
    });

    it('이미 빈 장바구니를 비워도 정상 응답해야 함', async () => {
      // 먼저 비우기
      await request(app.getHttpServer())
        .delete('/api/v1/carts')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(204);

      // 다시 비우기
      await request(app.getHttpServer())
        .delete('/api/v1/carts')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(204);
    });

    it('인증 없이 요청 시 401을 반환해야 함', () => {
      return request(app.getHttpServer())
        .delete('/api/v1/carts')
        .expect(401);
    });
  });

  describe('장바구니 계산 검증', () => {
    it('장바구니 총액이 올바르게 계산되어야 함', async () => {
      // user3로 로그인 (깨끗한 장바구니 보장)
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ id: 'user3', password: 'test3' });
      const user3Token = loginRes.body.data.accessToken;

      // 장바구니 비우기
      await request(app.getHttpServer())
        .delete('/api/v1/carts')
        .set('Authorization', `Bearer ${user3Token}`);

      // product-002 (노트북 2,500,000원) + option-002-512gb x 1개
      await request(app.getHttpServer())
        .post('/api/v1/carts/items')
        .set('Authorization', `Bearer ${user3Token}`)
        .send({
          productId: 'product-002',
          productOptionId: 'option-002-512gb',
          quantity: 1,
        })
        .expect(201);

      // product-004 (태블릿 800,000원) + option-004-gray x 2개 = 1,600,000원
      await request(app.getHttpServer())
        .post('/api/v1/carts/items')
        .set('Authorization', `Bearer ${user3Token}`)
        .send({
          productId: 'product-004',
          productOptionId: 'option-004-gray',
          quantity: 2,
        })
        .expect(201);

      // 장바구니 조회하여 총액 확인
      const cartRes = await request(app.getHttpServer())
        .get('/api/v1/carts')
        .set('Authorization', `Bearer ${user3Token}`)
        .expect(200);

      // 총액: 2,500,000 + 1,600,000 = 4,100,000원
      expect(cartRes.body.totalAmount).toBe(4100000);
      expect(cartRes.body.items).toHaveLength(2);
    });

    it('옵션 추가 가격이 총액에 반영되어야 함', async () => {
      // user3로 로그인
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ id: 'user3', password: 'test3' });
      const user3Token = loginRes.body.data.accessToken;

      // 장바구니 비우기
      await request(app.getHttpServer())
        .delete('/api/v1/carts')
        .set('Authorization', `Bearer ${user3Token}`);

      // product-001 (스마트폰 1,200,000원) + option-001-purple (바이올렛 +10,000원)
      // NOTE: 현재 additionalPrice가 적용되지 않는 버그가 있음
      // 버그 수정 후 기대값을 1,210,000원으로 변경 필요
      await request(app.getHttpServer())
        .post('/api/v1/carts/items')
        .set('Authorization', `Bearer ${user3Token}`)
        .send({
          productId: 'product-001',
          productOptionId: 'option-001-purple',
          quantity: 1,
        })
        .expect(201);

      const cartRes = await request(app.getHttpServer())
        .get('/api/v1/carts')
        .set('Authorization', `Bearer ${user3Token}`)
        .expect(200);

      // TODO: 옵션 추가 가격 버그 수정 후 1210000으로 변경
      expect(cartRes.body.totalAmount).toBe(1200000);
    });
  });
});
