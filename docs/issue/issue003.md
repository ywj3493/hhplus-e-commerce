# Issue #003: Data Model Design and ERD Documentation

## Issue Information

- **Issue Number**: #003
- **Type**: Documentation
- **Status**: Completed
- **Created**: 2025-10-31
- **Completed**: 2025-11-02

---

## Problem Statement

Following the completion of API specification documentation (Issue #002), the next critical step is to design the database schema and create Entity-Relationship Diagrams (ERD). This document will serve as the blueprint for implementing the persistence layer, defining all entities, relationships, constraints, and performance optimization strategies.

The data model must support all functional requirements from the 25 user stories while ensuring data integrity, optimal query performance, and proper concurrency control for critical operations like inventory management and coupon issuance.

---

## Objectives

1. Design comprehensive database schema for all 5 Epics
2. Create Entity-Relationship Diagrams using Mermaid notation
3. Define indexing strategy for query performance optimization
4. Specify concurrency control mechanisms (pessimistic locking)
5. Document Outbox pattern implementation for external data integration
6. Establish database constraints and validation rules
7. Create traceability from API endpoints to database entities

---

## Work Completed

### 1. Data Model Documentation

**File Location**: `/docs/dev/dashboard/data-model.md`

**Contents**:

#### Database Entities Overview

Designed 12 core entities organized by domain:

**1. User Domain (1 entity)**
- `User` - User account and authentication information

**2. Product Domain (5 entities)**
- `Category` - Single-level product categories
- `Product` - Product master data
- `ProductOptionGroup` - Option group definitions (e.g., Color, Size)
- `ProductOption` - Individual option values
- `Stock` - Inventory management per product/option

**3. Shopping Cart Domain (2 entities)**
- `Cart` - Shopping cart container
- `CartItem` - Individual items in cart

**4. Order Domain (4 entities)**
- `Order` - Order master data
- `OrderItem` - Line items in order
- `StockReservation` - Inventory reservation with 10-minute timeout
- `Payment` - Payment transaction records

**5. Coupon Domain (2 entities)**
- `Coupon` - Coupon master data (campaigns)
- `UserCoupon` - User-specific coupon ownership

**6. Data Integration Domain (1 entity)**
- `DataTransmission` - Outbox pattern for external system integration

**Related User Stories**: All 25 user stories (US-PROD-01 through US-DATA-02)

#### Entity-Relationship Diagrams

Created comprehensive Mermaid ERD diagrams showing:
- Entity relationships with cardinality
- Primary and foreign key relationships
- One-to-Many and Many-to-One associations
- Cascading delete behaviors

#### Detailed Entity Specifications

For each of the 12 entities, documented:
- All columns with data types
- Primary key definitions
- Foreign key relationships
- NOT NULL constraints
- UNIQUE constraints
- DEFAULT values
- Enum type definitions (OrderStatus, PaymentStatus, etc.)
- Business rules and validation logic
- Relationship descriptions

#### Indexing Strategy

Defined indexes for optimal query performance:

**Query Performance Indexes**:
- `Product.categoryId` - Category filtering
- `Product.createdAt` - Sort by newest products
- `Order.userId, Order.status` - User order history
- `CartItem.userId` - Cart retrieval
- `UserCoupon.userId` - User's coupon list

**Statistical Query Indexes**:
- `Order.status, Order.paidAt` - Popular products calculation
- `OrderItem.productId` - Product sales volume
- `StockReservation.reservedAt` - Expired reservation cleanup

**Composite Indexes**:
- `(userId, status)` on Order table
- `(productId, optionId)` on Stock table
- `(userId, couponId)` on UserCoupon table

#### Concurrency Control Strategy

**Pessimistic Locking (SELECT FOR UPDATE)**:
- `Stock` table - Inventory deduction and reservation
- `Coupon` table - Coupon issuance (first-come-first-served)
- Transaction isolation level: READ COMMITTED (PostgreSQL default)

**Critical Sections**:
1. Inventory reservation during order creation
2. Coupon issuance from limited-quantity campaigns
3. Payment processing with inventory updates

#### Inventory Reservation Timeout

**10-Minute Timeout Mechanism**:
- `StockReservation` table tracks reserved inventory
- `reservedAt` timestamp for expiration check
- Batch job runs every 1 minute to restore expired reservations
- Status transitions: RESERVED → CONFIRMED (on payment) or EXPIRED (timeout)

#### Outbox Pattern Implementation

**DataTransmission Entity**:
- Stores order data pending external transmission
- Status flow: PENDING → SUCCESS / FAILED
- Retry strategy: Exponential backoff (1min, 2min, 4min intervals)
- Maximum 3 retry attempts
- Separate batch job processes outbox queue

### 2. Requirements Traceability

Created mapping from database entities to:
- Functional Requirements (FR-*)
- User Stories (US-*)
- API Endpoints

**Coverage Verification**:
- All 26 functional requirements supported
- All 25 user stories implemented
- All 15 API endpoints backed by entities

### 3. Data Integrity Rules

**Foreign Key Constraints**:
- CASCADE DELETE: User → Cart, User → UserCoupon
- RESTRICT DELETE: Category → Product (prevent orphaned products)
- SET NULL: Coupon → Order (allow coupon deletion without breaking orders)

**Validation Rules**:
- Stock quantity >= 0 (CHECK constraint)
- Coupon maxUsageCount >= issuedCount
- Order totalAmount = SUM(OrderItem amounts)
- Payment amount matches Order totalAmount

### 4. Performance Considerations

**Query Optimization**:
- Popular products cache: Refresh every 10 minutes
- Category-based filtering: Index on Product.categoryId
- User order history: Composite index (userId, createdAt DESC)

**Write Performance**:
- Batch reservation expiration: Process 1000 records per batch
- Outbox pattern: Async processing to avoid blocking API responses
- Stock updates: Minimize lock duration with optimized queries

---

## Acceptance Criteria

- [x] data-model.md document created in correct location
- [x] All 12 database entities documented with complete specifications
- [x] Each entity includes:
  - [x] Table name and description
  - [x] All columns with data types and constraints
  - [x] Primary key definition
  - [x] Foreign key relationships
  - [x] Unique constraints
  - [x] NOT NULL constraints
  - [x] DEFAULT values
  - [x] Enum definitions where applicable
- [x] Mermaid ERD diagrams created for entity relationships
- [x] Indexing strategy documented with justification
- [x] Concurrency control mechanisms specified
- [x] Inventory reservation timeout logic documented
- [x] Outbox pattern implementation detailed
- [x] Foreign key cascade behavior defined
- [x] Requirements traceability matrix completed
- [x] Document follows project language policy (Korean for specs)
- [x] Navigation links work correctly (prev: api-specification.md, next: sequence-diagrams.md)
- [x] issue003.md document completed

---

## Deliverables

1. **`/docs/dev/dashboard/data-model.md`** - Complete data model specification
   - Entity-Relationship Diagrams
   - Detailed entity specifications
   - Indexing strategy
   - Concurrency control mechanisms
   - Outbox pattern documentation
   - Requirements traceability

2. **`/docs/issue/issue003.md`** - Issue tracking document (this file)
   - Work summary and progress tracking
   - Links to deliverables

---

## Design Considerations

### 1. Database Schema Design Principles

**Normalization**:
- Applied 3rd Normal Form (3NF) to minimize data redundancy
- Separate tables for entities with independent lifecycles
- Avoided data duplication except for performance-critical denormalization

**Entity Naming Conventions**:
- Singular nouns for table names (User, Product, Order)
- Past tense for timestamp columns (createdAt, updatedAt, deletedAt)
- Status suffix for enum columns (orderStatus, paymentStatus)

**Prisma ORM Compatibility**:
- All entities designed for Prisma schema generation
- Relationship definitions follow Prisma conventions
- Index names follow Prisma auto-generation patterns

### 2. Performance Optimization Strategy

**Indexing Strategy**:
- Primary key indexes (auto-created by database)
- Foreign key indexes for JOIN performance
- Composite indexes for multi-column queries
- Covering indexes for frequently accessed columns

**Query Patterns**:
- Product list: Category filtering + pagination → Index on categoryId
- Popular products: Aggregate query on OrderItem → Index on (productId, createdAt)
- User orders: Filter by userId + status → Composite index
- Cart retrieval: Single-user cart → Index on userId

### 3. Concurrency Control Requirements

**Critical Operations**:

1. **Inventory Management**:
   - Problem: Multiple users ordering same product simultaneously
   - Solution: Pessimistic lock (SELECT FOR UPDATE) on Stock table
   - Transaction scope: Read stock → Reserve → Update quantity

2. **Coupon Issuance**:
   - Problem: Limited-quantity coupons over-issued
   - Solution: Pessimistic lock (SELECT FOR UPDATE) on Coupon table
   - Transaction scope: Check availability → Increment count → Create UserCoupon

3. **Payment Processing**:
   - Problem: Double payment or inventory inconsistency
   - Solution: Transaction with optimistic locking on Order status
   - Transaction scope: Validate order → Create payment → Update inventory

**Transaction Isolation Level**:
- Database default: READ COMMITTED
- Prevents dirty reads while maintaining good concurrency
- Pessimistic locks provide additional protection for critical sections

### 4. Inventory Reservation Mechanism

**Requirements**:
- US-ORDER-02: 10-minute timeout for inventory reservation
- US-PAY-04: Auto-expire orders after timeout

**Implementation**:

1. **StockReservation Table**:
   - Links Order to reserved Stock quantities
   - Tracks reservation timestamp (reservedAt)
   - Status: RESERVED → CONFIRMED (payment) / EXPIRED (timeout)

2. **Batch Job for Expiration**:
   - Runs every 1 minute
   - Query: `SELECT * FROM StockReservation WHERE status='RESERVED' AND reservedAt < NOW() - INTERVAL '10 minutes'`
   - Actions:
     - Update StockReservation status to EXPIRED
     - Restore Stock quantity
     - Update Order status to EXPIRED

3. **Performance Considerations**:
   - Index on (status, reservedAt) for efficient expiration queries
   - Process in batches to avoid long-running transactions
   - Use UPDATE with WHERE clause to minimize locks

### 5. Outbox Pattern for Data Integration

**Requirements**:
- US-DATA-01: Send order data to external platform
- US-DATA-02: Retry failed transmissions

**Implementation**:

1. **DataTransmission Table**:
   - Stores outbound messages to external systems
   - Columns: orderId, payload (JSON), status, retryCount, lastAttemptAt
   - Status flow: PENDING → SUCCESS / FAILED

2. **Retry Strategy**:
   - Exponential backoff: 1 minute, 2 minutes, 4 minutes
   - Maximum 3 attempts (retryCount <= 3)
   - Mark as FAILED after max attempts

3. **Batch Processing**:
   - Separate worker process reads PENDING messages
   - Attempts external API call
   - Updates status based on response
   - Independent of main API response flow (async)

**Benefits**:
- Decouples external API failures from order creation
- Ensures at-least-once delivery
- Provides audit trail for data transmission
- Enables manual retry or debugging

### 6. Data Integrity Constraints

**Foreign Key Behaviors**:

| Parent Table | Child Table | Delete Behavior | Reason |
|--------------|-------------|-----------------|---------|
| User | Cart | CASCADE | Cart is user-specific, should be deleted with user |
| User | UserCoupon | CASCADE | User's coupons are meaningless without user |
| User | Order | RESTRICT | Prevent user deletion if orders exist (audit) |
| Category | Product | RESTRICT | Prevent category deletion if products exist |
| Product | CartItem | CASCADE | Remove cart items when product deleted |
| Product | OrderItem | RESTRICT | Preserve order history even if product deleted |
| Coupon | UserCoupon | CASCADE | Remove issued coupons when campaign deleted |
| Order | OrderItem | CASCADE | Order items belong to order lifecycle |
| Order | Payment | CASCADE | Payment records belong to order |

**CHECK Constraints**:
- `Stock.quantity >= 0` - Prevent negative inventory
- `Coupon.maxUsageCount >= Coupon.issuedCount` - Prevent over-issuance
- `Product.price > 0` - Ensure positive pricing
- `OrderItem.quantity > 0` - Minimum 1 item per line

**UNIQUE Constraints**:
- `User.email` - Email uniqueness for login
- `(userId, productId, optionId)` on CartItem - One entry per product/option in cart
- `(userId, couponId)` on UserCoupon - One coupon per user

---

## Next Steps

- **Issue #004**: Sequence Diagram Documentation
  - Design interaction flows for each Epic
  - Document pessimistic locking sequences
  - Illustrate error handling paths
  - Visualize batch job processes

- **Issue #005**: Prisma Schema Implementation
  - Translate data model to Prisma schema
  - Generate TypeScript types
  - Create database migration scripts

---

## References

- [Issue #001](issue001.md) - Requirements Analysis and User Stories
- [Issue #002](issue002.md) - API Specification (predecessor)
- [Requirements Document](../dev/dashboard/requirements.md)
- [User Stories Document](../dev/dashboard/user-stories.md)
- [API Specification Document](../dev/dashboard/api-specification.md)
- [Project Policy](../policy.md)
- [CLAUDE.md](../../CLAUDE.md)

---

## Notes

- Database design follows 3rd Normal Form for data integrity
- All entities compatible with Prisma ORM conventions
- Pessimistic locking strategy documented for inventory and coupon operations
- 10-minute timeout for inventory reservations implemented via batch job
- Outbox pattern ensures reliable external data transmission
- Index strategy optimized for common query patterns
- Foreign key cascade behaviors carefully chosen to balance data integrity and audit requirements
