import { Test, TestingModule } from '@nestjs/testing';
import { CategoryPrismaRepository } from '@/product/infrastructure/repositories/category-prisma.repository';
import { PrismaService } from '@/common/infrastructure/prisma/prisma.service';
import { Category } from '@/product/domain/entities/category.entity';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllTables,
  type TestDbConfig,
} from '../../utils/test-database';

describe('CategoryPrismaRepository 통합 테스트', () => {
  let db: TestDbConfig;
  let prismaService: PrismaService;
  let repository: CategoryPrismaRepository;
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
        CategoryPrismaRepository,
      ],
    }).compile();

    prismaService = moduleRef.get<PrismaService>(PrismaService);
    repository = moduleRef.get<CategoryPrismaRepository>(CategoryPrismaRepository);
  }, 120000); // 120초 timeout

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  beforeEach(async () => {
    // 각 테스트 전에 데이터 정리
    await clearAllTables(prismaService);
  });

  describe('findById', () => {
    it('존재하는 카테고리 ID로 조회 시 Category 엔티티를 반환해야 함', async () => {
      // Given: 데이터베이스에 카테고리 생성
      const createdCategory = await prismaService.category.create({
        data: {
          id: 'test-category-id',
          name: '테스트 카테고리',
        },
      });

      // When: ID로 카테고리 조회
      const result = await repository.findById('test-category-id');

      // Then: Category 엔티티가 반환되어야 함
      expect(result).toBeInstanceOf(Category);
      expect(result?.id).toBe('test-category-id');
      expect(result?.name).toBe('테스트 카테고리');
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
    });

    it('존재하지 않는 카테고리 ID로 조회 시 null을 반환해야 함', async () => {
      // Given: 데이터베이스에 카테고리가 없음

      // When: 존재하지 않는 ID로 조회
      const result = await repository.findById('non-existent-id');

      // Then: null이 반환되어야 함
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('모든 카테고리를 생성일자 오름차순으로 조회해야 함', async () => {
      // Given: 여러 카테고리 생성
      const category1 = await prismaService.category.create({
        data: {
          id: 'category-1',
          name: '카테고리 1',
          createdAt: new Date('2024-01-01'),
        },
      });
      const category2 = await prismaService.category.create({
        data: {
          id: 'category-2',
          name: '카테고리 2',
          createdAt: new Date('2024-01-02'),
        },
      });
      const category3 = await prismaService.category.create({
        data: {
          id: 'category-3',
          name: '카테고리 3',
          createdAt: new Date('2024-01-03'),
        },
      });

      // When: 전체 조회
      const result = await repository.findAll();

      // Then: 생성일자 오름차순으로 정렬되어야 함
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('category-1');
      expect(result[1].id).toBe('category-2');
      expect(result[2].id).toBe('category-3');
    });

    it('카테고리가 없을 때 빈 배열을 반환해야 함', async () => {
      // Given: 데이터베이스에 카테고리가 없음

      // When: 전체 조회
      const result = await repository.findAll();

      // Then: 빈 배열이 반환되어야 함
      expect(result).toEqual([]);
    });
  });

  describe('save', () => {
    it('새로운 카테고리를 생성해야 함', async () => {
      // Given: 새로운 Category 엔티티
      const category = Category.create('new-category-id', '새 카테고리');

      // When: 저장
      const result = await repository.save(category);

      // Then: 저장된 엔티티가 반환되어야 함
      expect(result).toBeInstanceOf(Category);
      expect(result.id).toBe('new-category-id');
      expect(result.name).toBe('새 카테고리');

      // And: 데이터베이스에 저장되어야 함
      const savedInDb = await prismaService.category.findUnique({
        where: { id: 'new-category-id' },
      });
      expect(savedInDb).toBeDefined();
      expect(savedInDb?.name).toBe('새 카테고리');
    });

    it('기존 카테고리를 업데이트해야 함', async () => {
      // Given: 기존 카테고리
      await prismaService.category.create({
        data: {
          id: 'existing-category',
          name: '기존 카테고리',
        },
      });

      // And: 업데이트할 Category 엔티티
      const category = Category.create('existing-category', '업데이트된 카테고리');

      // When: 저장
      const result = await repository.save(category);

      // Then: 업데이트된 엔티티가 반환되어야 함
      expect(result.id).toBe('existing-category');
      expect(result.name).toBe('업데이트된 카테고리');

      // And: 데이터베이스에 업데이트되어야 함
      const updatedInDb = await prismaService.category.findUnique({
        where: { id: 'existing-category' },
      });
      expect(updatedInDb?.name).toBe('업데이트된 카테고리');
    });
  });

  describe('데이터베이스 연결', () => {
    it('Testcontainer MySQL에 정상적으로 연결되어야 함', async () => {
      // When: 데이터베이스 연결 확인
      const result = await prismaService.$queryRaw`SELECT 1 as result`;

      // Then: 쿼리 실행이 성공해야 함
      expect(result).toBeDefined();
    });

    it('categories 테이블이 생성되어 있어야 함', async () => {
      // When: 테이블 목록 조회 (현재 연결된 DB 사용)
      const tables = await prismaService.$queryRaw<{ TABLE_NAME: string }[]>`
        SELECT TABLE_NAME
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories'
      `;

      // Then: categories 테이블이 존재해야 함
      expect(tables).toHaveLength(1);
      expect(tables[0].TABLE_NAME).toBe('categories');
    });
  });
});
