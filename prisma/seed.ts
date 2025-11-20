import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ============================================================================
  // User 도메인 - 사용자 3명
  // ============================================================================
  console.log('👤 Creating users...');

  const users = await Promise.all([
    prisma.user.upsert({
      where: { id: 'user-001' },
      update: {},
      create: {
        id: 'user-001',
        name: '김철수',
        email: 'kim@example.com',
      },
    }),
    prisma.user.upsert({
      where: { id: 'user-002' },
      update: {},
      create: {
        id: 'user-002',
        name: '이영희',
        email: 'lee@example.com',
      },
    }),
    prisma.user.upsert({
      where: { id: 'user-003' },
      update: {},
      create: {
        id: 'user-003',
        name: '박민수',
        email: null, // 이메일 없는 사용자
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // ============================================================================
  // Product 도메인 - 카테고리 및 상품
  // ============================================================================
  console.log('📦 Creating categories...');

  const categories = await Promise.all([
    prisma.category.upsert({
      where: { id: 'category-electronics' },
      update: {},
      create: {
        id: 'category-electronics',
        name: '전자기기',
      },
    }),
    prisma.category.upsert({
      where: { id: 'category-fashion' },
      update: {},
      create: {
        id: 'category-fashion',
        name: '패션',
      },
    }),
    prisma.category.upsert({
      where: { id: 'category-home' },
      update: {},
      create: {
        id: 'category-home',
        name: '홈·리빙',
      },
    }),
  ]);

  console.log(`✅ Created ${categories.length} categories`);

  // ============================================================================
  // 상품 13개 (페이지네이션 확인용)
  // ============================================================================
  console.log('🛍️  Creating products...');

  // 전자기기 카테고리 상품 (5개)
  const electronicsProducts = [
    {
      id: 'product-001',
      name: '스마트폰 갤럭시 S24',
      description: '최신 5G 스마트폰, 200MP 카메라, 120Hz 디스플레이',
      price: 1200000,
      categoryId: 'category-electronics',
      hasOptions: true,
    },
    {
      id: 'product-002',
      name: '노트북 맥북 프로',
      description: 'M3 칩셋, 16GB RAM, 512GB SSD',
      price: 2500000,
      categoryId: 'category-electronics',
      hasOptions: true,
    },
    {
      id: 'product-003',
      name: '무선 이어폰',
      description: '액티브 노이즈 캔슬링, 최대 24시간 재생',
      price: 250000,
      categoryId: 'category-electronics',
      hasOptions: false,
    },
    {
      id: 'product-004',
      name: '태블릿 PC',
      description: '11인치 디스플레이, S펜 포함',
      price: 800000,
      categoryId: 'category-electronics',
      hasOptions: true,
    },
    {
      id: 'product-005',
      name: '스마트 워치',
      description: '건강 모니터링, GPS 내장',
      price: 350000,
      categoryId: 'category-electronics',
      hasOptions: true,
    },
  ];

  // 패션 카테고리 상품 (5개)
  const fashionProducts = [
    {
      id: 'product-006',
      name: '겨울 패딩 점퍼',
      description: '방수 기능, 초경량 구스다운',
      price: 180000,
      categoryId: 'category-fashion',
      hasOptions: true,
    },
    {
      id: 'product-007',
      name: '청바지',
      description: '스트레치 소재, 슬림핏',
      price: 89000,
      categoryId: 'category-fashion',
      hasOptions: true,
    },
    {
      id: 'product-008',
      name: '운동화',
      description: '에어쿠션, 통기성 메쉬',
      price: 120000,
      categoryId: 'category-fashion',
      hasOptions: true,
    },
    {
      id: 'product-009',
      name: '가죽 가방',
      description: '천연 가죽, 수납공간 넉넉',
      price: 250000,
      categoryId: 'category-fashion',
      hasOptions: true,
    },
    {
      id: 'product-010',
      name: '겨울 목도리',
      description: '100% 캐시미어, 부드러운 촉감',
      price: 45000,
      categoryId: 'category-fashion',
      hasOptions: false,
    },
  ];

  // 홈·리빙 카테고리 상품 (3개)
  const homeProducts = [
    {
      id: 'product-011',
      name: '공기청정기',
      description: '3단계 필터, 초미세먼지 99.9% 제거',
      price: 380000,
      categoryId: 'category-home',
      hasOptions: false,
    },
    {
      id: 'product-012',
      name: '식탁 세트',
      description: '4인용, 원목 소재',
      price: 550000,
      categoryId: 'category-home',
      hasOptions: true,
    },
    {
      id: 'product-013',
      name: '침구 세트',
      description: '킹사이즈, 순면 100%',
      price: 120000,
      categoryId: 'category-home',
      hasOptions: true,
    },
  ];

  const allProducts = [
    ...electronicsProducts,
    ...fashionProducts,
    ...homeProducts,
  ];

  for (const productData of allProducts) {
    await prisma.product.upsert({
      where: { id: productData.id },
      update: {},
      create: productData,
    });
  }

  console.log(`✅ Created ${allProducts.length} products`);

  // ============================================================================
  // 상품 옵션 및 재고
  // ============================================================================
  console.log('🎨 Creating product options and stocks...');

  // Product 001: 스마트폰 (색상 옵션)
  const phone001Options = [
    {
      id: 'option-001-black',
      productId: 'product-001',
      type: '색상',
      name: '미드나잇 블랙',
      additionalPrice: 0,
    },
    {
      id: 'option-001-white',
      productId: 'product-001',
      type: '색상',
      name: '팬텀 화이트',
      additionalPrice: 0,
    },
    {
      id: 'option-001-purple',
      productId: 'product-001',
      type: '색상',
      name: '바이올렛',
      additionalPrice: 10000,
    },
  ];

  for (const option of phone001Options) {
    await prisma.productOption.upsert({
      where: { id: option.id },
      update: {},
      create: option,
    });

    // 각 옵션별 재고 생성
    const stockId = `stock-${option.id}`;
    const totalQty = option.name.includes('블랙') ? 100 : 50; // 블랙이 재고 많음

    await prisma.stock.upsert({
      where: { id: stockId },
      update: {},
      create: {
        id: stockId,
        productId: 'product-001',
        productOptionId: option.id,
        totalQuantity: totalQty,
        availableQuantity: totalQty,
        reservedQuantity: 0,
        soldQuantity: 0,
      },
    });
  }

  // Product 002: 노트북 (용량 옵션)
  const laptop002Options = [
    {
      id: 'option-002-512gb',
      productId: 'product-002',
      type: '용량',
      name: '512GB',
      additionalPrice: 0,
    },
    {
      id: 'option-002-1tb',
      productId: 'product-002',
      type: '용량',
      name: '1TB',
      additionalPrice: 300000,
    },
  ];

  for (const option of laptop002Options) {
    await prisma.productOption.upsert({
      where: { id: option.id },
      update: {},
      create: option,
    });

    const stockId = `stock-${option.id}`;
    await prisma.stock.upsert({
      where: { id: stockId },
      update: {},
      create: {
        id: stockId,
        productId: 'product-002',
        productOptionId: option.id,
        totalQuantity: 30,
        availableQuantity: 30,
        reservedQuantity: 0,
        soldQuantity: 0,
      },
    });
  }

  // Product 003: 무선 이어폰 (옵션 없음)
  await prisma.stock.upsert({
    where: { id: 'stock-product-003' },
    update: {},
    create: {
      id: 'stock-product-003',
      productId: 'product-003',
      productOptionId: null,
      totalQuantity: 200,
      availableQuantity: 200,
      reservedQuantity: 0,
      soldQuantity: 0,
    },
  });

  // Product 004: 태블릿 (색상 옵션)
  const tablet004Options = [
    {
      id: 'option-004-gray',
      productId: 'product-004',
      type: '색상',
      name: '그라파이트',
      additionalPrice: 0,
    },
    {
      id: 'option-004-pink',
      productId: 'product-004',
      type: '색상',
      name: '핑크 골드',
      additionalPrice: 20000,
    },
  ];

  for (const option of tablet004Options) {
    await prisma.productOption.upsert({
      where: { id: option.id },
      update: {},
      create: option,
    });

    const stockId = `stock-${option.id}`;
    await prisma.stock.upsert({
      where: { id: stockId },
      update: {},
      create: {
        id: stockId,
        productId: 'product-004',
        productOptionId: option.id,
        totalQuantity: 40,
        availableQuantity: 40,
        reservedQuantity: 0,
        soldQuantity: 0,
      },
    });
  }

  // Product 005: 스마트 워치 (사이즈 옵션)
  const watch005Options = [
    {
      id: 'option-005-40mm',
      productId: 'product-005',
      type: '사이즈',
      name: '40mm',
      additionalPrice: 0,
    },
    {
      id: 'option-005-44mm',
      productId: 'product-005',
      type: '사이즈',
      name: '44mm',
      additionalPrice: 30000,
    },
  ];

  for (const option of watch005Options) {
    await prisma.productOption.upsert({
      where: { id: option.id },
      update: {},
      create: option,
    });

    const stockId = `stock-${option.id}`;
    await prisma.stock.upsert({
      where: { id: stockId },
      update: {},
      create: {
        id: stockId,
        productId: 'product-005',
        productOptionId: option.id,
        totalQuantity: 60,
        availableQuantity: 60,
        reservedQuantity: 0,
        soldQuantity: 0,
      },
    });
  }

  // 나머지 상품들 (재고만 생성, 옵션은 생략)
  const productsWithoutDetailedOptions = [
    'product-006',
    'product-007',
    'product-008',
    'product-009',
    'product-010',
    'product-011',
    'product-012',
    'product-013',
  ];

  for (const productId of productsWithoutDetailedOptions) {
    await prisma.stock.upsert({
      where: { id: `stock-${productId}` },
      update: {},
      create: {
        id: `stock-${productId}`,
        productId,
        productOptionId: null,
        totalQuantity: 100,
        availableQuantity: 100,
        reservedQuantity: 0,
        soldQuantity: 0,
      },
    });
  }

  console.log('✅ Created product options and stocks');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
