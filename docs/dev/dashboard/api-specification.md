# API 명세서

**버전**: 1.0.0
**최종 수정**: 2025-10-30
**상태**: Active

---

## 문서 네비게이션

**이전**: [← 사용자 스토리](user-stories.md)
**다음**: [데이터 모델 →](data-model.md)

---

## 목차

1. [개요](#개요)
2. [API 기본 정보](#api-기본-정보)
3. [공통 응답 형식](#공통-응답-형식)
4. [공통 에러 코드](#공통-에러-코드)
5. [EPIC-1: 상품 탐색 API](#epic-1-상품-탐색-api)
6. [EPIC-2: 장바구니 관리 API](#epic-2-장바구니-관리-api)
7. [EPIC-3: 주문 및 결제 API](#epic-3-주문-및-결제-api)
8. [EPIC-4: 쿠폰 활용 API](#epic-4-쿠폰-활용-api)
9. [EPIC-5: 데이터 연동](#epic-5-데이터-연동)
10. [데이터 스키마](#데이터-스키마)
11. [요구사항 추적 매트릭스](#요구사항-추적-매트릭스)

---

## 개요

본 문서는 E-Commerce Backend Service의 RESTful API 명세를 정의합니다. 모든 API 엔드포인트는 [요구사항 분석](requirements.md)과 [사용자 스토리](user-stories.md)를 기반으로 설계되었습니다.

### API 설계 원칙

1. **RESTful 아키텍처**: 리소스 기반 URL 설계, HTTP 메서드의 의미론적 사용
2. **일관성**: 모든 엔드포인트에서 동일한 응답 형식 및 에러 처리
3. **명확성**: 직관적인 엔드포인트 이름과 명확한 HTTP 상태 코드
4. **확장성**: 버전 관리 및 페이지네이션 지원

> **참고**: 인증/인가 메커니즘은 과제 특성상 본 명세서에서 생략합니다. 실제 구현 시 JWT 기반 인증 등을 적용할 수 있습니다.

---

## API 기본 정보

### Base URL

```
http://localhost:3000/api/v1
```

- **프로토콜**: HTTP/HTTPS
- **버전**: v1 (URL 경로에 버전 포함)
- **Content-Type**: `application/json`
- **Character Encoding**: UTF-8

### HTTP 메서드

| 메서드 | 용도 | 멱등성 |
|--------|------|--------|
| **GET** | 리소스 조회 | ✅ |
| **POST** | 리소스 생성 | ❌ |
| **PATCH** | 리소스 부분 수정 | ❌ |
| **DELETE** | 리소스 삭제 | ✅ |

### 엔드포인트별 인증 요구사항

> **참고**: 과제 특성상 인증/인가 구현은 생략하지만, 각 엔드포인트의 인증 필요 여부는 다음과 같이 구분합니다.

**인증이 필요한 엔드포인트** (실제 서비스에서는 JWT 등으로 인증 필요):
- 장바구니 관련 모든 API
- 주문 및 결제 관련 모든 API
- 쿠폰 발급 및 조회 API

**인증이 불필요한 엔드포인트** (공개 API):
- 상품 목록 조회 (`GET /products`)
- 상품 상세 조회 (`GET /products/{id}`)
- 상품 옵션 조회 (`GET /products/{id}/options`)
- 인기 상품 조회 (`GET /products/popular`)

### 공통 헤더

**인증 필요 시**:

```http
Authorization: Bearer {access_token}
```

---

## 공통 응답 형식

### 성공 응답 형식

```json
{
  "success": true,
  "data": {
    // 응답 데이터
  },
  "timestamp": "2025-10-30T10:00:00Z"
}
```

### 페이지네이션 응답 형식

```typescript
PaginatedResponse<T> {
  success: true,
  data: {
    items: T[],           // 페이지네이션된 아이템 목록
    pagination: {
      page: number,       // 현재 페이지 (1부터 시작)
      limit: number,      // 페이지 크기
      totalItems: number, // 전체 아이템 수
      totalPages: number, // 전체 페이지 수
      hasNext: boolean,   // 다음 페이지 존재 여부
      hasPrev: boolean    // 이전 페이지 존재 여부
    }
  },
  timestamp: string       // ISO 8601 형식
}
```

**예시**: `PaginatedResponse<ProductListItem>`

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "prod-001",
        "name": "무선 이어폰",
        "price": 89000
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "timestamp": "2025-10-30T10:00:00Z"
}
```

### 에러 응답 형식

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지",
    "details": {
      // 추가 에러 정보 (선택적)
    }
  },
  "timestamp": "2025-10-30T10:00:00Z"
}
```

---

## 공통 에러 코드

### HTTP 상태 코드 사용 가이드

| 상태 코드 | 설명 | 사용 시나리오 |
|----------|------|--------------|
| **200 OK** | 성공 | GET, PATCH, DELETE 요청 성공 |
| **201 Created** | 생성 성공 | POST 요청으로 리소스 생성 성공 |
| **400 Bad Request** | 잘못된 요청 | 유효성 검증 실패, 잘못된 파라미터 |
| **401 Unauthorized** | 인증 필요 | 인증되지 않은 사용자 (과제에서는 생략) |
| **403 Forbidden** | 권한 없음 | 다른 사용자의 리소스 접근 시도 |
| **404 Not Found** | 리소스 없음 | 존재하지 않는 리소스 조회 |
| **409 Conflict** | 충돌 | 재고 부족, 중복 발급 등 |
| **500 Internal Server Error** | 서버 오류 | 예상치 못한 서버 에러 |

### 공통 에러 코드

다음 에러 코드는 모든 엔드포인트에서 공통적으로 발생할 수 있습니다. 각 엔드포인트의 에러 응답 테이블에서는 해당 엔드포인트에 특화된 에러만 명시합니다.

| 코드 | HTTP 상태 | 설명 | 발생 조건 |
|------|----------|------|----------|
| **UNAUTHORIZED** | 401 | 인증이 필요합니다 | 인증 토큰이 없거나 유효하지 않음 |
| **FORBIDDEN** | 403 | 권한이 없습니다 | 다른 사용자의 리소스 접근 시도 |
| **NOT_FOUND** | 404 | 리소스를 찾을 수 없습니다 | 존재하지 않는 리소스 ID |
| **BAD_REQUEST** | 400 | 잘못된 요청입니다 | 유효성 검증 실패 |
| **INTERNAL_ERROR** | 500 | 서버 내부 오류가 발생했습니다 | 예상치 못한 서버 에러 |

> **참고**: 각 엔드포인트의 **Error Responses** 테이블에는 해당 API에 특화된 에러 코드만 기재합니다.

---

## EPIC-1: 상품 탐색 API

상품을 조회하고 탐색하는 기능을 제공하는 API 그룹입니다.

### 엔드포인트 목록

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/products` | 상품 목록 조회 |
| GET | `/products/{id}` | 상품 상세 조회 |
| GET | `/products/{id}/options` | 상품 옵션 조회 |
| GET | `/products/popular` | 인기 상품 Top 5 조회 |

---

### GET /products

상품 목록을 페이지네이션하여 조회합니다.

#### 관련 스토리
- [US-PROD-01](user-stories.md#us-prod-01-상품-목록-조회): 상품 목록 조회
- [US-PROD-05](user-stories.md#us-prod-05-정렬-기준-적용): 정렬 기준 적용

#### 요청

**Query Parameters**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| `page` | integer | ❌ | 1 | 페이지 번호 (1부터 시작) |
| `limit` | integer | ❌ | 20 | 페이지 크기 (1-100) |
| `sortBy` | string | ❌ | createdAt | 정렬 기준 (`price`, `popularity`, `createdAt`) |
| `sortOrder` | string | ❌ | desc | 정렬 방향 (`asc`, `desc`) |

**요청 예시**

```http
GET /api/v1/products?page=1&limit=20&sortBy=price&sortOrder=asc
```

#### 응답

**Success (200 OK)**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "prod-001",
        "name": "무선 이어폰",
        "price": 89000,
        "categoryId": "cat-001",
        "categoryName": "전자기기",
        "hasStock": true,
        "createdAt": "2025-10-25T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "timestamp": "2025-10-30T10:00:00Z"
}
```

**Error Responses**

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| `INVALID_PAGE_NUMBER` | 유효하지 않은 페이지 번호입니다 | page < 1 |
| `INVALID_PAGE_SIZE` | 페이지 크기는 1-100 사이여야 합니다 | limit < 1 또는 limit > 100 |
| `INVALID_SORT_FIELD` | 지원하지 않는 정렬 기준입니다 | sortBy가 유효하지 않음 |
| `INVALID_SORT_ORDER` | 유효하지 않은 정렬 방향입니다 | sortOrder가 asc, desc가 아님 |

**에러 응답 예시**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PAGE_SIZE",
    "message": "페이지 크기는 1-100 사이여야 합니다"
  },
  "timestamp": "2025-10-30T10:00:00Z"
}
```


---

### GET /products/{id}

특정 상품의 상세 정보를 조회합니다.

#### 관련 스토리
- [US-PROD-02](user-stories.md#us-prod-02-상품-상세-조회): 상품 상세 조회

#### 요청

**Path Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `id` | string | ✅ | 상품 ID |

#### 응답

**Success (200 OK)**

```json
{
  "success": true,
  "data": {
    "id": "prod-001",
    "name": "무선 이어폰",
    "price": 89000,
    "description": "고품질 노이즈 캔슬링 무선 이어폰",
    "categoryId": "cat-001",
    "categoryName": "전자기기",
    "hasStock": true,
    "hasOptions": true,
    "createdAt": "2025-10-25T10:00:00Z",
    "updatedAt": "2025-10-28T15:30:00Z"
  },
  "timestamp": "2025-10-30T10:00:00Z"
}
```

**Error Responses**

| 에러 코드 | 메시지 |
|----------|--------|
| `PRODUCT_NOT_FOUND` | 상품을 찾을 수 없습니다 |


---

### GET /products/{id}/options

특정 상품의 옵션 정보를 조회합니다.

#### 관련 스토리
- [US-PROD-04](user-stories.md#us-prod-04-옵션-정보-확인): 옵션 정보 확인

#### 요청

**Path Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `id` | string | ✅ | 상품 ID |

#### 응답

**Success (200 OK)**

```json
{
  "success": true,
  "data": {
    "productId": "prod-001",
    "options": [
      {
        "id": "opt-001",
        "productId": "prod-001",
        "type": "색상",
        "name": "빨강",
        "additionalPrice": 0,
        "hasStock": true
      },
      {
        "id": "opt-002",
        "productId": "prod-001",
        "type": "색상",
        "name": "파랑",
        "additionalPrice": 0,
        "hasStock": false
      },
      {
        "id": "opt-003",
        "productId": "prod-001",
        "type": "사이즈",
        "name": "S",
        "additionalPrice": 0,
        "hasStock": false
      },
      {
        "id": "opt-004",
        "productId": "prod-001",
        "type": "사이즈",
        "name": "M",
        "additionalPrice": 0,
        "hasStock": true
      }
    ]
  },
  "timestamp": "2025-10-30T10:00:00Z"
}
```

**Success - 옵션이 없는 경우 (200 OK)**

```json
{
  "success": true,
  "data": {
    "productId": "prod-001",
    "options": []
  },
  "timestamp": "2025-10-30T10:00:00Z"
}
```

**Error Responses**

| 에러 코드 | 메시지 |
|----------|--------|
| `PRODUCT_NOT_FOUND` | 상품을 찾을 수 없습니다 |


---

### GET /products/popular

최근 3일간 인기 상품 Top 5를 조회합니다.

#### 관련 스토리
- [US-PROD-06](user-stories.md#us-prod-06-인기-상품-확인): 인기 상품 확인

#### 응답

**Success (200 OK)**

```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2025-10-27T00:00:00Z",
      "endDate": "2025-10-30T00:00:00Z"
    },
    "items": [
      {
        "rank": 1,
        "product": {
          "id": "prod-001",
          "name": "무선 이어폰",
          "price": 89000,
          "categoryName": "전자기기"
        },
        "salesCount": 150,
        "salesAmount": 13350000
      },
      {
        "rank": 2,
        "product": {
          "id": "prod-002",
          "name": "블루투스 스피커",
          "price": 59000,
          "categoryName": "전자기기"
        },
        "salesCount": 120,
        "salesAmount": 7080000
      }
    ]
  },
  "timestamp": "2025-10-30T10:00:00Z"
}
```

**Success - 주문 데이터가 없는 경우 (200 OK)**

```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2025-10-27T00:00:00Z",
      "endDate": "2025-10-30T00:00:00Z"
    },
    "items": []
  },
  "timestamp": "2025-10-30T10:00:00Z"
}
```


---

## EPIC-2: 장바구니 관리 API

장바구니에 상품을 추가하고 관리하는 기능을 제공하는 API 그룹입니다.

### 엔드포인트 목록

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/carts/items` | 장바구니에 상품 추가 |
| GET | `/carts` | 장바구니 조회 |
| PATCH | `/carts/items/{id}` | 수량 변경 |
| DELETE | `/carts/items/{id}` | 개별 상품 제거 |
| DELETE | `/carts` | 장바구니 전체 비우기 |

---

### POST /carts/items

장바구니에 상품을 추가합니다.

#### 관련 스토리
- [US-CART-01](user-stories.md#us-cart-01-장바구니에-상품-추가): 장바구니에 상품 추가

#### 요청

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `productId` | string | ✅ | 상품 ID |
| `optionId` | string | ❌ | 옵션 ID (옵션이 있는 상품의 경우 필수) |
| `quantity` | integer | ✅ | 수량 (1 이상) |

#### 응답

**Success (201 Created)**

```json
{
  "success": true,
  "data": {
    "id": "cart-item-001",
    "userId": "user-001",
    "productId": "prod-001",
    "productName": "무선 이어폰",
    "productPrice": 89000,
    "optionId": "opt-001",
    "optionName": "빨강",
    "additionalPrice": 0,
    "quantity": 2,
    "subtotal": 178000,
    "createdAt": "2025-10-30T10:00:00Z"
  },
  "timestamp": "2025-10-30T10:00:00Z"
}
```

**Error Responses**

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| `INVALID_QUANTITY` | 수량은 1 이상이어야 합니다 | quantity < 1 |
| `OPTION_REQUIRED` | 옵션을 선택해주세요 | 옵션 필수 상품에 optionId 없음 |
| `PRODUCT_NOT_FOUND` | 상품을 찾을 수 없습니다 | 존재하지 않는 productId |
| `OPTION_NOT_FOUND` | 옵션을 찾을 수 없습니다 | 존재하지 않는 optionId |
| `OUT_OF_STOCK` | {상품명} - {옵션명}이 품절입니다 | 재고 부족 |


---

### GET /carts

사용자의 장바구니 내역을 조회합니다.

#### 관련 스토리
- [US-CART-04](user-stories.md#us-cart-04-장바구니-확인): 장바구니 확인
- [US-CART-05](user-stories.md#us-cart-05-총-금액-확인): 총 금액 확인

#### 응답

**Success (200 OK)**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "cart-item-001",
        "productId": "prod-001",
        "productName": "무선 이어폰",
        "productPrice": 89000,
        "optionId": "opt-001",
        "optionName": "빨강",
        "additionalPrice": 0,
        "quantity": 2,
        "subtotal": 178000,
        "hasStock": true,
        "createdAt": "2025-10-30T10:00:00Z"
      },
      {
        "id": "cart-item-002",
        "productId": "prod-002",
        "productName": "블루투스 스피커",
        "productPrice": 59000,
        "optionId": null,
        "optionName": null,
        "additionalPrice": 0,
        "quantity": 1,
        "subtotal": 59000,
        "hasStock": true,
        "createdAt": "2025-10-30T09:30:00Z"
      }
    ],
    "totalAmount": 237000,
    "itemCount": 2
  },
  "timestamp": "2025-10-30T10:00:00Z"
}
```

**Success - 장바구니가 비어있는 경우 (200 OK)**

```json
{
  "success": true,
  "data": {
    "items": [],
    "totalAmount": 0,
    "itemCount": 0
  },
  "timestamp": "2025-10-30T10:00:00Z"
}
```


---

### PATCH /carts/items/{id}

장바구니 항목의 수량을 변경합니다.

#### 관련 스토리
- [US-CART-02](user-stories.md#us-cart-02-수량-조정): 수량 조정

#### 요청

**Path Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `id` | string | ✅ | 장바구니 항목 ID |

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `quantity` | integer | ✅ | 변경할 수량 (1 이상) |

#### 응답

**Success (200 OK)**

```json
{
  "success": true,
  "data": {
    "id": "cart-item-001",
    "productId": "prod-001",
    "productName": "무선 이어폰",
    "productPrice": 89000,
    "optionId": "opt-001",
    "optionName": "빨강",
    "additionalPrice": 0,
    "quantity": 5,
    "subtotal": 445000,
    "updatedAt": "2025-10-30T10:05:00Z"
  },
  "timestamp": "2025-10-30T10:05:00Z"
}
```

**Error Responses**

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| `INVALID_QUANTITY` | 수량은 1 이상이어야 합니다 | quantity < 1 |
| `CART_ITEM_NOT_FOUND` | 장바구니 항목을 찾을 수 없습니다 | 존재하지 않는 항목 ID |
| `OUT_OF_STOCK` | {상품명} - {옵션명}이 품절입니다 | 재고 부족 |


---

### DELETE /carts/items/{id}

장바구니에서 특정 항목을 제거합니다.

#### 관련 스토리
- [US-CART-03](user-stories.md#us-cart-03-상품-제거): 상품 제거

#### 요청

**Path Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `id` | string | ✅ | 장바구니 항목 ID |

**요청 예시**

```http
DELETE /api/v1/carts/items/cart-item-001
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 응답

**Success (200 OK)**

```json
{
  "success": true,
  "data": {
    "message": "장바구니 항목이 삭제되었습니다",
    "deletedItemId": "cart-item-001"
  },
  "timestamp": "2025-10-30T10:00:00Z"
}
```

**Error Responses**

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| `CART_ITEM_NOT_FOUND` | 장바구니 항목을 찾을 수 없습니다 | 존재하지 않는 항목 ID |

---

### DELETE /carts

장바구니의 모든 항목을 비웁니다.

#### 관련 스토리
- [US-CART-06](user-stories.md#us-cart-06-장바구니-전체-비우기): 장바구니 전체 비우기

#### 응답

**Success (200 OK)**

```json
{
  "success": true,
  "data": {
    "message": "장바구니가 비워졌습니다",
    "deletedCount": 3
  },
  "timestamp": "2025-10-30T10:00:00Z"
}
```

**Success - 빈 장바구니 (200 OK)**

```json
{
  "success": true,
  "data": {
    "message": "장바구니가 비워졌습니다",
    "deletedCount": 0
  },
  "timestamp": "2025-10-30T10:00:00Z"
}
```

---

## EPIC-3: 주문 및 결제 API

주문을 생성하고 결제를 처리하는 기능을 제공하는 API 그룹입니다.

### 엔드포인트 목록

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/orders` | 주문 생성 (재고 확보) |
| GET | `/orders/{id}` | 주문 상세 조회 |
| GET | `/orders` | 주문 목록 조회 |
| POST | `/orders/{id}/payment` | 결제 처리 |
| POST | `/orders/{id}/cancel` | 주문 취소 |

---

### POST /orders

사용자의 장바구니 전체 항목으로 주문을 생성하고 재고를 예약합니다.

> **참고**: 장바구니의 모든 항목으로 주문이 생성됩니다 (부분 주문 불가). 결제 완료 시 장바구니가 자동으로 비워집니다.

#### 관련 스토리
- [US-ORDER-01](user-stories.md#us-order-01-주문-생성): 주문 생성
- [US-ORDER-02](user-stories.md#us-order-02-재고-예약-보장): 재고 예약 보장
- [US-ORDER-03](user-stories.md#us-order-03-쿠폰-적용): 쿠폰 적용

#### 요청

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `couponId` | string | ❌ | 사용할 쿠폰 ID (선택) |

**요청 예시**

```http
POST /api/v1/orders
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "couponId": "coupon-001"
}
```

#### 응답

**Success (201 Created)**

```json
{
  "success": true,
  "data": {
    "id": "order-001",
    "userId": "user-001",
    "status": "PENDING",
    "items": [
      {
        "productId": "prod-001",
        "productName": "무선 이어폰",
        "optionId": "opt-001",
        "optionName": "빨강",
        "quantity": 2,
        "productPrice": 89000,
        "optionAdditionalPrice": 0,
        "unitPrice": 89000,
        "subtotal": 178000
      }
    ],
    "totalAmount": 178000,
    "discountAmount": 17800,
    "finalAmount": 160200,
    "coupon": {
      "id": "coupon-001",
      "name": "10% 할인 쿠폰",
      "discountRate": 10
    },
    "reservationExpiresAt": "2025-10-30T10:10:00Z",
    "createdAt": "2025-10-30T10:00:00Z"
  },
  "timestamp": "2025-10-30T10:00:00Z"
}
```

**Error Responses**

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| `EMPTY_CART` | 장바구니가 비어있습니다 | 장바구니에 상품이 없음 |
| `COUPON_ALREADY_USED` | 이미 사용한 쿠폰입니다 | 쿠폰이 USED 상태 |
| `COUPON_EXPIRED` | 쿠폰이 만료되었습니다 | 쿠폰 유효기간 경과 |
| `MINIMUM_AMOUNT_NOT_MET` | 쿠폰 사용 최소 금액을 충족하지 못했습니다 | 주문 금액이 쿠폰 최소 금액 미달 |
| `COUPON_NOT_FOUND` | 쿠폰을 찾을 수 없습니다 | 존재하지 않는 쿠폰 ID |
| `OUT_OF_STOCK` | {상품명} - {옵션명}이 품절입니다 | 재고 부족 |

**에러 응답 예시**

```json
{
  "success": false,
  "error": {
    "code": "OUT_OF_STOCK",
    "message": "무선 이어폰 - 빨강이 품절입니다"
  },
  "timestamp": "2025-10-30T10:00:00Z"
}
```


---

### GET /orders/{id}

특정 주문의 상세 정보를 조회합니다.

#### 관련 스토리
- [US-ORDER-04](user-stories.md#us-order-04-주문-상태-확인): 주문 상태 확인

#### 요청

**Path Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `id` | string | ✅ | 주문 ID |

**요청 예시**

```http
GET /api/v1/orders/order-001
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 응답

**Success (200 OK)**

```json
{
  "success": true,
  "data": {
    "id": "order-001",
    "userId": "user-001",
    "status": "COMPLETED",
    "items": [
      {
        "productId": "prod-001",
        "productName": "무선 이어폰",
        "optionId": "opt-001",
        "optionName": "빨강",
        "quantity": 2,
        "productPrice": 89000,
        "optionAdditionalPrice": 0,
        "unitPrice": 89000,
        "subtotal": 178000
      }
    ],
    "totalAmount": 178000,
    "discountAmount": 17800,
    "finalAmount": 160200,
    "coupon": {
      "id": "coupon-001",
      "name": "10% 할인 쿠폰",
      "discountRate": 10
    },
    "payment": {
      "paidAt": "2025-10-30T10:05:00Z",
      "method": "CARD"
    },
    "createdAt": "2025-10-30T10:00:00Z",
    "updatedAt": "2025-10-30T10:05:00Z"
  },
  "timestamp": "2025-10-30T10:30:00Z"
}
```

**Error Responses**

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| 403 | `FORBIDDEN` | 권한이 없습니다 | 다른 사용자의 주문 |
| `ORDER_NOT_FOUND` | 주문을 찾을 수 없습니다 | 존재하지 않는 주문 ID |


---

### GET /orders

사용자의 주문 목록을 조회합니다.

#### 관련 스토리
- [US-ORDER-04](user-stories.md#us-order-04-주문-상태-확인): 주문 상태 확인

#### 요청

**Query Parameters**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| `startDate` | string | ❌ | - | 조회 시작일 (ISO 8601) |
| `endDate` | string | ❌ | - | 조회 종료일 (ISO 8601) |
| `status` | string | ❌ | - | 주문 상태 필터 |
| `page` | integer | ❌ | 1 | 페이지 번호 |
| `limit` | integer | ❌ | 20 | 페이지 크기 |

**요청 예시**

```http
GET /api/v1/orders?startDate=2025-10-01T00:00:00Z&endDate=2025-10-31T23:59:59Z&status=COMPLETED
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 응답

**Success (200 OK)**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "order-001",
        "status": "COMPLETED",
        "totalAmount": 178000,
        "finalAmount": 160200,
        "itemCount": 2,
        "createdAt": "2025-10-30T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 5,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  },
  "timestamp": "2025-10-30T10:30:00Z"
}
```

**Error Responses**

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| `INVALID_DATE_RANGE` | 유효하지 않은 날짜 범위입니다 | startDate > endDate |


---

### POST /orders/{id}/payment

주문에 대한 결제를 처리합니다.

#### 관련 스토리
- [US-PAY-01](user-stories.md#us-pay-01-결제-처리): 결제 처리
- [US-PAY-02](user-stories.md#us-pay-02-결제-실패-시-재고-복원): 결제 실패 시 재고 복원
- [US-PAY-03](user-stories.md#us-pay-03-시간-내-재결제): 시간 내 재결제

#### 요청

**Path Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `id` | string | ✅ | 주문 ID |

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `paymentMethod` | string | ✅ | 결제 수단 (CARD, BANK_TRANSFER 등) |

**요청 예시**

```http
POST /api/v1/orders/order-001/payment
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "paymentMethod": "CARD"
}
```

#### 응답

**Success (200 OK)**

```json
{
  "success": true,
  "data": {
    "orderId": "order-001",
    "status": "COMPLETED",
    "payment": {
      "amount": 160200,
      "method": "CARD",
      "paidAt": "2025-10-30T10:05:00Z"
    }
  },
  "timestamp": "2025-10-30T10:05:00Z"
}
```

**Error Responses**

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| `ALREADY_PAID` | 이미 결제 완료된 주문입니다 | 주문 상태가 COMPLETED |
| `CANNOT_PAY_CANCELLED` | 취소된 주문은 결제할 수 없습니다 | 주문 상태가 CANCELLED |
| `ORDER_EXPIRED` | 주문이 만료되었습니다 | 주문 상태가 EXPIRED |
| `RESERVATION_EXPIRED` | 재고 확보가 만료되었습니다 | 재고 확보 후 10분 경과 |
| 403 | `FORBIDDEN` | 권한이 없습니다 | 다른 사용자의 주문 |
| `ORDER_NOT_FOUND` | 주문을 찾을 수 없습니다 | 존재하지 않는 주문 ID |

**에러 응답 예시**

```json
{
  "success": false,
  "error": {
    "code": "RESERVATION_EXPIRED",
    "message": "재고 예약이 만료되었습니다"
  },
  "timestamp": "2025-10-30T10:15:00Z"
}
```


---

### POST /orders/{id}/cancel

주문을 취소하고 예약된 재고를 복원합니다.

#### 관련 스토리
- [US-PAY-02](user-stories.md#us-pay-02-결제-실패-시-재고-복원): 결제 실패 시 재고 복원

#### 요청

**Path Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `id` | string | ✅ | 주문 ID |

**요청 예시**

```http
POST /api/v1/orders/order-001/cancel
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 응답

**Success (200 OK)**

```json
{
  "success": true,
  "data": {
    "orderId": "order-001",
    "status": "CANCELLED",
    "cancelledAt": "2025-10-30T10:08:00Z"
  },
  "timestamp": "2025-10-30T10:08:00Z"
}
```

**Error Responses**

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| `ALREADY_COMPLETED` | 이미 결제 완료된 주문은 취소할 수 없습니다 | 주문 상태가 COMPLETED |
| 403 | `FORBIDDEN` | 권한이 없습니다 | 다른 사용자의 주문 |
| `ORDER_NOT_FOUND` | 주문을 찾을 수 없습니다 | 존재하지 않는 주문 ID |


---

## EPIC-4: 쿠폰 활용 API

쿠폰을 발급받고 사용하는 기능을 제공하는 API 그룹입니다.

### 엔드포인트 목록

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/coupons/{id}/issue` | 쿠폰 발급 |
| GET | `/coupons/my` | 보유 쿠폰 조회 |

---

### POST /coupons/{id}/issue

선착순으로 쿠폰을 발급받습니다.

#### 관련 스토리
- [US-COUP-01](user-stories.md#us-coup-01-선착순-쿠폰-발급): 선착순 쿠폰 발급
- [US-COUP-02](user-stories.md#us-coup-02-중복-발급-방지): 중복 발급 방지

#### 요청

**Path Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `id` | string | ✅ | 쿠폰 ID |

**Request Body**: 없음

**요청 예시**

```http
POST /api/v1/coupons/coupon-001/issue
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 응답

**Success (201 Created)**

```json
{
  "success": true,
  "data": {
    "id": "user-coupon-001",
    "userId": "user-001",
    "coupon": {
      "id": "coupon-001",
      "name": "10% 할인 쿠폰",
      "discountRate": 10,
      "minAmount": 50000,
      "issueStartDate": "2025-10-01T00:00:00Z",
      "issueEndDate": "2025-10-31T23:59:59Z",
      "totalQuantity": 100,
      "issuedQuantity": 45
    },
    "status": "AVAILABLE",
    "expiresAt": "2025-11-30T23:59:59Z",
    "issuedAt": "2025-10-30T10:00:00Z"
  },
  "timestamp": "2025-10-30T10:00:00Z"
}
```

**Error Responses**

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|
| `COUPON_PERIOD_INVALID` | 쿠폰 발급 기간이 아닙니다 | 발급 시작 전 또는 종료 후 |
| `COUPON_NOT_FOUND` | 쿠폰을 찾을 수 없습니다 | 존재하지 않는 쿠폰 ID |
| `ALREADY_ISSUED` | 이미 발급받은 쿠폰입니다 | 1인 1매 제한 위반 |
| `COUPON_SOLD_OUT` | 쿠폰이 모두 소진되었습니다 | 발급 가능 수량 소진 |

**에러 응답 예시**

```json
{
  "success": false,
  "error": {
    "code": "COUPON_SOLD_OUT",
    "message": "쿠폰이 모두 소진되었습니다"
  },
  "timestamp": "2025-10-30T10:00:00Z"
}
```


---

### GET /coupons/my

사용자가 보유한 쿠폰 목록을 조회합니다.

#### 관련 스토리
- [US-COUP-03](user-stories.md#us-coup-03-보유-쿠폰-조회): 보유 쿠폰 조회
- [US-COUP-04](user-stories.md#us-coup-04-유효한-쿠폰만-사용): 유효 쿠폰 사용

#### 요청

**Query Parameters**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| `status` | string | ❌ | - | 쿠폰 상태 필터 (AVAILABLE, USED, EXPIRED) |

**요청 예시**

```http
GET /api/v1/coupons/my?status=AVAILABLE
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 응답

**Success (200 OK)**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "user-coupon-001",
        "coupon": {
          "id": "coupon-001",
          "name": "10% 할인 쿠폰",
          "discountRate": 10,
          "minAmount": 50000,
          "issueStartDate": "2025-10-01T00:00:00Z",
          "issueEndDate": "2025-10-31T23:59:59Z",
          "totalQuantity": 100,
          "issuedQuantity": 100
        },
        "status": "AVAILABLE",
        "expiresAt": "2025-11-30T23:59:59Z",
        "issuedAt": "2025-10-30T10:00:00Z"
      },
      {
        "id": "user-coupon-002",
        "coupon": {
          "id": "coupon-002",
          "name": "20% 할인 쿠폰",
          "discountRate": 20,
          "minAmount": 100000,
          "issueStartDate": "2025-10-01T00:00:00Z",
          "issueEndDate": "2025-10-31T23:59:59Z",
          "totalQuantity": 50,
          "issuedQuantity": 50
        },
        "status": "USED",
        "expiresAt": "2025-11-30T23:59:59Z",
        "issuedAt": "2025-10-29T14:00:00Z",
        "usedAt": "2025-10-30T09:00:00Z"
      }
    ],
    "availableCount": 1,
    "totalCount": 2
  },
  "timestamp": "2025-10-30T10:00:00Z"
}
```

**Success - 쿠폰이 없는 경우 (200 OK)**

```json
{
  "success": true,
  "data": {
    "items": [],
    "availableCount": 0,
    "totalCount": 0
  },
  "timestamp": "2025-10-30T10:00:00Z"
}
```

**Error Responses**

| 에러 코드 | 메시지 | 조건 |
|----------|--------|------|


---

## EPIC-5: 데이터 연동

주문 완료 후 외부 데이터 플랫폼으로 데이터를 전송하는 시스템 동작입니다.

### 개요

EPIC-5는 공개 API 엔드포인트가 없으며, 내부 시스템 동작으로 구현됩니다.

#### 관련 스토리
- [US-DATA-01](user-stories.md#us-data-01-주문-데이터-전송): 주문 데이터 전송
- [US-DATA-02](user-stories.md#us-data-02-전송-실패-재시도): 전송 실패 재시도

### 시스템 동작

#### 1. Outbox Pattern 구현

**트리거**: 주문 상태가 COMPLETED로 변경될 때

**동작 흐름**:
1. 주문 트랜잭션 내에서 Outbox 테이블에 전송 데이터 저장
2. 트랜잭션 커밋
3. 별도 Worker가 Outbox 테이블을 폴링 (PENDING 상태)
4. 외부 데이터 플랫폼으로 HTTP POST 전송
5. 전송 성공 시 Outbox 상태를 SUCCESS로 변경
6. 전송 실패 시 Outbox 상태를 FAILED로 변경

**Outbox 데이터 구조**:

```json
{
  "orderId": "order-001",
  "orderData": {
    "orderId": "order-001",
    "userId": "user-001",
    "items": [
      {
        "productId": "prod-001",
        "optionId": "opt-001",
        "quantity": 2,
        "unitPrice": 89000
      }
    ],
    "finalAmount": 160200,
    "orderDate": "2025-10-30T10:00:00Z"
  },
  "status": "PENDING",
  "attemptCount": 0,
  "createdAt": "2025-10-30T10:05:00Z"
}
```

#### 2. 외부 API 호출 명세

**엔드포인트**: (외부 플랫폼에서 제공)

**Method**: POST

**Request Body**:

```json
{
  "orderId": "order-001",
  "userId": "user-001",
  "items": [
    {
      "productId": "prod-001",
      "optionId": "opt-001",
      "quantity": 2,
      "unitPrice": 89000
    }
  ],
  "finalAmount": 160200,
  "orderDate": "2025-10-30T10:00:00Z"
}
```

**응답**:
- **Success (200 OK)**: 전송 성공
- **Error (4xx, 5xx)**: 전송 실패 (재시도 대기)

#### 3. 재시도 전략

**재시도 조건**: Outbox 상태가 FAILED인 경우

**재시도 전략**: Exponential Backoff
- 1차 재시도: 1분 후
- 2차 재시도: 2분 후 (누적 3분)
- 3차 재시도: 4분 후 (누적 7분)

**최대 재시도 횟수**: 3회

**최종 실패 처리**:
- Outbox 상태를 `FAILED_PERMANENT`로 변경
- 모니터링 시스템으로 알림 발송


---

## 데이터 스키마

### 공통 DTO 정의

#### PaginatedResponse<T>

```typescript
interface PaginatedResponse<T> {
  success: true
  data: {
    items: T[]                 // 페이지네이션된 아이템 목록
    pagination: PaginationMeta // 페이지네이션 메타데이터
  }
  timestamp: string            // ISO 8601 형식
}
```

#### PaginationMeta

```typescript
interface PaginationMeta {
  page: number         // 현재 페이지 (1부터 시작)
  limit: number        // 페이지 크기
  totalItems: number   // 전체 아이템 수
  totalPages: number   // 전체 페이지 수
  hasNext: boolean     // 다음 페이지 존재 여부
  hasPrev: boolean     // 이전 페이지 존재 여부
}
```

#### ErrorResponse

```typescript
interface ErrorResponse {
  success: false
  error: {
    code: string        // 에러 코드
    message: string     // 에러 메시지
    details?: object    // 추가 정보 (선택)
  }
  timestamp: string     // ISO 8601 형식
}
```

### User 관련 DTO

#### User

```typescript
interface User {
  id: string    // 사용자 ID
  name: string  // 사용자 이름
}
```

### Category 관련 DTO

#### Category

```typescript
interface Category {
  id: string    // 카테고리 ID
  name: string  // 카테고리명
}
```

**참고**: 카테고리는 단일 계층(depth 1) 구조로 설계됩니다. 카테고리 간 계층 관계는 없습니다.

### 상품 관련 DTO

#### ProductListItem

```typescript
interface ProductListItem {
  id: string            // 상품 ID
  name: string          // 상품명
  price: number         // 가격 (원 단위)
  categoryId: string    // 카테고리 ID
  categoryName: string  // 카테고리명
  hasStock: boolean     // 재고 유무
  createdAt: string     // 생성일 (ISO 8601)
}
```

**사용**: `PaginatedResponse<ProductListItem>` (GET /products)

#### ProductDetail

```typescript
interface ProductDetail {
  id: string            // 상품 ID
  name: string          // 상품명
  price: number         // 가격
  description: string   // 상품 설명
  categoryId: string    // 카테고리 ID
  categoryName: string  // 카테고리명
  hasStock: boolean     // 재고 유무
  hasOptions: boolean   // 옵션 존재 여부
  createdAt: string     // 생성일
  updatedAt: string     // 수정일
}
```

#### ProductOption

```typescript
interface ProductOption {
  id: string              // 옵션 ID
  productId: string       // 상품 ID
  type: string            // 옵션 타입 (예: "색상", "사이즈")
  name: string            // 옵션명 (예: "빨강", "S")
  additionalPrice: number // 추가 가격
  hasStock: boolean       // 재고 유무
}
```

> **Note**: 옵션은 `type` 필드로 그룹화됩니다. UI에서는 동일한 `type`을 가진 옵션들을 함께 표시합니다.

#### PopularProductItem

```typescript
interface PopularProductItem {
  rank: number          // 순위
  product: {
    id: string          // 상품 ID
    name: string        // 상품명
    price: number       // 가격
    categoryName: string // 카테고리명
  }
  salesCount: number    // 판매 수량
  salesAmount: number   // 매출액
}
```

### 장바구니 관련 DTO

#### CartItem

```typescript
interface CartItem {
  id: string              // 장바구니 항목 ID
  productId: string       // 상품 ID
  productName: string     // 상품명
  productPrice: number    // 상품 가격
  optionId: string | null // 옵션 ID
  optionName: string | null // 옵션명
  additionalPrice: number // 옵션 추가 가격
  quantity: number        // 수량
  subtotal: number        // 소계 ((상품가격 + 추가가격) × 수량)
  hasStock: boolean       // 재고 유무
  createdAt: string       // 추가일
}
```

#### Cart

```typescript
interface Cart {
  items: CartItem[]     // 장바구니 항목 목록
  totalAmount: number   // 총 금액
  itemCount: number     // 항목 수
}
```

### 주문 관련 DTO

#### OrderItem

```typescript
interface OrderItem {
  productId: string           // 상품 ID
  productName: string         // 상품명 (스냅샷)
  optionId: string | null     // 옵션 ID
  optionName: string | null   // 옵션명 (스냅샷)
  quantity: number            // 수량
  productPrice: number        // 상품 가격 (스냅샷)
  optionAdditionalPrice: number // 옵션 추가 가격 (스냅샷)
  unitPrice: number           // 단가 (productPrice + optionAdditionalPrice)
  subtotal: number            // 소계 (unitPrice × quantity)
}
```

#### Coupon

```typescript
interface Coupon {
  id: string            // 쿠폰 ID
  name: string          // 쿠폰명
  discountRate: number  // 할인율 (%)
  minAmount?: number    // 최소 주문 금액 (선택)
  issueStartDate: string // 발급 시작일 (ISO 8601)
  issueEndDate: string   // 발급 종료일 (ISO 8601)
  totalQuantity: number  // 총 발급 가능 수량
  issuedQuantity: number // 현재 발급된 수량
}
```

#### Order

```typescript
interface Order {
  id: string                  // 주문 ID
  userId: string              // 사용자 ID
  status: OrderStatus         // 주문 상태
  items: OrderItem[]          // 주문 항목 목록
  totalAmount: number         // 총 상품 금액
  discountAmount: number      // 할인 금액
  finalAmount: number         // 최종 결제 금액
  coupon?: Coupon             // 사용 쿠폰 (선택)
  payment?: {
    paidAt: string            // 결제 일시
    method: string            // 결제 수단
  }
  reservationExpiresAt?: string // 재고 예약 만료 시간 (PENDING 상태)
  createdAt: string           // 주문 생성일
  updatedAt: string           // 주문 수정일
}
```

#### OrderStatus

```typescript
enum OrderStatus {
  PENDING = "PENDING",       // 결제 대기
  COMPLETED = "COMPLETED",   // 결제 완료
  FAILED = "FAILED",         // 결제 실패
  CANCELLED = "CANCELLED",   // 주문 취소
  EXPIRED = "EXPIRED"        // 재고 예약 만료
}
```

#### OrderListItem

```typescript
interface OrderListItem {
  id: string            // 주문 ID
  status: OrderStatus   // 주문 상태
  totalAmount: number   // 총 상품 금액
  finalAmount: number   // 최종 결제 금액
  itemCount: number     // 주문 항목 수
  createdAt: string     // 주문 생성일
}
```

**사용**: `PaginatedResponse<OrderListItem>` (GET /orders)

### 쿠폰 관련 DTO

#### UserCoupon

```typescript
interface UserCoupon {
  id: string            // 사용자 쿠폰 ID
  userId: string        // 사용자 ID
  coupon: Coupon        // 쿠폰 정보
  status: CouponStatus  // 쿠폰 상태
  expiresAt: string     // 만료일
  issuedAt: string      // 발급일
  usedAt?: string       // 사용일 (선택)
}
```

#### CouponStatus

```typescript
enum CouponStatus {
  AVAILABLE = "AVAILABLE", // 사용 가능
  USED = "USED",           // 사용 완료
  EXPIRED = "EXPIRED"      // 만료
}
```

---

## 요구사항 추적 매트릭스

모든 기능 요구사항(FR)과 사용자 스토리(US)가 API 엔드포인트로 구현되었는지 추적합니다.

### EPIC-1: 상품 탐색

| 요구사항 ID | 사용자 스토리 ID | API 엔드포인트 | HTTP 메서드 |
|------------|----------------|---------------|------------|
| FR-PROD-01 | US-PROD-01 | `/products` | GET |
| FR-PROD-02 | US-PROD-02 | `/products/{id}` | GET |
| FR-PROD-03 | US-PROD-03 | `/products/{id}/options` | GET |
| FR-PROD-04 | US-PROD-04 | `/products` (with sortBy) | GET |
| FR-PROD-05 | US-PROD-05 | `/products/popular` | GET |

### EPIC-2: 장바구니 관리

| 요구사항 ID | 사용자 스토리 ID | API 엔드포인트 | HTTP 메서드 |
|------------|----------------|---------------|------------|
| FR-CART-01 | US-CART-01 | `/carts/items` | POST |
| FR-CART-02 | US-CART-02 | `/carts/items/{id}` | PATCH |
| FR-CART-03 | US-CART-03 | `/carts/items/{id}` | DELETE |
| FR-CART-04 | US-CART-04 | `/carts` | GET |
| FR-CART-05 | US-CART-05 | `/carts` (totalAmount 포함) | GET |
| FR-CART-06 | US-CART-06 | `/carts` | DELETE |

### EPIC-3: 주문 및 결제

| 요구사항 ID | 사용자 스토리 ID | API 엔드포인트 | HTTP 메서드 |
|------------|----------------|---------------|------------|
| FR-ORDER-01 | US-ORDER-01 | `/orders` | POST |
| FR-ORDER-02 | US-ORDER-02 | `/orders` (재고 예약 포함) | POST |
| FR-ORDER-03 | US-ORDER-03 | `/orders` (쿠폰 적용 포함) | POST |
| FR-ORDER-04 | US-ORDER-04 | `/orders/{id}`, `/orders` | GET |
| FR-ORDER-05 | US-ORDER-04 | `/orders`, `/orders/{id}` | GET |
| FR-PAYMENT-01 | US-PAY-01 | `/orders/{id}/payment` | POST |
| FR-PAYMENT-02 | US-PAY-01 | `/orders/{id}/payment` (재고 차감) | POST |
| FR-PAYMENT-03 | US-PAY-02, US-PAY-04 | `/orders/{id}/cancel`, 시스템 배치 | POST |
| FR-PAYMENT-04 | US-PAY-03 | `/orders/{id}/payment` (재시도) | POST |

### EPIC-4: 쿠폰 활용

| 요구사항 ID | 사용자 스토리 ID | API 엔드포인트 | HTTP 메서드 |
|------------|----------------|---------------|------------|
| FR-COUPON-01 | US-COUP-01 | `/coupons/{id}/issue` | POST |
| FR-COUPON-02 | US-COUP-01 | `/coupons/{id}/issue` (수량 제한) | POST |
| FR-COUPON-03 | US-COUP-02 | `/coupons/{id}/issue` (중복 방지) | POST |
| FR-COUPON-04 | US-COUP-04 | `/orders` (쿠폰 검증 포함) | POST |
| FR-COUPON-05 | US-COUP-03 | `/coupons/my` | GET |

### EPIC-5: 데이터 연동

| 요구사항 ID | 사용자 스토리 ID | 구현 방식 | 트리거 |
|------------|----------------|----------|--------|
| FR-DATA-01 | US-DATA-01 | Outbox Pattern | 주문 COMPLETED |
| FR-DATA-02 | US-DATA-01 | Outbox 트랜잭션 분리 | 주문 COMPLETED |
| FR-DATA-03 | US-DATA-02 | 배치 워커 재시도 | FAILED 상태 |
| FR-DATA-04 | US-DATA-02 | Outbox 이력 테이블 | 모든 전송 시도 |

---

## 관련 문서

- **이전**: [← 사용자 스토리](user-stories.md)
- **다음**: [데이터 모델 →](data-model.md)
- **요구사항**: [요구사항 분석](requirements.md)
- **Issue**: [Issue #002](../../issue/issue002.md)

---

**버전 이력**:

- 1.1.0 (2025-11-02): 피드백 반영 - API 응답 구조 및 DTO 업데이트
  - 옵션 API 응답 구조 변경 (optionGroups → options with type field)
  - ProductOption DTO 업데이트 (type 필드 추가, groupId 제거)
  - ProductOptionGroup DTO 제거
  - 재고 "확보" → "예약" 용어 변경
  - OrderStatus EXPIRED 설명 업데이트
- 1.0.0 (2025-10-30): 초기 API 명세서 작성
  - 15개 API 엔드포인트 정의
  - 25개 사용자 스토리 매핑 완료
  - 공통 응답 형식 및 에러 코드 표준화
  - 데이터 스키마 정의
