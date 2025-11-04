# Issue #006: Separate Use Case Documents into Business and Technical Perspectives

## Issue Information

- **Issue Number**: #006
- **Type**: Documentation / Refactoring
- **Status**: In Progress
- **Created**: 2025-11-03
- **Branch**: feature/006
- **Related Issues**: #005 (Architecture & Use Cases Documentation)

---

## Problem Statement

The current use case documents (`use-cases.md`) in each domain directory mix **business perspective** (what the system should do) with **technical perspective** (how the system implements it). This creates several issues:

### Current Problems

1. **Unclear Target Audience**
   - Product managers and domain experts need business flows
   - Developers need implementation details and technical design
   - Current documents try to serve both, making them lengthy and unfocused

2. **Mixed Abstraction Levels**
   - Business rules and user scenarios mixed with layer responsibilities
   - Actor interactions mixed with Repository interfaces and database transactions
   - Business flows mixed with Pessimistic Lock and Exponential Backoff strategies

3. **Maintenance Difficulty**
   - Changes in technical implementation require updating business-focused sections
   - Business requirement changes affect technical implementation sections
   - Document becomes too large (5000+ lines per domain)

### Example of Mixed Content

Current document structure:
```markdown
## UC-ORDER-01: 주문 생성
- Actor: Customer
- Main Flow: ...
- **Sequence Diagram** (with Presentation/Application/Domain/Infrastructure layers)
- **Layer Responsibilities** (Repository, Entity, Service)
- **Implementation Code** (TypeScript examples)
- **Transaction Strategy** (SQL queries)
```

This mixes **business scenario** (Main Flow) with **technical implementation** (Layers, Code, SQL).

---

## Objectives

### Primary Goals

1. **Separate Business and Technical Concerns**
   - `use-cases.md`: Focus on business flows, actors, and business rules
   - `sequence-diagrams.md`: Focus on technical design and implementation

2. **Improve Document Usability**
   - Product managers can read business use cases without technical jargon
   - Developers can focus on implementation details without business context clutter

3. **Enhance Maintainability**
   - Business changes only affect `use-cases.md`
   - Technical refactoring only affects `sequence-diagrams.md`
   - Each document can evolve independently

4. **Standardize Documentation**
   - Consistent structure across all 6 domains
   - Clear separation of concerns

---

## Document Separation Strategy

### A. use-cases.md (Business Perspective)

**Target Audience**: Product Managers, Business Analysts, Domain Experts, QA

**Purpose**: Define **what** the system should do from a user's perspective

**Content**:
- **Basic Information**: Use Case ID, Name, Actor, Goal
- **Pre-conditions**: What must be true before the use case starts
- **Main Flow**: Step-by-step happy path (business actions only)
- **Alternative Flows**: Exception scenarios and error cases
- **Post-conditions**: What is true after the use case completes
- **Business Rules**: Domain-specific rules and constraints
- **UI Flow**: User interface interactions (if applicable)
- **Related User Stories**: Traceability to requirements

**Excluded**:
- ❌ Layered architecture (Presentation/Application/Domain/Infrastructure)
- ❌ Sequence diagrams with technical components
- ❌ Repository interfaces, Entity definitions
- ❌ Code examples (TypeScript, SQL)
- ❌ Transaction strategies, concurrency control
- ❌ Performance optimization (indexes, caching)

**Writing Style**:
- Use business language (avoid technical jargon)
- Focus on user actions and system responses
- Describe "what" happens, not "how" it's implemented

---

### B. sequence-diagrams.md (Technical Perspective)

**Target Audience**: Developers, Architects, DevOps

**Purpose**: Define **how** the system implements use cases technically

**Content**:
- **Layered Architecture Flow**: Sequence diagrams showing all 4 layers
- **Component Responsibilities**: Detailed explanation per layer
  - Presentation Layer: Controller, DTO, Validation
  - Application Layer: Use Case, Transaction Management
  - Domain Layer: Entity, Domain Service, Repository Interface
  - Infrastructure Layer: Repository Implementation, Database Access
- **Implementation Examples**: TypeScript code snippets
- **Transaction Boundaries**: Where transactions start/commit/rollback
- **Concurrency Control**: Pessimistic Lock, Optimistic Lock, FOR UPDATE
- **Error Handling**: Exception types and propagation
- **Performance Optimization**: Database indexes, caching strategies
- **Test Scenarios**: Unit tests, integration tests (code-based)

**Writing Style**:
- Use technical terminology
- Show actual code structures and patterns
- Focus on implementation details
- Include SQL queries, lock strategies, retry mechanisms

---

## Document Structure

### Before (Current)

```
/docs/dev/dashboard/
├── product/
│   └── use-cases.md (8000+ lines, mixed content)
├── cart/
│   └── use-cases.md (7000+ lines, mixed content)
└── ...
```

### After (Target)

