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
      imageUrl: 'https://example.com/images/galaxy-s24.jpg',
      categoryId: 'category-electronics',
      hasOptions: true,
    },
    {
      id: 'product-002',
      name: '노트북 맥북 프로',
      description: 'M3 칩셋, 16GB RAM, 512GB SSD',
      price: 2500000,
      imageUrl: 'https://example.com/images/macbook-pro.jpg',
      categoryId: 'category-electronics',
      hasOptions: true,
    },
    {
      id: 'product-003',
      name: '무선 이어폰',
      description: '액티브 노이즈 캔슬링, 최대 24시간 재생',
      price: 250000,
      imageUrl: 'https://example.com/images/earbuds.jpg',
      categoryId: 'category-electronics',
      hasOptions: false,
    },
    {
      id: 'product-004',
      name: '태블릿 PC',
      description: '11인치 디스플레이, S펜 포함',
      price: 800000,
      imageUrl: 'https://example.com/images/tablet.jpg',
      categoryId: 'category-electronics',
      hasOptions: true,
    },
    {
      id: 'product-005',
      name: '스마트 워치',
      description: '건강 모니터링, GPS 내장',
      price: 350000,
      imageUrl: 'https://example.com/images/smartwatch.jpg',
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
      imageUrl: 'https://example.com/images/padding.jpg',
      categoryId: 'category-fashion',
      hasOptions: true,
    },
    {
      id: 'product-007',
      name: '청바지',
      description: '스트레치 소재, 슬림핏',
      price: 89000,
      imageUrl: 'https://example.com/images/jeans.jpg',
      categoryId: 'category-fashion',
      hasOptions: true,
    },
    {
      id: 'product-008',
      name: '운동화',
      description: '에어쿠션, 통기성 메쉬',
      price: 120000,
      imageUrl: 'https://example.com/images/sneakers.jpg',
      categoryId: 'category-fashion',
      hasOptions: true,
    },
    {
      id: 'product-009',
      name: '가죽 가방',
      description: '천연 가죽, 수납공간 넉넉',
      price: 250000,
      imageUrl: 'https://example.com/images/bag.jpg',
      categoryId: 'category-fashion',
      hasOptions: true,
    },
    {
      id: 'product-010',
      name: '겨울 목도리',
      description: '100% 캐시미어, 부드러운 촉감',
      price: 45000,
      imageUrl: 'https://example.com/images/scarf.jpg',
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
      imageUrl: 'https://example.com/images/air-purifier.jpg',
      categoryId: 'category-home',
      hasOptions: false,
    },
    {
      id: 'product-012',
      name: '식탁 세트',
      description: '4인용, 원목 소재',
      price: 550000,
      imageUrl: 'https://example.com/images/dining-table.jpg',
      categoryId: 'category-home',
      hasOptions: true,
    },
    {
      id: 'product-013',
      name: '침구 세트',
      description: '킹사이즈, 순면 100%',
      price: 120000,
      imageUrl: 'https://example.com/images/bedding.jpg',
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

  // ============================================================================
  // Order 도메인 - 주문 3개 (PAID, PENDING, CANCELLED)
  // ============================================================================
  console.log('🛒 Creating orders...');

  // 주문 1: PAID 상태 (user-001, 스마트폰 + 무선 이어폰)
  const order001 = await prisma.order.upsert({
    where: { id: 'order-001' },
    update: {},
    create: {
      id: 'order-001',
      userId: 'user-001',
      status: 'PAID',
      totalAmount: 1450000, // 1,200,000 (스마트폰) + 250,000 (이어폰)
      discountAmount: 50000, // 할인 5만원
      finalAmount: 1400000,
      userCouponId: null,
      reservationExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10분 후
      createdAt: new Date('2025-11-15T10:30:00Z'),
      paidAt: new Date('2025-11-15T10:35:00Z'),
    },
  });

  // 주문 1의 아이템들
  await prisma.orderItem.upsert({
    where: { id: 'order-item-001-01' },
    update: {},
    create: {
      id: 'order-item-001-01',
      orderId: 'order-001',
      productId: 'product-001',
      productName: '스마트폰 갤럭시 S24', // 스냅샷
      productOptionId: 'option-001-black',
      productOptionName: '미드나잇 블랙', // 스냅샷
      quantity: 1,
      unitPrice: 1200000, // 스냅샷
      totalPrice: 1200000,
    },
  });

  await prisma.orderItem.upsert({
    where: { id: 'order-item-001-02' },
    update: {},
    create: {
      id: 'order-item-001-02',
      orderId: 'order-001',
      productId: 'product-003',
      productName: '무선 이어폰', // 스냅샷
      productOptionId: null,
      productOptionName: null,
      quantity: 1,
      unitPrice: 250000, // 스냅샷
      totalPrice: 250000,
    },
  });

  // 주문 1의 결제 정보
  await prisma.payment.upsert({
    where: { id: 'payment-001' },
    update: {},
    create: {
      id: 'payment-001',
      orderId: 'order-001',
      userId: 'user-001',
      amount: 1400000,
      method: 'CREDIT_CARD',
      transactionId: 'txn-20251115-103500-abc123',
      status: 'COMPLETED',
      idempotencyKey: 'idem-order-001-20251115103500',
      createdAt: new Date('2025-11-15T10:35:00Z'),
    },
  });

  // 주문 1의 재고 반영 (soldQuantity 증가)
  await prisma.stock.update({
    where: { id: 'stock-option-001-black' },
    data: {
      availableQuantity: 99, // 100 -> 99
      soldQuantity: 1, // 0 -> 1
    },
  });

  await prisma.stock.update({
    where: { id: 'stock-product-003' },
    data: {
      availableQuantity: 199, // 200 -> 199
      soldQuantity: 1, // 0 -> 1
    },
  });

  console.log('✅ Created order-001 (PAID)');

  // 주문 2: PENDING 상태 (user-002, 노트북 대기 중)
  const order002 = await prisma.order.upsert({
    where: { id: 'order-002' },
    update: {},
    create: {
      id: 'order-002',
      userId: 'user-002',
      status: 'PENDING',
      totalAmount: 2800000, // 2,500,000 (노트북) + 300,000 (1TB 추가)
      discountAmount: 0,
      finalAmount: 2800000,
      userCouponId: null,
      reservationExpiresAt: new Date(Date.now() + 8 * 60 * 1000), // 8분 후 만료 예정
      createdAt: new Date('2025-11-20T09:00:00Z'),
      paidAt: null,
    },
  });

  await prisma.orderItem.upsert({
    where: { id: 'order-item-002-01' },
    update: {},
    create: {
      id: 'order-item-002-01',
      orderId: 'order-002',
      productId: 'product-002',
      productName: '노트북 맥북 프로', // 스냅샷
      productOptionId: 'option-002-1tb',
      productOptionName: '1TB', // 스냅샷
      quantity: 1,
      unitPrice: 2800000, // 2,500,000 + 300,000 (스냅샷)
      totalPrice: 2800000,
    },
  });

  // 주문 2의 재고 예약 (reservedQuantity 증가)
  await prisma.stock.update({
    where: { id: 'stock-option-002-1tb' },
    data: {
      availableQuantity: 29, // 30 -> 29
      reservedQuantity: 1, // 0 -> 1
    },
  });

  console.log('✅ Created order-002 (PENDING)');

  // 주문 3: CANCELLED 상태 (user-001, 태블릿 취소)
  const order003 = await prisma.order.upsert({
    where: { id: 'order-003' },
    update: {},
    create: {
      id: 'order-003',
      userId: 'user-001',
      status: 'CANCELLED',
      totalAmount: 820000, // 800,000 (태블릿) + 20,000 (핑크 골드 추가)
      discountAmount: 0,
      finalAmount: 820000,
      userCouponId: null,
      reservationExpiresAt: new Date('2025-11-18T15:10:00Z'),
      createdAt: new Date('2025-11-18T15:00:00Z'),
      paidAt: null,
    },
  });

  await prisma.orderItem.upsert({
    where: { id: 'order-item-003-01' },
    update: {},
    create: {
      id: 'order-item-003-01',
      orderId: 'order-003',
      productId: 'product-004',
      productName: '태블릿 PC', // 스냅샷
      productOptionId: 'option-004-pink',
      productOptionName: '핑크 골드', // 스냅샷
      quantity: 1,
      unitPrice: 820000, // 800,000 + 20,000 (스냅샷)
      totalPrice: 820000,
    },
  });

  // 주문 3은 취소되어 재고가 원복되었으므로 Stock 업데이트 없음

  console.log('✅ Created order-003 (CANCELLED)');

  console.log('✅ Created 3 orders with items and payments');

  // ============================================================================
  // Coupon 도메인 - 쿠폰 5개 및 사용자 쿠폰 발급
  // ============================================================================
  console.log('🎟️  Creating coupons...');

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // 쿠폰 1: 정액 할인 (10,000원) - 일반 쿠폰
  await prisma.coupon.upsert({
    where: { id: 'coupon-001' },
    update: {},
    create: {
      id: 'coupon-001',
      name: '신규 가입 축하 쿠폰',
      description: '신규 회원 가입 시 지급되는 10,000원 할인 쿠폰',
      discountType: 'FIXED',
      discountValue: 10000,
      minAmount: 50000, // 최소 주문 금액 5만원
      totalQuantity: 1000,
      issuedQuantity: 3, // 3명에게 발급됨
      validFrom: yesterday,
      validUntil: nextMonth,
    },
  });

  // 쿠폰 2: 정률 할인 (10%) - 일반 쿠폰
  await prisma.coupon.upsert({
    where: { id: 'coupon-002' },
    update: {},
    create: {
      id: 'coupon-002',
      name: '주말 특별 할인',
      description: '주말 한정 10% 할인 쿠폰',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minAmount: 100000, // 최소 주문 금액 10만원
      totalQuantity: 500,
      issuedQuantity: 2, // 2명에게 발급됨
      validFrom: yesterday,
      validUntil: nextWeek,
    },
  });

  // 쿠폰 3: 무제한 쿠폰 (정액 5,000원)
  await prisma.coupon.upsert({
    where: { id: 'coupon-003' },
    update: {},
    create: {
      id: 'coupon-003',
      name: '첫 구매 할인 쿠폰',
      description: '첫 구매 시 5,000원 할인',
      discountType: 'FIXED',
      discountValue: 5000,
      minAmount: null, // 최소 금액 제한 없음
      totalQuantity: 999999, // 사실상 무제한
      issuedQuantity: 1,
      validFrom: yesterday,
      validUntil: nextMonth,
    },
  });

  // 쿠폰 4: 만료된 쿠폰
  await prisma.coupon.upsert({
    where: { id: 'coupon-004' },
    update: {},
    create: {
      id: 'coupon-004',
      name: '지난달 프로모션 쿠폰',
      description: '이미 만료된 쿠폰 (테스트용)',
      discountType: 'FIXED',
      discountValue: 20000,
      minAmount: 100000,
      totalQuantity: 100,
      issuedQuantity: 0,
      validFrom: new Date('2025-10-01T00:00:00Z'),
      validUntil: new Date('2025-10-31T23:59:59Z'), // 이미 만료됨
    },
  });

  // 쿠폰 5: 소진된 쿠폰 (동시성 테스트용)
  await prisma.coupon.upsert({
    where: { id: 'coupon-005' },
    update: {},
    create: {
      id: 'coupon-005',
      name: '선착순 10명 한정 쿠폰',
      description: '이미 소진된 쿠폰 (동시성 테스트용)',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      minAmount: 50000,
      totalQuantity: 10,
      issuedQuantity: 10, // 이미 전부 발급됨
      validFrom: yesterday,
      validUntil: nextWeek,
    },
  });

  console.log('✅ Created 5 coupons');

  // ============================================================================
  // 사용자 쿠폰 발급
  // ============================================================================
  console.log('👥 Issuing coupons to users...');

  // user-001: 3개 쿠폰 보유 (신규 가입, 주말 할인, 첫 구매)
  await prisma.userCoupon.upsert({
    where: { id: 'user-coupon-001' },
    update: {},
    create: {
      id: 'user-coupon-001',
      userId: 'user-001',
      couponId: 'coupon-001',
      isUsed: false,
      usedAt: null,
      issuedAt: new Date('2025-11-10T10:00:00Z'),
      expiresAt: nextMonth, // coupon-001의 validUntil과 동일
    },
  });

  await prisma.userCoupon.upsert({
    where: { id: 'user-coupon-002' },
    update: {},
    create: {
      id: 'user-coupon-002',
      userId: 'user-001',
      couponId: 'coupon-002',
      isUsed: true, // 이미 사용됨
      usedAt: new Date('2025-11-15T10:35:00Z'), // order-001에서 사용
      issuedAt: new Date('2025-11-14T10:00:00Z'),
      expiresAt: nextWeek, // coupon-002의 validUntil과 동일
    },
  });

  await prisma.userCoupon.upsert({
    where: { id: 'user-coupon-003' },
    update: {},
    create: {
      id: 'user-coupon-003',
      userId: 'user-001',
      couponId: 'coupon-003',
      isUsed: false,
      usedAt: null,
      issuedAt: new Date('2025-11-10T10:00:00Z'),
      expiresAt: nextMonth,
    },
  });

  // user-002: 2개 쿠폰 보유 (신규 가입, 주말 할인)
  await prisma.userCoupon.upsert({
    where: { id: 'user-coupon-004' },
    update: {},
    create: {
      id: 'user-coupon-004',
      userId: 'user-002',
      couponId: 'coupon-001',
      isUsed: false,
      usedAt: null,
      issuedAt: new Date('2025-11-12T14:00:00Z'),
      expiresAt: nextMonth,
    },
  });

  await prisma.userCoupon.upsert({
    where: { id: 'user-coupon-005' },
    update: {},
    create: {
      id: 'user-coupon-005',
      userId: 'user-002',
      couponId: 'coupon-002',
      isUsed: false,
      usedAt: null,
      issuedAt: new Date('2025-11-18T09:00:00Z'),
      expiresAt: nextWeek,
    },
  });

  // user-003: 1개 쿠폰 보유 (신규 가입)
  await prisma.userCoupon.upsert({
    where: { id: 'user-coupon-006' },
    update: {},
    create: {
      id: 'user-coupon-006',
      userId: 'user-003',
      couponId: 'coupon-001',
      isUsed: false,
      usedAt: null,
      issuedAt: new Date('2025-11-19T16:30:00Z'),
      expiresAt: nextMonth,
    },
  });

  console.log('✅ Issued 6 user coupons');

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
