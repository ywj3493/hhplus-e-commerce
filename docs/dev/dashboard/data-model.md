# 데이터 모델 (Data Model)

**버전**: 1.0.0
**최종 수정**: 2025-10-31
**상태**: Active

---

## 문서 네비게이션

**이전**: [← API 명세서](api-specification.md)
**다음**: [시퀀스 다이어그램 →](sequence-diagrams.md)

---

## 목차

1. [개요](#개요)
2. [엔티티 목록](#엔티티-목록)
3. [ERD 다이어그램](#erd-다이어그램)
4. [엔티티 상세 설명](#엔티티-상세-설명)
5. [관계 설명](#관계-설명)
6. [인덱스 전략](#인덱스-전략)
7. [동시성 제어 전략](#동시성-제어-전략)
8. [성능 최적화 전략](#성능-최적화-전략)

---

## 개요

본 문서는 E-Commerce Backend Service의 데이터베이스 스키마를 정의합니다. 모든 엔티티는 [요구사항 분석](requirements.md), [사용자 스토리](user-stories.md), [API 명세서](api-specification.md)를 기반으로 설계되었습니다.

### 설계 원칙

1. **정규화**: 제3정규형(3NF) 준수하여 데이터 중복 최소화
2. **성능 최적화**: 빈번한 쿼리를 위한 인덱스 설계
3. **동시성 제어**: 비관적 락을 통한 재고 및 쿠폰 수량 관리
4. **데이터 무결성**: 외래 키, NOT NULL, UNIQUE, CHECK 제약 조건
5. **확장성**: Prisma ORM과 호환되는 스키마 구조

### 데이터베이스

- **DBMS**: PostgreSQL (권장) 또는 MySQL
- **문자 인코딩**: UTF-8
- **Collation**: UTF-8 기본 정렬

---

## 엔티티 목록

### 1. 사용자 및 인증
| 엔티티 | 설명 | 관계 |
|--------|------|------|
| `User` | 사용자 정보 | Cart, Order, UserCoupon |

### 2. 상품 관리
| 엔티티 | 설명 | 관계 |
|--------|------|------|
| `Category` | 카테고리 (단일 계층) | Product |
| `Product` | 상품 정보 | Category, ProductOptionGroup, Stock |
| `ProductOptionGroup` | 옵션 그룹 (색상, 사이즈 등) | Product, ProductOption |
| `ProductOption` | 개별 옵션 | ProductOptionGroup, Stock |
| `Stock` | 재고 정보 (상품별/옵션별) | Product, ProductOption |

### 3. 장바구니
| 엔티티 | 설명 | 관계 |
|--------|------|------|
| `Cart` | 장바구니 | User, CartItem |
| `CartItem` | 장바구니 항목 | Cart, Product, ProductOption |

### 4. 주문 및 결제
| 엔티티 | 설명 | 관계 |
|--------|------|------|
| `Order` | 주문 정보 | User, OrderItem, Payment, UserCoupon |
| `OrderItem` | 주문 항목 | Order, Product, ProductOption |
| `StockReservation` | 재고 확보 (10분 타임아웃) | Order, Stock |
| `Payment` | 결제 정보 | Order |

### 5. 쿠폰
| 엔티티 | 설명 | 관계 |
|--------|------|------|
| `Coupon` | 쿠폰 마스터 | UserCoupon |
| `UserCoupon` | 사용자별 쿠폰 | User, Coupon, Order |

### 6. 데이터 연동
| 엔티티 | 설명 | 관계 |
|--------|------|------|
| `DataTransmission` | Outbox 패턴 (외부 전송) | Order |

**총 엔티티 수**: 15개

---

## ERD 다이어그램

### Overview: 도메인 간 관계

전체 시스템의 도메인 구조와 주요 관계를 보여줍니다.

```mermaid
erDiagram
    %% 도메인별 핵심 엔티티만 표시
    User ||--o| Cart : "has"
    User ||--o{ Order : "places"
    User ||--o{ UserCoupon : "owns"

    Category ||--o{ Product : "contains"
    Product ||--o{ Stock : "has"

    Cart ||--o{ CartItem : "contains"
    CartItem }o--|| Product : "references"

    Order ||--o{ OrderItem : "contains"
    Order ||--o| Payment : "has"
    Order ||--o{ StockReservation : "reserves"
    Order }o--o| UserCoupon : "uses"
    OrderItem }o--|| Product : "references"

    StockReservation }o--|| Stock : "reserves"

    Coupon ||--o{ UserCoupon : "issued to"

    Order ||--o{ DataTransmission : "sends"
```

### 1. 사용자 도메인 (User Domain)

사용자 정보를 관리하는 엔티티입니다.

```mermaid
erDiagram
    User {
        string id PK "사용자 ID (UUID)"
        string name "사용자 이름"
        timestamp createdAt "생성일시"
        timestamp updatedAt "수정일시"
    }

    User ||--o| Cart : "has (1:1)"
    User ||--o{ Order : "places (1:N)"
    User ||--o{ UserCoupon : "owns (1:N)"
```

### 2. 상품 도메인 (Product Domain)

상품, 카테고리, 옵션, 재고를 관리하는 엔티티 그룹입니다.

```mermaid
erDiagram
    Category {
        string id PK
        string name UK
        timestamp createdAt
        timestamp updatedAt
    }

    Product {
        string id PK
        string name
        string description
        decimal price
        string categoryId FK
        boolean hasOptions
        timestamp createdAt
        timestamp updatedAt
    }

    ProductOptionGroup {
        string id PK
        string productId FK
        string name
        timestamp createdAt
        timestamp updatedAt
    }

    ProductOption {
        string id PK
        string groupId FK
        string name
        decimal additionalPrice
        timestamp createdAt
        timestamp updatedAt
    }

    Stock {
        string id PK
        string productId FK
        string optionId FK
        int quantity
        timestamp updatedAt
    }

    Category ||--o{ Product : "contains (1:N)"
    Product ||--o{ ProductOptionGroup : "has (1:N)"
    Product ||--o{ Stock : "has (1:N)"
    ProductOptionGroup ||--o{ ProductOption : "contains (1:N)"
    ProductOption ||--o{ Stock : "has (1:N)"
```

**주요 제약조건**:

- `Stock.quantity >= 0` (CHECK)
- `Stock (productId, optionId)` UNIQUE
- `Category.name` UNIQUE
- 동시성 제어: `SELECT FOR UPDATE` on Stock

### 3. 장바구니 도메인 (Cart Domain)

장바구니와 장바구니 항목을 관리하는 엔티티 그룹입니다.

```mermaid
erDiagram
    User {
        string id PK
    }

    Cart {
        string id PK
        string userId FK
        timestamp createdAt
        timestamp updatedAt
    }

    CartItem {
        string id PK
        string cartId FK
        string productId FK
        string optionId FK
        int quantity
        timestamp createdAt
        timestamp updatedAt
    }

    Product {
        string id PK
    }

    ProductOption {
        string id PK
    }

    User ||--o| Cart : "has (1:1)"
    Cart ||--o{ CartItem : "contains (1:N)"
    CartItem }o--|| Product : "references (N:1)"
    CartItem }o--o| ProductOption : "references (N:1, optional)"
```

**주요 제약조건**:

- `Cart.userId` UNIQUE (사용자당 1개 장바구니)
- `CartItem (cartId, productId, optionId)` UNIQUE (중복 방지)
- `CartItem.quantity >= 1` (CHECK)

### 4. 주문 및 결제 도메인 (Order Domain)

주문, 결제, 재고 확보를 관리하는 엔티티 그룹입니다.

```mermaid
erDiagram
    User {
        string id PK
    }

    Order {
        string id PK
        string userId FK
        string status
        decimal totalAmount
        decimal discountAmount
        decimal finalAmount
        string userCouponId FK
        timestamp createdAt
        timestamp paidAt
        timestamp updatedAt
    }

    OrderItem {
        string id PK
        string orderId FK
        string productId FK
        string optionId FK
        string productName
        string optionName
        int quantity
        decimal unitPrice
        decimal subtotal
        timestamp createdAt
    }

    Payment {
        string id PK
        string orderId FK
        string method
        decimal amount
        timestamp paidAt
        timestamp createdAt
    }

    StockReservation {
        string id PK
        string orderId FK
        string stockId FK
        int quantity
        timestamp reservedAt
        timestamp expiresAt
    }

    Stock {
        string id PK
    }

    Product {
        string id PK
    }

    ProductOption {
        string id PK
    }

    UserCoupon {
        string id PK
    }

    User ||--o{ Order : "places (1:N)"
    Order ||--o{ OrderItem : "contains (1:N)"
    Order ||--o| Payment : "has (1:1)"
    Order ||--o{ StockReservation : "reserves (1:N)"
    Order }o--o| UserCoupon : "uses (N:1, optional)"
    OrderItem }o--|| Product : "references (N:1)"
    OrderItem }o--o| ProductOption : "references (N:1, optional)"
    StockReservation }o--|| Stock : "reserves (N:1)"
```

**주요 제약조건**:

- `Order.status` ENUM (PENDING, COMPLETED, FAILED, CANCELLED, EXPIRED)
- `Payment.orderId` UNIQUE (주문당 1개 결제)
- `StockReservation (orderId, stockId)` UNIQUE (주문-재고 조합 중복 방지)
- `StockReservation.expiresAt = reservedAt + 10분` (자동 만료)
- **스냅샷 패턴**: OrderItem에 상품 정보 저장

### 5. 쿠폰 도메인 (Coupon Domain)

쿠폰 마스터와 사용자별 쿠폰을 관리하는 엔티티 그룹입니다.

```mermaid
erDiagram
    User {
        string id PK
    }

    Coupon {
        string id PK
        string name
        int discountRate
        decimal minAmount
        timestamp issueStartDate
        timestamp issueEndDate
        int totalQuantity
        int issuedQuantity
        timestamp createdAt
        timestamp updatedAt
    }

    UserCoupon {
        string id PK
        string userId FK
        string couponId FK
        string status
        timestamp issuedAt
        timestamp expiresAt
        timestamp usedAt
        timestamp createdAt
    }

    Order {
        string id PK
    }

    User ||--o{ UserCoupon : "owns (1:N)"
    Coupon ||--o{ UserCoupon : "issued to (1:N)"
    UserCoupon ||--o{ Order : "used in (1:N)"
```

**주요 제약조건**:

- `Coupon.discountRate` 1-100 (CHECK)
- `Coupon.issuedQuantity <= totalQuantity` (애플리케이션 검증)
- `UserCoupon (userId, couponId)` UNIQUE (1인 1매)
- `UserCoupon.status` ENUM (AVAILABLE, USED, EXPIRED)
- 동시성 제어: `SELECT FOR UPDATE` on Coupon

### 6. 데이터 연동 도메인 (Data Transmission Domain)

외부 데이터 플랫폼 전송을 관리하는 엔티티입니다 (Outbox Pattern).

```mermaid
erDiagram
    Order {
        string id PK
    }

    DataTransmission {
        string id PK
        string orderId FK
        json payload
        string status
        int attemptCount
        timestamp createdAt
        timestamp sentAt
        timestamp updatedAt
    }

    Order ||--o{ DataTransmission : "sends (1:N)"
```

**주요 제약조건**:

- `DataTransmission.status` ENUM (PENDING, SUCCESS, FAILED, FAILED_PERMANENT)
- `DataTransmission.attemptCount >= 0` (CHECK)
- **재시도 전략**: Exponential Backoff (1분, 2분, 4분)
- **최대 재시도**: 3회

---

## 엔티티 상세 설명

### 1. User (사용자)

사용자 정보를 저장하는 엔티티입니다.

#### 컬럼

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
|--------|------------|---------|------|
| `id` | VARCHAR(36) | PRIMARY KEY | 사용자 ID (UUID) |
| `name` | VARCHAR(100) | NOT NULL | 사용자 이름 |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 생성일시 |
| `updatedAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 수정일시 |

#### 인덱스

```sql
-- 기본 키 (자동 생성)
PRIMARY KEY (id)
```

#### 관계

- **1:1** → Cart (한 사용자는 하나의 장바구니를 가짐)
- **1:N** → Order (한 사용자는 여러 주문을 생성)
- **1:N** → UserCoupon (한 사용자는 여러 쿠폰을 보유)

---

### 2. Category (카테고리)

상품 카테고리 정보를 저장하는 엔티티입니다. **단일 계층 구조**로 설계됩니다.

#### 컬럼

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
|--------|------------|---------|------|
| `id` | VARCHAR(36) | PRIMARY KEY | 카테고리 ID (UUID) |
| `name` | VARCHAR(50) | NOT NULL, UNIQUE | 카테고리명 |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 생성일시 |
| `updatedAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 수정일시 |

#### 인덱스

```sql
PRIMARY KEY (id)
-- UTF-8 대소문자 구분 없는 정렬 (PostgreSQL)
UNIQUE INDEX idx_category_name (name) WITH (COLLATE = "ucs_basic")
-- MySQL의 경우: UNIQUE INDEX idx_category_name (name) USING BTREE COLLATE utf8mb4_unicode_ci
```

#### 관계

- **1:N** → Product (한 카테고리는 여러 상품을 포함)

---

### 3. Product (상품)

상품 정보를 저장하는 엔티티입니다.

#### 컬럼

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
|--------|------------|---------|------|
| `id` | VARCHAR(36) | PRIMARY KEY | 상품 ID (UUID) |
| `name` | VARCHAR(200) | NOT NULL | 상품명 |
| `description` | TEXT | NULL | 상품 설명 |
| `price` | DECIMAL(10, 2) | NOT NULL, CHECK (price >= 0) | 가격 (원 단위) |
| `categoryId` | VARCHAR(36) | NOT NULL, FOREIGN KEY | 카테고리 ID |
| `hasOptions` | BOOLEAN | NOT NULL, DEFAULT FALSE | 옵션 존재 여부 |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 생성일시 |
| `updatedAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 수정일시 |

#### 인덱스

```sql
PRIMARY KEY (id)
-- idx_product_category는 복합 인덱스로 커버되므로 제거
INDEX idx_product_created_at (createdAt DESC)     -- 최신순 정렬
INDEX idx_product_category_created (categoryId, createdAt DESC)  -- 카테고리별 조회 + 복합
```

#### 관계

- **N:1** → Category (여러 상품은 하나의 카테고리에 속함)
- **1:N** → ProductOptionGroup (한 상품은 여러 옵션 그룹을 가질 수 있음)
- **1:N** → Stock (한 상품은 여러 재고 항목을 가질 수 있음)

#### 비즈니스 로직

- `hasOptions = true`일 경우, 장바구니 추가 시 `optionId` 필수
- **재고 유무 계산** (`hasStock`):
  ```sql
  -- 옵션이 없는 상품 (hasOptions = false)
  SELECT EXISTS(
    SELECT 1 FROM Stock
    WHERE productId = :productId AND optionId IS NULL AND quantity > 0
  ) AS hasStock;

  -- 옵션이 있는 상품 (hasOptions = true)
  SELECT EXISTS(
    SELECT 1 FROM Stock
    WHERE productId = :productId AND quantity > 0
  ) AS hasStock;
  ```

---

### 4. ProductOptionGroup (상품 옵션 그룹)

상품의 옵션 그룹(색상, 사이즈 등)을 저장하는 엔티티입니다.

#### 컬럼

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
|--------|------------|---------|------|
| `id` | VARCHAR(36) | PRIMARY KEY | 옵션 그룹 ID (UUID) |
| `productId` | VARCHAR(36) | NOT NULL, FOREIGN KEY | 상품 ID |
| `name` | VARCHAR(50) | NOT NULL | 옵션 그룹명 (예: "색상", "사이즈") |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 생성일시 |
| `updatedAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 수정일시 |

#### 인덱스

```sql
PRIMARY KEY (id)
INDEX idx_option_group_product (productId)
```

#### 관계

- **N:1** → Product (여러 옵션 그룹은 하나의 상품에 속함)
- **1:N** → ProductOption (한 옵션 그룹은 여러 옵션을 포함)

---

### 5. ProductOption (상품 옵션)

개별 옵션 정보를 저장하는 엔티티입니다.

#### 컬럼

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
|--------|------------|---------|------|
| `id` | VARCHAR(36) | PRIMARY KEY | 옵션 ID (UUID) |
| `groupId` | VARCHAR(36) | NOT NULL, FOREIGN KEY | 옵션 그룹 ID |
| `name` | VARCHAR(50) | NOT NULL | 옵션명 (예: "빨강", "S") |
| `additionalPrice` | DECIMAL(10, 2) | NOT NULL, CHECK (additionalPrice >= 0) | 추가 가격 |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 생성일시 |
| `updatedAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 수정일시 |

#### 인덱스

```sql
PRIMARY KEY (id)
INDEX idx_option_group (groupId)
```

#### 관계

- **N:1** → ProductOptionGroup (여러 옵션은 하나의 옵션 그룹에 속함)
- **1:N** → Stock (한 옵션은 여러 재고 항목을 가질 수 있음)

---

### 6. Stock (재고)

상품 및 옵션별 재고 수량을 저장하는 엔티티입니다.

#### 컬럼

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
|--------|------------|---------|------|
| `id` | VARCHAR(36) | PRIMARY KEY | 재고 ID (UUID) |
| `productId` | VARCHAR(36) | NOT NULL, FOREIGN KEY | 상품 ID |
| `optionId` | VARCHAR(36) | NULL, FOREIGN KEY | 옵션 ID (NULL 가능) |
| `quantity` | INT | NOT NULL, CHECK (quantity >= 0) | 재고 수량 |
| `updatedAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 수정일시 |

#### 인덱스

```sql
PRIMARY KEY (id)
-- NULL 안전 UNIQUE 제약 (PostgreSQL)
UNIQUE INDEX idx_stock_product_option (productId, COALESCE(optionId, ''))
-- MySQL의 경우: UNIQUE INDEX idx_stock_product_option (productId, IFNULL(optionId, ''))
INDEX idx_stock_product (productId)
```

#### NULL 처리

**중요**: `optionId`가 NULL일 수 있으므로, UNIQUE 제약에서 NULL을 빈 문자열로 변환하여 처리합니다.
- PostgreSQL: `COALESCE(optionId, '')`
- MySQL: `IFNULL(optionId, '')`

이를 통해 옵션이 없는 상품의 재고가 중복 생성되는 것을 방지합니다.

#### 관계

- **N:1** → Product (여러 재고 항목은 하나의 상품에 속함)
- **N:1** → ProductOption (여러 재고 항목은 하나의 옵션에 속함)

#### 동시성 제어

```sql
-- 재고 확보 시 비관적 락 사용
BEGIN;
SELECT * FROM Stock WHERE id = :stockId FOR UPDATE;
UPDATE Stock SET quantity = quantity - :quantity WHERE id = :stockId AND quantity >= :quantity;
COMMIT;
```

#### 비즈니스 로직

- `optionId = NULL`: 옵션이 없는 상품의 재고
- `optionId != NULL`: 특정 옵션의 재고
- **UNIQUE 제약**: (productId, optionId) 조합은 유일해야 함

#### TODO: 트리거 구현 필요

**Stock 음수 방지 트리거**:
동시성 제어 실패 시에도 재고가 음수가 되지 않도록 DB 레벨 트리거 구현이 필요합니다.

```sql
-- PostgreSQL 예시
CREATE TRIGGER trg_stock_quantity_check
BEFORE UPDATE ON Stock
FOR EACH ROW
EXECUTE FUNCTION check_stock_quantity();

CREATE FUNCTION check_stock_quantity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity < 0 THEN
    RAISE EXCEPTION 'Stock quantity cannot be negative: productId=%, quantity=%',
                    NEW.productId, NEW.quantity;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

이 트리거는 애플리케이션 레벨 검증 외에 추가 안전장치로 동작합니다.

---

### 7. Cart (장바구니)

사용자별 장바구니를 저장하는 엔티티입니다.

#### 컬럼

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
|--------|------------|---------|------|
| `id` | VARCHAR(36) | PRIMARY KEY | 장바구니 ID (UUID) |
| `userId` | VARCHAR(36) | NOT NULL, UNIQUE, FOREIGN KEY | 사용자 ID |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 생성일시 |
| `updatedAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 수정일시 |

#### 인덱스

```sql
PRIMARY KEY (id)
UNIQUE INDEX idx_cart_user (userId)  -- 사용자당 1개 장바구니
```

#### 관계

- **1:1** → User (한 사용자는 하나의 장바구니를 가짐)
- **1:N** → CartItem (한 장바구니는 여러 항목을 포함)

---

### 8. CartItem (장바구니 항목)

장바구니에 담긴 상품 항목을 저장하는 엔티티입니다.

#### 컬럼

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
|--------|------------|---------|------|
| `id` | VARCHAR(36) | PRIMARY KEY | 장바구니 항목 ID (UUID) |
| `cartId` | VARCHAR(36) | NOT NULL, FOREIGN KEY | 장바구니 ID |
| `productId` | VARCHAR(36) | NOT NULL, FOREIGN KEY | 상품 ID |
| `optionId` | VARCHAR(36) | NULL, FOREIGN KEY | 옵션 ID (NULL 가능) |
| `quantity` | INT | NOT NULL, CHECK (quantity >= 1) | 수량 |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 생성일시 |
| `updatedAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 수정일시 |

#### 인덱스

```sql
PRIMARY KEY (id)
INDEX idx_cart_item_cart (cartId)
-- NULL 안전 UNIQUE 제약 (PostgreSQL)
UNIQUE INDEX idx_cart_item_product_option (cartId, productId, COALESCE(optionId, ''))
-- MySQL의 경우: UNIQUE INDEX idx_cart_item_product_option (cartId, productId, IFNULL(optionId, ''))
```

#### NULL 처리

**중요**: `optionId`가 NULL일 수 있으므로, UNIQUE 제약에서 NULL을 빈 문자열로 변환하여 처리합니다.
이를 통해 옵션이 없는 동일 상품이 장바구니에 중복 추가되는 것을 방지합니다.

#### 관계

- **N:1** → Cart (여러 항목은 하나의 장바구니에 속함)
- **N:1** → Product (여러 항목은 하나의 상품을 참조)
- **N:1** → ProductOption (여러 항목은 하나의 옵션을 참조)

#### 비즈니스 로직

- 동일한 (cartId, productId, optionId) 조합은 수량만 증가
- `optionId = NULL`: 옵션이 없는 상품

---

### 9. Order (주문)

주문 정보를 저장하는 엔티티입니다.

#### 컬럼

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
|--------|------------|---------|------|
| `id` | VARCHAR(36) | PRIMARY KEY | 주문 ID (UUID) |
| `userId` | VARCHAR(36) | NOT NULL, FOREIGN KEY | 사용자 ID |
| `status` | ENUM | NOT NULL | 주문 상태 (PENDING, COMPLETED, FAILED, CANCELLED, EXPIRED) |
| `totalAmount` | DECIMAL(10, 2) | NOT NULL, CHECK (totalAmount >= 0) | 총 상품 금액 |
| `discountAmount` | DECIMAL(10, 2) | NOT NULL, DEFAULT 0, CHECK (discountAmount >= 0) | 할인 금액 |
| `finalAmount` | DECIMAL(10, 2) | NOT NULL, CHECK (finalAmount >= 0) | 최종 결제 금액 |
| `userCouponId` | VARCHAR(36) | NULL, FOREIGN KEY | 사용자 쿠폰 ID |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 생성일시 |
| `paidAt` | TIMESTAMP | NULL | 결제일시 |
| `updatedAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 수정일시 |

#### ENUM 정의

```sql
-- PostgreSQL
CREATE TYPE order_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- MySQL
-- ENUM('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED')
```

#### CHECK 제약

```sql
-- 금액 계산 정확성 보장
ALTER TABLE "Order" ADD CONSTRAINT chk_final_amount
CHECK (finalAmount = totalAmount - discountAmount);

-- 또는 Generated Column (PostgreSQL 12+)
-- finalAmount DECIMAL(10, 2) GENERATED ALWAYS AS (totalAmount - discountAmount) STORED
```

#### 인덱스

```sql
PRIMARY KEY (id)
INDEX idx_order_user_status (userId, status)      -- 사용자별 주문 조회
INDEX idx_order_created_at (createdAt DESC)       -- 최신순 정렬
INDEX idx_order_status_paid_at (status, paidAt)   -- 인기 상품 통계
```

#### 관계

- **N:1** → User (여러 주문은 하나의 사용자에 속함)
- **1:N** → OrderItem (한 주문은 여러 항목을 포함)
- **1:1** → Payment (한 주문은 하나의 결제 정보를 가짐)
- **1:N** → StockReservation (한 주문은 여러 재고 확보를 가질 수 있음)
- **N:1** → UserCoupon (여러 주문은 하나의 쿠폰을 사용할 수 있음)

#### 상태 전이

```
PENDING → COMPLETED  (결제 성공)
PENDING → FAILED     (결제 실패)
PENDING → EXPIRED    (10분 타임아웃)
PENDING → CANCELLED  (사용자 취소)
COMPLETED → CANCELLED (주문 취소)
```

#### TODO: 상태 전이 검증 트리거

잘못된 상태 전이(예: `COMPLETED → PENDING`)를 방지하기 위한 DB 레벨 트리거 구현이 필요합니다.

```sql
-- PostgreSQL 예시
CREATE TRIGGER trg_order_status_transition
BEFORE UPDATE ON "Order"
FOR EACH ROW
EXECUTE FUNCTION validate_order_status_transition();

CREATE FUNCTION validate_order_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- COMPLETED에서 PENDING으로 변경 불가
  IF OLD.status = 'COMPLETED' AND NEW.status = 'PENDING' THEN
    RAISE EXCEPTION 'Invalid status transition: COMPLETED -> PENDING';
  END IF;

  -- EXPIRED에서 다른 상태로 변경 불가
  IF OLD.status = 'EXPIRED' AND NEW.status != 'EXPIRED' THEN
    RAISE EXCEPTION 'Cannot change status from EXPIRED';
  END IF;

  -- FAILED에서 COMPLETED로 직접 변경 불가
  IF OLD.status = 'FAILED' AND NEW.status = 'COMPLETED' THEN
    RAISE EXCEPTION 'Invalid status transition: FAILED -> COMPLETED (must retry payment)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### 10. OrderItem (주문 항목)

주문에 포함된 상품 항목을 저장하는 엔티티입니다. **스냅샷 패턴**을 사용하여 주문 시점의 상품 정보를 저장합니다.

#### 컬럼

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
|--------|------------|---------|------|
| `id` | VARCHAR(36) | PRIMARY KEY | 주문 항목 ID (UUID) |
| `orderId` | VARCHAR(36) | NOT NULL, FOREIGN KEY | 주문 ID |
| `productId` | VARCHAR(36) | NOT NULL, FOREIGN KEY | 상품 ID (참조용) |
| `optionId` | VARCHAR(36) | NULL, FOREIGN KEY | 옵션 ID (참조용) |
| `productName` | VARCHAR(200) | NOT NULL | 상품명 (스냅샷) |
| `optionName` | VARCHAR(50) | NULL | 옵션명 (스냅샷) |
| `quantity` | INT | NOT NULL, CHECK (quantity >= 1) | 수량 |
| `productPrice` | DECIMAL(10, 2) | NOT NULL, CHECK (productPrice >= 0) | 상품 가격 (스냅샷) |
| `optionAdditionalPrice` | DECIMAL(10, 2) | NOT NULL, DEFAULT 0, CHECK (optionAdditionalPrice >= 0) | 옵션 추가 가격 (스냅샷) |
| `unitPrice` | DECIMAL(10, 2) | NOT NULL, CHECK (unitPrice >= 0) | 단가 (productPrice + optionAdditionalPrice) |
| `subtotal` | DECIMAL(10, 2) | NOT NULL, CHECK (subtotal >= 0) | 소계 (unitPrice × quantity) |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 생성일시 |

#### 인덱스

```sql
PRIMARY KEY (id)
INDEX idx_order_item_order (orderId)
INDEX idx_order_item_product (productId)  -- 인기 상품 통계
```

#### 관계

- **N:1** → Order (여러 항목은 하나의 주문에 속함)
- **N:1** → Product (여러 항목은 하나의 상품을 참조)
- **N:1** → ProductOption (여러 항목은 하나의 옵션을 참조)

#### 비즈니스 로직

- **스냅샷 패턴**: `productName`, `optionName`, `productPrice`, `optionAdditionalPrice` 필드는 주문 시점의 값을 저장
- `unitPrice`는 `productPrice + optionAdditionalPrice`로 계산됨
- 상품 정보가 변경되어도 주문 내역은 영향받지 않음
- 가격 분석 시 상품 가격과 옵션 가격을 개별적으로 추적 가능

---

### 11. StockReservation (재고 확보)

주문 생성 시 10분간 재고를 확보하는 엔티티입니다.

#### 컬럼

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
|--------|------------|---------|------|
| `id` | VARCHAR(36) | PRIMARY KEY | 재고 확보 ID (UUID) |
| `orderId` | VARCHAR(36) | NOT NULL, FOREIGN KEY | 주문 ID |
| `stockId` | VARCHAR(36) | NOT NULL, FOREIGN KEY | 재고 ID |
| `quantity` | INT | NOT NULL, CHECK (quantity >= 1) | 확보 수량 |
| `reservedAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 확보일시 |
| `expiresAt` | TIMESTAMP | NOT NULL | 만료일시 (reservedAt + 10분) |

#### 인덱스

```sql
PRIMARY KEY (id)
INDEX idx_reservation_order (orderId)
UNIQUE INDEX idx_reservation_order_stock (orderId, stockId)  -- 주문-재고 조합 중복 방지
INDEX idx_reservation_expires_at (expiresAt)  -- 만료 배치 작업
```

#### 관계

- **N:1** → Order (여러 확보는 하나의 주문에 속함)
- **N:1** → Stock (여러 확보는 하나의 재고를 참조)

#### 비즈니스 로직

- `expiresAt = reservedAt + INTERVAL '10 minutes'`
- 배치 작업(1분마다): `expiresAt < NOW()`인 확보를 자동 삭제 및 재고 복원

#### 동시성 제어: 배치 작업 vs 결제 경쟁 조건 해결

**문제**: 배치 작업이 재고 복원 중 사용자가 결제 요청 시 충돌 발생 가능

**해결 방안**:

```sql
-- 결제 프로세스에서 StockReservation 락 획득 및 만료 시간 재확인
BEGIN;

-- 1. StockReservation에 배타적 락 획득
SELECT * FROM StockReservation
WHERE orderId = :orderId
FOR UPDATE;

-- 2. 만료 시간 재확인 (배치 작업이 삭제하기 전)
IF expiresAt < NOW() THEN
  ROLLBACK;
  THROW 'RESERVATION_EXPIRED';
END IF;

-- 3. 결제 처리 (Payment INSERT, Order status UPDATE)
INSERT INTO Payment (...) VALUES (...);
UPDATE "Order" SET status = 'COMPLETED', paidAt = NOW() WHERE id = :orderId;

-- 4. 재고 차감 (Stock FOR UPDATE)
UPDATE Stock SET quantity = quantity - :quantity
WHERE id = :stockId;

-- 5. StockReservation 삭제
DELETE FROM StockReservation WHERE orderId = :orderId;

COMMIT;
```

**배치 작업**:
```sql
-- 배치 작업도 동일하게 FOR UPDATE 사용
BEGIN;

SELECT * FROM StockReservation
WHERE expiresAt < NOW()
FOR UPDATE SKIP LOCKED;  -- 이미 락된 행은 건너뜀

-- 재고 복원 및 삭제
UPDATE Stock SET quantity = quantity + reservation.quantity ...;
DELETE FROM StockReservation WHERE id IN (...);
UPDATE "Order" SET status = 'EXPIRED' WHERE id IN (...);

COMMIT;
```

**핵심**: `SKIP LOCKED`를 사용하여 결제 중인 Reservation은 건너뛰고, 결제는 만료 시간을 재확인합니다.

---

### 12. Payment (결제)

결제 정보를 저장하는 엔티티입니다.

#### 컬럼

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
|--------|------------|---------|------|
| `id` | VARCHAR(36) | PRIMARY KEY | 결제 ID (UUID) |
| `orderId` | VARCHAR(36) | NOT NULL, UNIQUE, FOREIGN KEY | 주문 ID |
| `method` | ENUM | NOT NULL | 결제 수단 (CARD, BANK_TRANSFER) |
| `amount` | DECIMAL(10, 2) | NOT NULL, CHECK (amount >= 0) | 결제 금액 |
| `paidAt` | TIMESTAMP | NOT NULL | 결제일시 |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 생성일시 |

#### ENUM 정의

```sql
-- PostgreSQL
CREATE TYPE payment_method AS ENUM ('CARD', 'BANK_TRANSFER');

-- MySQL
-- ENUM('CARD', 'BANK_TRANSFER')
```

#### 인덱스

```sql
PRIMARY KEY (id)
UNIQUE INDEX idx_payment_order (orderId)  -- 주문당 1개 결제
```

#### 관계

- **1:1** → Order (한 결제는 하나의 주문에 대응)

---

### 13. Coupon (쿠폰 마스터)

쿠폰 마스터 정보를 저장하는 엔티티입니다.

#### 컬럼

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
|--------|------------|---------|------|
| `id` | VARCHAR(36) | PRIMARY KEY | 쿠폰 ID (UUID) |
| `name` | VARCHAR(100) | NOT NULL | 쿠폰명 |
| `discountRate` | INT | NOT NULL, CHECK (discountRate BETWEEN 1 AND 100) | 할인율 (%) |
| `minAmount` | DECIMAL(10, 2) | NULL, CHECK (minAmount >= 0) | 최소 주문 금액 |
| `issueStartDate` | TIMESTAMP | NOT NULL | 발급 시작일 |
| `issueEndDate` | TIMESTAMP | NOT NULL | 발급 종료일 |
| `totalQuantity` | INT | NOT NULL, CHECK (totalQuantity >= 1) | 총 발급 가능 수량 |
| `issuedQuantity` | INT | NOT NULL, DEFAULT 0, CHECK (issuedQuantity >= 0) | 현재 발급된 수량 |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 생성일시 |
| `updatedAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 수정일시 |

#### 인덱스

```sql
PRIMARY KEY (id)
INDEX idx_coupon_issue_date (issueStartDate, issueEndDate)
```

#### CHECK 제약

```sql
-- 발급 수량 정합성 보장
ALTER TABLE Coupon ADD CONSTRAINT chk_issued_quantity
CHECK (issuedQuantity <= totalQuantity);
```

이 제약을 통해 애플리케이션 버그가 발생해도 `issuedQuantity > totalQuantity`가 되는 것을 DB 레벨에서 방지합니다.

#### 관계

- **1:N** → UserCoupon (한 쿠폰은 여러 사용자에게 발급)

#### 동시성 제어

```sql
-- 쿠폰 발급 시 비관적 락 사용
BEGIN;
SELECT * FROM Coupon WHERE id = :couponId FOR UPDATE;
UPDATE Coupon SET issuedQuantity = issuedQuantity + 1
WHERE id = :couponId AND issuedQuantity < totalQuantity;
COMMIT;
```

#### 비즈니스 로직

- `issuedQuantity <= totalQuantity` 제약 (애플리케이션 레벨)
- 1인 1매 제한은 `UserCoupon` 테이블에서 검증

---

### 14. UserCoupon (사용자 쿠폰)

사용자별로 발급된 쿠폰을 저장하는 엔티티입니다.

#### 컬럼

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
|--------|------------|---------|------|
| `id` | VARCHAR(36) | PRIMARY KEY | 사용자 쿠폰 ID (UUID) |
| `userId` | VARCHAR(36) | NOT NULL, FOREIGN KEY | 사용자 ID |
| `couponId` | VARCHAR(36) | NOT NULL, FOREIGN KEY | 쿠폰 ID |
| `status` | ENUM | NOT NULL | 쿠폰 상태 (AVAILABLE, USED, EXPIRED) |
| `issuedAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 발급일시 |
| `expiresAt` | TIMESTAMP | NOT NULL | 만료일시 |
| `usedAt` | TIMESTAMP | NULL | 사용일시 |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 생성일시 |

#### ENUM 정의

```sql
-- PostgreSQL
CREATE TYPE coupon_status AS ENUM ('AVAILABLE', 'USED', 'EXPIRED');

-- MySQL
-- ENUM('AVAILABLE', 'USED', 'EXPIRED')
```

#### 인덱스

```sql
PRIMARY KEY (id)
INDEX idx_user_coupon_user_status (userId, status)    -- 사용자별 쿠폰 조회
INDEX idx_user_coupon_expires_at (expiresAt)          -- 만료 배치 작업
UNIQUE INDEX idx_user_coupon_user_coupon (userId, couponId)  -- 1인 1매 제한
```

#### 관계

- **N:1** → User (여러 쿠폰은 하나의 사용자에게 발급)
- **N:1** → Coupon (여러 사용자 쿠폰은 하나의 쿠폰 마스터를 참조)
- **1:N** → Order (한 쿠폰은 여러 주문에서 사용될 수 없음 - 1회용)

#### 상태 전이

```
AVAILABLE → USED    (주문 생성 시)
AVAILABLE → EXPIRED (만료일 경과)
```

#### 비즈니스 로직

- **1인 1매**: (userId, couponId) UNIQUE 제약
- 배치 작업(1일 1회): `status = 'AVAILABLE' AND expiresAt < NOW()` → `status = 'EXPIRED'`

---

### 15. DataTransmission (데이터 전송 - Outbox)

외부 데이터 플랫폼으로 전송할 주문 데이터를 저장하는 엔티티입니다. **Outbox Pattern**을 사용합니다.

#### 컬럼

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
|--------|------------|---------|------|
| `id` | VARCHAR(36) | PRIMARY KEY | 전송 ID (UUID) |
| `orderId` | VARCHAR(36) | NOT NULL, FOREIGN KEY | 주문 ID |
| `payload` | JSON | NOT NULL | 전송 데이터 (JSON 형식) |
| `status` | ENUM | NOT NULL | 전송 상태 (PENDING, SUCCESS, FAILED, FAILED_PERMANENT) |
| `attemptCount` | INT | NOT NULL, DEFAULT 0, CHECK (attemptCount >= 0) | 시도 횟수 |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 생성일시 |
| `sentAt` | TIMESTAMP | NULL | 전송일시 |
| `updatedAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 수정일시 |

#### ENUM 정의

```sql
-- PostgreSQL
CREATE TYPE transmission_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'FAILED_PERMANENT');

-- MySQL
-- ENUM('PENDING', 'SUCCESS', 'FAILED', 'FAILED_PERMANENT')
```

#### 인덱스

```sql
PRIMARY KEY (id)
INDEX idx_transmission_status_created (status, createdAt)  -- 재시도 배치 작업
INDEX idx_transmission_order (orderId)
```

#### 관계

- **N:1** → Order (여러 전송은 하나의 주문을 참조)

#### 상태 전이

```
PENDING → SUCCESS           (전송 성공)
PENDING → FAILED            (전송 실패, attemptCount < 3)
FAILED → SUCCESS            (재시도 성공)
FAILED → FAILED_PERMANENT   (attemptCount >= 3)
```

#### 비즈니스 로직

- **Outbox Pattern**: 주문 트랜잭션 내에서 PENDING 상태로 삽입
- 배치 워커가 주기적으로 PENDING/FAILED 상태 데이터를 외부 전송
- **재시도 전략**: Exponential Backoff (1분, 2분, 4분)
- `attemptCount >= 3` 시 `FAILED_PERMANENT`로 변경 및 알림

---

## 관계 설명

### 1. User 관련 관계

```mermaid
erDiagram
    User ||--o| Cart : "has (1:1)"
    User ||--o{ Order : "places (1:N)"
    User ||--o{ UserCoupon : "owns (1:N)"
```

- **User → Cart (1:1)**: 사용자당 하나의 장바구니
- **User → Order (1:N)**: 사용자는 여러 주문 생성 가능
- **User → UserCoupon (1:N)**: 사용자는 여러 쿠폰 보유 가능

### 2. Product 관련 관계

```mermaid
erDiagram
    Category ||--o{ Product : "contains (1:N)"
    Product ||--o{ ProductOptionGroup : "has (1:N)"
    Product ||--o{ Stock : "has (1:N)"
    ProductOptionGroup ||--o{ ProductOption : "contains (1:N)"
    ProductOption ||--o{ Stock : "has (1:N)"
```

- **Category → Product (1:N)**: 카테고리는 여러 상품 포함
- **Product → ProductOptionGroup (1:N)**: 상품은 여러 옵션 그룹 보유
- **Product → Stock (1:N)**: 상품은 여러 재고 항목 보유 (옵션별)
- **ProductOptionGroup → ProductOption (1:N)**: 옵션 그룹은 여러 옵션 포함
- **ProductOption → Stock (1:N)**: 옵션별 재고 관리

### 3. Cart 관련 관계

```mermaid
erDiagram
    Cart ||--o{ CartItem : "contains (1:N)"
    CartItem }o--|| Product : "references (N:1)"
    CartItem }o--o| ProductOption : "references (N:1, optional)"
```

- **Cart → CartItem (1:N)**: 장바구니는 여러 항목 포함
- **CartItem → Product (N:1)**: 장바구니 항목은 하나의 상품 참조
- **CartItem → ProductOption (N:1, optional)**: 장바구니 항목은 옵션 참조 (선택)

### 4. Order 관련 관계

```mermaid
erDiagram
    Order ||--o{ OrderItem : "contains (1:N)"
    Order ||--o| Payment : "has (1:1)"
    Order ||--o{ StockReservation : "reserves (1:N)"
    Order }o--o| UserCoupon : "uses (N:1, optional)"
    OrderItem }o--|| Product : "references (N:1)"
    OrderItem }o--o| ProductOption : "references (N:1, optional)"
    StockReservation }o--|| Stock : "reserves (N:1)"
```

- **Order → OrderItem (1:N)**: 주문은 여러 항목 포함
- **Order → Payment (1:1)**: 주문당 하나의 결제
- **Order → StockReservation (1:N)**: 주문은 여러 재고 확보
- **Order → UserCoupon (N:1, optional)**: 주문은 쿠폰 사용 가능
- **OrderItem → Product (N:1)**: 주문 항목은 하나의 상품 참조
- **OrderItem → ProductOption (N:1, optional)**: 주문 항목은 옵션 참조 (선택)
- **StockReservation → Stock (N:1)**: 재고 확보는 하나의 재고 참조

### 5. Coupon 관련 관계

```mermaid
erDiagram
    Coupon ||--o{ UserCoupon : "issued to (1:N)"
```

- **Coupon → UserCoupon (1:N)**: 쿠폰은 여러 사용자에게 발급

### 6. DataTransmission 관련 관계

```mermaid
erDiagram
    Order ||--o{ DataTransmission : "sends (1:N)"
```

- **Order → DataTransmission (1:N)**: 주문은 여러 전송 시도 가능

---

## 인덱스 전략

### 1. 조회 성능 최적화

#### 상품 조회
```sql
-- 최신순 정렬 (단독 쿼리용)
INDEX idx_product_created_at (createdAt DESC)

-- 카테고리별 + 최신순 (복합 인덱스)
-- 주의: 이 인덱스가 있으면 idx_product_category는 불필요
INDEX idx_product_category_created (categoryId, createdAt DESC)
```

**최적화 노트**: `idx_product_category_created`는 첫 번째 컬럼이 `categoryId`이므로, 카테고리별 조회 쿼리에도 사용됩니다. 따라서 별도의 `idx_product_category` 인덱스는 중복입니다.

#### 장바구니 조회
```sql
-- 사용자별 장바구니 조회
UNIQUE INDEX idx_cart_user (userId)
INDEX idx_cart_item_cart (cartId)
```

#### 주문 조회
```sql
-- 사용자별 주문 조회
INDEX idx_order_user_status (userId, status)

-- 최신순 정렬
INDEX idx_order_created_at (createdAt DESC)
```

### 2. 통계 쿼리 최적화

#### 인기 상품 통계 (최근 3일)
```sql
-- Order 테이블
INDEX idx_order_status_paid_at (status, paidAt)

-- OrderItem 테이블
INDEX idx_order_item_product (productId)

-- 쿼리 예시
SELECT
  p.id,
  p.name,
  SUM(oi.quantity) AS sales_count,
  SUM(oi.subtotal) AS sales_amount
FROM Product p
JOIN OrderItem oi ON p.id = oi.productId
JOIN Order o ON oi.orderId = o.id
WHERE o.status = 'COMPLETED'
  AND o.paidAt >= NOW() - INTERVAL '3 days'
GROUP BY p.id, p.name
ORDER BY sales_count DESC
LIMIT 5;
```

### 3. 동시성 제어 인덱스

#### 재고 관리
```sql
-- 상품+옵션 조합 UNIQUE
UNIQUE INDEX idx_stock_product_option (productId, optionId)
```

#### 쿠폰 발급
```sql
-- 1인 1매 제한
UNIQUE INDEX idx_user_coupon_user_coupon (userId, couponId)
```

### 4. 배치 작업 인덱스

#### 재고 확보 만료
```sql
INDEX idx_reservation_expires_at (expiresAt)

-- 배치 쿼리
SELECT * FROM StockReservation
WHERE expiresAt < NOW();
```

#### 쿠폰 만료
```sql
INDEX idx_user_coupon_expires_at (expiresAt)

-- 배치 쿼리
UPDATE UserCoupon
SET status = 'EXPIRED'
WHERE status = 'AVAILABLE' AND expiresAt < NOW();
```

#### 외부 전송 재시도
```sql
INDEX idx_transmission_status_created (status, createdAt)

-- 배치 쿼리
SELECT * FROM DataTransmission
WHERE status IN ('PENDING', 'FAILED')
ORDER BY createdAt ASC;
```

---

## 동시성 제어 전략

### 1. 비관적 락 (Pessimistic Lock)

#### 재고 차감/확보

```sql
-- 트랜잭션 시작
BEGIN;

-- 재고 행에 배타적 락 획득
SELECT * FROM Stock
WHERE id = :stockId
FOR UPDATE;

-- 재고 확인 및 차감
UPDATE Stock
SET quantity = quantity - :quantity
WHERE id = :stockId AND quantity >= :quantity;

-- 결과 확인: affected rows = 0 → 재고 부족
IF affected_rows = 0 THEN
  ROLLBACK;
  THROW 'OUT_OF_STOCK';
END IF;

-- 재고 확보 기록
INSERT INTO StockReservation (orderId, stockId, quantity, reservedAt, expiresAt)
VALUES (:orderId, :stockId, :quantity, NOW(), NOW() + INTERVAL '10 minutes');

-- 트랜잭션 커밋
COMMIT;
```

**효과**:
- 다른 트랜잭션은 `SELECT FOR UPDATE`가 완료될 때까지 대기
- 100명이 동시 요청 시 순차적으로 처리되어 정확한 재고 수량 보장

#### 쿠폰 발급

```sql
-- 트랜잭션 시작
BEGIN;

-- 쿠폰 행에 배타적 락 획득
SELECT * FROM Coupon
WHERE id = :couponId
FOR UPDATE;

-- 중복 발급 확인 (1인 1매)
SELECT COUNT(*) FROM UserCoupon
WHERE userId = :userId AND couponId = :couponId;

IF count > 0 THEN
  ROLLBACK;
  THROW 'ALREADY_ISSUED';
END IF;

-- 쿠폰 발급 가능 여부 확인 및 수량 증가
UPDATE Coupon
SET issuedQuantity = issuedQuantity + 1
WHERE id = :couponId AND issuedQuantity < totalQuantity;

IF affected_rows = 0 THEN
  ROLLBACK;
  THROW 'COUPON_SOLD_OUT';
END IF;

-- 사용자 쿠폰 발급
INSERT INTO UserCoupon (userId, couponId, status, issuedAt, expiresAt)
VALUES (:userId, :couponId, 'AVAILABLE', NOW(), :expiresAt);

-- 트랜잭션 커밋
COMMIT;
```

**효과**:
- 100명이 100개 쿠폰을 동시 요청 시 정확히 100명만 발급 성공
- 1인 1매 제한 보장

### 2. 트랜잭션 격리 수준

#### PostgreSQL 기본 설정

```sql
-- 기본 격리 수준: READ COMMITTED
SHOW TRANSACTION ISOLATION LEVEL;
```

**READ COMMITTED의 장점**:
- Dirty Read 방지
- 적절한 동시성 보장
- 대부분의 동시성 문제 해결

#### 특수한 경우: SERIALIZABLE

```sql
-- 높은 정합성이 필요한 경우 (예: 금융 거래)
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- 트랜잭션 로직
COMMIT;
```

### 3. 낙관적 락 (Optimistic Lock) - 선택적 사용

#### 버전 컬럼 추가 (선택)

```sql
-- Stock 테이블에 version 컬럼 추가 (선택적)
ALTER TABLE Stock ADD COLUMN version INT NOT NULL DEFAULT 1;

-- 재고 차감 시 버전 확인
UPDATE Stock
SET quantity = quantity - :quantity, version = version + 1
WHERE id = :stockId AND version = :expectedVersion AND quantity >= :quantity;

IF affected_rows = 0 THEN
  THROW 'CONFLICT or OUT_OF_STOCK';
END IF;
```

**사용 시나리오**:
- 동시성이 낮고 충돌이 드문 경우
- 읽기가 많고 쓰기가 적은 경우

**본 프로젝트에서는 비관적 락 권장**:
- 재고 및 쿠폰은 동시성이 높은 리소스
- 정확한 수량 제어가 필수

### 4. 데드락 방지

#### 락 획득 순서 일관성

```sql
-- 나쁜 예: 순서가 다른 락 획득
-- Transaction A
SELECT * FROM Stock WHERE id = 'stock-001' FOR UPDATE;
SELECT * FROM Coupon WHERE id = 'coupon-001' FOR UPDATE;

-- Transaction B
SELECT * FROM Coupon WHERE id = 'coupon-001' FOR UPDATE;  -- Deadlock!
SELECT * FROM Stock WHERE id = 'stock-001' FOR UPDATE;

-- 좋은 예: 항상 동일한 순서로 락 획득
-- 모든 트랜잭션은 Stock → Coupon 순서로 락 획득
```

#### 타임아웃 설정

```sql
-- PostgreSQL
SET lock_timeout = '5s';

-- MySQL
SET innodb_lock_wait_timeout = 5;
```

---

## 성능 최적화 전략

### 1. 캐싱 전략

#### 인기 상품 통계 캐싱

```typescript
// Redis 캐시 사용 예시
const POPULAR_PRODUCTS_KEY = 'popular_products:3days';
const CACHE_TTL = 15 * 60; // 15분

async function getPopularProducts() {
  // 캐시 조회
  const cached = await redis.get(POPULAR_PRODUCTS_KEY);
  if (cached) {
    return JSON.parse(cached);
  }

  // DB 조회
  const products = await db.query(`
    SELECT ... FROM Product ... (인기 상품 쿼리)
  `);

  // 캐시 저장
  await redis.setex(POPULAR_PRODUCTS_KEY, CACHE_TTL, JSON.stringify(products));

  return products;
}
```

**갱신 전략**:
- TTL: 15분
- 배치 작업: 10분마다 백그라운드 갱신
- API 응답: 캐시 우선, 만료 시 DB 조회

#### 상품 정보 캐싱

```typescript
// 상품 상세 정보 캐싱
const PRODUCT_KEY = (id: string) => `product:${id}`;
const PRODUCT_TTL = 60 * 60; // 1시간

async function getProductById(id: string) {
  const cached = await redis.get(PRODUCT_KEY(id));
  if (cached) {
    return JSON.parse(cached);
  }

  const product = await db.product.findUnique({ where: { id } });
  await redis.setex(PRODUCT_KEY(id), PRODUCT_TTL, JSON.stringify(product));

  return product;
}
```

### 2. 쿼리 최적화

#### N+1 문제 해결

```typescript
// 나쁜 예: N+1 쿼리
const orders = await db.order.findMany();
for (const order of orders) {
  const items = await db.orderItem.findMany({ where: { orderId: order.id } });
  // ...
}

// 좋은 예: JOIN 사용
const orders = await db.order.findMany({
  include: {
    items: true,
    payment: true,
    userCoupon: {
      include: { coupon: true }
    }
  }
});
```

#### 인덱스 힌트 사용

```sql
-- PostgreSQL
SELECT * FROM Product
WHERE categoryId = :categoryId
ORDER BY createdAt DESC
-- 인덱스 힌트 (필요 시)
;

-- MySQL
SELECT * FROM Product USE INDEX (idx_product_category_created)
WHERE categoryId = :categoryId
ORDER BY createdAt DESC;
```

### 3. 배치 처리 최적화

#### 벌크 연산

```sql
-- 나쁜 예: 개별 INSERT
INSERT INTO OrderItem (...) VALUES (...);  -- N번 실행

-- 좋은 예: 벌크 INSERT
INSERT INTO OrderItem (orderId, productId, quantity, ...)
VALUES
  (:orderId, :productId1, :quantity1, ...),
  (:orderId, :productId2, :quantity2, ...),
  (...);
```

#### 배치 작업 최적화

```typescript
// 재고 확보 만료 배치 (1분마다)
async function expireStockReservations() {
  const expired = await db.stockReservation.findMany({
    where: { expiresAt: { lt: new Date() } },
    include: { stock: true }
  });

  // 벌크 업데이트
  await db.$transaction([
    // 재고 복원
    db.stock.updateMany({
      where: { id: { in: expired.map(r => r.stockId) } },
      data: { quantity: { increment: /* 복원 수량 */ } }
    }),
    // 확보 삭제
    db.stockReservation.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    }),
    // 주문 상태 변경
    db.order.updateMany({
      where: { id: { in: expired.map(r => r.orderId) } },
      data: { status: 'EXPIRED' }
    })
  ]);
}
```

### 4. 커넥션 풀 최적화

```typescript
// Prisma 커넥션 풀 설정
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    }
  },
  // 커넥션 풀 설정
  // connection_limit=10
});
```

**권장 설정** (PostgreSQL):
- **최소 커넥션**: 5
- **최대 커넥션**: 20
- **타임아웃**: 30초

---

## 관련 문서

- **이전**: [← API 명세서](api-specification.md)
- **다음**: [시퀀스 다이어그램 →](sequence-diagrams.md)
- **요구사항**: [요구사항 분석](requirements.md)
- **사용자 스토리**: [사용자 스토리](user-stories.md)
- **Issue**: [Issue #003](../../issue/issue003.md)

---

**버전 이력**:
- 1.0.0 (2025-10-31): 초기 데이터 모델 문서 작성
  - 15개 엔티티 정의
  - Mermaid ERD 다이어그램 작성
  - 인덱스 전략 수립
  - 동시성 제어 전략 문서화
  - 성능 최적화 가이드 작성