```
/docs/dev/dashboard/
├── architecture.md
├── product/
│   ├── use-cases.md           # Business perspective (~2000 lines)
│   └── sequence-diagrams.md   # Technical perspective (~6000 lines)
├── cart/
│   ├── use-cases.md           # Business perspective (~2000 lines)
│   └── sequence-diagrams.md   # Technical perspective (~5000 lines)
├── order/
│   ├── use-cases.md
│   └── sequence-diagrams.md
├── payment/
│   ├── use-cases.md
│   └── sequence-diagrams.md
├── coupon/
│   ├── use-cases.md
│   └── sequence-diagrams.md
└── data/
    ├── use-cases.md
    └── sequence-diagrams.md
```

---

## Implementation Steps

### Phase 1: Create Issue Document
- [x] Create `issue006.md` with separation strategy

### Phase 2: Product Domain (Example/Template)
- [ ] Extract business content from `product/use-cases.md`
- [ ] Rewrite `product/use-cases.md` with business perspective only
- [ ] Create `product/sequence-diagrams.md` with technical content
- [ ] Update cross-references between documents

### Phase 3: Remaining Domains
Apply the same pattern to:
- [ ] Cart Domain: `cart/use-cases.md` + `cart/sequence-diagrams.md`
- [ ] Order Domain: `order/use-cases.md` + `order/sequence-diagrams.md`
- [ ] Payment Domain: `payment/use-cases.md` + `payment/sequence-diagrams.md`
- [ ] Coupon Domain: `coupon/use-cases.md` + `coupon/sequence-diagrams.md`
- [ ] Data Domain: `data/use-cases.md` + `data/sequence-diagrams.md`

### Phase 4: Update Cross-References
- [ ] Update `architecture.md` to reference both document types
- [ ] Update navigation links in all documents
- [ ] Verify all internal links work correctly

---

## Example: Order Domain Separation

### Before: order/use-cases.md (Mixed)

```markdown
## UC-ORDER-01: 주문 생성

### 기본 정보
- Actor: Customer
- Goal: 장바구니 상품으로 주문을 생성

### 시퀀스 다이어그램
[Mermaid diagram with Controller → UseCase → Repository → DB]

### 레이어별 책임
**Presentation Layer**: OrderController...
**Application Layer**: CreateOrderUseCase...
[6000 lines of technical details]
```

### After: order/use-cases.md (Business Only)

```markdown
## UC-ORDER-01: 주문 생성

### 기본 정보
- **Use Case ID**: UC-ORDER-01
- **Actor**: Customer
- **Goal**: 장바구니 상품으로 주문을 생성하고 재고를 예약한다

### Pre-conditions
- 고객이 로그인되어 있음
- 장바구니에 1개 이상의 상품이 있음
- 상품의 재고가 충분함

### Main Flow
1. 고객이 "주문하기" 버튼을 클릭한다
2. 시스템은 장바구니 상품 목록을 확인한다
3. 시스템은 각 상품의 재고를 확인하고 예약한다
4. [선택] 고객이 쿠폰을 선택한다
5. 시스템은 쿠폰 유효성을 검증한다
6. 시스템은 총 주문 금액을 계산한다 (쿠폰 할인 적용)
7. 시스템은 주문을 생성한다 (상태: PENDING)
8. 시스템은 주문 예약 만료 시간을 설정한다 (10분 후)
9. 시스템은 장바구니를 비운다
10. 시스템은 주문 상세 페이지를 표시한다

### Alternative Flows
**3a. 재고 부족**
- 3a1. 시스템은 "재고가 부족합니다" 오류 메시지를 표시한다
- 3a2. 주문 생성이 취소된다
- 3a3. Use case ends

**5a. 유효하지 않은 쿠폰**
- 5a1. 시스템은 "유효하지 않은 쿠폰입니다" 오류를 표시한다
- 5a2. 쿠폰 적용 없이 Main Flow 6단계로 진행한다

### Post-conditions
- 주문이 PENDING 상태로 생성됨
- 재고가 예약됨 (구매 가능 수량 감소)
- 장바구니가 비워짐
- 10분 내 결제 대기 상태

### Business Rules
- **BR-1**: 재고는 주문 생성 시 즉시 예약된다
- **BR-2**: 예약된 재고는 10분 후 자동으로 해제된다
- **BR-3**: 사용자당 쿠폰은 1회만 사용 가능하다
- **BR-4**: 쿠폰 할인은 총 주문 금액을 초과할 수 없다

### Related User Stories
- US-ORDER-01: 주문 생성
- US-CART-06: 주문 완료 후 장바구니 비우기
- US-COUPON-03: 주문 시 쿠폰 사용

### Related Requirements
- FR-ORDER-01: 주문 생성 및 재고 예약
- FR-ORDER-04: 재고 예약 타임아웃 (10분)

**기술 구현 상세**: [Order Sequence Diagrams](./sequence-diagrams.md)
```

