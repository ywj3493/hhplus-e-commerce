import { Test, TestingModule } from '@nestjs/testing';
import { ProductPrismaRepository } from '@/product/infrastructure/repositories/product-prisma.repository';
import { PrismaService } from '@/common/infrastructure/persistance/prisma.service';
import { Product } from '@/product/domain/entities/product.entity';
import { Price } from '@/product/domain/entities/price.vo';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllTables,
  type TestDbConfig,
} from '../../utils/test-database';

describe('ProductPrismaRepository 통합 테스트', () => {
  let db: TestDbConfig;
  let prismaService: PrismaService;
  let repository: ProductPrismaRepository;
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
        ProductPrismaRepository,
      ],
    }).compile();

    prismaService = moduleRef.get<PrismaService>(PrismaService);
    repository = moduleRef.get<ProductPrismaRepository>(ProductPrismaRepository);
  }, 120000); // 120초 timeout

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  beforeEach(async () => {
    // 각 테스트 전에 데이터 정리
    await clearAllTables(prismaService);
  });

  describe('findById', () => {
    it('존재하는 상품 ID로 조회 시 Product 애그리거트를 반환해야 함', async () => {
      // Given: 카테고리 생성
      await prismaService.category.create({
        data: {
          id: 'test-category',
          name: '테스트 카테고리',
        },
      });

      // And: 옵션이 없는 상품 생성
      await prismaService.product.create({
        data: {
          id: 'test-product-id',
          name: '테스트 상품',
          description: '테스트 설명',
          price: 10000,
          imageUrl: 'https://example.com/image.jpg',
          categoryId: 'test-category',
          hasOptions: false,
        },
      });

      // When: ID로 상품 조회
      const result = await repository.findById('test-product-id');

      // Then: Product 엔티티가 반환되어야 함
      expect(result).toBeInstanceOf(Product);
      expect(result?.id).toBe('test-product-id');
      expect(result?.name).toBe('테스트 상품');
      expect(result?.description).toBe('테스트 설명');
      expect(result?.price.amount).toBe(10000);
      expect(result?.imageUrl).toBe('https://example.com/image.jpg');
      expect(result?.categoryId).toBe('test-category');
      expect(result?.options).toHaveLength(0);
    });

    it('옵션이 있는 상품을 조회 시 옵션과 재고를 포함해야 함', async () => {
      // Given: 카테고리 생성
      await prismaService.category.create({
        data: {
          id: 'test-category',
          name: '테스트 카테고리',
        },
      });

      // And: 옵션이 있는 상품 생성
      await prismaService.product.create({
        data: {
          id: 'product-with-options',
          name: '옵션 상품',
          description: '옵션 설명',
          price: 20000,
          imageUrl: 'https://example.com/image.jpg',
          categoryId: 'test-category',
          hasOptions: true,
          options: {
            create: [
              {
                id: 'option-1',
                type: 'COLOR',
                name: '빨강',
                additionalPrice: 0,
                stocks: {
                  create: {
                    id: 'stock-1',
                    productId: 'product-with-options',
                    totalQuantity: 100,
                    availableQuantity: 100,
                    reservedQuantity: 0,
                    soldQuantity: 0,
                  },
                },
              },
              {
                id: 'option-2',
                type: 'COLOR',
                name: '파랑',
                additionalPrice: 1000,
                stocks: {
                  create: {
                    id: 'stock-2',
                    productId: 'product-with-options',
                    totalQuantity: 50,
                    availableQuantity: 50,
                    reservedQuantity: 0,
                    soldQuantity: 0,
                  },
                },
              },
            ],
          },
        },
      });

      // When: 상품 조회
      const result = await repository.findById('product-with-options');

      // Then: 옵션과 재고가 포함되어야 함
      expect(result?.options).toHaveLength(2);
      expect(result?.options[0].name).toBe('빨강');
      expect(result?.options[0].stock.availableQuantity).toBe(100);
      expect(result?.options[1].name).toBe('파랑');
      expect(result?.options[1].stock.availableQuantity).toBe(50);
    });

    it('존재하지 않는 상품 ID로 조회 시 undefined를 반환해야 함', async () => {
      // Given: 데이터베이스에 상품이 없음

      // When: 존재하지 않는 ID로 조회
      const result = await repository.findById('non-existent-id');

      // Then: undefined가 반환되어야 함
      expect(result).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('페이지네이션을 적용하여 상품 목록을 조회해야 함', async () => {
      // Given: 카테고리 생성
      await prismaService.category.create({
        data: {
          id: 'test-category',
          name: '테스트 카테고리',
        },
      });

      // And: 여러 상품 생성
      for (let i = 1; i <= 15; i++) {
        await prismaService.product.create({
          data: {
            id: `product-${i}`,
            name: `상품 ${i}`,
            description: `설명 ${i}`,
            price: 10000 * i,
            imageUrl: `https://example.com/image${i}.jpg`,
            categoryId: 'test-category',
            hasOptions: false,
            createdAt: new Date(2024, 0, i),
          },
        });
      }

      // When: 페이지 1, 크기 10으로 조회
      const result = await repository.findAll(1, 10);

      // Then: 페이지네이션 결과가 올바르게 반환되어야 함
      expect(result.items).toHaveLength(10);
      expect(result.total).toBe(15);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(2);
      // 최신순 정렬 확인 (createdAt DESC)
      expect(result.items[0].id).toBe('product-15');
    });

    it('페이지 2를 조회하면 나머지 상품을 반환해야 함', async () => {
      // Given: 카테고리 생성
      await prismaService.category.create({
        data: {
          id: 'test-category',
          name: '테스트 카테고리',
        },
      });

      // And: 15개 상품 생성
      for (let i = 1; i <= 15; i++) {
        await prismaService.product.create({
          data: {
            id: `product-${i}`,
            name: `상품 ${i}`,
            description: `설명 ${i}`,
            price: 10000 * i,
            imageUrl: `https://example.com/image${i}.jpg`,
            categoryId: 'test-category',
            hasOptions: false,
          },
        });
      }

      // When: 페이지 2, 크기 10으로 조회
      const result = await repository.findAll(2, 10);

      // Then: 나머지 5개 상품이 반환되어야 함
      expect(result.items).toHaveLength(5);
      expect(result.page).toBe(2);
    });
  });

  describe('findPopular', () => {
    it('지정된 개수만큼 인기 상품을 조회해야 함', async () => {
      // Given: 카테고리 생성
      await prismaService.category.create({
        data: {
          id: 'test-category',
          name: '테스트 카테고리',
        },
      });

      // And: 10개 상품 생성
      for (let i = 1; i <= 10; i++) {
        await prismaService.product.create({
          data: {
            id: `product-${i}`,
            name: `상품 ${i}`,
            description: `설명 ${i}`,
            price: 10000 * i,
            imageUrl: `https://example.com/image${i}.jpg`,
            categoryId: 'test-category',
            hasOptions: false,
          },
        });
      }

      // When: 상위 5개 조회
      const result = await repository.findPopular(5);

      // Then: 5개 상품이 반환되어야 함
      expect(result).toHaveLength(5);
    });
  });

  describe('save', () => {
    it('새로운 상품을 생성해야 함', async () => {
      // Given: 카테고리 생성
      await prismaService.category.create({
        data: {
          id: 'test-category',
          name: '테스트 카테고리',
        },
      });

      // And: 새로운 Product 엔티티
      const product = Product.create(
        'new-product-id',
        '새 상품',
        Price.from(15000),
        '새 상품 설명',
        'https://example.com/new.jpg',
        'test-category',
        [],
        new Date(),
        new Date(),
      );

      // When: 저장
      await repository.save(product);

      // Then: 데이터베이스에 저장되어야 함
      const savedInDb = await prismaService.product.findUnique({
        where: { id: 'new-product-id' },
      });
      expect(savedInDb).toBeDefined();
      expect(savedInDb?.name).toBe('새 상품');
      expect(Number(savedInDb?.price)).toBe(15000);
    });
  });

  describe('exists', () => {
    it('존재하는 상품의 경우 true를 반환해야 함', async () => {
      // Given: 카테고리 생성
      await prismaService.category.create({
        data: {
          id: 'test-category',
          name: '테스트 카테고리',
        },
      });

      // And: 상품 생성
      await prismaService.product.create({
        data: {
          id: 'existing-product',
          name: '기존 상품',
          description: '설명',
          price: 10000,
          imageUrl: 'https://example.com/image.jpg',
          categoryId: 'test-category',
          hasOptions: false,
        },
      });

      // When: 존재 여부 확인
      const result = await repository.exists('existing-product');

      // Then: true가 반환되어야 함
      expect(result).toBe(true);
    });

    it('존재하지 않는 상품의 경우 false를 반환해야 함', async () => {
      // When: 존재하지 않는 상품 확인
      const result = await repository.exists('non-existent-product');

      // Then: false가 반환되어야 함
      expect(result).toBe(false);
    });
  });

  describe('reserveStock - 재고 예약 (비관적 락)', () => {
    it('재고가 충분한 경우 예약에 성공해야 함', async () => {
      // Given: 재고가 있는 상품 생성
      await prismaService.category.create({
        data: { id: 'test-category', name: '테스트 카테고리' },
      });
      await prismaService.product.create({
        data: {
          id: 'test-product',
          name: '테스트 상품',
          description: '설명',
          price: 10000,
          imageUrl: 'https://example.com/image.jpg',
          categoryId: 'test-category',
          hasOptions: false,
        },
      });
      await prismaService.stock.create({
        data: {
          id: 'test-stock',
          productId: 'test-product',
          totalQuantity: 100,
          availableQuantity: 100,
          reservedQuantity: 0,
          soldQuantity: 0,
        },
      });

      // When: 재고 10개 예약
      await repository.reserveStock('test-stock', 10);

      // Then: 재고가 올바르게 예약되어야 함
      const stock = await prismaService.stock.findUnique({
        where: { id: 'test-stock' },
      });
      expect(stock?.availableQuantity).toBe(90);
      expect(stock?.reservedQuantity).toBe(10);
      expect(stock?.soldQuantity).toBe(0);
    });

    it('재고가 부족한 경우 예외를 발생시켜야 함', async () => {
      // Given: 재고가 부족한 상품 생성
      await prismaService.category.create({
        data: { id: 'test-category', name: '테스트 카테고리' },
      });
      await prismaService.product.create({
        data: {
          id: 'test-product',
          name: '테스트 상품',
          description: '설명',
          price: 10000,
          imageUrl: 'https://example.com/image.jpg',
          categoryId: 'test-category',
          hasOptions: false,
        },
      });
      await prismaService.stock.create({
        data: {
          id: 'test-stock',
          productId: 'test-product',
          totalQuantity: 10,
          availableQuantity: 5,
          reservedQuantity: 5,
          soldQuantity: 0,
        },
      });

      // When & Then: 재고 부족 예외 발생
      await expect(repository.reserveStock('test-stock', 10)).rejects.toThrow(
        '재고가 부족합니다',
      );

      // And: 재고가 변경되지 않아야 함
      const stock = await prismaService.stock.findUnique({
        where: { id: 'test-stock' },
      });
      expect(stock?.availableQuantity).toBe(5);
      expect(stock?.reservedQuantity).toBe(5);
    });

    it('유효하지 않은 수량(0 이하)의 경우 예외를 발생시켜야 함', async () => {
      // Given: 재고 생성
      await prismaService.category.create({
        data: { id: 'test-category', name: '테스트 카테고리' },
      });
      await prismaService.product.create({
        data: {
          id: 'test-product',
          name: '테스트 상품',
          description: '설명',
          price: 10000,
          imageUrl: 'https://example.com/image.jpg',
          categoryId: 'test-category',
          hasOptions: false,
        },
      });
      await prismaService.stock.create({
        data: {
          id: 'test-stock',
          productId: 'test-product',
          totalQuantity: 100,
          availableQuantity: 100,
          reservedQuantity: 0,
          soldQuantity: 0,
        },
      });

      // When & Then: 유효하지 않은 수량 예외 발생
      await expect(repository.reserveStock('test-stock', 0)).rejects.toThrow(
        '예약 수량은 양수여야 합니다',
      );
      await expect(repository.reserveStock('test-stock', -5)).rejects.toThrow(
        '예약 수량은 양수여야 합니다',
      );
    });
  });

  describe('releaseStock - 예약 재고 복원', () => {
    it('예약된 재고를 정상적으로 복원해야 함', async () => {
      // Given: 예약된 재고가 있는 상품 생성
      await prismaService.category.create({
        data: { id: 'test-category', name: '테스트 카테고리' },
      });
      await prismaService.product.create({
        data: {
          id: 'test-product',
          name: '테스트 상품',
          description: '설명',
          price: 10000,
          imageUrl: 'https://example.com/image.jpg',
          categoryId: 'test-category',
          hasOptions: false,
        },
      });
      await prismaService.stock.create({
        data: {
          id: 'test-stock',
          productId: 'test-product',
          totalQuantity: 100,
          availableQuantity: 80,
          reservedQuantity: 20,
          soldQuantity: 0,
        },
      });

      // When: 예약 재고 10개 복원
      await repository.releaseStock('test-stock', 10);

      // Then: 재고가 올바르게 복원되어야 함
      const stock = await prismaService.stock.findUnique({
        where: { id: 'test-stock' },
      });
      expect(stock?.availableQuantity).toBe(90);
      expect(stock?.reservedQuantity).toBe(10);
    });

    it('예약 수량을 초과하여 복원하려는 경우 예외를 발생시켜야 함', async () => {
      // Given: 예약된 재고가 있는 상품 생성
      await prismaService.category.create({
        data: { id: 'test-category', name: '테스트 카테고리' },
      });
      await prismaService.product.create({
        data: {
          id: 'test-product',
          name: '테스트 상품',
          description: '설명',
          price: 10000,
          imageUrl: 'https://example.com/image.jpg',
          categoryId: 'test-category',
          hasOptions: false,
        },
      });
      await prismaService.stock.create({
        data: {
          id: 'test-stock',
          productId: 'test-product',
          totalQuantity: 100,
          availableQuantity: 90,
          reservedQuantity: 10,
          soldQuantity: 0,
        },
      });

      // When & Then: 예약 수량 초과 예외 발생
      await expect(repository.releaseStock('test-stock', 20)).rejects.toThrow(
        '복원 수량이 예약 수량을 초과합니다',
      );
    });
  });

  describe('confirmStock - 예약 재고 판매 확정', () => {
    it('예약된 재고를 판매로 확정해야 함', async () => {
      // Given: 예약된 재고가 있는 상품 생성
      await prismaService.category.create({
        data: { id: 'test-category', name: '테스트 카테고리' },
      });
      await prismaService.product.create({
        data: {
          id: 'test-product',
          name: '테스트 상품',
          description: '설명',
          price: 10000,
          imageUrl: 'https://example.com/image.jpg',
          categoryId: 'test-category',
          hasOptions: false,
        },
      });
      await prismaService.stock.create({
        data: {
          id: 'test-stock',
          productId: 'test-product',
          totalQuantity: 100,
          availableQuantity: 80,
          reservedQuantity: 20,
          soldQuantity: 0,
        },
      });

      // When: 예약 재고 10개 판매 확정
      await repository.confirmStock('test-stock', 10);

      // Then: 재고가 올바르게 판매 확정되어야 함
      const stock = await prismaService.stock.findUnique({
        where: { id: 'test-stock' },
      });
      expect(stock?.availableQuantity).toBe(80);
      expect(stock?.reservedQuantity).toBe(10);
      expect(stock?.soldQuantity).toBe(10);
    });

    it('예약 수량을 초과하여 확정하려는 경우 예외를 발생시켜야 함', async () => {
      // Given: 예약된 재고가 있는 상품 생성
      await prismaService.category.create({
        data: { id: 'test-category', name: '테스트 카테고리' },
      });
      await prismaService.product.create({
        data: {
          id: 'test-product',
          name: '테스트 상품',
          description: '설명',
          price: 10000,
          imageUrl: 'https://example.com/image.jpg',
          categoryId: 'test-category',
          hasOptions: false,
        },
      });
      await prismaService.stock.create({
        data: {
          id: 'test-stock',
          productId: 'test-product',
          totalQuantity: 100,
          availableQuantity: 90,
          reservedQuantity: 10,
          soldQuantity: 0,
        },
      });

      // When & Then: 예약 수량 초과 예외 발생
      await expect(repository.confirmStock('test-stock', 20)).rejects.toThrow(
        '판매 확정 수량이 예약 수량을 초과합니다',
      );
    });
  });

  describe('데이터베이스 연결', () => {
    it('Testcontainer MySQL에 정상적으로 연결되어야 함', async () => {
      // When: 데이터베이스 연결 확인
      const result = await prismaService.$queryRaw`SELECT 1 as result`;

      // Then: 쿼리 실행이 성공해야 함
      expect(result).toBeDefined();
    });

    it('products, product_options, stocks 테이블이 생성되어 있어야 함', async () => {
      // When: 테이블 목록 조회
      const tables = await prismaService.$queryRaw<{ TABLE_NAME: string }[]>`
        SELECT TABLE_NAME
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME IN ('products', 'product_options', 'stocks')
        ORDER BY TABLE_NAME
      `;

      // Then: 모든 테이블이 존재해야 함
      expect(tables).toHaveLength(3);
      expect(tables.map((t) => t.TABLE_NAME)).toEqual([
        'product_options',
        'products',
        'stocks',
      ]);
    });
  });
});
