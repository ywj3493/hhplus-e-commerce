import { Test, TestingModule } from '@nestjs/testing';
import { MySqlContainer, StartedMySqlContainer } from '@testcontainers/mysql';
import { PrismaClient } from '@prisma/client';
import { UserPrismaRepository } from '@/user/infrastructure/repositories/user-prisma.repository';
import { PrismaService } from '@/common/infrastructure/prisma/prisma.service';
import { User } from '@/user/domain/entities/user.entity';
import { execSync } from 'child_process';

describe('UserPrismaRepository 통합 테스트', () => {
  let container: StartedMySqlContainer;
  let prismaService: PrismaService;
  let repository: UserPrismaRepository;
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

    // Migration 실행 (prisma migrate deploy 사용)
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
        UserPrismaRepository,
      ],
    }).compile();

    prismaService = moduleRef.get<PrismaService>(PrismaService);
    repository = moduleRef.get<UserPrismaRepository>(UserPrismaRepository);
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
    await prismaService.user.deleteMany({});
  });

  describe('findById', () => {
    it('존재하는 사용자 ID로 조회 시 User 엔티티를 반환해야 함', async () => {
      // Given: 데이터베이스에 사용자 생성
      const createdUser = await prismaService.user.create({
        data: {
          id: 'test-user-id',
          name: '테스트 사용자',
          email: 'test@example.com',
        },
      });

      // When: ID로 사용자 조회
      const result = await repository.findById('test-user-id');

      // Then: User 엔티티가 반환되어야 함
      expect(result).toBeInstanceOf(User);
      expect(result?.id).toBe('test-user-id');
      expect(result?.name).toBe('테스트 사용자');
      expect(result?.email).toBe('test@example.com');
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
    });

    it('존재하지 않는 사용자 ID로 조회 시 null을 반환해야 함', async () => {
      // Given: 데이터베이스에 사용자가 없음

      // When: 존재하지 않는 ID로 조회
      const result = await repository.findById('non-existent-id');

      // Then: null이 반환되어야 함
      expect(result).toBeNull();
    });

    it('이메일이 null인 사용자를 올바르게 조회해야 함', async () => {
      // Given: 이메일이 없는 사용자 생성
      await prismaService.user.create({
        data: {
          id: 'user-without-email',
          name: '이메일 없는 사용자',
          email: null,
        },
      });

      // When: 사용자 조회
      const result = await repository.findById('user-without-email');

      // Then: 이메일이 null인 User 엔티티가 반환되어야 함
      expect(result).toBeInstanceOf(User);
      expect(result?.email).toBeNull();
      expect(result?.name).toBe('이메일 없는 사용자');
    });
  });

  describe('데이터베이스 연결', () => {
    it('Testcontainer MySQL에 정상적으로 연결되어야 함', async () => {
      // When: 데이터베이스 연결 확인
      const result = await prismaService.$queryRaw`SELECT 1 as result`;

      // Then: 쿼리 실행이 성공해야 함
      expect(result).toBeDefined();
    });

    it('users 테이블이 생성되어 있어야 함', async () => {
      // When: 테이블 목록 조회
      const tables = await prismaService.$queryRaw<{ TABLE_NAME: string }[]>`
        SELECT TABLE_NAME
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = 'test_db' AND TABLE_NAME = 'users'
      `;

      // Then: users 테이블이 존재해야 함
      expect(tables).toHaveLength(1);
      expect(tables[0].TABLE_NAME).toBe('users');
    });
  });
});