### After: order/sequence-diagrams.md (Technical Only)

```markdown
# Order Domain - Sequence Diagrams & Technical Design

## UC-ORDER-01: 주문 생성 - Technical Implementation

### Overview
This document describes the technical implementation of Order Creation use case based on Layered Architecture.

### Layered Architecture Flow

```mermaid
sequenceDiagram
    participant Controller as OrderController<br/>(Presentation)
    participant UseCase as CreateOrderUseCase<br/>(Application)
    participant StockService as StockService<br/>(Domain)
    [Full technical sequence diagram]
```

### Layer Responsibilities

#### Presentation Layer
**Component**: `OrderController`
- HTTP request handling
- DTO validation
- Response transformation
[Implementation code examples]

#### Application Layer
**Component**: `CreateOrderUseCase`
- Transaction management
- Use case orchestration
[Implementation code examples]

[...continues with full technical details...]
```

---

## Acceptance Criteria

### Documentation Structure
- [ ] Issue #006 document created
- [ ] All 6 domains have both `use-cases.md` and `sequence-diagrams.md`
- [ ] Navigation links updated in all documents
- [ ] Cross-references between business and technical docs work

### Content Quality
- [ ] `use-cases.md` files contain NO technical jargon (Controller, Repository, Transaction)
- [ ] `use-cases.md` files use business language only
- [ ] `sequence-diagrams.md` files contain ALL technical implementation details
- [ ] No duplicate content between the two document types

### File Count
- **Created**: 7 files (1 issue + 6 sequence-diagrams.md)
- **Modified**: 6 files (6 use-cases.md files refined to business-only)
- **Total**: 13 file changes

---

## Benefits

### For Product Managers
- ✅ Clear business use cases without technical complexity
- ✅ Easy to validate against requirements
- ✅ Can be shared with non-technical stakeholders

### For Developers
- ✅ Focused technical design documents
- ✅ Implementation guidance without business context clutter
- ✅ Easier to maintain and update during refactoring

### For the Team
- ✅ Faster onboarding (read only relevant docs)
- ✅ Better collaboration (shared understanding with clear separation)
- ✅ Reduced documentation maintenance burden

---

## Checklist

### Per Domain Completion
For each domain (Product, Cart, Order, Payment, Coupon, Data):

- [ ] **use-cases.md** (Business)
  - [ ] Remove all sequence diagrams with layers
  - [ ] Remove layer responsibility sections
  - [ ] Remove code examples
  - [ ] Remove transaction/concurrency details
  - [ ] Keep only: Actor, Pre/Post-conditions, Main/Alt Flows, Business Rules
  - [ ] Add link to sequence-diagrams.md at the end

- [ ] **sequence-diagrams.md** (Technical) - NEW FILE
  - [ ] Create file with technical content from original use-cases.md
  - [ ] Include all sequence diagrams
  - [ ] Include layer responsibilities
  - [ ] Include implementation code examples
  - [ ] Include transaction strategies
  - [ ] Include concurrency control details
  - [ ] Include performance optimization
  - [ ] Include test scenarios

---

## References

### Related Documents
- [Architecture](../dev/dashboard/architecture.md) - Layered Architecture definition
- [Requirements](../dev/dashboard/requirements.md) - Business requirements
- [User Stories](../dev/dashboard/user-stories.md) - User scenarios
- [API Specification](../dev/dashboard/api-specification.md) - API contracts
- [Data Model](../dev/dashboard/data-model.md) - Database schema

### Current Use Case Documents (To Be Split)
- [Product Use Cases](../dev/dashboard/product/use-cases.md)
- [Cart Use Cases](../dev/dashboard/cart/use-cases.md)
- [Order Use Cases](../dev/dashboard/order/use-cases.md)
- [Payment Use Cases](../dev/dashboard/payment/use-cases.md)
- [Coupon Use Cases](../dev/dashboard/coupon/use-cases.md)
- [Data Use Cases](../dev/dashboard/data/use-cases.md)

---

## Deliverables

1. **Issue Document**: `issue006.md` (this file)
2. **Business Documents**: 6 refined `use-cases.md` files (business-only)
3. **Technical Documents**: 6 new `sequence-diagrams.md` files (technical-only)
4. **Updated Navigation**: Cross-references in all affected documents

---

## Notes

- This refactoring does NOT change any technical decisions or business requirements
- It only reorganizes existing content for better clarity and maintainability
- The separation follows industry best practices (BDD/Gherkin for business, UML/Sequence for technical)
- Both documents remain in Korean for consistency with existing docs

---

**Issue Status**: 🚧 **In Progress**

**Next Steps**:
1. Start with Product domain as template/example
2. Apply same pattern to remaining 5 domains
3. Update cross-references and navigation
4. Review and validate all documents
5. Create pull request referencing this issue

---
