# Issue #013: User Domain Implementation (Dashboard Product)

**Status**: Planning
**Created**: 2025-11-20
**Priority**: High
**Epic**: User Management
**Product**: Dashboard

---

## Overview

Implement the User domain for the Dashboard product with minimal functionality. The User domain will only handle user information retrieval, while authentication will be managed separately in the Auth area using a master token approach for testing.

### Scope

**Dashboard Product (This Issue)**:
- User profile retrieval (GET /api/users/me)
- Read-only operations
- Master Token authentication (temporary)

**Admin Product (Future)**:
- User list management
- User CRUD operations
- To be defined in `/docs/dev/admin/requirements.md`

---

## Goals

1. **Documentation Updates**:
   - Update `/docs/dev/dashboard/requirements.md` with User management requirements
   - Update `/docs/dev/dashboard/user-stories.md` with UC-USER-01
   - Update `/docs/dev/dashboard/data-model.md` with detailed User table definition
   - Update `/docs/dev/dashboard/api-specification.md` with User API endpoint

2. **Domain Documentation**:
   - Create `/docs/dev/dashboard/user/use-cases.md`
   - Create `/docs/dev/dashboard/user/sequence-diagrams.md`

3. **Implementation** (Not in this planning phase):
   - User domain layer (entities, repositories)
   - User application layer (use cases, DTOs)
   - User presentation layer (controllers, response DTOs)
   - Auth infrastructure (FakeAuthGuard, Master Token)

---

## Requirements

### Business Requirements

- **BR-USER-01**: Users can retrieve their own profile information
- **BR-USER-02**: Only authenticated users can access APIs
- **BR-USER-03**: Authentication uses Master Token (temporary, for testing)

### Technical Requirements

- **TR-USER-01**: User entity manages basic information only (id, name, email)
- **TR-USER-02**: Test user data is managed in InMemoryUserRepository
- **TR-USER-03**: Auth logic is separated from User domain
- **TR-USER-04**: Master Token is mapped to userId for testing

---

## Use Case

### UC-USER-01: Get User Profile

**Actor**: Authenticated Customer

**Precondition**:
- User has valid Access Token (Master Token)
- User exists in the system

**Main Flow**:
1. User requests their profile information (Authorization header with Master Token)
2. System validates the token (Auth Guard)
3. System extracts userId from the token
4. System retrieves user information via UserRepository
5. System returns user information (id, name, email, createdAt)

**Alternative Flow**:
- **2a. Invalid Token**:
  - 2a1. System returns "Invalid token" error (401 Unauthorized)
  - 2a2. Use case terminates

- **4a. User Not Found**:
  - 4a1. System returns "User not found" error (404 Not Found)
  - 4a2. Use case terminates

**Postcondition**:
- User receives their profile information

**Business Rules**:
- BR-USER-01: Users can only retrieve their own information

---

## API Specification

### GET /api/users/me

Retrieve the current user's profile information.

**Request Headers**:
```
Authorization: Bearer {masterToken}
```

**Response (200 OK)**:
```json
{
  "id": "user-uuid-1",
  "name": "홍길동",
  "email": "hong@example.com",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

**Error Responses**:
- **401 Unauthorized**: Invalid or missing token
  ```json
  {
    "statusCode": 401,
    "message": "유효하지 않은 토큰입니다"
  }
  ```

- **404 Not Found**: User not found
  ```json
  {
    "statusCode": 404,
    "message": "사용자를 찾을 수 없습니다"
  }
  ```

---

## Data Model

### User Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(36) | PRIMARY KEY | User ID (UUID) |
| name | VARCHAR(100) | NOT NULL | User name |
| email | VARCHAR(255) | UNIQUE, NULL | Email (for future auth implementation) |
| createdAt | TIMESTAMP | NOT NULL | Created timestamp |
| updatedAt | TIMESTAMP | NOT NULL | Updated timestamp |

**Relationships**:
- 1:1 → Cart
- 1:N → Order
- 1:N → UserCoupon

**Indexes**:
- PRIMARY KEY: id
- UNIQUE INDEX: email

**Test Data**:
```sql
INSERT INTO User (id, name, email, createdAt, updatedAt) VALUES
  ('user-uuid-1', '홍길동', 'hong@example.com', NOW(), NOW()),
  ('user-uuid-2', '김철수', 'kim@example.com', NOW(), NOW()),
  ('user-uuid-3', '이영희', 'lee@example.com', NOW(), NOW());
