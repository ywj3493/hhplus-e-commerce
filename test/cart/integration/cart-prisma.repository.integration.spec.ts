import { Test, TestingModule } from '@nestjs/testing';
import { MySqlContainer, StartedMySqlContainer } from '@testcontainers/mysql';
import { PrismaClient } from '@prisma/client';
import { CartPrismaRepository } from '@/order/infrastructure/repositories/cart-prisma.repository';
import { PrismaService } from '@/common/infrastructure/prisma/prisma.service';
import { Cart } from '@/order/domain/entities/cart.entity';
import { Price } from '@/product/domain/entities/price.vo';
import { execSync } from 'child_process';

describe('CartPrismaRepository 통합 테스트', () => {
  let container: StartedMySqlContainer;
  let prismaService: PrismaService;
  let repository: CartPrismaRepository;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    // MySQL Testcontainer 시작
    container = await new MySqlContainer('mysql:8.0')
      .withDatabase('test_db')
      .withRootPassword('test')
      .start();

    // DATABASE_URL 설정
    const databaseUrl = container.getConnectionUri();
    process.env.DATABASE_URL = databaseUrl;

    // Prisma Client 생성 및 Migration 실행
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });

    // Migration 실행
    execSync('pnpm prisma migrate deploy', {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    });

    // NestJS 테스트 모듈 생성
    moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: prisma,
        },
        CartPrismaRepository,
      ],
    }).compile();

    prismaService = moduleRef.get<PrismaService>(PrismaService);
    repository = moduleRef.get<CartPrismaRepository>(CartPrismaRepository);
  }, 60000); // 60초 timeout

  afterAll(async () => {
    // 연결 해제 및 컨테이너 종료
    if (prismaService) {
      await prismaService.$disconnect();
    }
    if (container) {
      await container.stop();
    }
  });

  beforeEach(async () => {
    // 각 테스트 전에 데이터 정리
    await prismaService.cartItem.deleteMany({});
    await prismaService.cart.deleteMany({});
    await prismaService.user.deleteMany({});
    await prismaService.stock.deleteMany({});
    await prismaService.productOption.deleteMany({});
    await prismaService.product.deleteMany({});
    await prismaService.category.deleteMany({});
  });

  describe('findByUserId', () => {
    it('사용자 ID로 장바구니를 조회해야 함', async () => {
      // Given: 사용자 생성
      await prismaService.user.create({
        data: {
          id: 'test-user',
          name: '테스트 사용자',
          email: 'test@example.com',
        },
      });

      // And: 카테고리 및 상품 생성
      await prismaService.category.create({
        data: { id: 'test-category', name: '테스트 카테고리' },
      });

      await prismaService.product.create({
        data: {
          id: 'test-product',
          name: '테스트 상품',
          description: '테스트 상품 설명',
          price: 10000,
          imageUrl: 'https://example.com/image.jpg',
          categoryId: 'test-category',
          hasOptions: true,
        },
      });

      await prismaService.productOption.create({
        data: {
          id: 'test-option',
          productId: 'test-product',
          type: '색상',
          name: 'Red',
          additionalPrice: 0,
        },
      });

      // And: 장바구니 및 CartItem 생성
      await prismaService.cart.create({
        data: {
          id: 'test-cart',
          userId: 'test-user',
          items: {
            create: [
              {
                id: 'test-item-1',
                productId: 'test-product',
                productName: '테스트 상품',
                productOptionId: 'test-option',
                price: 10000,
                quantity: 2,
              },
            ],
          },
        },
      });

      // When: findByUserId 호출
      const cart = await repository.findByUserId('test-user');

      // Then: Cart Entity 반환 (CartItem 포함)
      expect(cart).toBeDefined();
      expect(cart!.id).toBe('test-cart');
      expect(cart!.userId).toBe('test-user');
      expect(cart!.getItems()).toHaveLength(1);

      // And: CartItem 검증
      const items = cart!.getItems();
      expect(items[0].productId).toBe('test-product');
      expect(items[0].productName).toBe('테스트 상품');
      expect(items[0].productOptionId).toBe('test-option');
      expect(items[0].getPrice().amount).toBe(10000);
      expect(items[0].quantity).toBe(2);
    });

    it('장바구니가 없는 사용자는 null을 반환해야 함', async () => {
      // Given: 사용자만 생성 (장바구니 없음)
      await prismaService.user.create({
        data: {
          id: 'test-user-without-cart',
          name: '장바구니 없는 사용자',
          email: 'no-cart@example.com',
        },
      });

      // When: findByUserId 호출
      const cart = await repository.findByUserId('test-user-without-cart');

      // Then: null 반환
      expect(cart).toBeNull();
    });
  });

  describe('save', () => {
    it('신규 장바구니를 생성해야 함', async () => {
      // Given: 사용자 생성
      await prismaService.user.create({
        data: {
          id: 'test-user',
          name: '테스트 사용자',
          email: 'test@example.com',
        },
      });

      // And: 카테고리 및 상품 생성
      await prismaService.category.create({
        data: { id: 'test-category', name: '테스트 카테고리' },
      });

      await prismaService.product.create({
        data: {
          id: 'test-product',
          name: '테스트 상품',
          description: '테스트 상품 설명',
          price: 10000,
          imageUrl: 'https://example.com/image.jpg',
          categoryId: 'test-category',
          hasOptions: true,
        },
      });

      await prismaService.productOption.create({
        data: {
          id: 'test-option',
          productId: 'test-product',
          type: '색상',
          name: 'Red',
          additionalPrice: 0,
        },
      });

      // And: 새로운 Cart Entity
      const cart = Cart.create('test-user');
      cart.addItem({
        productId: 'test-product',
        productName: '테스트 상품',
        productOptionId: 'test-option',
        price: Price.from(10000),
        quantity: 2,
      });

      // When: save 호출
      await repository.save(cart);

      // Then: DB에 저장됨
      const saved = await prismaService.cart.findUnique({
        where: { userId: 'test-user' },
        include: { items: true },
      });
      expect(saved).toBeDefined();
      expect(saved!.userId).toBe('test-user');
      expect(saved!.items).toHaveLength(1);
      expect(saved!.items[0].productId).toBe('test-product');
      expect(saved!.items[0].quantity).toBe(2);
    });

    it('기존 장바구니를 업데이트하고 CartItem을 동기화해야 함', async () => {
      // Given: 사용자 및 상품 생성
      await prismaService.user.create({
        data: {
          id: 'test-user',
          name: '테스트 사용자',
          email: 'test@example.com',
        },
      });

      await prismaService.category.create({
        data: { id: 'test-category', name: '테스트 카테고리' },
      });

      await prismaService.product.create({
        data: {
          id: 'test-product-1',
          name: '테스트 상품 1',
          description: '테스트 상품 1 설명',
          price: 10000,
          imageUrl: 'https://example.com/image1.jpg',
          categoryId: 'test-category',
          hasOptions: true,
        },
      });

      await prismaService.product.create({
        data: {
          id: 'test-product-2',
          name: '테스트 상품 2',
          description: '테스트 상품 2 설명',
          price: 20000,
          imageUrl: 'https://example.com/image2.jpg',
          categoryId: 'test-category',
          hasOptions: true,
        },
      });

      await prismaService.productOption.create({
        data: {
          id: 'test-option-1',
          productId: 'test-product-1',
          type: '색상',
          name: 'Red',
          additionalPrice: 0,
        },
      });

      await prismaService.productOption.create({
        data: {
          id: 'test-option-2',
          productId: 'test-product-2',
          type: '색상',
          name: 'Blue',
          additionalPrice: 0,
        },
      });

      // And: 기존 장바구니 (아이템 2개)
      await prismaService.cart.create({
        data: {
          id: 'test-cart',
          userId: 'test-user',
          items: {
            create: [
              {
                id: 'test-item-1',
                productId: 'test-product-1',
                productName: '테스트 상품 1',
                productOptionId: 'test-option-1',
                price: 10000,
                quantity: 1,
              },
              {
                id: 'test-item-2',
                productId: 'test-product-2',
                productName: '테스트 상품 2',
                productOptionId: 'test-option-2',
                price: 20000,
                quantity: 1,
              },
            ],
          },
        },
      });

      // When: 장바구니 조회 후 아이템 1개 제거 + 저장
      const cart = await repository.findByUserId('test-user');
      expect(cart).toBeDefined();

      const items = cart!.getItems();
      cart!.removeItem(items[0].id); // 첫 번째 아이템 제거

      await repository.save(cart!);

      // Then: CartItem 동기화 (1개만 남음)
      const updated = await prismaService.cart.findUnique({
        where: { userId: 'test-user' },
        include: { items: true },
      });
      expect(updated!.items).toHaveLength(1);
      expect(updated!.items[0].productId).toBe('test-product-2');
    });

    it('빈 장바구니를 저장하면 CartItem이 모두 삭제되어야 함', async () => {
      // Given: 사용자 및 상품 생성
      await prismaService.user.create({
        data: {
          id: 'test-user',
          name: '테스트 사용자',
          email: 'test@example.com',
        },
      });

      await prismaService.category.create({
        data: { id: 'test-category', name: '테스트 카테고리' },
      });

      await prismaService.product.create({
        data: {
          id: 'test-product',
          name: '테스트 상품',
          description: '테스트 상품 설명',
          price: 10000,
          imageUrl: 'https://example.com/image.jpg',
          categoryId: 'test-category',
          hasOptions: true,
        },
      });

      await prismaService.productOption.create({
        data: {
          id: 'test-option',
          productId: 'test-product',
          type: '색상',
          name: 'Red',
          additionalPrice: 0,
        },
      });

      // And: 기존 장바구니 (아이템 1개)
      await prismaService.cart.create({
        data: {
          id: 'test-cart',
          userId: 'test-user',
          items: {
            create: [
              {
                id: 'test-item-1',
                productId: 'test-product',
                productName: '테스트 상품',
                productOptionId: 'test-option',
                price: 10000,
                quantity: 1,
              },
            ],
          },
        },
      });

      // When: 장바구니 조회 후 모든 아이템 제거 + 저장
      const cart = await repository.findByUserId('test-user');
      cart!.clearAll();
      await repository.save(cart!);

      // Then: CartItem이 모두 삭제됨
      const updated = await prismaService.cart.findUnique({
        where: { userId: 'test-user' },
        include: { items: true },
      });
      expect(updated!.items).toHaveLength(0);
    });
  });

  describe('clearByUserId', () => {
    it('사용자 장바구니를 삭제해야 함 (CartItem Cascade delete)', async () => {
      // Given: 사용자 및 상품 생성
      await prismaService.user.create({
        data: {
          id: 'test-user',
          name: '테스트 사용자',
          email: 'test@example.com',
        },
      });

      await prismaService.category.create({
        data: { id: 'test-category', name: '테스트 카테고리' },
      });

      await prismaService.product.create({
        data: {
          id: 'test-product',
          name: '테스트 상품',
          description: '테스트 상품 설명',
          price: 10000,
          imageUrl: 'https://example.com/image.jpg',
          categoryId: 'test-category',
          hasOptions: true,
        },
      });

      await prismaService.productOption.create({
        data: {
          id: 'test-option',
          productId: 'test-product',
          type: '색상',
          name: 'Red',
          additionalPrice: 0,
        },
      });

      // And: 장바구니 및 CartItem 생성
      await prismaService.cart.create({
        data: {
          id: 'test-cart',
          userId: 'test-user',
          items: {
            create: [
              {
                id: 'test-item-1',
                productId: 'test-product',
                productName: '테스트 상품',
                productOptionId: 'test-option',
                price: 10000,
                quantity: 2,
              },
            ],
          },
        },
      });

      // When: clearByUserId 호출
      await repository.clearByUserId('test-user');

      // Then: Cart 삭제됨
      const cart = await prismaService.cart.findUnique({
        where: { userId: 'test-user' },
      });
      expect(cart).toBeNull();

      // And: CartItem도 Cascade delete로 자동 삭제됨
      const items = await prismaService.cartItem.findMany({
        where: { cartId: 'test-cart' },
      });
      expect(items).toHaveLength(0);
    });
  });
});
