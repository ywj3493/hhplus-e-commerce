# Issue #024: Payment Gateway 리팩토링 - Port/Adapter 패턴 및 Facade 패턴 적용

## 📋 Overview

**Status**: ✅ Completed
**Created**: 2025-11-21
**Completed**: 2025-11-21
**Branch**: `step7`

## 🎯 목표

1. Payment Gateway에 Port/Adapter 패턴 적용하여 Domain Layer 독립성 확보
2. Event-Driven 아키텍처를 Facade 패턴으로 전환하여 보상 트랜잭션(Saga Pattern) 구현 준비
3. X-Test-Fail 헤더 기반 결정적 테스트 동작 구현
4. 각 UseCase의 단일 책임 원칙 준수

## 📝 Background

### 기존 문제점

1. **Port/Adapter 패턴 미적용**
   - MockPaymentApiClient가 Infrastructure 계층에 존재
   - Domain Layer가 Infrastructure에 의존
   - 10% 랜덤 실패로 인한 테스트 불안정성

2. **Event-Driven 아키텍처의 한계**
   - 같은 도메인 내에서 이벤트 발행/수신 (불필요한 복잡성)
   - ProcessPaymentUseCase → PaymentCompletedEvent → PaymentCompletedHandler
   - 트랜잭션 경계가 불명확
   - 보상 트랜잭션 구현 어려움

## 🔧 구현 내용

### Part 1: Port/Adapter 패턴 적용

#### 1. Domain Layer Port 정의

**파일**: `src/order/domain/ports/payment.port.ts`

```typescript
export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface ProcessPaymentRequest {
  orderId: string;
  userId: string;
  amount: number;
  paymentMethod: PaymentMethod;
}

export interface ProcessPaymentResponse {
  success: boolean;
  transactionId?: string;
  errorMessage?: string;
}

export interface IPaymentGateway {
  processPayment(
    request: ProcessPaymentRequest,
    shouldFail?: boolean,
  ): Promise<ProcessPaymentResponse>;
}
```

#### 2. Infrastructure Layer Adapters 구현

**Test/Development Adapter**: `src/order/infrastructure/gateways/fake-payment.adapter.ts`

- 결정적 동작 (랜덤 실패 제거)
- shouldFail 파라미터로 테스트 제어
- X-Test-Fail 헤더 기반 실패 시뮬레이션

**Production-Ready Adapter**: `src/__fake__/payment/fake-payment-api.adapter.ts`

- 실제 PG API 호출 구조 준비
- 200ms 지연 시뮬레이션
- 실제 API 교체 준비 완료

#### 3. UseCase 리팩토링

**변경사항**:

```typescript
// Before
@Inject(PAYMENT_API_CLIENT)
private readonly paymentApiClient: IPaymentApiClient

// After
@Inject(PAYMENT_GATEWAY)
private readonly paymentGateway: IPaymentGateway
```

#### 4. Module 설정

```typescript
{
  provide: PAYMENT_GATEWAY,
  useClass:
    process.env.NODE_ENV === 'test'
      ? FakePaymentAdapter
      : process.env.NODE_ENV === 'production'
      ? FakePaymentApiAdapter
      : FakePaymentAdapter,
}
```

### Part 2: Facade 패턴 적용

#### 1. 새로운 UseCase 생성

**ConfirmStockUseCase**: `src/order/application/use-cases/confirm-stock.use-case.ts`

```typescript
@Injectable()
export class ConfirmStockUseCase {
  async execute(orderItems: OrderItem[]): Promise<void> {
    for (const item of orderItems) {
      await this.stockManagementService.confirmSale(
        item.productId,
        item.productOptionId,
        item.quantity,
      );
    }
  }
}
```

**CompleteOrderUseCase**: `src/order/application/use-cases/complete-order.use-case.ts`

```typescript
@Injectable()
export class CompleteOrderUseCase {
  async execute(orderId: string): Promise<void> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error(`주문을 찾을 수 없습니다: ${orderId}`);
    }
    order.complete();
    await this.orderRepository.save(order);
  }
}
```

#### 2. PaymentFacadeService 생성

**파일**: `src/order/application/facades/payment-facade.service.ts`

```typescript
@Injectable()
export class PaymentFacadeService {
  async processPaymentAndComplete(
    input: ProcessPaymentInput,
    testFail = false,
  ): Promise<ProcessPaymentOutput> {
    // Step 1: 결제 처리
    const payment = await this.processPaymentUseCase.execute(input, testFail);

    // Step 2: Order 조회
    const order = await this.orderRepository.findById(input.orderId);

    // Step 3: 재고 확정 (reserved → sold)
    await this.confirmStockUseCase.execute(order.items);

    // Step 4: 주문 완료 (PENDING → COMPLETED)
    await this.completeOrderUseCase.execute(input.orderId);

    return payment;
  }
}
```

#### 3. ProcessPaymentUseCase 리팩토링

**변경사항**:

