# Future Work Items (TODOs)

이 문서는 현재 구현되지 않았거나 개선이 필요한 항목들을 정리한 목록입니다.
각 항목은 향후 별도 이슈로 생성하여 구현할 예정입니다.

**Last Updated**: 2025-11-20

---

## 📋 미구현 API

### Product 도메인

#### 1. 인기 상품 API
- **엔드포인트**: `GET /products/popular`
- **문서 위치**:
  - `/docs/dev/dashboard/api-specification.md` (lines 434-496)
  - `/docs/dev/dashboard/requirements.md` - FR-PROD-05
  - `/docs/dev/dashboard/user-stories.md` - US-PROD-05
- **설명**: 최근 3일간 판매량 기준 Top 5 상품 조회
- **필요 작업**:
  - [ ] GetPopularProductsUseCase 구현
  - [ ] 판매 이력 집계 로직 (OrderItem 기반)
  - [ ] 캐싱 전략 (Redis 또는 In-Memory)
  - [ ] 배치 작업 (일별 집계 테이블 생성)
  - [ ] ProductController에 엔드포인트 추가
- **우선순위**: Medium
- **예상 난이도**: Medium (집계 쿼리 최적화 필요)

**참고사항**:
- 현재 OrderItem 테이블만 존재
- 옵션 1: 실시간 집계 (성능 이슈 가능)
- 옵션 2: 일별 집계 테이블 생성 (ProductDailySales)
- 응답 시간 목표: <200ms

---

### Order 도메인

#### 2. 주문 취소 API
- **엔드포인트**: `POST /orders/{id}/cancel`
- **문서 위치**:
  - `/docs/dev/dashboard/api-specification.md` (lines 1112-1157)
  - `/docs/dev/dashboard/requirements.md` - FR-ORDER-05
  - `/docs/dev/dashboard/user-stories.md` - US-ORDER-05
- **설명**: 주문 취소 및 재고 복원
- **필요 작업**:
  - [ ] CancelOrderUseCase 구현
  - [ ] 주문 상태 변경 (PENDING → CANCELLED)
  - [ ] 재고 복원 트랜잭션 (Stock release)
  - [ ] 쿠폰 복원 (UserCoupon.isUsed = false)
  - [ ] 결제 취소 연동 (환불 처리)
  - [ ] OrderController에 엔드포인트 추가
- **우선순위**: High
- **예상 난이도**: Medium (트랜잭션 복잡도)

**참고사항**:
- 주문 상태에 따른 취소 가능 여부 검증 필요
- PENDING 상태만 취소 가능 (PAID, CONFIRMED, SHIPPED는 불가)
- 재고 복원 시 Stock Entity의 release() 메서드 활용

---

## 💳 Payment Infrastructure 리팩터링

### 3. Payment Gateway Port/Adapter 패턴 적용
- **현재 상태**:
  - IPaymentApiClient (Infrastructure Layer Interface) 존재
  - MockPaymentApiClient 구현 (랜덤 실패 포함)
- **목표**: Port-Adapter 패턴으로 Domain Layer 독립성 확보
- **필요 작업**:
  - [ ] **Task 1: Domain Layer Port 정의**
    - `src/order/domain/ports/payment-gateway.port.ts` 생성
    - IPaymentGateway 인터페이스 정의
    - ProcessPaymentRequest, ProcessPaymentResponse DTO
    - PAYMENT_GATEWAY 토큰 생성
  - [ ] **Task 2: FakePaymentGateway 구현**
    - `src/order/infrastructure/gateways/fake-payment-gateway.ts`
    - 결정적 동작 (항상 성공)
    - testFail 플래그 지원 (명시적 실패 테스트용)
    - Swagger 및 E2E 테스트 용도
  - [ ] **Task 3: PaymentApiAdapter 구현**
    - MockPaymentApiClient → PaymentApiAdapter로 이름 변경
    - `src/order/infrastructure/gateways/payment-api-adapter.ts`
    - IPaymentGateway 구현
    - 실제 PG사 API 연동 준비 (Toss Payments, KakaoPay 등)
  - [ ] **Task 4: ProcessPaymentUseCase 수정**
    - IPaymentApiClient → IPaymentGateway 의존성 변경
    - Infrastructure 계층 인터페이스 의존 제거
  - [ ] **Task 5: OrderModule Provider 분기**
    - `NODE_ENV === 'test'` → FakePaymentGateway
    - `NODE_ENV === 'production'` → PaymentApiAdapter (실제 API)
    - 그 외 → PaymentApiAdapter (Mock 동작)
