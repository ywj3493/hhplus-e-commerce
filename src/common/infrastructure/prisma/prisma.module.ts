import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Prisma Module
 * 전역 모듈로 등록되어 모든 모듈에서 PrismaService를 사용할 수 있습니다.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
