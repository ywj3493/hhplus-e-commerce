import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma Service
 * Prisma Client를 관리하고 데이터베이스 연결을 제공합니다.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /**
   * 모듈 초기화 시 데이터베이스 연결
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * 모듈 종료 시 데이터베이스 연결 해제
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
