import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OrderModule } from '../order/order.module';
import { ProcessPaymentUseCase } from './application/use-cases/process-payment.use-case';
import { PAYMENT_REPOSITORY } from './domain/repositories/payment.repository';
import { InMemoryPaymentRepository } from './infrastructure/repositories/in-memory-payment.repository';
import {
  PAYMENT_API_CLIENT,
} from './infrastructure/clients/payment-api.interface';
import { MockPaymentApiClient } from './infrastructure/clients/mock-payment-api.client';
import { PaymentController } from './presentation/controllers/payment.controller';

/**
 * PaymentModule
 *
 * Payment 도메인 모듈
 */
@Module({
  imports: [
    OrderModule, // Order Repository 의존성
    EventEmitterModule.forRoot(), // Event Emitter
  ],
  controllers: [PaymentController],
  providers: [
    // Use Cases
    ProcessPaymentUseCase,

    // Repositories
    {
      provide: PAYMENT_REPOSITORY,
      useClass: InMemoryPaymentRepository,
    },

    // External Clients
    {
      provide: PAYMENT_API_CLIENT,
      useClass: MockPaymentApiClient,
    },
  ],
  exports: [
    PAYMENT_REPOSITORY, // 다른 모듈에서 사용 가능하도록 export
  ],
})
export class PaymentModule {}
