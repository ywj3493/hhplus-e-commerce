# Issue #003: ERD 설계 (Data Model Design)

**Status**: In Progress
**Created**: 2025-10-31
**Branch**: `docs/003`
**Labels**: documentation, database, design

---

## 목표 (Objective)

E-Commerce Backend Service의 데이터베이스 스키마를 설계하고 ERD(Entity-Relationship Diagram)를 작성합니다. 성능 최적화를 위한 인덱스 전략과 동시성 제어를 위한 락 메커니즘을 포함합니다.

---

## 배경 (Background)

[Issue #002](issue002.md)에서 API 명세를 완성했으며, 이제 데이터베이스 스키마 설계가 필요합니다. 다음 요구사항을 충족해야 합니다:

1. **성능 최적화**: 인기 상품 통계, 카테고리별 조회 등 빈번한 쿼리 최적화
2. **동시성 처리**: 재고 관리, 쿠폰 발급 시 정확한 수량 제어
3. **데이터 무결성**: 외래 키, NOT NULL, UNIQUE 제약 조건 적용
4. **확장성**: Prisma ORM과 호환되는 스키마 설계

---

## 범위 (Scope)

### In Scope
- ✅ 사용자 기능 관련 엔티티 (상품, 장바구니, 주문, 쿠폰)
- ✅ 재고 관리 및 확보 메커니즘
- ✅ 외부 데이터 전송을 위한 Outbox 패턴
- ✅ 인덱스 설계 (성능 최적화)
- ✅ 동시성 제어 전략 (비관적 락)
- ✅ Mermaid ERD 다이어그램

### Out of Scope
- ❌ Admin 기능 엔티티 (별도 이슈로 분리 예정)
- ❌ Prisma 스키마 파일 작성 (후속 이슈)
- ❌ 데이터베이스 마이그레이션 스크립트

---

## 주요 엔티티 (Key Entities)

### 1. 사용자 및 인증
- `User` - 사용자 정보

### 2. 상품 관리
- `Category` - 카테고리 (단일 계층)
- `Product` - 상품 정보
- `ProductOptionGroup` - 옵션 그룹 (색상, 사이즈 등)
- `ProductOption` - 개별 옵션
- `Stock` - 재고 정보 (상품별/옵션별)

### 3. 장바구니
- `Cart` - 장바구니
- `CartItem` - 장바구니 항목

### 4. 주문 및 결제
- `Order` - 주문 정보
- `OrderItem` - 주문 항목
- `StockReservation` - 재고 확보 (10분 타임아웃)
- `Payment` - 결제 정보

### 5. 쿠폰
- `Coupon` - 쿠폰 마스터
- `UserCoupon` - 사용자별 쿠폰

### 6. 데이터 연동
- `DataTransmission` - Outbox 패턴 (외부 전송)

---

## 설계 고려사항 (Design Considerations)

### 1. 인덱스 전략
- **조회 성능**:
  - `Product.categoryId` (카테고리별 조회)
  - `Product.createdAt` (최신순 정렬)
  - `Order.userId, Order.status` (사용자별 주문 조회)
  - `CartItem.userId` (장바구니 조회)
- **통계 쿼리**:
  - `Order.status, Order.paidAt` (인기 상품 통계)
  - `OrderItem.productId` (상품별 판매 수량)

### 2. 동시성 제어
- **비관적 락 (Pessimistic Lock)**:
  - `Stock` 테이블: 재고 차감/확보 시 `SELECT FOR UPDATE`
  - `Coupon` 테이블: 쿠폰 발급 시 `SELECT FOR UPDATE`
- **트랜잭션 격리 수준**: READ COMMITTED (PostgreSQL 기본값)

### 3. 재고 확보 타임아웃
- `StockReservation` 테이블로 재고 확보 관리
- `reservedAt` 컬럼으로 10분 만료 체크
- 배치 작업으로 1분마다 만료된 확보 자동 복원

### 4. Outbox Pattern
- `DataTransmission` 테이블로 외부 전송 데이터 관리
- `status`: PENDING → SUCCESS / FAILED
- 재시도 전략: Exponential Backoff (1분, 2분, 4분)

---

## 참고 문서 (References)

- [요구사항 분석](../dev/dashboard/requirements.md)
- [사용자 스토리](../dev/dashboard/user-stories.md)
- [API 명세서](../dev/dashboard/api-specification.md)
- [과제 문서](../reference/assignment/assignment02.md)

---

## 작업 목록 (Tasks)

- [x] Issue 문서 작성
- [ ] `data-model.md` 파일 생성
- [ ] Mermaid ERD 다이어그램 작성
- [ ] 엔티티별 상세 설명 작성 (컬럼, 타입, 제약조건)
- [ ] 인덱스 전략 문서화
- [ ] 동시성 제어 전략 문서화
- [ ] 관계 설명 및 다이어그램 검증

---

## 체크리스트 (Checklist)

### 필수 요구사항
- [ ] 모든 API 엔드포인트가 지원하는 엔티티 정의
- [ ] 재고 동시성 제어 방안 포함
- [ ] 쿠폰 발급 수량 관리 방법 포함
- [ ] 인기 상품 통계를 위한 인덱스 설정
- [ ] Outbox 패턴 엔티티 설계

### 품질 기준
- [ ] Mermaid ERD 다이어그램 가독성
- [ ] 모든 엔티티에 대한 상세 설명
- [ ] 외래 키 관계 명확성
- [ ] 인덱스 전략의 타당성

---

## 다음 단계 (Next Steps)

1. **Issue #004**: Prisma 스키마 작성
2. **Issue #005**: 데이터베이스 마이그레이션 전략

---

**관련 링크**:
- Issue #001: [요구사항 분석 및 유스케이스 작성](issue001.md)
- Issue #002: [API 명세서 작성](issue002.md)