- **우선순위**: Medium
- **예상 난이도**: Low (리팩터링)

**참고사항**:
- 현재 MockPaymentApiClient는 랜덤 실패를 포함하여 테스트에 부적합
- FakePaymentGateway는 항상 성공하여 테스트 일관성 확보
- 실제 PG사 연동 시 PaymentApiAdapter만 수정하면 됨

---

## 🏗️ 아키텍처 개선

### 4. 공통 Response Wrapper
- **현재 상태**: Controller마다 개별 Response DTO 사용
- **목표**: API 응답 형식 표준화
- **문서 위치**: `/docs/dev/dashboard/api-specification.md` (lines 96-170)
- **필요 작업**:
  - [ ] ApiResponse<T> 클래스 생성
    ```typescript
    {
      success: boolean,
      data: T,
      timestamp: string
    }
    ```
  - [ ] PaginatedResponse<T> 클래스 생성
    ```typescript
    {
      success: boolean,
      data: {
        items: T[],
        pagination: {
          page: number,
          limit: number,
          total: number
        }
      },
      timestamp: string
    }
    ```
  - [ ] 모든 Controller Response DTO 수정
  - [ ] 인터셉터 또는 데코레이터 활용
- **우선순위**: Low
- **예상 난이도**: Low (일괄 수정)

**참고사항**:
- NestJS Interceptor 활용 가능 (@UseInterceptors(ResponseInterceptor))
- 또는 Custom Decorator (@ApiSuccessResponse)

---

### 5. Global Exception Filter
- **현재 상태**: Controller에서 try-catch로 개별 예외 처리
- **목표**: 도메인 Exception → HTTP Exception 자동 변환
- **필요 작업**:
  - [ ] GlobalExceptionFilter 생성 (@Catch())
  - [ ] 도메인 Exception 매핑 규칙
    - ProductNotFoundException → 404 Not Found
    - InsufficientStockException → 400 Bad Request
    - CouponAlreadyIssuedException → 409 Conflict
  - [ ] 공통 ErrorResponse 형식
    ```typescript
    {
      success: false,
      error: {
        code: string,
        message: string,
        details: any
      },
      timestamp: string
    }
    ```
  - [ ] AppModule에 Global Filter 등록
  - [ ] Controller의 try-catch 제거
- **우선순위**: Medium
- **예상 난이도**: Low

**참고사항**:
- NestJS Built-in Exception Filter 확장
- 도메인 예외는 그대로 유지 (Domain Layer 독립성)

---

### 6. Mapper 클래스 도입
- **현재 상태**: Controller/UseCase에서 직접 DTO 변환
- **목표**: DTO 변환 로직 분리 및 재사용성 향상
- **필요 작업**:
  - [ ] ProductMapper 클래스 생성
    - toDto(product: Product): ProductDto
    - toDomain(dto: CreateProductDto): Product
  - [ ] OrderMapper 클래스 생성
  - [ ] CouponMapper 클래스 생성
  - [ ] CartMapper 클래스 생성
  - [ ] Controller/UseCase에서 Mapper 활용
- **우선순위**: Low
- **예상 난이도**: Low (리팩터링)

**참고사항**:
- Presentation Layer DTO ↔ Application Layer DTO 변환
- Application Layer DTO ↔ Domain Entity 변환 (toData/from 메서드 활용)

---

## ⏰ 배치/스케줄러

### 7. 재고 예약 만료 Job
- **문서 위치**: `/docs/dev/dashboard/requirements.md` - BR-ORDER-04
- **설명**: 결제 대기 중인 주문이 10분 경과 시 자동 취소 및 재고 복원
- **현재 상태**:
  - Job 파일 존재 (`src/order/application/jobs/release-expired-reservation.job.ts`)
  - 스케줄러 등록 여부 불명확
- **필요 작업**:
  - [ ] `@nestjs/schedule` 패키지 설치
  - [ ] `@Cron('*/1 * * * *')` 데코레이터 추가 (1분마다)
  - [ ] OrderRepository.findExpiredPendingOrders() 구현
  - [ ] 만료된 주문 재고 복원 로직
  - [ ] 주문 상태 CANCELLED로 변경
  - [ ] AppModule에 ScheduleModule import
  - [ ] 로깅 추가 (만료 처리 건수)
- **우선순위**: High
- **예상 난이도**: Low

