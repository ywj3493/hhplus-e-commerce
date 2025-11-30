import {
  StartedMySqlContainer,
  MySqlContainer,
} from '@testcontainers/mysql';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

export type TestDbConfig = {
  container: StartedMySqlContainer;
  prisma: PrismaClient;
  url: string;
  dbName: string;
};

/**
 * 테스트용 데이터베이스 설정
 *
 * @param options.isolated - true일 경우 독립된 컨테이너 생성 (동시성 테스트, E2E 테스트용)
 * @param options.seed - true일 경우 seed 데이터 실행 (E2E 테스트용)
 * @returns 테스트 DB 설정 정보
 */
export async function setupTestDatabase(
  options: {
    isolated?: boolean;
    seed?: boolean;
  } = {},
): Promise<TestDbConfig> {
  const { isolated = false, seed = false } = options;

  // DB 이름은 항상 고유하게 생성
  // 각 테스트 파일마다 독립적인 컨테이너 + DB 사용
  const dbName = generateUniqueDbName();

  // 컨테이너 시작
  const container = await new MySqlContainer('mysql:8.0')
    .withDatabase(dbName)
    .withRootPassword('test')
    .start();

  const url = container.getConnectionUri();

  // Migration 실행
  execSync('pnpm prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'ignore',
  });

  // Seed (E2E 테스트용)
  if (seed) {
    execSync('pnpm prisma db seed', {
      env: { ...process.env, DATABASE_URL: url },
      stdio: 'ignore',
    });
  }

  // Prisma Client 생성
  const prisma = new PrismaClient({
    datasources: { db: { url } },
  });

  return { container, prisma, url, dbName };
}

/**
 * 테스트 DB 정리
 */
export async function cleanupTestDatabase(
  config: TestDbConfig,
): Promise<void> {
  try {
    await config.prisma.$disconnect();
  } catch (error) {
    console.error('Failed to disconnect Prisma:', error);
  }

  try {
    await config.container.stop();
  } catch (error) {
    console.error('Failed to stop container:', error);
  }
}

/**
 * 모든 테이블의 데이터를 삭제
 * 외래키 순서를 고려하여 자식 테이블부터 삭제
 */
export async function clearAllTables(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$transaction([
      // 가장 하위 테이블들 (다른 테이블을 참조하지 않음)
      prisma.cartItem.deleteMany(),
      prisma.orderItem.deleteMany(),
      prisma.payment.deleteMany(), // payment는 order를 참조하므로 먼저 삭제
      prisma.stock.deleteMany(),
      prisma.userCoupon.deleteMany(),

      // 중간 레벨 테이블들
      prisma.cart.deleteMany(),
      prisma.order.deleteMany(),
      prisma.productOption.deleteMany(),

      // 상위 테이블들
      prisma.coupon.deleteMany(),
      prisma.product.deleteMany(),
      prisma.category.deleteMany(),
      prisma.user.deleteMany(),
    ]);
  } catch (error) {
    // 테이블이 없는 경우 무시 (첫 테스트 실행 시)
    console.warn('Warning: Failed to clear tables, they may not exist yet:', error);
  }
}

/**
 * 고유한 DB 이름 생성
 * 각 테스트 파일마다 고유한 컨테이너와 DB 사용
 */
function generateUniqueDbName(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const workerId = process.env.JEST_WORKER_ID || '1';
  return `test_w${workerId}_${timestamp}_${random}`;
}
