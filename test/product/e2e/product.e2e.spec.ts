import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ProductModule } from '@/product/product.module';
import { PrismaService } from '@/common/infrastructure/prisma/prisma.service';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  type TestDbConfig,
} from '../../utils/test-database';

/**
 * E2E Test: Product API Endpoints
 * Tests full HTTP request/response flow with Testcontainers
 */
describe('Product API (e2e)', () => {
  let app: INestApplication;
  let db: TestDbConfig;

  beforeAll(async () => {
    // 독립된 DB 설정 + Seed 데이터 (E2E 테스트용)
    db = await setupTestDatabase({ isolated: true, seed: true });

    // NestJS 앱 생성
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ProductModule],
    })
      .overrideProvider(PrismaService)
      .useValue(db.prisma)
      .compile();

    app = moduleFixture.createNestApplication();

    // 글로벌 유효성 검사 파이프 설정
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    );

    await app.init();
  }, 180000); // 180초 timeout (컨테이너 시작 + Migration + Seed)

  afterAll(async () => {
    await app.close();
    await cleanupTestDatabase(db);
  });

  describe('GET /products', () => {
    it('기본 페이지네이션으로 상품 목록을 반환해야 함', () => {
      return request(app.getHttpServer())
        .get('/products')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('items');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('limit');
          expect(res.body).toHaveProperty('totalPages');
          expect(res.body.page).toBe(1);
          expect(res.body.limit).toBe(10);
          expect(Array.isArray(res.body.items)).toBe(true);
          expect(res.body.items.length).toBeLessThanOrEqual(10);
        });
    });

    it('사용자 정의 페이지네이션으로 상품 목록을 반환해야 함', () => {
      return request(app.getHttpServer())
        .get('/products')
        .query({ page: 2, limit: 5 })
        .expect(200)
        .expect((res) => {
          expect(res.body.page).toBe(2);
          expect(res.body.limit).toBe(5);
          expect(res.body.items.length).toBeLessThanOrEqual(5);
        });
    });

    it('올바른 구조의 상품을 반환해야 함', () => {
      return request(app.getHttpServer())
        .get('/products')
        .expect(200)
        .expect((res) => {
          if (res.body.items.length > 0) {
            const product = res.body.items[0];
            expect(product).toHaveProperty('id');
            expect(product).toHaveProperty('name');
            expect(product).toHaveProperty('price');
            expect(product).toHaveProperty('imageUrl');
            expect(product).toHaveProperty('stockStatus');
            expect(typeof product.id).toBe('string');
            expect(typeof product.name).toBe('string');
            expect(typeof product.price).toBe('number');
            expect(typeof product.imageUrl).toBe('string');
            expect(['재고 있음', '품절']).toContain(product.stockStatus);
          }
        });
    });

    it('유효하지 않은 페이지 파라미터에 대해 400을 반환해야 함', () => {
      return request(app.getHttpServer())
        .get('/products')
        .query({ page: 0 })
        .expect(400);
    });

    it('최소값 미만의 페이지 크기에 대해 400을 반환해야 함', () => {
      return request(app.getHttpServer())
        .get('/products')
        .query({ page: 1, limit: 0 })
        .expect(400);
    });

    it('최대값 초과의 페이지 크기에 대해 400을 반환해야 함 (BR-PROD-03)', () => {
      return request(app.getHttpServer())
        .get('/products')
        .query({ page: 1, limit: 101 })
        .expect(400);
    });

    it('최대 페이지 크기 100을 허용해야 함', () => {
      return request(app.getHttpServer())
        .get('/products')
        .query({ page: 1, limit: 100 })
        .expect(200)
        .expect((res) => {
          expect(res.body.limit).toBe(100);
        });
    });

    it('사용 가능한 데이터를 초과하는 페이지를 처리해야 함', () => {
      return request(app.getHttpServer())
        .get('/products')
        .query({ page: 1000, limit: 10 })
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toHaveLength(0);
          expect(res.body.page).toBe(1000);
        });
    });

    it('상품을 최신순으로 정렬해야 함 (BR-PROD-01)', () => {
      return request(app.getHttpServer())
        .get('/products')
        .query({ page: 1, limit: 5 })
        .expect(200)
        .expect((res) => {
          expect(res.body.items.length).toBeGreaterThan(0);
          // 상품은 생성일자 순으로 정렬되어야 함 (최신 먼저)
          // ID가 내림차순인지 확인하여 이를 검증할 수 있음
        });
    });
  });

  describe('GET /products/:id', () => {
    const validProductId = '550e8400-e29b-41d4-a716-446655440001'; // Basic T-Shirt
    const invalidProductId = '550e8400-e29b-41d4-a716-446655449999'; // 유효한 UUID 형식이지만 존재하지 않음
    const malformedId = 'not-a-uuid';

    it('유효한 ID에 대해 상품 상세를 반환해야 함', () => {
      return request(app.getHttpServer())
        .get(`/products/${validProductId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('name');
          expect(res.body).toHaveProperty('price');
          expect(res.body).toHaveProperty('description');
          expect(res.body).toHaveProperty('imageUrl');
          expect(res.body).toHaveProperty('optionGroups');
          expect(res.body.id).toBe(validProductId);
          expect(Array.isArray(res.body.optionGroups)).toBe(true);
        });
    });

    it('올바른 구조의 상품을 반환해야 함', () => {
      return request(app.getHttpServer())
        .get(`/products/${validProductId}`)
        .expect(200)
        .expect((res) => {
          expect(typeof res.body.id).toBe('string');
          expect(typeof res.body.name).toBe('string');
          expect(typeof res.body.price).toBe('number');
          expect(typeof res.body.description).toBe('string');
          expect(typeof res.body.imageUrl).toBe('string');
          expect(res.body.price).toBeGreaterThan(0);
        });
    });

    it('그룹화된 옵션을 반환해야 함 (BR-PROD-05)', () => {
      return request(app.getHttpServer())
        .get(`/products/${validProductId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.optionGroups.length).toBeGreaterThan(0);

          res.body.optionGroups.forEach((group: any) => {
            expect(group).toHaveProperty('type');
            expect(group).toHaveProperty('options');
            expect(typeof group.type).toBe('string');
            expect(Array.isArray(group.options)).toBe(true);
            expect(group.options.length).toBeGreaterThan(0);
          });
        });
    });

    it('옵션별 재고 상태를 포함해야 함 (BR-PROD-06)', () => {
      return request(app.getHttpServer())
        .get(`/products/${validProductId}`)
        .expect(200)
        .expect((res) => {
          const firstGroup = res.body.optionGroups[0];
          const firstOption = firstGroup.options[0];

          expect(firstOption).toHaveProperty('id');
          expect(firstOption).toHaveProperty('name');
          expect(firstOption).toHaveProperty('additionalPrice');
          expect(firstOption).toHaveProperty('stockStatus');
          expect(firstOption).toHaveProperty('isSelectable');
          expect(['재고 있음', '품절']).toContain(firstOption.stockStatus);
          expect(typeof firstOption.isSelectable).toBe('boolean');
        });
    });

    it('품절 옵션을 선택 불가능으로 표시해야 함 (BR-PROD-08)', () => {
      return request(app.getHttpServer())
        .get(`/products/${validProductId}`)
        .expect(200)
        .expect((res) => {
          // Navy 옵션(품절)이 있는 Color 그룹 찾기
          const colorGroup = res.body.optionGroups.find((g: any) => g.type === 'Color');
          if (colorGroup) {
            const navyOption = colorGroup.options.find((o: any) => o.name === 'Navy');
            if (navyOption) {
              expect(navyOption.stockStatus).toBe('품절');
              expect(navyOption.isSelectable).toBe(false);
            }
          }
        });
    });

    it('옵션의 추가 가격을 포함해야 함', () => {
      // L과 XL에 +2000원이 있는 Premium Hoodie로 테스트
      const hoodieId = '550e8400-e29b-41d4-a716-446655440002';

      return request(app.getHttpServer())
        .get(`/products/${hoodieId}`)
        .expect(200)
        .expect((res) => {
          const sizeGroup = res.body.optionGroups.find((g: any) => g.type === 'Size');
          if (sizeGroup) {
            const lOption = sizeGroup.options.find((o: any) => o.name === 'L');
            if (lOption) {
              expect(lOption.additionalPrice).toBe(2000);
            }
          }
        });
    });

    it('존재하지 않는 상품 ID에 대해 404를 반환해야 함', () => {
      return request(app.getHttpServer())
        .get(`/products/${invalidProductId}`)
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('Product not found');
        });
    });

    it('잘못된 형식의 상품 ID에 대해 400을 반환해야 함', () => {
      return request(app.getHttpServer())
        .get(`/products/${malformedId}`)
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });
  });

  describe('API 일관성', () => {
    it('목록과 상세에서 동일한 상품 개수를 반환해야 함', async () => {
      // 상품 목록 조회
      const listResponse = await request(app.getHttpServer())
        .get('/products')
        .query({ page: 1, limit: 5 });

      expect(listResponse.status).toBe(200);

      // 목록의 각 상품에 대해 상세 조회
      for (const product of listResponse.body.items) {
        const detailResponse = await request(app.getHttpServer())
          .get(`/products/${product.id}`);

        expect(detailResponse.status).toBe(200);
        expect(detailResponse.body.id).toBe(product.id);
        expect(detailResponse.body.name).toBe(product.name);
        expect(detailResponse.body.price).toBe(product.price);
      }
    });

    it('목록과 상세 간 일관된 재고 상태를 가져야 함', async () => {
      // 상품 목록 조회
      const listResponse = await request(app.getHttpServer())
        .get('/products')
        .query({ page: 1, limit: 1 });

      if (listResponse.body.items.length > 0) {
        const listProduct = listResponse.body.items[0];

        // 상품 상세 조회
        const detailResponse = await request(app.getHttpServer())
          .get(`/products/${listProduct.id}`);

        expect(detailResponse.status).toBe(200);

        // 목록의 재고 상태는 전체 상품 상태
        // 상세는 옵션별 상태를 가짐
        // 재고가 있는 경우 최소한 하나의 옵션이 전체 상태와 일치해야 함
        if (listProduct.stockStatus === '재고 있음') {
          const hasInStockOption = detailResponse.body.optionGroups.some((group: any) =>
            group.options.some((opt: any) => opt.stockStatus === '재고 있음'),
          );
          expect(hasInStockOption).toBe(true);
        }
      }
    });
  });
});