**참고사항**:
- Order.reservationExpiresAt 필드 활용
- Stock.release() 메서드로 재고 복원
- 트랜잭션 처리 필수

---

### 8. Outbox Pattern Worker
- **문서 위치**:
  - `/docs/dev/dashboard/requirements.md` - FR-DATA-01~04
  - `/docs/dev/dashboard/user-stories.md` - US-DATA-01~02
  - `/docs/dev/dashboard/api-specification.md` - EPIC-5
- **설명**: 주문 완료 시 외부 데이터 플랫폼으로 전송 (최종 일관성)
- **현재 상태**: 미구현
- **필요 작업**:
  - [ ] **Prisma Schema 추가**
    ```prisma
    model DataTransmission {
      id            String   @id @default(uuid())
      aggregateId   String   // Order ID
      aggregateType String   // "Order"
      eventType     String   // "OrderCompleted"
      payload       Json
      status        String   // PENDING, PROCESSING, SENT, FAILED
      retryCount    Int      @default(0)
      lastError     String?
      createdAt     DateTime @default(now())
      processedAt   DateTime?
    }
    ```
  - [ ] OutboxWriter (주문 완료 시 레코드 생성)
  - [ ] OutboxWorker (배치 처리)
    - `@Cron('*/1 * * * *')` - 1분마다 실행
    - PENDING 상태 레코드 조회
    - 외부 API 호출
    - 성공 시 SENT, 실패 시 재시도
  - [ ] Exponential Backoff 재시도 로직
    - 1분 → 2분 → 4분 (최대 3회)
  - [ ] 실패 알림 (Slack, Email)
- **우선순위**: Low (장기 과제)
- **예상 난이도**: High

**참고사항**:
- PaymentCompletedEvent 도메인 이벤트는 이미 존재
- 이벤트 핸들러에서 Outbox 레코드 생성
- Worker는 별도 프로세스 또는 스케줄러로 실행

---

## 🗄️ 데이터/스키마 개선

### 9. 판매 이력 집계 테이블
- **설명**: 인기 상품 API 성능 최적화를 위한 집계 테이블
- **현재 상태**: OrderItem 테이블만 존재
- **필요 작업**:
  - [ ] **옵션 1: 실시간 집계 (간단, 성능 이슈 가능)**
    - OrderItem 테이블에서 최근 3일 데이터 집계
    - 캐싱 활용 (Redis, 5분 TTL)
  - [ ] **옵션 2: 일별 집계 테이블 (권장)**
    - ProductDailySales 모델 추가
    ```prisma
    model ProductDailySales {
      id            String   @id @default(uuid())
      productId     String
      date          DateTime @db.Date
      totalQuantity Int
      totalAmount   Decimal  @db.Decimal(15, 2)
      createdAt     DateTime @default(now())

      product Product @relation(fields: [productId], references: [id])

      @@unique([productId, date])
      @@index([date])
    }
    ```
    - 일별 배치 작업으로 집계 데이터 생성
    - 최근 3일 데이터만 조회하여 Top 5 추출
- **우선순위**: Medium (인기 상품 API와 함께)
- **예상 난이도**: Medium

**참고사항**:
- 인기 상품 API 구현 시 함께 결정
- 초기에는 옵션 1로 시작 → 트래픽 증가 시 옵션 2로 전환

---

### 10. Prisma Schema 불일치 수정
- **설명**: Order 테이블의 reservationExpiresAt 필드 정리
- **현재 상태**:
  - Prisma Schema: `Order.reservationExpiresAt` 존재
  - Domain Entity: `Order.reservationExpiresAt` 없음 (OrderItem에만 존재)
- **필요 작업**:
  - [ ] 옵션 1: Prisma Schema에서 제거 (OrderItem만 사용)
  - [ ] 옵션 2: Domain Entity에 추가 (Order 레벨 예약 관리)
- **우선순위**: Low
- **예상 난이도**: Low

**참고사항**:
- 현재 로직은 OrderItem.reservationExpiresAt 기준으로 동작
- 재고 예약 만료 Job과 연관 확인 필요

---

## 🧪 테스트 개선

### 11. In-Memory Repository 제거 (선택적)
- **현재 상태**: 13개 In-Memory Repository 파일 존재
- **목표**: Testcontainers로 통합 테스트 전환 후 제거
- **필요 작업**:
  - [ ] 모든 단위 테스트를 Testcontainers로 전환
  - [ ] In-Memory Repository 파일 삭제
  - [ ] InMemory 관련 spec 파일 삭제