- EventEmitter 의존성 제거
- PaymentCompletedEvent 발행 제거
- 결제 처리만 담당 (단일 책임)

```typescript
// Before
this.eventEmitter.emit(
  'payment.completed',
  new PaymentCompletedEvent(savedPayment.id, order.id),
);

// After (삭제됨)
// Note: 재고 확정 및 주문 완료는 PaymentFacadeService에서 처리
```

#### 4. 삭제된 파일

- `src/order/application/event-handlers/payment-completed.handler.ts`
- `src/order/application/event-handlers/payment-completed.handler.spec.ts`
- `src/order/domain/events/payment-completed.event.ts`

#### 5. Controller 수정

```typescript
// Before
constructor(private readonly processPaymentUseCase: ProcessPaymentUseCase) {}

async processPayment(...) {
  const output = await this.processPaymentUseCase.execute(input, shouldFail);
  return PaymentResponseDto.from(output);
}

// After
constructor(private readonly paymentFacadeService: PaymentFacadeService) {}

async processPayment(...) {
  const output = await this.paymentFacadeService.processPaymentAndComplete(input, shouldFail);
  return PaymentResponseDto.from(output);
}
```

## 📊 아키텍처 비교

### Before (Event-Driven)

```text
PaymentController
  └─ ProcessPaymentUseCase
       ├─ Payment 저장
       └─ PaymentCompletedEvent 발행
            ↓
       PaymentCompletedHandler (비동기 수신)
         ├─ StockManagementService.confirmSale()
         └─ Order.complete()
```

**문제점**:

- 같은 도메인 내부에서 이벤트 주고받음
- 트랜잭션 경계 불명확
- 실패 시 롤백 어려움

### After (Facade Pattern)

```text
PaymentController
  └─ PaymentFacadeService (동기 조율)
       ├─ ProcessPaymentUseCase (결제 처리)
       ├─ ConfirmStockUseCase (재고 확정)
       └─ CompleteOrderUseCase (주문 완료)
```

**장점**:

- 트랜잭션 경계 명확
- 각 단계별 롤백 로직 구현 가능
- 보상 트랜잭션 준비 완료

## 🧪 테스트 결과

### 전체 테스트 통과

```bash
Unit Tests:       40/40 passed (368 tests)
Integration Tests: 11/11 passed (103 tests)
E2E Tests:         1/1 passed (19 tests)
Total:            52/52 passed (490 tests)
```

### 주요 테스트 커버리지

1. **ProcessPaymentUseCase**
   - 정상 결제 처리
   - testFail 플래그 전달
   - 소유권 검증 (BR-PAY-01)
   - 주문 상태 검증 (BR-PAY-02)
   - 예약 시간 검증 (BR-PAY-03)
   - 중복 결제 방지
   - 외부 API 결제 처리

2. **PaymentController**
   - Facade 서비스 통합
   - DTO 변환
   - X-Test-Fail 헤더 처리
   - 예외 처리

## ✅ 결과

### Port/Adapter 패턴

- ✅ Domain Layer 독립성 확보
- ✅ Infrastructure 의존성 제거
- ✅ 테스트 일관성 보장 (랜덤 실패 0%)
- ✅ X-Test-Fail 헤더 사양 유지
- ✅ 환경별 자동 구현체 주입

### Facade 패턴

- ✅ 트랜잭션 경계 명확화
- ✅ 보상 트랜잭션 구현 준비 완료
- ✅ 각 UseCase 단일 책임 분리
- ✅ 테스트 독립성 향상
- ✅ 코드 흐름 직관성 개선

## 🔮 향후 작업 (Issue #025+)

### Saga Pattern 구현

```typescript
// 미래 구현 예시
async processPaymentAndComplete(input: ProcessPaymentInput): Promise<ProcessPaymentOutput> {
  try {
    // Step 1: 결제
    const payment = await this.processPaymentUseCase.execute(input);

    try {
      // Step 2: 재고 확정
      await this.confirmStockUseCase.execute(order.items);

      try {
        // Step 3: 주문 완료
        await this.completeOrderUseCase.execute(input.orderId);
      } catch (error) {
        // 보상: 재고 확정 취소
        await this.cancelStockConfirmation(order.items);
        // 보상: 결제 취소
        await this.cancelPayment(payment.id);
      }
    } catch (error) {
      // 보상: 결제 취소
      await this.cancelPayment(payment.id);
    }
  }
}
```

### 분산 트랜잭션 관리

- 재시도 로직 추가
- 타임아웃 처리
- Idempotency 보장

## 📚 참고 자료

- Hexagonal Architecture (Ports and Adapters)
- Saga Pattern (Choreography vs Orchestration)
- Clean Architecture
- DDD (Domain-Driven Design)

## 🔗 Related Issues

- Issue #023: Cart Testcontainers 통합
- Issue #025: (예정) Saga Pattern 구현

---

**Issue created**: 2025-11-21
**Issue closed**: 2025-11-21
**Total time**: ~2 hours
