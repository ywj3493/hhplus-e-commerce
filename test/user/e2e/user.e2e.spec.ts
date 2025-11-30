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
 * E2E Test: User API Endpoints
 * Tests full HTTP request/response flow with Testcontainers
 */
describe('User API (e2e)', () => {
  let app: INestApplication;
  let db: TestDbConfig;
  let redisConfig: TestRedisConfig;
  let authToken: string;

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

    // 인증 토큰 획득
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ id: 'user1', password: 'test1' });
    authToken = loginRes.body.data.accessToken;
  }, 180000); // 180초 timeout (컨테이너 시작 + Migration + Seed)

  afterAll(async () => {
    await app.close();
    await cleanupTestDatabase(db);
    await cleanupTestRedis(redisConfig);
  });

  describe('GET /users/me', () => {
    it('인증된 사용자의 프로필을 반환해야 함', () => {
      // user1 (FAKE_USERS) -> user-001 (DB seed: 김철수)
      return request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('name');
          expect(res.body).toHaveProperty('email');
          expect(res.body.id).toBe('user-001');
          // DB seed 데이터: 김철수, kim@example.com
          expect(res.body.name).toBe('김철수');
          expect(res.body.email).toBe('kim@example.com');
        });
    });

    it('올바른 구조의 응답을 반환해야 함', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(typeof res.body.id).toBe('string');
          expect(typeof res.body.name).toBe('string');
          // email은 nullable이므로 string 또는 null
          expect(
            res.body.email === null || typeof res.body.email === 'string',
          ).toBe(true);
        });
    });

    it('인증 없이 요청 시 401을 반환해야 함', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users/me')
        .expect(401);
    });

    it('잘못된 토큰으로 요청 시 401을 반환해야 함', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('만료된 토큰으로 요청 시 401을 반환해야 함', () => {
      // 만료된 JWT 토큰 (exp가 과거)
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTAwMSIsIm5hbWUiOiLtmY3quLjrj5kiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDAwMX0.invalid';

      return request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('다른 사용자로 로그인하여 프로필 조회 시 해당 사용자의 정보를 반환해야 함', async () => {
      // user2 (FAKE_USERS) -> user-002 (DB seed: 이영희)
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ id: 'user2', password: 'test2' });

      const user2Token = loginRes.body.data.accessToken;

      return request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe('user-002');
          expect(res.body.name).toBe('이영희');
          expect(res.body.email).toBe('lee@example.com');
        });
    });

    it('이메일이 없는 사용자도 정상적으로 조회해야 함', async () => {
      // user3 (FAKE_USERS) -> user-003 (DB seed: 박민수, email: null)
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ id: 'user3', password: 'test3' });

      const user3Token = loginRes.body.data.accessToken;

      return request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${user3Token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe('user-003');
          expect(res.body.name).toBe('박민수');
          expect(res.body.email).toBeNull();
        });
    });
  });

  describe('인증 흐름', () => {
    it('로그인 성공 시 액세스 토큰을 반환해야 함', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ id: 'user1', password: 'test1' })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data).toHaveProperty('userId');
          expect(res.body.data).toHaveProperty('name');
          expect(res.body.data.userId).toBe('user-001');
        });
    });

    it('잘못된 아이디로 로그인 시 401을 반환해야 함', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ id: 'wronguser', password: 'test1' })
        .expect(401)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
        });
    });

    it('잘못된 비밀번호로 로그인 시 401을 반환해야 함', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ id: 'user1', password: 'wrongpassword' })
        .expect(401)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
        });
    });
  });
});