- **우선순위**: Low
- **예상 난이도**: Medium (테스트 대량 수정)

**참고사항**:
- 현재 단위 테스트에서 사용 중
- 빠른 테스트 피드백이 필요한 경우 유지 가능
- Testcontainers는 느리지만 데이터 정합성 보장

---

### 12. 테스트 언어 통일
- **현재 상태**: 대부분 한글, 일부 영문 주석 혼재
- **목표**: `CLAUDE.md` 규칙 준수
- **필요 작업**:
  - [ ] describe/it 블록: 한글
  - [ ] Given-When-Then 주석: 영문 유지
  - [ ] 인라인 주석: 한글
- **우선순위**: Low
- **예상 난이도**: Low

---

## 🔐 인증/인가

### 13. 실제 JWT 인증 구현
- **현재 상태**: Fake Auth Guard 사용 (`__fake__/auth/`)
- **목표**: 실제 JWT 인증 구현
- **필요 작업**:
  - [ ] `@nestjs/passport`, `passport-jwt` 설치
  - [ ] JwtStrategy 구현
  - [ ] JwtAuthGuard 구현
  - [ ] AuthModule 구현 (Login, Register)
  - [ ] User 비밀번호 해싱 (bcrypt)
  - [ ] Refresh Token 전략
  - [ ] Fake Auth Guard 제거
- **우선순위**: Low (현재 Fake로 충분)
- **예상 난이도**: Medium

**참고사항**:
- Fake Auth는 Swagger 및 E2E 테스트용으로 유지 가능
- 실제 인증 구현 후에도 테스트용으로 분리하여 사용

---

## 📊 모니터링/로깅

### 14. 성능 모니터링
- **목표**: 응답 시간 목표 달성 검증
  - 상품 조회: <200ms
  - 주문 생성: <500ms
  - 쿠폰 발급: <300ms
- **필요 작업**:
  - [ ] NestJS Logger 활용
  - [ ] 응답 시간 측정 Interceptor
  - [ ] APM 도구 연동 (Sentry, New Relic 등)
  - [ ] Slow Query 로깅
- **우선순위**: Low
- **예상 난이도**: Low

---

## 📚 문서화

### 15. Swagger API 문서 정비
- **현재 상태**: 일부 Controller에 Swagger 데코레이터 누락
- **필요 작업**:
  - [ ] 모든 Controller에 `@ApiTags` 추가
  - [ ] 모든 엔드포인트에 `@ApiOperation` 추가
  - [ ] Request/Response DTO에 `@ApiProperty` 추가
  - [ ] 예시 값 (example) 추가
  - [ ] Error Response 정의 (`@ApiResponse`)
- **우선순위**: Low
- **예상 난이도**: Low

---

### 16. Admin 도메인 구현 여부 결정
- **문서 위치**: `/docs/dev/admin/requirements.md`
- **현재 상태**: Dashboard 기능만 구현 중
- **결정 필요**: Admin 기능 구현 여부
  - 상품 관리 (등록/수정/삭제)
  - 주문 관리 (상태 변경)
  - 쿠폰 관리 (생성/수정)
  - 사용자 관리
- **우선순위**: TBD (사업 요구사항에 따라)

---

## 📈 우선순위 요약

### 🔴 High Priority (즉시 필요)
1. **주문 취소 API** (Issue #002 참조)
2. **재고 예약 만료 Job** (스케줄러 등록)

### 🟡 Medium Priority (1-2주 내)
3. **인기 상품 API** (집계 로직 포함)
4. **Global Exception Filter**
5. **Payment Gateway Port/Adapter 패턴**
6. **판매 이력 집계 테이블**

### 🟢 Low Priority (장기 과제)
7. **공통 Response Wrapper**
8. **Mapper 클래스 도입**
9. **Outbox Pattern Worker**
10. **In-Memory Repository 제거**
11. **실제 JWT 인증**
12. **성능 모니터링**

---

## 📝 Issue 생성 가이드

각 TODO 항목을 별도 이슈로 생성 시 다음 형식을 따릅니다:

```markdown
# Issue #XXX: {Title}

## Status
- Created: YYYY-MM-DD
- Priority: High/Medium/Low
- Current Status: Not Started

## Objective
{간단한 목표 설명}

## Tasks
- [ ] Task 1
- [ ] Task 2

## Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2

## Related Issues
- Related: Issue #XXX
```

---

**Document created**: 2025-11-20
**Next review**: TBD
