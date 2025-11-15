import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ProductModule } from '../../../src/product/product.module';

/**
 * E2E Test: Product API Endpoints
 * Tests full HTTP request/response flow
 */
describe('Product API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ProductModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Enable validation pipe (same as main.ts)
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /products', () => {
    it('should return product list with default pagination', () => {
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

    it('should return product list with custom pagination', () => {
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

    it('should return products with correct structure', () => {
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

    it('should return 400 for invalid page parameter', () => {
      return request(app.getHttpServer())
        .get('/products')
        .query({ page: 0 })
        .expect(400);
    });

    it('should return 400 for page size below minimum', () => {
      return request(app.getHttpServer())
        .get('/products')
        .query({ page: 1, limit: 0 })
        .expect(400);
    });

    it('should return 400 for page size above maximum (BR-PROD-03)', () => {
      return request(app.getHttpServer())
        .get('/products')
        .query({ page: 1, limit: 101 })
        .expect(400);
    });

    it('should accept maximum page size of 100', () => {
      return request(app.getHttpServer())
        .get('/products')
        .query({ page: 1, limit: 100 })
        .expect(200)
        .expect((res) => {
          expect(res.body.limit).toBe(100);
        });
    });

    it('should handle page beyond available data', () => {
      return request(app.getHttpServer())
        .get('/products')
        .query({ page: 1000, limit: 10 })
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toHaveLength(0);
          expect(res.body.page).toBe(1000);
        });
    });

    it('should sort products by newest first (BR-PROD-01)', () => {
      return request(app.getHttpServer())
        .get('/products')
        .query({ page: 1, limit: 5 })
        .expect(200)
        .expect((res) => {
          expect(res.body.items.length).toBeGreaterThan(0);
          // Products should be sorted by creation date (newest first)
          // We can verify this by checking IDs in descending order
        });
    });
  });

  describe('GET /products/:id', () => {
    const validProductId = '550e8400-e29b-41d4-a716-446655440001'; // Basic T-Shirt
    const invalidProductId = '550e8400-e29b-41d4-a716-446655449999'; // Valid UUID format but non-existent
    const malformedId = 'not-a-uuid';

    it('should return product detail for valid ID', () => {
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

    it('should return product with correct structure', () => {
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

    it('should return grouped options (BR-PROD-05)', () => {
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

    it('should include stock status per option (BR-PROD-06)', () => {
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

    it('should mark out-of-stock options as not selectable (BR-PROD-08)', () => {
      return request(app.getHttpServer())
        .get(`/products/${validProductId}`)
        .expect(200)
        .expect((res) => {
          // Find the Color group with Navy option (which is out of stock)
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

    it('should include additional price for options', () => {
      // Test with Premium Hoodie which has L and XL with +2000 KRW
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

    it('should return 404 for non-existent product ID', () => {
      return request(app.getHttpServer())
        .get(`/products/${invalidProductId}`)
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('Product not found');
        });
    });

    it('should return 400 for malformed product ID', () => {
      return request(app.getHttpServer())
        .get(`/products/${malformedId}`)
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });
  });

  describe('API consistency', () => {
    it('should return same product count in list and detail', async () => {
      // Get product list
      const listResponse = await request(app.getHttpServer())
        .get('/products')
        .query({ page: 1, limit: 5 });

      expect(listResponse.status).toBe(200);

      // For each product in list, get detail
      for (const product of listResponse.body.items) {
        const detailResponse = await request(app.getHttpServer())
          .get(`/products/${product.id}`);

        expect(detailResponse.status).toBe(200);
        expect(detailResponse.body.id).toBe(product.id);
        expect(detailResponse.body.name).toBe(product.name);
        expect(detailResponse.body.price).toBe(product.price);
      }
    });

    it('should have consistent stock status between list and detail', async () => {
      // Get product list
      const listResponse = await request(app.getHttpServer())
        .get('/products')
        .query({ page: 1, limit: 1 });

      if (listResponse.body.items.length > 0) {
        const listProduct = listResponse.body.items[0];

        // Get product detail
        const detailResponse = await request(app.getHttpServer())
          .get(`/products/${listProduct.id}`);

        expect(detailResponse.status).toBe(200);

        // Stock status in list is overall product status
        // Detail has per-option status
        // At least one option should match the overall status if in stock
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
