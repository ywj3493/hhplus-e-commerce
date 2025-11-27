# Issue 029: Global Exception Filter 구현

## 배경

현재 Swagger에서 `ProductNotFoundException` 등 커스텀 Exception이 500 에러로 표시됩니다.
Domain Exception이 적절한 HTTP 상태 코드(400, 404, 409 등)와 구체적인 메시지로 응답되어야 합니다.

## 문제 분석

### 현재 Exception 상속 구조

| 도메인 | Exception 상속 | HTTP 상태 코드 | 현재 동작 |
|--------|---------------|---------------|----------|
| Coupon | NestJS HttpException | 자동 매핑 (400, 404, 409) | ✅ 정상 |
| User | NestJS HttpException | 자동 매핑 (400, 404) | ✅ 정상 |
| Product | Error | 매핑 없음 | ❌ 500 에러 |
| Order | Error | 매핑 없음 | ❌ 500 에러 |

### 원인

- Global Exception Filter가 없음
- Product/Order 도메인의 Exception이 일반 Error를 상속하여 HTTP 상태 코드 매핑 없음

## 해결 방안

### 접근 방식: Global Exception Filter 구현

Domain Exception은 Error 상속을 유지하면서 Global Exception Filter에서 HTTP 상태 코드로 변환합니다.

#### 장점

- Domain 레이어가 HTTP/NestJS에 의존하지 않음 (Clean Architecture)
- 중앙 집중식 예외 처리로 유지보수 용이
- 로깅, 모니터링 등 추가 기능 확장 용이

## 구현 작업

### 1. Global Exception Filter 생성

**파일**: `src/common/filters/domain-exception.filter.ts`

- 모든 예외를 catch하여 HTTP 응답으로 변환
- Exception 이름별로 HTTP 상태 코드 매핑
- NestJS HttpException은 그대로 통과

### 2. HTTP 상태 코드 매핑

```text
404 Not Found:
  - ProductNotFoundException
  - CartNotFoundException
  - CartItemNotFoundException
  - OrderNotFoundException

400 Bad Request:
  - InvalidProductIdException
  - EmptyCartException
  - InvalidOrderStateException
  - MinimumOrderAmountException
  - InvalidQuantityException
  - InvalidOrderStatusException

409 Conflict:
  - InsufficientStockException
  - OrderAlreadyCompletedException
  - OrderExpiredException
  - AlreadyPaidException
  - OptimisticLockException
  - LockAcquisitionException

403 Forbidden:
  - OrderOwnershipException

402 Payment Required:
  - PaymentFailedException

502 Bad Gateway:
  - PaymentApiException
```

### 3. main.ts에 Global Filter 등록

```typescript
app.useGlobalFilters(new GlobalExceptionFilter());
```

### 4. ProductController 단순화 (선택)

현재 ProductController의 try-catch 블록 제거 (Global Filter가 처리하므로 불필요)

## 수정 파일 목록

| 파일 | 작업 |
|-----|------|
| `src/common/filters/domain-exception.filter.ts` | 새로 생성 |
| `src/main.ts` | Global Filter 등록 추가 |
| `src/product/presentation/controllers/product.controller.ts` | try-catch 제거 (선택) |

## 예상 응답 형식

```json
{
  "statusCode": 404,
  "message": "상품을 찾을 수 없습니다: product-123",
  "error": "ProductNotFoundException",
  "timestamp": "2025-11-27T10:00:00.000Z",
  "path": "/api/v1/products/product-123"
}
```

## 완료 조건

- [ ] Global Exception Filter 구현
- [ ] main.ts에 등록
- [ ] 모든 Domain Exception이 적절한 HTTP 상태 코드로 응답
- [ ] Swagger에서 에러 메시지 확인 가능