```

---

## Architecture

### Domain Structure

```
src/user/
├── presentation/
│   ├── controllers/
│   │   └── user.controller.ts
│   └── dtos/
│       └── user.response.dto.ts
├── application/
│   ├── use-cases/
│   │   ├── get-user-profile.use-case.ts
│   │   └── get-user-profile.use-case.spec.ts
│   └── dtos/
│       └── get-user-profile.dto.ts  # Input + Output
├── domain/
│   ├── entities/
│   │   ├── user.entity.ts
│   │   └── user.entity.spec.ts
│   ├── repositories/
│   │   └── user.repository.ts  # Interface
│   └── user.exceptions.ts
├── infrastructure/
│   ├── repositories/
│   │   ├── in-memory-user.repository.ts
│   │   └── in-memory-user.repository.spec.ts
│   └── fixtures/
│       └── user.fixtures.ts
└── user.module.ts
```

### Auth Area Structure (Temporary)

```
src/__fake__/auth/
├── fake-users.ts        # Existing file (keep as-is)
├── master-token.ts      # New: Master Token definitions
└── auth.guard.ts        # New: FakeAuthGuard
```

---

## Key Components

### 1. User Entity

**Properties**:
- id: string (UUID)
- name: string
- email: string | null
- createdAt: Date
- updatedAt: Date

**Methods**:
- `static reconstitute(data: UserData): User` - Reconstruct from DB
- `private validate(): void` - Business rule validation
- Getters only (immutable)

**No Authentication Logic**:
- No password field
- No token generation
- Pure domain entity

### 2. UserRepository Interface

```typescript
interface UserRepository {
  findById(id: string): Promise<User | null>;
}
```

### 3. Master Token (Temporary Auth)

```typescript
// src/__fake__/auth/master-token.ts
export const MASTER_TOKEN = 'test-master-token-12345';

export interface TokenPayload {
  userId: string;
}

export const TOKEN_USER_MAP: Record<string, TokenPayload> = {
  [MASTER_TOKEN]: { userId: 'user-uuid-1' },
  'test-token-user2': { userId: 'user-uuid-2' },
  'test-token-user3': { userId: 'user-uuid-3' },
};
```

### 4. FakeAuthGuard

```typescript
// src/__fake__/auth/auth.guard.ts
@Injectable()
export class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('토큰이 필요합니다');
    }

    const token = authHeader.substring(7);
    const payload = TOKEN_USER_MAP[token];

    if (!payload) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다');
    }

    request.user = payload;
    return true;
  }
}
```

### 5. GetUserProfileUseCase

```typescript
@Injectable()
export class GetUserProfileUseCase {
  constructor(
    @Inject('USER_REPOSITORY')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: GetUserProfileInput): Promise<GetUserProfileOutput> {
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new UserNotFoundException(input.userId);
    }

    return GetUserProfileOutput.from(user);
  }
}
```

### 6. UserController

```typescript
@Controller('users')
export class UserController {
  constructor(
    private readonly getUserProfileUseCase: GetUserProfileUseCase,
  ) {}

  @Get('me')
  @UseGuards(FakeAuthGuard)
  async getMyProfile(@Request() req): Promise<UserResponseDto> {
    const input = new GetUserProfileInput(req.user.userId);
    const output = await this.getUserProfileUseCase.execute(input);
    return UserResponseDto.from(output);
  }
}
```

---

## Test Data

### User Fixtures

```typescript
// src/user/infrastructure/fixtures/user.fixtures.ts
export const userFixtures = [
  {
    id: 'user-uuid-1',
    name: '홍길동',
    email: 'hong@example.com',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  },
  {
    id: 'user-uuid-2',
    name: '김철수',
    email: 'kim@example.com',
    createdAt: new Date('2025-01-02T00:00:00Z'),
    updatedAt: new Date('2025-01-02T00:00:00Z'),
  },
  {
    id: 'user-uuid-3',
    name: '이영희',
    email: 'lee@example.com',
    createdAt: new Date('2025-01-03T00:00:00Z'),
    updatedAt: new Date('2025-01-03T00:00:00Z'),
  },
];
```

### Master Token Mapping

```typescript
// src/__fake__/auth/master-token.ts
export const TOKEN_USER_MAP: Record<string, TokenPayload> = {
  'test-master-token-12345': { userId: 'user-uuid-1' },  // 홍길동
  'test-token-user2': { userId: 'user-uuid-2' },         // 김철수
  'test-token-user3': { userId: 'user-uuid-3' },         // 이영희
};
```

---

## Exception Handling

### User Domain Exceptions

```typescript
// src/user/domain/user.exceptions.ts

