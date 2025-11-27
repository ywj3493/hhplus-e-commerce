import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/common/infrastructure/persistance/prisma.service';
import { ProductPrismaRepository } from '@/product/infrastructure/repositories/product-prisma.repository';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllTables,
  type TestDbConfig,
} from '../../utils/test-database';

/**
 * 재고 예약 동시성 제어 통합 테스트
 * - Repository 레벨 동시성 테스트 (분산락 없이)
 * - 100 concurrent requests 시나리오
 * - 재고 정합성 보장 확인
 * - 독립된 DB 환경에서 실행 (동시성 테스트 격리)
 *
 * Note: 분산락은 StockManagementService 레벨에서 적용됨
 * 이 테스트는 Repository의 기본 동작을 검증함
 */
describe('재고 예약 동시성 제어 (Repository 레벨)', () => {
  let db: TestDbConfig;
  let prismaService: PrismaService;
  let repository: ProductPrismaRepository;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    // 독립된 DB 설정 (동시성 테스트용)
    db = await setupTestDatabase({ isolated: true });

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
  }, 120000); // 120초 timeout (컨테이너 시작 + migration)

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  beforeEach(async () => {
    // 테스트 데이터 정리
    await clearAllTables(prismaService);
  });

  describe('100 concurrent requests - 재고 충분', () => {
    it('100개의 동시 요청이 들어와도 재고가 정확하게 예약되어야 함', async () => {
      // Given: 총 재고 100개인 상품 생성
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

      // When: 100개의 동시 요청 (각 1개씩 예약)
      // 낙관적 락이므로 일부 요청은 OptimisticLockException으로 실패할 수 있음
      const requests = Array.from({ length: 100 }, () =>
        repository.reserveStock('test-stock', 1).catch((err) => err),
      );

      const results = await Promise.all(requests);

      // Then: 성공한 요청의 개수를 확인
      const successCount = results.filter((r) => !(r instanceof Error)).length;
      const failureCount = results.filter((r) => r instanceof Error).length;

      console.log(`성공: ${successCount}, 실패: ${failureCount}`);

      // And: 최종 재고 상태가 정확해야 함
      const stock = await prismaService.stock.findUnique({
        where: { id: 'test-stock' },
      });

      // 성공한 만큼만 예약되어야 함
      expect(stock?.reservedQuantity).toBe(successCount);
      expect(stock?.availableQuantity).toBe(100 - successCount);
      expect(stock?.soldQuantity).toBe(0);

      // 재고 불변식: available + reserved + sold = total
      expect(
        stock!.availableQuantity + stock!.reservedQuantity + stock!.soldQuantity,
      ).toBe(100);
    });
  });

  describe('100 concurrent requests - 재고 부족', () => {
    it('100개의 동시 요청 중 재고 부족 시 실패해야 함', async () => {
      // Given: 총 재고 50개인 상품 생성
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
          totalQuantity: 50,
          availableQuantity: 50,
          reservedQuantity: 0,
          soldQuantity: 0,
        },
      });

      // When: 100개의 동시 요청 (각 1개씩 예약)
      // 분산락 제거 후 Repository 레벨에서는 순차적으로 처리됨
      // 재고 부족 시에만 실패
      const requests = Array.from({ length: 100 }, () =>
        repository.reserveStock('test-stock', 1).catch((err) => err),
      );

      const results = await Promise.all(requests);

      // Then: 성공과 실패가 적절히 나뉘어야 함
      const successCount = results.filter((r) => !(r instanceof Error)).length;
      const failureCount = results.filter((r) => r instanceof Error).length;

      console.log(`성공: ${successCount}, 실패: ${failureCount}`);

      // And: 최종 재고 상태가 정확해야 함
      const stock = await prismaService.stock.findUnique({
        where: { id: 'test-stock' },
      });

      // 성공한 만큼만 예약되어야 함
      expect(stock?.reservedQuantity).toBe(successCount);
      expect(stock?.availableQuantity).toBe(50 - successCount);
      expect(stock?.soldQuantity).toBe(0);

      // 전체 요청 수는 100개
      expect(successCount + failureCount).toBe(100);

      // 재고 불변식: available + reserved + sold = total
      expect(
        stock!.availableQuantity + stock!.reservedQuantity + stock!.soldQuantity,
      ).toBe(50);
    });
  });

  describe('Mixed operations - 예약/복원/확정 동시 실행', () => {
    it('예약-복원-확정이 동시에 발생해도 재고가 정확하게 관리되어야 함', async () => {
      // Given: 총 재고 100개인 상품 생성 (초기 상태: available 50, reserved 50)
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
          availableQuantity: 50,
          reservedQuantity: 50,
          soldQuantity: 0,
        },
      });

      // When: 30개 예약, 20개 복원, 20개 확정 동시 실행
      const reserveRequests = Array.from({ length: 30 }, () =>
        repository.reserveStock('test-stock', 1).catch((err) => err),
      );
      const releaseRequests = Array.from({ length: 20 }, () =>
        repository.releaseStock('test-stock', 1).catch((err) => err),
      );
      const confirmRequests = Array.from({ length: 20 }, () =>
        repository.confirmStock('test-stock', 1).catch((err) => err),
      );

      const allResults = await Promise.all([
        ...reserveRequests,
        ...releaseRequests,
        ...confirmRequests,
      ]);

      const reserveSuccess = reserveRequests.filter(
        (_, i) => !(allResults[i] instanceof Error),
      ).length;
      const releaseSuccess = releaseRequests.filter(
        (_, i) => !(allResults[30 + i] instanceof Error),
      ).length;
      const confirmSuccess = confirmRequests.filter(
        (_, i) => !(allResults[50 + i] instanceof Error),
      ).length;

      console.log(
        `예약 성공: ${reserveSuccess}/30, 복원 성공: ${releaseSuccess}/20, 확정 성공: ${confirmSuccess}/20`,
      );

      // Then: 불변식이 유지되어야 함 (totalQuantity = available + reserved + sold)
      const stock = await prismaService.stock.findUnique({
        where: { id: 'test-stock' },
      });

      expect(
        stock!.availableQuantity + stock!.reservedQuantity + stock!.soldQuantity,
      ).toBe(100);

      console.log(
        `최종 재고: available=${stock!.availableQuantity}, reserved=${stock!.reservedQuantity}, sold=${stock!.soldQuantity}`,
      );
    });
  });
});
