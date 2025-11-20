# Issue #019: DB Integration Phase 1 - Environment Setup & User Domain

## Status
- **Created**: 2025-11-20
- **Branch**: `step7`
- **Type**: Infrastructure Implementation
- **Priority**: High

## Objective
Establish Prisma + MySQL infrastructure and complete User domain database integration as the foundation for subsequent domain integrations.

### Goals
1. Set up Prisma ORM with MySQL database
2. Configure Testcontainers for integration testing
3. Implement User domain Prisma repository
4. Validate end-to-end database operations

## Background
Current implementation uses InMemory repositories for all domains. To fulfill Assignment 04 requirements and prepare for production deployment, we need to integrate actual RDBMS (MySQL) using Prisma ORM.

This is Phase 1 of a multi-phase DB integration strategy:
- **Phase 1 (Issue #019)**: User domain ← **Current**
- **Phase 2 (Issue #020)**: Product + Category domains
- **Phase 3 (Issue #021)**: Coupon domain (concurrency control)
- **Phase 4 (Issue #022)**: Order + Cart + Payment domains
- **Phase 5 (Issue #023)**: DataTransmission + InMemory cleanup

## Technical Approach

### Technology Stack
- **ORM**: Prisma 5.x
- **Database**: MySQL 8.0
- **Testing**: Testcontainers (MySQL container)
- **Package Manager**: pnpm

### Why User Domain First?
1. **Simplest domain**: Single entity with no complex relationships
2. **Low dependency**: Other domains depend on User, not vice versa
3. **Learning curve**: Safe environment to establish Prisma patterns
4. **Foundation**: Sets up infrastructure for subsequent domains

## Tasks

### Task 1: Environment Setup
**Deliverables:**
- Prisma packages installed (`@prisma/client`, `prisma`)
- `prisma/schema.prisma` initialized
- MySQL datasource configured
- `.env` file with `DATABASE_URL`

**Acceptance Criteria:**
- `npx prisma --version` shows Prisma CLI version
- Schema file has correct MySQL datasource configuration

**Commit:**
```
chore: Prisma 및 MySQL 환경 설정

- @prisma/client, prisma 패키지 설치
- prisma/schema.prisma 초기 설정 (MySQL datasource)
- .env 파일에 DATABASE_URL 추가
- .env.example 업데이트
```

---

### Task 2: User Schema & Migration
**Deliverables:**
- User entity translated to Prisma schema
- Indexes defined for email (unique), createdAt
- Initial migration generated
- Prisma Client generated

**Schema Details:**
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  point     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([createdAt])
  @@map("users")
}
```

**Acceptance Criteria:**
- `prisma/migrations/` contains initial migration
- `npx prisma migrate dev` runs successfully
- Prisma Client generates User model types

**Commit:**
```
feat: User Prisma 스키마 및 Migration 추가

- User 엔티티를 Prisma 스키마로 변환
- email unique 인덱스, createdAt 인덱스 설정
- 초기 Migration 생성
- Prisma Client 생성
```

---

### Task 3: UserPrismaRepository Implementation
**Deliverables:**
- `src/user/infrastructure/repositories/user-prisma.repository.ts`
- `src/common/infrastructure/prisma/prisma.service.ts`
- `src/common/infrastructure/prisma/prisma.module.ts`
- DI configuration in `UserModule`

**Implementation Notes:**
- Implement `IUserRepository` interface
- Use Prisma Client for CRUD operations
- Map Prisma models to Domain entities
- Handle unique constraint violations (email)

**Key Methods:**
```typescript
class UserPrismaRepository implements IUserRepository {
  async save(user: User): Promise<void>
  async findById(userId: string): Promise<User | null>
  async findByEmail(email: string): Promise<User | null>
  async findAll(params: FindAllParams): Promise<User[]>
  async count(): Promise<number>
  async delete(userId: string): Promise<void>
}
```

**Acceptance Criteria:**
- All interface methods implemented
- Prisma entity → Domain entity mapping correct
- Error handling for database constraints
- Unit tests pass

**Commit:**
```
feat: UserPrismaRepository 구현

- PrismaService, PrismaModule 추가
- UserPrismaRepository 구현 (IUserRepository 인터페이스)
- Prisma 모델 ↔ Domain 엔티티 변환 로직
- UserModule에 Prisma Provider 등록
```

---

### Task 4: Integration Testing with Testcontainers
**Deliverables:**
- Testcontainers setup for MySQL
- `src/user/infrastructure/repositories/user-prisma.repository.integration.spec.ts`
- Test database lifecycle management

**Test Coverage:**
- User creation and retrieval
- Email uniqueness constraint
- Point updates
- Pagination and sorting
- Count queries

**Testcontainers Configuration:**
```typescript
const container = await new MySqlContainer('mysql:8.0')
  .withDatabase('test_db')
  .withUsername('test')
  .withPassword('test')
  .start();
```

**Acceptance Criteria:**
- All integration tests pass
- Tests run in isolated MySQL container
- Container cleanup after tests
- No test pollution between test cases

**Commit:**
```
test: User 도메인 Testcontainers 통합 테스트

- MySQL Testcontainer 설정
- UserPrismaRepository 통합 테스트 작성
- CRUD 연산, 제약조건, 페이지네이션 검증
- 테스트 격리 및 정리 로직
```

---

## Verification Checklist

### Functional Requirements
- [ ] User can be created with valid email
- [ ] Duplicate email throws error
- [ ] User can be retrieved by ID
- [ ] User can be retrieved by email
- [ ] User point can be updated
- [ ] User list supports pagination
- [ ] User can be deleted

### Non-Functional Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Prisma Client generates without errors
- [ ] Migration runs without errors
- [ ] No breaking changes to existing API

### Code Quality
- [ ] TypeScript types are correct
- [ ] Error handling is comprehensive
- [ ] Code follows project conventions
- [ ] No hardcoded values (use env vars)

## Testing Strategy

### Unit Tests
- Domain entity validation (existing)
- Repository method logic

### Integration Tests
- Database CRUD operations
- Constraint validations
- Transaction handling
- Concurrent operations

### Test Execution
```bash
# Run all tests
pnpm test

# Run integration tests only
pnpm test:integration

# Run with coverage
pnpm test:cov
```

## Migration Strategy

### Coexistence Period
During this phase, both InMemory and Prisma repositories will coexist:
- **InMemory**: Remains for backwards compatibility
- **Prisma**: New implementation for production

### DI Configuration
```typescript
// Development: Use InMemory
{ provide: IUserRepository, useClass: InMemoryUserRepository }

// Production/Test: Use Prisma
{ provide: IUserRepository, useClass: UserPrismaRepository }
```

### Cleanup Plan
InMemory repositories will be removed in Phase 5 (Issue #023) after all domains are migrated.

## Dependencies

### Required Packages
```json
{
  "dependencies": {
    "@prisma/client": "^5.x.x"
  },
  "devDependencies": {
    "prisma": "^5.x.x",
    "testcontainers": "^10.x.x"
  }
}
```

### Environment Variables
```env
# Development (Docker)
DATABASE_URL="mysql://root:password@localhost:3306/ecommerce_dev"

# Test (Testcontainers - auto-generated)
DATABASE_URL="mysql://test:test@localhost:xxxxx/test_db"

# Production
DATABASE_URL="mysql://user:pass@prod-host:3306/ecommerce_prod"
```

## Related Issues
- **Blocked by**: None
- **Blocks**: Issue #020 (Product domain)
- **Related**: Assignment 04 (STEP 7 - Integration)

## References
- [Prisma Documentation](https://www.prisma.io/docs)
- [Testcontainers Documentation](https://node.testcontainers.org/)
- [Project Data Model](/docs/dev/data-model.md)
- [Assignment 04](/docs/reference/assignment/assignment04.md)

## Notes
- Keep InMemory repository during this phase
- Ensure backward compatibility
- Focus on establishing patterns for subsequent domains
- Document any Prisma-specific decisions for team reference

---

**Issue created**: 2025-11-20
**Target completion**: Phase 1 of 5-phase DB integration
