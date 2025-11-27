/**
 * E2E 테스트용 모듈 오버라이드 설정
 *
 * NODE_ENV === 'test'일 때 InMemory Repository를 사용하는 모듈들을
 * 실제 Prisma Repository로 오버라이드하기 위한 헬퍼
 */
import { TestingModuleBuilder } from '@nestjs/testing';
import { PrismaService } from '@/common/infrastructure/persistance/prisma.service';

// User
import { USER_REPOSITORY } from '@/user/domain/repositories/user.repository';
import { UserPrismaRepository } from '@/user/infrastructure/repositories/user-prisma.repository';

// Product
import {
  PRODUCT_REPOSITORY,
  CATEGORY_REPOSITORY,
} from '@/product/domain/repositories/tokens';
import { ProductPrismaRepository } from '@/product/infrastructure/repositories/product-prisma.repository';
import { CategoryPrismaRepository } from '@/product/infrastructure/repositories/category-prisma.repository';

// Coupon
import {
  COUPON_REPOSITORY,
  USER_COUPON_REPOSITORY,
} from '@/coupon/domain/repositories/tokens';
import { CouponPrismaRepository } from '@/coupon/infrastructure/repositories/coupon-prisma.repository';
import { UserCouponPrismaRepository } from '@/coupon/infrastructure/repositories/user-coupon-prisma.repository';

// Order
import {
  CART_REPOSITORY,
  ORDER_REPOSITORY,
  PAYMENT_REPOSITORY,
} from '@/order/domain/repositories/tokens';
import { CartPrismaRepository } from '@/order/infrastructure/repositories/cart-prisma.repository';
import { OrderPrismaRepository } from '@/order/infrastructure/repositories/order-prisma.repository';
import { PaymentPrismaRepository } from '@/order/infrastructure/repositories/payment-prisma.repository';

/**
 * 모든 InMemory Repository를 Prisma Repository로 오버라이드
 *
 * @param moduleBuilder - NestJS TestingModuleBuilder
 * @returns 오버라이드가 적용된 TestingModuleBuilder
 */
export function overrideAllRepositories(
  moduleBuilder: TestingModuleBuilder,
): TestingModuleBuilder {
  return moduleBuilder
    // User Repository
    .overrideProvider(USER_REPOSITORY)
    .useFactory({
      factory: (prisma: PrismaService) => new UserPrismaRepository(prisma),
      inject: [PrismaService],
    })
    // Product Repositories
    .overrideProvider(PRODUCT_REPOSITORY)
    .useFactory({
      factory: (prisma: PrismaService) => new ProductPrismaRepository(prisma),
      inject: [PrismaService],
    })
    .overrideProvider(CATEGORY_REPOSITORY)
    .useFactory({
      factory: (prisma: PrismaService) => new CategoryPrismaRepository(prisma),
      inject: [PrismaService],
    })
    // Coupon Repositories
    .overrideProvider(COUPON_REPOSITORY)
    .useFactory({
      factory: (prisma: PrismaService) => new CouponPrismaRepository(prisma),
      inject: [PrismaService],
    })
    .overrideProvider(USER_COUPON_REPOSITORY)
    .useFactory({
      factory: (prisma: PrismaService) =>
        new UserCouponPrismaRepository(prisma),
      inject: [PrismaService],
    })
    // Order Repositories
    .overrideProvider(CART_REPOSITORY)
    .useFactory({
      factory: (prisma: PrismaService) => new CartPrismaRepository(prisma),
      inject: [PrismaService],
    })
    .overrideProvider(ORDER_REPOSITORY)
    .useFactory({
      factory: (prisma: PrismaService) => new OrderPrismaRepository(prisma),
      inject: [PrismaService],
    })
    .overrideProvider(PAYMENT_REPOSITORY)
    .useFactory({
      factory: (prisma: PrismaService) => new PaymentPrismaRepository(prisma),
      inject: [PrismaService],
    });
}