export class UserNotFoundException extends NotFoundException {
  constructor(userId: string) {
    super(`사용자를 찾을 수 없습니다: ${userId}`);
  }
}

export class InvalidUserDataException extends BadRequestException {
  constructor(message: string) {
    super(`유효하지 않은 사용자 데이터: ${message}`);
  }
}
```

---

## Integration with Other Domains

### Adding Authentication to Existing APIs

Other domains (Cart, Order, Coupon) can use `FakeAuthGuard` to require authentication:

```typescript
@Controller('carts')
export class CartController {
  @Get()
  @UseGuards(FakeAuthGuard)  // Add authentication
  async getCart(@Request() req): Promise<CartResponseDto> {
    const userId = req.user.userId;  // Extract userId from token
    // ... use userId to fetch cart
  }
}
```

---

## Documentation Files to Create/Update

### Phase 1: Dashboard Documentation Updates (4 files)

1. **`docs/dev/dashboard/requirements.md`**
   - Add "6. 사용자 관리 (User Management)" section
   - Business requirements: BR-USER-01, BR-USER-02, BR-USER-03
   - Technical requirements: TR-USER-01, TR-USER-02, TR-USER-03, TR-USER-04

2. **`docs/dev/dashboard/user-stories.md`**
   - Add "UC-USER-01: 사용자 정보 조회" use case
   - Actor: Authenticated Customer
   - Main flow, alternative flows, business rules

3. **`docs/dev/dashboard/data-model.md`**
   - Add detailed User table definition
   - Columns, constraints, relationships, indexes
   - Test data SQL

4. **`docs/dev/dashboard/api-specification.md`**
   - Add "6. User API" section
   - GET /api/users/me endpoint specification
   - Request/response examples, error codes

### Phase 2: User Domain Documentation (2 files)

5. **`docs/dev/dashboard/user/use-cases.md`** (New)
   - UC-USER-01 detailed specification
   - Scope definition (Dashboard vs Admin)
   - Future expansion notes

6. **`docs/dev/dashboard/user/sequence-diagrams.md`** (New)
   - SD-USER-01: User Profile Retrieval
   - Mermaid sequence diagram
   - Component descriptions
   - Error handling flows
   - Test scenarios

---

## Future Considerations

### Auth Domain Separation (Future Issue)

The temporary Auth area (`src/__fake__/auth/`) will be replaced with a proper Auth domain:

**Future Auth Domain**:
- User registration
- User login (JWT generation)
- Token validation
- Password management
- Session management

**Migration Path**:
1. Replace `FakeAuthGuard` with `JwtAuthGuard`
2. Replace `TOKEN_USER_MAP` with JWT token verification
3. No changes needed in User domain (already separated)

### Admin Product (Future Issue)

User management features for Admin product:
- User list retrieval (GET /api/admin/users)
- User creation (POST /api/admin/users)
- User update (PATCH /api/admin/users/:id)
- User deletion (DELETE /api/admin/users/:id)

To be defined in `/docs/dev/admin/requirements.md`.

---

## Testing Strategy

### Unit Tests

- **User Entity**: Validation, getters
- **GetUserProfileUseCase**: Success and error cases
- **InMemoryUserRepository**: CRUD operations
- **FakeAuthGuard**: Token validation

### Integration Tests

- **GET /api/users/me**: With valid/invalid tokens
- **Authentication Flow**: Token → userId extraction → user retrieval

### Test Coverage

- User domain: 100% (entities, use cases)
- Auth infrastructure: 80% (guard logic)

---

## Acceptance Criteria

- [ ] All 6 documentation files created/updated
- [ ] User domain structure follows existing pattern (Product domain)
- [ ] FakeAuthGuard implemented and tested
- [ ] Master Token mapping defined
- [ ] GET /api/users/me endpoint working
- [ ] Test data loaded in InMemoryUserRepository
- [ ] All tests passing (unit + integration)
- [ ] Korean test conventions followed
- [ ] Absolute imports used

---

## Related Issues

- **Previous**: [Issue #012](issue012.md) - Domain Consolidation (Cart-Order-Payment)
- **Next**: TBD - Auth Domain Implementation (Future)

---

## References

- [CLAUDE.md](../../CLAUDE.md) - Project conventions
- [Product Domain](../../src/product/) - Reference implementation
- [Architecture Guide](../dev/dashboard/architecture.md) - Layered architecture
- [Data Model](../dev/dashboard/data-model.md) - Database schema

---

**Created**: 2025-11-20
**Author**: Claude
**Branch**: To be created (e.g., `feature/013`)
